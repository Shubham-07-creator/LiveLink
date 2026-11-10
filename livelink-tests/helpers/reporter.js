// Writes REPORT.md: per-area summary, every failure with the first error lines, warnings and flaky tests.
const fs = require('fs');
const strip = (s) => (s || '').replace(/\u001b\[[0-9;]*m/g, '');

const AREAS = {
  '01-api': 'Backend API and security',
  '02-socket': 'Socket signaling and host logic',
  '03-pages': 'Pages, themes, console errors, accessibility',
  '04-call': 'Real calls (2-5 users, chat, screen share, cleanup)',
  '05-network': 'TURN relay and reconnection',
  '06-bundle': 'Frontend bundle secret scan',
};

class Reporter {
  constructor() { this.rows = new Map(); }
  onTestEnd(test, result) {
    const file = test.location.file.split(/[\\/]/).pop().replace(/\.spec\.js$/, '');
    const warnings = test.annotations.filter((a) => a.type === 'warning').map((a) => a.description);
    this.rows.set(test.id, {
      area: file,
      title: test.titlePath().slice(3).join(' > ') || test.title,
      status: result.status,
      retry: result.retry,
      err: strip(result.error && result.error.message).split('\n').filter(Boolean).slice(0, 6).join('\n    '),
      warnings,
    });
  }
  onEnd() {
    const rows = [...this.rows.values()];
    const flaky = rows.filter((r) => r.status === 'passed' && r.retry > 0);
    const failed = rows.filter((r) => r.status === 'failed' || r.status === 'timedOut');
    const passed = rows.filter((r) => r.status === 'passed' && r.retry === 0);
    const skipped = rows.filter((r) => r.status === 'skipped');
    let md = `# LiveLink Test Report\n\n${new Date().toISOString()}\n\n`;
    md += `**PASS ${passed.length}  |  FAIL ${failed.length}  |  FLAKY ${flaky.length}  |  SKIPPED ${skipped.length}**\n\n`;
    md += `## Summary by area\n\n| Area | Pass | Fail | Flaky | Skip |\n|---|---|---|---|---|\n`;
    for (const k of Object.keys(AREAS)) {
      const a = rows.filter((r) => r.area === k);
      if (!a.length) continue;
      const c = (f) => a.filter(f).length;
      md += `| ${AREAS[k]} | ${c((r) => r.status === 'passed' && !r.retry)} | ${c((r) => r.status === 'failed' || r.status === 'timedOut')} | ${c((r) => r.status === 'passed' && r.retry > 0)} | ${c((r) => r.status === 'skipped')} |\n`;
    }
    md += `\n## BROKEN (fix these)\n\n`;
    md += failed.length ? failed.map((r) => `- [${AREAS[r.area] || r.area}] **${r.title}**\n    ${r.err}`).join('\n') : '_Nothing failed._';
    md += `\n\n## FLAKY (passed only on retry, treat as bugs)\n\n`;
    md += flaky.length ? flaky.map((r) => `- [${r.area}] ${r.title}`).join('\n') : '_None._';
    const warns = rows.filter((r) => r.warnings.length);
    md += `\n\n## Warnings (not failures, but look at them)\n\n`;
    md += warns.length ? warns.map((r) => `- [${r.area}] ${r.title}: ${r.warnings.join(' / ')}`).join('\n') : '_None._';
    md += `\n\n## Passed\n\n` + (passed.length ? passed.map((r) => `- [${r.area}] ${r.title}`).join('\n') : '_None._');
    md += `\n\n## Skipped\n\n` + (skipped.length ? skipped.map((r) => `- [${r.area}] ${r.title}`).join('\n') : '_None._') + '\n';
    fs.writeFileSync('REPORT.md', md);
    console.log(`\n=== LiveLink: PASS ${passed.length} | FAIL ${failed.length} | FLAKY ${flaky.length} | SKIP ${skipped.length} ===  see REPORT.md`);
  }
}
module.exports = Reporter;
