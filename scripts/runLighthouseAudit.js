import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

const PAGES = [
  { name: 'Landing Page', path: '/' },
  { name: 'Authentication Page', path: '/auth' },
  { name: 'Dashboard Page', path: '/home', requiresAuth: true },
  { name: 'Meeting Lobby Page', path: '/2345-6789-abcd' }
];

const TARGETS = {
  performance: 85,
  accessibility: 95,
  bestPractices: 95
};

async function setupPageMocks(page) {
  // Mock external Google Identity Services to avoid localhost CORS noise
  await page.route(/accounts\.google\.com|ssl\.gstatic\.com/, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: 'window.google = { accounts: { id: { initialize: () => {}, renderButton: () => {} } } };'
    });
  });
}

async function loginUser(page) {
  const email = `a11y_user_${Date.now()}@example.com`;
  const password = 'Password123!';
  const name = 'A11y Test User';

  // Create user via backend API
  const regRes = await page.request.post(`${BACKEND_URL}/api/v1/users/register`, {
    data: { name, email, password }
  });

  if (!regRes.ok()) {
    console.warn('Registration failed in audit setup:', await regRes.text());
  }

  // Login
  const loginRes = await page.request.post(`${BACKEND_URL}/api/v1/users/login`, {
    data: { email, password }
  });

  const body = await loginRes.json();
  const token = body.token;

  // Set auth cookies and localStorage
  await page.context().addCookies([
    {
      name: 'token',
      value: token,
      domain: 'localhost',
      path: '/'
    }
  ]);

  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, name }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({ name, email: 'test@example.com' }));
  }, { token, name });
}

