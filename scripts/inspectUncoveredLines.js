import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../');

const covFile = path.join(rootDir, 'coverage/coverage-final.json');
if (!fs.existsSync(covFile)) {
  console.error('coverage-final.json not found');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(covFile, 'utf8'));

for (const [filePath, fileCov] of Object.entries(data)) {
  if (filePath.includes('socketManager.js') || filePath.includes('user.controller.js')) {
    const filename = path.basename(filePath);
    console.log(`\n================== ${filename} ==================`);
    
    // Uncovered lines
    const uncoveredLines = [];
    for (const [line, count] of Object.entries(fileCov.s || {})) {
      if (count === 0) {
        const stmt = fileCov.statementMap[line];
        if (stmt) {
          uncoveredLines.push(stmt.start.line);
        }
      }
    }
    const uniqueLines = [...new Set(uncoveredLines)].sort((a, b) => a - b);
    console.log(`Total Uncovered Lines (${uniqueLines.length}):`, uniqueLines.join(', '));

    // Per-function breakdown
    console.log('\n--- Functions Breakdown ---');
    const fnStats = [];
    for (const [fnId, count] of Object.entries(fileCov.f || {})) {
      const fnMeta = fileCov.fnMap[fnId];
      fnStats.push({
        name: fnMeta.name || `<anonymous @ line ${fnMeta.decl?.start?.line || fnMeta.loc?.start?.line}>`,
        line: fnMeta.decl?.start?.line || fnMeta.loc?.start?.line,
        executed: count > 0,
        calls: count
      });
    }
    console.table(fnStats);

    // Branch coverage summary
    let totalBranches = 0;
    let coveredBranches = 0;
    const uncoveredBranchDetails = [];
    for (const [bId, counts] of Object.entries(fileCov.b || {})) {
      const bMeta = fileCov.branchMap[bId];
      totalBranches += counts.length;
      counts.forEach((c, idx) => {
        if (c > 0) coveredBranches++;
        else {
          uncoveredBranchDetails.push({
            line: bMeta.loc.start.line,
            type: bMeta.type,
            branchIndex: idx
          });
        }
      });
    }
    console.log(`Branches: ${coveredBranches} / ${totalBranches} (${((coveredBranches/totalBranches)*100).toFixed(1)}%)`);
    console.log('Uncovered Branches Sample at lines:', uncoveredBranchDetails.slice(0, 15).map(b => `line ${b.line} (${b.type})`).join(', '));
  }
}
