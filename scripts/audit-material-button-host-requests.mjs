import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { inspectButtonHostRequests } from '../tests/material-parity/button-host-request-evidence.mjs';
import { selectedButtonInputs } from '../tests/material-parity/button-pill-radius-evidence.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const capture = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(capture);
assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
const raw = JSON.parse(bytes), entries = [...raw.results.map(e => ({ ...e, kind: 'static' })),
  ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
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
    state: e.state ?? 'static', inputTrees: e.inputTrees, proof: inspectButtonHostRequests(input, r, a) }));
});
assert.equal(observations.length, 600);
assert.equal(new Set(observations.map(o => JSON.stringify([o.case, o.proof.element]))).size, 600);
const groups = [];
for (const o of observations) for (const p of o.proof.properties) {
  let g = groups.find(g => g.family === o.family && g.element === o.proof.element && g.property === p.property);
  if (!g) { g = { family: o.family, element: o.proof.element, ...p, cases: [] }; groups.push(g); }
  for (const [k, v] of Object.entries(p)) assert.deepEqual(g[k], v);
  g.cases.push(o.case);
}
assert.equal(groups.length, 27);
const candidate = 'examples/material-showcase/src/app/astylar.component.ts', introducedBy = '2f440115740ff76fa9e55b3f4a11568207b2af5a';
const current = readFileSync(candidate, 'utf8'), initial = execFileSync('git', ['show', `${introducedBy}:${candidate}`]).toString();
const history = ["selector: '.material-button',", "selector: '#core-primary',"].map(selector => {
  const select = text => text.split(/\r?\n/).filter(l => l.includes(selector));
  const lines = select(current); assert.equal(lines.length, 1); assert.deepEqual(lines, select(initial));
  return { selector, initialAndCurrentRule: lines[0].trim() };
});
const files = ['scripts/audit-material-button-host-requests.mjs', 'tests/material-parity/button-host-request-evidence.mjs',
  'tests/material-parity/button-host-request-evidence.spec.mjs', 'tests/material-parity/button-flex-input-evidence.mjs',
  'tests/material-parity/button-pill-radius-evidence.mjs', 'tests/material-parity/root-initial-style-evidence.mjs',
  'tests/material-parity/border-initial-input-evidence.mjs',
  'examples/material-showcase/src/app/reference.component.ts', candidate];
const output = { schemaVersion: 1, kind: 'shared-button-host-request-audit', capture: { file: capture, sha256: hash(bytes) },
  sourceFingerprints: files.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
  history: { introducedBy, rules: history, conclusion: 'The shared base rule and explicit core absolute rule are unchanged from the initial showcase. Complete current captured rules are separately checked. Historical auxiliary-rule absence and later compensation motives are not inferred.' },
  cases: new Set(observations.map(o => o.case)).size, owners: observations.length,
  families: new Set(observations.map(o => o.family)).size, propertyOccurrences: observations.length * 3,
  classification: 'application-plugin-authoring-defect', canonicalAttributionChanged: false,
  inputEquivalent: false, candidateUsedLayoutVerified: false, originalRasterCauseProven: false,
  structuralEquivalenceVerified: false, renderingEquivalent: false, groups, observations,
  limitation: 'Exact explicit reference host requests differ from candidate authoring and local stages. Null marks absent captured own-stage values, not a synthetic computed default. CSS host vertical-align is not equated to native text painting, and fixed-width coincidence does not establish min-width intent equivalence. Used layout, containing blocks, native-value/span composition and raster remain independent.' };
const file = 'docs/material-button-host-request-audit.json', text = JSON.stringify(output, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(readFileSync(file, 'utf8'), text); else writeFileSync(file, text);
console.log(JSON.stringify({ cases: output.cases, owners: output.owners, groups: groups.length,
  propertyOccurrences: output.propertyOccurrences, canonicalAttributionChanged: false }));
