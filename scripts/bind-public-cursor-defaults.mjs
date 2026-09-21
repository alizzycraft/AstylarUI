import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { validateCursorEvidence, cursorArtifactRoot } from '../tests/material-parity/public-cursor-defaults-evidence.mjs';
import { assertHistoricalCursorReceipt } from '../tests/material-parity/historical-cursor-receipt-assertion.mjs';
assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--check'));
const report = JSON.parse(readFileSync(`${cursorArtifactRoot}/latest-report.json`));
const data = validateCursorEvidence(report), file = 'docs/material-public-cursor-defaults-audit.json';
const serialized = JSON.stringify(data, null, 2) + '\n';
if (process.argv[2] === '--check') assertHistoricalCursorReceipt(data);
else writeFileSync(file, serialized);
console.log(JSON.stringify({ cases: data.cases, boundaries: data.boundaries, screenshots: data.screenshots,
  differences: data.differences.length, check: process.argv[2] === '--check' }));
