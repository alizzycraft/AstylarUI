import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { collectButtonBoxSizingInputs } from '../tests/material-parity/button-box-sizing-source-binding.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const previous = JSON.parse(readFileSync('docs/material-button-box-sizing-input-survey.json'));
const bytes = readFileSync(previous.capture.file);
assert.equal(hash(bytes), previous.capture.sha256);
const evidence = collectButtonBoxSizingInputs(JSON.parse(bytes), { parityPath: previous.capture.file });
assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
// No prior finding is upgraded, removed or rewritten by stronger source binding.
assert.deepEqual(evidence.observations, previous.observations);
assert.equal(evidence.captures.length, previous.captures.length);
for (const [i, c] of evidence.captures.entries()) {
  const key = `${c.kind}:${c.family}@${c.profile}/${c.viewport.id}${c.state ? '/' + c.state : ''}`;
  assert.deepEqual({ case: key, owners: c.selectedOwners.map(o => o.element), inputTrees: c.inputTrees }, previous.captures[i]);
}
assert.deepEqual(evidence.groups.map(g => ({ family: g.family, element: g.element, cases: g.reviewedCases,
  measuredCases: g.measuredCases, geometryGapCases: g.geometryGapCases })), previous.groups);
const files = ['scripts/audit-material-button-box-sizing-binding.mjs',
  'tests/material-parity/button-box-sizing-source-binding.mjs',
  'tests/material-parity/button-box-sizing-source-binding.spec.mjs',
  'tests/material-parity/button-box-sizing-input-evidence.mjs',
  'tests/material-parity/button-fixed-width-evidence.mjs', 'tests/material-parity/button-flex-input-evidence.mjs',
  'tests/material-parity/button-pill-radius-evidence.mjs', 'tests/material-parity/root-initial-style-evidence.mjs',
  'tests/material-parity/border-initial-input-evidence.mjs', 'docs/material-button-box-sizing-input-survey.json'];
const report = { schemaVersion: 1, kind: 'original-button-box-sizing-source-binding',
  sourceFingerprints: files.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
  canonicalAttributionChanged: false, previousObservationsUnchanged: true, inputEquivalent: false, renderingEquivalent: false,
  evidence };
const file = 'docs/material-button-box-sizing-source-binding.json', text = JSON.stringify(report, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(readFileSync(file, 'utf8'), text); else writeFileSync(file, text);
console.log(JSON.stringify({ cases: evidence.captures.length, observations: evidence.observations.length,
  groups: evidence.groups.length, measured: evidence.groups.reduce((n, g) => n + g.measuredCases.length, 0),
  gaps: evidence.groups.reduce((n, g) => n + g.geometryGapCases.length, 0), previousObservationsUnchanged: true,
  canonicalAttributionChanged: false }));
