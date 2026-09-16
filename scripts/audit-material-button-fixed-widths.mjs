import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { inspectButtonFixedWidth } from '../tests/material-parity/button-fixed-width-evidence.mjs';
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
    state: e.state ?? 'static', inputTrees: e.inputTrees, proof: inspectButtonFixedWidth(input, r, a) }));
});
assert.equal(observations.length, 600);
assert.equal(new Set(observations.map(o => JSON.stringify([o.case, o.proof.element]))).size, 600);
const groups = [];
for (const o of observations) {
  const p = o.proof;
  let g = groups.find(g => g.family === o.family && g.element === p.element);
  if (!g) { g = { family: o.family, element: p.element, referenceAuthoredWidth: p.referenceAuthoredWidth,
    referenceComputedWidth: p.referenceComputedWidth, candidateAuthoredWidth: p.candidateAuthoredWidth, cases: [] }; groups.push(g); }
  for (const k of ['referenceAuthoredWidth', 'referenceComputedWidth', 'candidateAuthoredWidth']) assert.equal(g[k], p[k]);
  g.cases.push(o.case);
}
assert.equal(groups.length, 9);
const source = 'examples/material-showcase/src/app/astylar.component.ts', introducedBy = '2f440115740ff76fa9e55b3f4a11568207b2af5a';
const selectors = ["'.material-button'", "'#core-primary'", '`#${family}-secondary`', '`#${family}-disabled`',
  "'#menu-primary'", "'#bottom-sheet-primary'", "'#dialog-primary'", "'#snack-bar-primary'", "'#tooltip-primary'"];
function project(text) {
  const file = ts.createSourceFile(source, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS), result = [];
  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const property = name => node.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText(file) === name)?.initializer;
      const selector = property('selector'), width = property('width');
      if (selector && width && selectors.includes(selector.getText(file))) result.push({ selector: selector.getText(file), widthExpression: width.getText(file) });
    }
    ts.forEachChild(node, visit);
  }
  visit(file); assert.deepEqual(result.map(r => r.selector), selectors); return result;
}
const history = project(readFileSync(source, 'utf8'));
assert.deepEqual(history, project(execFileSync('git', ['show', `${introducedBy}:${source}`]).toString()));
const files = ['scripts/audit-material-button-fixed-widths.mjs', 'tests/material-parity/button-fixed-width-evidence.mjs',
  'tests/material-parity/button-fixed-width-evidence.spec.mjs', 'tests/material-parity/button-flex-input-evidence.mjs',
  'tests/material-parity/button-pill-radius-evidence.mjs', 'tests/material-parity/root-initial-style-evidence.mjs',
  'tests/material-parity/border-initial-input-evidence.mjs', 'examples/material-showcase/src/app/reference.component.ts', source];
const output = { schemaVersion: 1, kind: 'shared-button-fixed-width-audit', capture: { file: capture, sha256: hash(bytes) },
  sourceFingerprints: files.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
  history: { introducedBy, initialAndCurrentWidthExpressions: history,
    limitation: 'Only selector and width expressions are compared at the initial/current endpoints, not entire rules, intermediate history or author motive.' },
  captureCases: entries.length, cases: new Set(observations.map(o => o.case)).size, owners: observations.length,
  families: new Set(observations.map(o => o.family)).size, classification: 'application-plugin-authoring-defect',
  canonicalAttributionChanged: false, inputEquivalent: false, candidateUsedLayoutVerified: false,
  originalRasterCauseProven: false, structuralEquivalenceVerified: false, renderingEquivalent: false,
  groups, observations,
  limitation: 'All original button owners are audited, including core-primary whose fixed request is numerically close to the browser used width. Absence of an authored reference width is not a measured pixel request. This proves differing authoring, not exact source of the constants, candidate used width, intrinsic-sizing failure, font metrics or raster equivalence.' };
const file = 'docs/material-button-fixed-width-audit.json', text = JSON.stringify(output, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(readFileSync(file, 'utf8'), text); else writeFileSync(file, text);
console.log(JSON.stringify({ cases: output.cases, owners: output.owners, groups: groups.length,
  coreOwnersRetained: observations.filter(o => o.proof.element === 'core-primary').length, canonicalAttributionChanged: false }));
