import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { validateSupplementalCapture } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Keep the capture producer frozen, including its failed DOM capitalization
// assertion. Correct that one verifier assumption in memory, not captured data.
const file = 'artifacts/material-parity/icon-heading-ax-20261017/latest-report.json';
const driver = 'scripts/audit-material-icon-heading-ax.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const source = readFileSync(driver);
assert.equal(hash(source), '6a1a85b1312f58fe8e0bfd57c3338da00afa8331c1f6d8d809d2df495d823e19');
const marker = "if (process.argv[2] === '--verify')";
assert.equal(source.toString().split(marker).length, 2);
let verifier = source.toString().split(marker)[0];
const before = "id === 'title' ? 'Icon' : 'Angular Material 20 reference'";
assert.equal(verifier.split(before).length, 2);
verifier = verifier.replace(before, "id === 'title' ? 'icon' : 'Angular Material 20 reference'");
const ast = ts.createSourceFile(driver, verifier, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
const imports = ast.statements.filter(ts.isImportDeclaration);
assert.equal(imports.length, 11);
for (const node of imports.reverse()) verifier = verifier.slice(0, node.getFullStart()) + verifier.slice(node.end);
const run = new Function('assert', 'createHash', 'readFileSync', 'ts', 'propertyGroups', 'validateSupplementalCapture', 'raw', 'file',
  verifier + '\nreturn verify(raw,file);');
const raw = JSON.parse(readFileSync(file));
const check = report => run(assert, createHash, readFileSync, ts, propertyGroups, validateSupplementalCapture, report, file);
const summary = check(raw);
let rejected = 0;
for (const mutate of [r => r.results.pop(), r => { r.results[0].reference.ax.title.backendNodeId++; },
  r => { r.results[0].astylar.benchmarkMode = false; }, r => { r.results[0].reference.appliedTheme = {}; }]) {
  const forged = structuredClone(raw); mutate(forged); assert.throws(() => check(forged)); rejected++;
}
const signature = target => ({ ignored: target.nodes[0].ignored, role: target.nodes[0].role?.value,
  name: target.nodes[0].name?.value, level: target.nodes[0].properties?.find(p => p.name === 'level')?.value.value,
  childText: target.nodes.filter(n => n.role?.value === 'StaticText').map(n => n.name?.value) });
const observations = raw.results.map(row => ({ profile: row.profile, viewport: row.viewport.id,
  reference: Object.fromEntries(['title', 'eyebrow'].map(id => [id, signature(row.reference.ax[id])])),
  astylar: Object.fromEntries(['title', 'eyebrow'].map(id => [id, signature(row.astylar.ax[id])])) }));
let equalTransformInputs = 0;
for (const row of raw.results) for (const side of ['reference', 'astylar']) {
  const tree = JSON.parse(readFileSync(row[side].inputTree.file));
  for (const id of ['title', 'eyebrow']) {
    const node = tree.nodes.find(n => side === 'reference' ? n.type === (id === 'title' ? 'h1' : 'p') : n.authored?.id === id);
    assert.ok(node);
    const style = side === 'reference' ? tree.styles[node.style] : node.normalResolvedStyle;
    assert.equal(style.textTransform, id === 'title' ? 'capitalize' : 'uppercase'); equalTransformInputs++;
  }
}
for (const row of observations) {
  assert.deepEqual(row.reference.title, { ignored: false, role: 'heading', name: 'Icon', level: 1, childText: ['Icon'] });
  assert.deepEqual(row.astylar.title, { ignored: false, role: 'heading', name: 'icon', level: 1, childText: ['icon'] });
  assert.deepEqual(row.reference.eyebrow.childText, ['ANGULAR MATERIAL 20 REFERENCE']);
  assert.deepEqual(row.astylar.eyebrow.childText, ['Angular Material 20 reference']);
}
console.log(JSON.stringify({ reportSha256: hash(readFileSync(file)), ...summary, negativeControlsRejected: rejected,
  equalTransformInputs, observations }));
