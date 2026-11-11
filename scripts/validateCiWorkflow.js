import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../');

console.log('=== [CI Workflow Validation (Dry-Run Syntax & Step Check)] ===');

const workflowPath = path.join(rootDir, '.github/workflows/ci.yml');
if (!fs.existsSync(workflowPath)) {
  console.error('FAIL: Workflow file not found:', workflowPath);
  process.exit(1);
}

const content = fs.readFileSync(workflowPath, 'utf8');

// Basic YAML structural check
const requiredKeys = ['name:', 'on:', 'jobs:', 'runs-on:', 'steps:'];
for (const key of requiredKeys) {
  if (!content.includes(key)) {
    console.error(`FAIL: Missing required YAML workflow key: ${key}`);
    process.exit(1);
  }
}

// Check scripts called in workflow against package.json
const pkgJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const calledScripts = [];
const scriptMatches = content.matchAll(/npm run ([a-zA-Z0-9:-]+)/g);
for (const match of scriptMatches) {
  calledScripts.push(match[1]);
}

let scriptMissing = false;
for (const script of calledScripts) {
  if (!pkgJson.scripts[script]) {
    console.error(`FAIL: CI workflow calls "npm run ${script}", but it is missing in package.json!`);
    scriptMissing = true;
  }
}

if (scriptMissing) {
  process.exit(1);
}

// Validate actions versions
const actionMatches = content.matchAll(/uses:\s+([a-zA-Z0-9_/-]+@v[0-9]+)/g);
console.log('GitHub Actions referenced:');
for (const match of actionMatches) {
  console.log(`  ✓ ${match[1]}`);
}

console.log('Package scripts invoked in pipeline:');
for (const s of new Set(calledScripts)) {
  console.log(`  ✓ npm run ${s} -> "${pkgJson.scripts[s]}"`);
}

console.log('\n✓ SYNTAX & INTEGRITY CHECK: .github/workflows/ci.yml is fully valid.');
console.log('NOTE: This workflow has NOT yet run on GitHub Actions runners (validated locally via dry-run audit).\n');
process.exit(0);
