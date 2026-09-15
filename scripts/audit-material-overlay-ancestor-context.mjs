import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { collectOverlayAncestorContextSurvey } from '../tests/material-parity/overlay-ancestor-context-survey.mjs';

const report = collectOverlayAncestorContextSurvey('artifacts/material-parity/overlay-ancestor-context-current-ancestry-audit/latest-report.json');
report.sourceFingerprints = ['scripts/audit-material-overlay-ancestor-context.mjs',
  'tests/material-parity/overlay-ancestor-context-survey.mjs'].map(file => ({ file,
    sha256: createHash('sha256').update(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')).digest('hex') }));
const file = 'docs/material-overlay-ancestor-context-survey.json', json = JSON.stringify(report, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), json);
else writeFileSync(file, json);
console.log(JSON.stringify({ cases: report.cases, samples: report.samples, replayedRootProperties: report.replayedRootProperties,
  missingEnumeratedComputedAliases: report.missingEnumeratedComputedAliases,
  canonicalAttributionChanged: false, originalOverlayCauseEstablished: false }));
