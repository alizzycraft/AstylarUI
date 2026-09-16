import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { inspectButtonFlexInput } from '../tests/material-parity/button-flex-input-evidence.mjs';
import { selectedButtonInputs } from '../tests/material-parity/button-pill-radius-evidence.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const capture = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(capture);
assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
const report = JSON.parse(bytes), entries = [...report.results.map(e => ({ ...e, kind: 'static' })),
  ...report.interactions.map(e => ({ ...e, kind: 'interaction' }))];
assert.equal(entries.length, 2311);
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const read = d => { const b = readFileSync(d.file); assert.equal(hash(b), d.sha256); return JSON.parse(b); };
const observations = entries.flatMap(e => {
  const inputs = selectedButtonInputs(e), a = read(e.inputTrees.astylar);
  assert.deepEqual(inputs.map(i => i.id).sort(), a.nodes.filter(n => n.authored?.class?.split(/\s+/)
    .includes('material-button')).map(n => n.authored.id).sort());
  if (!inputs.length) return [];
  const r = read(e.inputTrees.reference);
  return inputs.map(input => ({ case: keyOf(e), family: e.family, profile: e.profile, viewport: e.viewport,
    state: e.state ?? 'static', inputTrees: e.inputTrees, proof: inspectButtonFlexInput(input, r, a) }));
});
assert.equal(observations.length, 600);
assert.equal(new Set(observations.map(o => JSON.stringify([o.case, o.proof.element]))).size, 600);
const groups = [];
for (const o of observations) for (const p of o.proof.properties) {
  let g = groups.find(g => g.family === o.family && g.element === o.proof.element && g.property === p.property);
  if (!g) { g = { family: o.family, element: o.proof.element, ...p, cases: [] }; groups.push(g); }
  assert.equal(g.reference, p.reference); assert.equal(g.candidateLocal, p.candidateLocal); g.cases.push(o.case);
}
assert.equal(groups.length, 27);
const candidate = 'examples/material-showcase/src/app/astylar.component.ts', introducedBy = '2f440115740ff76fa9e55b3f4a11568207b2af5a';
const selectRule = s => s.split(/\r?\n/).filter(l => l.includes("selector: '.material-button',"));
const current = selectRule(readFileSync(candidate, 'utf8'));
assert.equal(current.length, 1);
assert.deepEqual(current, selectRule(execFileSync('git', ['show', `${introducedBy}:${candidate}`]).toString()));
const files = ['scripts/audit-material-button-flex-inputs.mjs', 'tests/material-parity/button-flex-input-evidence.mjs',
  'tests/material-parity/button-flex-input-evidence.spec.mjs', 'tests/material-parity/button-pill-radius-evidence.mjs',
  'tests/material-parity/root-initial-style-evidence.mjs', 'tests/material-parity/border-initial-input-evidence.mjs',
  'src/app/config/browser-defaults.ts', 'src/app/services/dom/style-defaults.service.ts',
  'examples/material-showcase/src/app/reference.component.ts', candidate];
const output = { schemaVersion: 1, kind: 'shared-button-flex-input-audit', capture: { file: capture, sha256: hash(bytes) },
  sourceFingerprints: files.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
  history: { introducedBy, initialAndCurrentBaseRule: current[0].trim(),
    conclusion: 'The shared candidate base rule omits these formatting requests in both initial and current source. Complete current captured rules exclude other applicable requests. This does not prove historical absence in every auxiliary rule or a compensating edit motive.' },
  cases: new Set(observations.map(o => o.case)).size, owners: observations.length, families: new Set(observations.map(o => o.family)).size,
  propertyOccurrences: observations.length * 3, classification: 'application-plugin-authoring-defect',
  canonicalAttributionChanged: false, inputEquivalent: false, candidateUsedLayoutVerified: false,
  originalRasterCauseProven: false, renderingEquivalent: false, groups, observations,
  limitation: 'Explicit reference formatting is absent from complete candidate authoring and differs in all local core stages. This is not a final used-layout or text-centering diagnosis. Native value painting and the reference label span are retained as different composition; no structural equivalence is inferred. Position, vertical-align, width, text metrics, state layers, clipping and raster remain separate.' };
const file = 'docs/material-button-flex-input-audit.json', text = JSON.stringify(output, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(readFileSync(file, 'utf8'), text); else writeFileSync(file, text);
console.log(JSON.stringify({ cases: output.cases, owners: output.owners, groups: groups.length,
  propertyOccurrences: output.propertyOccurrences, canonicalAttributionChanged: false }));
