import fs from 'node:fs';
import path from 'node:path';

function scanDir(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(scanDir(full));
    } else if (file.endsWith('.test.js') || file.endsWith('.spec.js')) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      const testNames = [];
      lines.forEach((l, idx) => {
        const m = l.match(/(?:test|it)\s*\(\s*[`'"]([^`'"]+)[`'"]/);
        if (m) testNames.push({ name: m[1], line: idx + 1 });
      });
      results.push({ file: full, count: testNames.length, tests: testNames });
    }
  }
  return results;
}

const tests = scanDir('tests').concat(scanDir('livelink-tests/tests'));
let total = 0;
console.log('=== TEST AUDIT ===');
tests.forEach(t => {
  console.log(`\n📄 ${t.file} (${t.count} tests):`);
  t.tests.forEach(test => console.log(`   - line ${test.line}: ${test.name}`));
  total += t.count;
});
console.log(`\nTOTAL NUMBER OF DEFINED TESTS: ${total}`);
