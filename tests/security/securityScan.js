import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');

console.log('=== [Layer 7: Automated Security & Secret Scanner] ===');

let securityViolations = [];

// 1. Secret Scanning in tracked files
const bannedPatterns = [
  { name: 'Hardcoded Gemini API Key', regex: /AIzaSy[A-Za-z0-9_-]{33}/ },
  { name: 'Hardcoded AWS Secret', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'Metered Permanent API Key in Frontend', regex: /apiKey:\s*["'][a-zA-Z0-9_-]{20,}["']/ }
];

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'build', 'dist', 'coverage', 'playwright-report'].includes(entry.name)) {
        continue;
      }
      scanDirectory(fullPath);
    } else if (entry.isFile()) {
      if (/\.(js|jsx|json|md|html)$/.test(entry.name) && entry.name !== 'package-lock.json') {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const bp of bannedPatterns) {
          if (bp.regex.test(content)) {
            securityViolations.push(`[${bp.name}] found in file: ${path.relative(rootDir, fullPath)}`);
          }
        }
      }
    }
  }
}

scanDirectory(path.join(rootDir, 'backend/src'));
scanDirectory(path.join(rootDir, 'frontend/src'));

if (securityViolations.length > 0) {
  console.error('FAILED: Security violations detected:');
  securityViolations.forEach(v => console.error('  - ' + v));
  process.exit(1);
} else {
  console.log('✓ Secret Scan: Zero leaked credentials or hardcoded keys found in source code.');
}

console.log('\nSUCCESS: All Layer 7 security scans passed cleanly!\n');
process.exit(0);
