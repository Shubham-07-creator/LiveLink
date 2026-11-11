import { execSync } from 'node:child_process';

console.log('=== [Gitleaks Full Git History Audit] ===');

const GITLEAKS_PATTERNS = [
  { id: 'google-api-key', name: 'Google API Key', regex: /AIzaSy[A-Za-z0-9_-]{33}/g },
  { id: 'aws-access-key-id', name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/g },
  { id: 'private-key', name: 'Private Key', regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g },
  { id: 'mongodb-credentials', name: 'MongoDB URI Credentials', regex: /mongodb(?:\+srv)?:\/\/[a-zA-Z0-9_.-]+:[^@\s"']+@[a-zA-Z0-9_.-]+/g },
  { id: 'slack-webhook', name: 'Slack Webhook', regex: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]{8}\/B[a-zA-Z0-9_]{8}\/[a-zA-Z0-9_]{24}/g },
  { id: 'discord-webhook', name: 'Discord Webhook', regex: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/[0-9]{17,20}\/[A-Za-z0-9_-]+/g },
  { id: 'metered-permanent-key', name: 'Metered Permanent API Key', regex: /apiKey:\s*["'][a-zA-Z0-9_-]{24,}["']/g }
];

// Get total commit count
const totalCommits = Number(execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim());
console.log(`Auditing full git history across ${totalCommits} commits...`);

// Extract full diff history
const logOutput = execSync('git log -p --full-history --date=iso', {
  maxBuffer: 50 * 1024 * 1024,
  encoding: 'utf8'
});

const lines = logOutput.split('\n');
let currentCommit = '';
let currentFile = '';
const findings = [];

for (const line of lines) {
  if (line.startsWith('commit ')) {
    currentCommit = line.split(' ')[1];
  } else if (line.startsWith('diff --git ')) {
    currentFile = line.split(' ')[2] || '';
  } else if (line.startsWith('+') && !line.startsWith('+++')) {
    // Check additions
    const addedContent = line.slice(1);
    // Ignore .env.example or test mock fixtures with dummy values
    if (currentFile.includes('.env.example') || currentFile.includes('mock') || currentFile.includes('tests/')) {
      continue;
    }
    for (const rule of GITLEAKS_PATTERNS) {
      if (rule.regex.test(addedContent)) {
        findings.push({
          rule: rule.name,
          commit: currentCommit.slice(0, 8),
          file: currentFile,
          snippet: addedContent.trim().slice(0, 60)
        });
      }
    }
  }
}

console.log(`\n--- Gitleaks Scan Summary ---`);
console.log(`Total Commits Scanned: ${totalCommits}`);
console.log(`Findings Detected:     ${findings.length}`);

if (findings.length > 0) {
  console.error('\nVIOLATIONS FOUND IN GIT HISTORY:');
  findings.forEach((f, i) => {
    console.error(`  [${i + 1}] ${f.rule} in commit ${f.commit} (${f.file}): "${f.snippet}..."`);
  });
  process.exit(1);
} else {
  console.log('\nSUCCESS: 0 leaked secrets found across entire git history!\n');
  process.exit(0);
}
