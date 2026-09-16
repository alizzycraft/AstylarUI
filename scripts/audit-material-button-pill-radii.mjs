import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { inspectButtonPillRadius, selectedButtonInputs } from '../tests/material-parity/button-pill-radius-evidence.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const capture = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(capture);
assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
const report = JSON.parse(bytes), entries = [...report.results.map(e => ({ ...e, kind: 'static' })),
  ...report.interactions.map(e => ({ ...e, kind: 'interaction' }))];
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const read = d => { const b = readFileSync(d.file); assert.equal(hash(b), d.sha256); return JSON.parse(b); };
const observations = entries.flatMap(e => {
  const inputs = selectedButtonInputs(e); if (!inputs.length) return [];
  const r = read(e.inputTrees.reference), a = read(e.inputTrees.astylar);
  // Independent full-tree class inventory prevents silent scalar-owner loss.
  assert.deepEqual(inputs.map(i => i.id).sort(), a.nodes.filter(n => n.authored?.class?.split(/\s+/)
    .includes('material-button')).map(n => n.authored.id).sort());
  return inputs.map(i => ({ case: keyOf(e), family: e.family, profile: e.profile, viewport: e.viewport,
    state: e.state ?? 'static', inputTrees: e.inputTrees, proof: inspectButtonPillRadius(e, i, r, a) }));
});
assert.equal(observations.length, 600);
assert.equal(new Set(observations.map(o => JSON.stringify([o.case, o.proof.element]))).size, 600);
const cases = new Set(observations.map(o => o.case)).size; assert.equal(cases, 480);
const groups = [];
for (const o of observations) for (const p of o.proof.properties) {
  let g = groups.find(g => g.family === o.family && g.element === o.proof.element &&
    g.property === p.property && g.reference === p.reference && g.candidate === p.candidate);
  if (!g) { g = { family: o.family, element: o.proof.element, ...p, cases: [] }; groups.push(g); }
  g.cases.push(o.case);
}
assert.equal(groups.length, 108);
const candidate = 'examples/material-showcase/src/app/astylar.component.ts';
const introducedBy = '2f440115740ff76fa9e55b3f4a11568207b2af5a';
const line = s => s.split(/\r?\n/).filter(l => l.includes("selector: '.material-button',"));
const currentLine = line(readFileSync(candidate, 'utf8'));
const historicalLine = line(execFileSync('git', ['show', `${introducedBy}:${candidate}`]).toString());
assert.equal(currentLine.length, 1); assert.deepEqual(currentLine, historicalLine);
const reference = 'examples/material-showcase/src/app/reference.component.ts';
const files = ['scripts/audit-material-button-pill-radii.mjs', 'tests/material-parity/button-pill-radius-evidence.mjs',
  'tests/material-parity/button-pill-radius-evidence.spec.mjs', 'tests/material-parity/root-initial-style-evidence.mjs',
  'tests/material-parity/border-initial-input-evidence.mjs', reference, candidate];
const output = { schemaVersion: 1, kind: 'shared-button-pill-radius-input-audit', capture: { file: capture, sha256: hash(bytes) },
  sourceFingerprints: files.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
  history: { introducedBy, initialAndCurrentDeclaration: currentLine[0].trim(),
    conclusion: 'The fixed theme-scaled radius is present in the initial showcase and the complete base rule is unchanged. No later compensating edit or causal renderer defect is established by this history.' },
  cases, owners: observations.length, families: new Set(observations.map(o => o.family)).size,
  propertyOccurrences: observations.length * 4, classification: 'application-plugin-authoring-defect',
  firstDivergence: 'full-pill token replaced by fixed theme-scaled radius',
  canonicalAttributionChanged: false, authoredIntentEquivalent: false, originalRasterCauseProven: false,
  candidateUsedPaintVerified: false, renderingEquivalent: false, groups, observations,
  limitation: 'Same used shape at constrained current heights does not preserve full-pill authored intent. Browser-only shape controls do not prove Astylar paint, border clipping, hit testing or full rendering. The reference shorthand cssText is retained because CSSOM var() longhands serialize empty. Global token-definition ancestry is not independently captured here; 9999px is the original computed value. No renderer or canonical fixture changes.' };
const file = 'docs/material-button-pill-radius-audit.json', text = JSON.stringify(output, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(readFileSync(file, 'utf8'), text); else writeFileSync(file, text);
console.log(JSON.stringify({ cases, owners: observations.length, groups: groups.length,
  propertyOccurrences: output.propertyOccurrences, canonicalAttributionChanged: false }));
