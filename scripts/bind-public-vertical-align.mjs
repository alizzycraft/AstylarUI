import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { validateVerticalAlignEvidence, verticalAlignArtifactRoot } from '../tests/material-parity/public-vertical-align-evidence.mjs';
assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--check'));
const report = JSON.parse(readFileSync(`${verticalAlignArtifactRoot}/latest-report.json`));
const data = validateVerticalAlignEvidence(report), file = 'docs/material-public-vertical-align-audit.json';
const serialized = JSON.stringify(data, null, 2) + '\n';
if (process.argv[2] === '--check') assert.equal(readFileSync(file, 'utf8'), serialized);
else writeFileSync(file, serialized);
console.log(JSON.stringify({ cases: data.cases, screenshots: data.screenshots, classification: data.classification,
  mismatchingDeltas: data.deltas.filter(d => !d.deltaMatches).length, check: process.argv[2] === '--check' }));
