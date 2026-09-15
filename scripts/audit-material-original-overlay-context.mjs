import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { collectOriginalOverlayContextSurvey } from '../tests/material-parity/original-overlay-context-survey.mjs';

const report = collectOriginalOverlayContextSurvey('artifacts/material-parity/original-overlay-context-current-ancestry-audit/latest-report.json');
report.sourceFingerprints = ['scripts/audit-material-original-overlay-context.mjs',
  'tests/material-parity/original-overlay-context-survey.mjs'].map(file => ({ file,
    sha256: createHash('sha256').update(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')).digest('hex') }));
const file = 'docs/material-original-overlay-context-survey.json', output = JSON.stringify(report, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output);
else writeFileSync(file, output);
console.log(JSON.stringify({ cases: report.cases, matchedOriginalOwners: report.matchedOriginalOwners,
  rootProperties: report.rootProperties, missingEnumeratedAliases: report.missingEnumeratedAliases,
  canonicalAttributionChanged: false, candidateReplayed: false }));
