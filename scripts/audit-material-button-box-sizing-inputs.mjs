import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inspectButtonBoxSizingInput } from '../tests/material-parity/button-box-sizing-input-evidence.mjs';
import { selectedButtonInputs } from '../tests/material-parity/button-pill-radius-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const capture = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(capture);
assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
const raw = JSON.parse(bytes), entries = [...raw.results.map(e => ({ ...e, kind: 'static' })),
  ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
assert.equal(entries.length, 2311);
const read = descriptor => { const b = readFileSync(descriptor.file); assert.equal(hash(b), descriptor.sha256); return JSON.parse(b); };
const observations = [], captures = [];
for (const entry of entries) {
  const key = `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
  const inputs = selectedButtonInputs(entry), candidate = read(entry.inputTrees.astylar);
  assert.deepEqual(inputs.map(i => i.id).sort(), candidate.nodes.filter(n => n.authored?.class?.split(/\s+/)
    .includes('material-button')).map(n => n.authored.id).sort());
  captures.push({ case: key, owners: inputs.map(i => i.id), inputTrees: entry.inputTrees });
  if (!inputs.length) continue;
  const reference = read(entry.inputTrees.reference);
  for (const input of inputs) observations.push({ case: key, family: entry.family, profile: entry.profile,
    viewport: entry.viewport, state: entry.state ?? 'static', inputSha256: hash(JSON.stringify(input)),
    proof: inspectButtonBoxSizingInput(input, reference, candidate, entry) });
}
assert.equal(observations.length, 600);
assert.equal(new Set(observations.map(o => JSON.stringify([o.case, o.proof.element]))).size, 600);
const groups = [];
for (const o of observations) {
  let group = groups.find(g => g.family === o.family && g.element === o.proof.element);
  if (!group) { group = { family: o.family, element: o.proof.element, cases: [], measuredCases: [], geometryGapCases: [] }; groups.push(group); }
  group.cases.push(o.case);
  (o.proof.observedDeclaredBorderBox ? group.measuredCases : group.geometryGapCases).push(o.case);
}
assert.equal(groups.length, 9);
const files = ['scripts/audit-material-button-box-sizing-inputs.mjs',
  'tests/material-parity/button-box-sizing-input-evidence.mjs', 'tests/material-parity/button-box-sizing-input-evidence.spec.mjs',
  'tests/material-parity/button-fixed-width-evidence.mjs', 'tests/material-parity/button-flex-input-evidence.mjs',
  'tests/material-parity/button-pill-radius-evidence.mjs', 'tests/material-parity/root-initial-style-evidence.mjs',
  'examples/material-showcase/src/app/astylar.component.ts', 'tests/material-parity/run-material-parity.mjs',
  'src/app/services/dom/elements/element-dimension.service.ts',
  'examples/material-showcase/node_modules/astylarui/dist/lib/app/services/dom/elements/element-dimension.service.js',
  'docs/material-button-box-sizing-public-proof.json'];
const report = { schemaVersion: 1, kind: 'original-button-box-sizing-input-survey',
  capture: { file: capture, sha256: hash(bytes) },
  sourceFingerprints: files.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
  captureCases: captures.length, selectedCases: new Set(observations.map(o => o.case)).size,
  owners: observations.length, groups, observedDeclaredBorderBoxes: observations.filter(o => o.proof.observedDeclaredBorderBox).length,
  interactionGeometryGaps: observations.filter(o => !o.proof.observedDeclaredBorderBox).length,
  classification: 'observation-stage-difference-with-bounded-native-button-sizing-evidence',
  canonicalAttributionChanged: false, inputEquivalent: false, renderingEquivalent: false,
  captures, observations,
  limitation: 'Complete original owner/source coverage, but border-box geometry is retained only for static cases. Keep interaction geometry gaps and the independent intrinsic-reference/fixed-candidate width mismatch visible. No whole-control equivalence or renderer fix.' };
const file = 'docs/material-button-box-sizing-input-survey.json', text = JSON.stringify(report, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(readFileSync(file, 'utf8'), text); else writeFileSync(file, text);
console.log(JSON.stringify({ cases: report.captureCases, selectedCases: report.selectedCases, owners: report.owners,
  groups: groups.length, observedDeclaredBorderBoxes: report.observedDeclaredBorderBoxes,
  interactionGeometryGaps: report.interactionGeometryGaps, canonicalAttributionChanged: false }));