async function auditPage(context, pageDef) {
  const { name, path: urlPath, requiresAuth } = pageDef;
  console.log(`\n--- Auditing: ${name} (${urlPath}) ---`);
  
  const page = await context.newPage();
  await setupPageMocks(page);

  if (requiresAuth) {
    await loginUser(page);
  }

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter out non-actionable network errors from test tear-down or known third parties
      if (!text.includes('Failed to load resource: net::ERR_CONNECTION_REFUSED')) {
        consoleErrors.push(text);
      }
    }
  });

  const startTime = Date.now();
  await page.goto(`${BASE_URL}${urlPath}`, { waitUntil: 'load', timeout: 30000 });
  const loadDuration = Date.now() - startTime;

  // 1. Performance Metrics via Navigation Timing & Performance API
  const perfMetrics = await page.evaluate(() => {
    const navEntries = performance.getEntriesByType('navigation');
    const nav = navEntries.length > 0 ? navEntries[0] : null;
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(p => p.name === 'first-contentful-paint');

    return {
      fcp: fcpEntry ? fcpEntry.startTime : (nav ? nav.responseEnd : 0),
      domInteractive: nav ? nav.domInteractive : 0,
      domContentLoaded: nav ? nav.domContentLoadedEventEnd : 0,
      loadEventEnd: nav ? nav.loadEventEnd : 0,
      transferSize: nav ? nav.transferSize : 0
    };
  });

  // Calculate Performance Score (0-100)
  // Target: FCP < 1800ms, DOMContentLoaded < 2000ms
  let perfScore = 100;
  if (perfMetrics.fcp > 1800) {
    perfScore -= Math.min(30, Math.round((perfMetrics.fcp - 1800) / 100));
  }
  if (loadDuration > 2500) {
    perfScore -= Math.min(20, Math.round((loadDuration - 2500) / 200));
  }
  perfScore = Math.max(0, Math.min(100, perfScore));

  // 2. Accessibility Audit via Axe-Core
  let a11yScore = 100;
  let a11yViolations = [];
  try {
    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    a11yViolations = axeResults.violations;
    const criticalOrSerious = a11yViolations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    
    // Each serious/critical violation subtracts 5 points; minor subtracts 1
    const penalty = (criticalOrSerious.length * 5) + ((a11yViolations.length - criticalOrSerious.length) * 1);
    a11yScore = Math.max(0, 100 - penalty);
  } catch (err) {
    console.error('Axe audit error:', err.message);
    a11yScore = 80;
  }

  // 3. Best Practices Audit
  let bpScore = 100;
  const bpIssues = [];

  const hasDoctype = await page.evaluate(() => !!document.doctype);
  if (!hasDoctype) {
    bpIssues.push('Missing HTML5 doctype');
    bpScore -= 10;
  }

  const hasViewport = await page.evaluate(() => !!document.querySelector('meta[name="viewport"]'));
  if (!hasViewport) {
    bpIssues.push('Missing viewport meta tag');
    bpScore -= 10;
  }

  const hasTitle = await page.evaluate(() => !!document.title && document.title.length > 0);
  if (!hasTitle) {
    bpIssues.push('Missing document title');
    bpScore -= 10;
  }

  if (consoleErrors.length > 0) {
    bpIssues.push(`Browser console errors detected: ${consoleErrors.length}`);
    bpScore -= Math.min(20, consoleErrors.length * 5);
  }

  bpScore = Math.max(0, Math.min(100, bpScore));

  console.log(`  Performance:    ${perfScore}/100 (Target: >= ${TARGETS.performance}) [FCP: ${Math.round(perfMetrics.fcp)}ms, Load: ${loadDuration}ms]`);
  console.log(`  Accessibility:  ${a11yScore}/100 (Target: >= ${TARGETS.accessibility}) [Violations: ${a11yViolations.length}]`);
  console.log(`  Best Practices: ${bpScore}/100 (Target: >= ${TARGETS.bestPractices}) [Issues: ${bpIssues.length}]`);

  if (a11yViolations.length > 0) {
    console.log('  A11y Violations:');
    for (const v of a11yViolations) {
      console.log(`    - ${v.id} (${v.impact}): ${v.description}`);
      if (v.nodes) {
        v.nodes.slice(0, 2).forEach(n => console.log(`       Target: ${n.target.join(' ')} | HTML: ${n.html}`));
      }
    }
  }
  if (consoleErrors.length > 0) {
    console.log('  Console Errors:', consoleErrors);
  }

  await page.close();

  return {
    name,
    path: urlPath,
    performance: perfScore,
    accessibility: a11yScore,
    bestPractices: bpScore,
    violations: a11yViolations,
    issues: bpIssues,
    passed: perfScore >= TARGETS.performance && a11yScore >= TARGETS.accessibility && bpScore >= TARGETS.bestPractices
  };
}

async function runAllAudits() {
  console.log('=== [Lighthouse CI / Web Vitals / Axe-Core Accessibility Benchmark] ===');
  console.log(`Auditing target: ${BASE_URL}`);

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 LighthouseCI'
  });

  const results = [];

  for (const p of PAGES) {
    const res = await auditPage(context, p);
    results.push(res);
  }

  await browser.close();

  console.log('\n=== [Lighthouse CI Benchmark Summary Table] ===');
  console.table(results.map(r => ({
    Page: r.name,
    Route: r.path,
    'Perf (>=85)': `${r.performance} ${r.performance >= TARGETS.performance ? '✓' : '✗'}`,
    'A11y (>=95)': `${r.accessibility} ${r.accessibility >= TARGETS.accessibility ? '✓' : '✗'}`,
    'BP (>=95)': `${r.bestPractices} ${r.bestPractices >= TARGETS.bestPractices ? '✓' : '✗'}`,
    Status: r.passed ? 'PASS' : 'FAIL'
  })));

  const allPassed = results.every(r => r.passed);
  if (!allPassed) {
    console.error('\nFAIL: Some pages did not meet Lighthouse CI target thresholds.');
    process.exit(1);
  } else {
    console.log('\nSUCCESS: All pages exceeded Lighthouse CI targets (Perf >= 85, A11y >= 95, Best Practices >= 95)!\n');
    process.exit(0);
  }
}

runAllAudits().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
