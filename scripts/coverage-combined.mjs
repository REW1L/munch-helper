import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

const readSummary = (relativePath) => {
  const filePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing coverage summary file: ${relativePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  const lines = parsed?.total?.lines;

  if (!lines || typeof lines.total !== 'number' || typeof lines.covered !== 'number') {
    throw new Error(`Invalid coverage summary format: ${relativePath}`);
  }

  return lines;
};

const frontendLines = readSummary('frontend/coverage/coverage-summary.json');
const backendLines = readSummary('backend/coverage/coverage-summary.json');

const totalLines = frontendLines.total + backendLines.total;
const coveredLines = frontendLines.covered + backendLines.covered;
const combinedPct = totalLines === 0 ? 0 : (coveredLines / totalLines) * 100;

console.log('Combined repo line coverage:', `${combinedPct.toFixed(2)}%`);
