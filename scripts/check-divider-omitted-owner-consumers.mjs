import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { NullEngine, Scene, MeshBuilder } from '@babylonjs/core';

// Bounded source-executed controls, not a replacement rendering harness.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const previousFile = 'artifacts/material-parity/divider-outside-owner-position-visibility-boundary-20261102.log';
const previousBytes = fs.readFileSync(previousFile);
assert.equal(hash(previousBytes), '8036235d47e196f7e0ee6cdd1dca0c8496c36ea0e0e1bdc41a838745e42f838b');
const previous = JSON.parse((previousBytes[0] === 255 && previousBytes[1] === 254
  ? previousBytes.toString('utf16le') : previousBytes.toString()).replace(/^\ufeff/, ''));
assert.equal(previous.ownerPairs, 120);
for (const receipt of previous.treeReceipts)
  assert.equal(hash(fs.readFileSync(receipt.file)), receipt.sha256);

const mapFile = 'artifacts/material-parity/retained-evidence/component-map-recovery-20261011/chunk-3JXWRYJY.js.map';
const mapBytes = fs.readFileSync(mapFile);
assert.equal(hash(mapBytes), 'dba484044ca0dea965d8ef4b12635673f0f055d7711099d2f6476ca490988ec4');
const map = JSON.parse(mapBytes);
const receipts = [];
function sources(relative) {
  const module = `node_modules/astylarui/dist/lib/${relative.replace(/\.ts$/, '.js')}`;
  const index = map.sources.indexOf(module);
  assert.ok(index >= 0, module);
  const file = `src/${relative}`, current = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const captured = map.sourcesContent[index];
  receipts.push({ captured: { module, sha256: hash(captured) }, current: { file, sha256: hash(current) } });
  return [captured, current];
}
function unique(source, predicate) {
  const ast = ts.createSourceFile('consumer.ts', source, 99, true);
  assert.deepEqual(ast.parseDiagnostics, []);
  const matches = [];
  const visit = node => { if (predicate(node, ast)) matches.push(node); ts.forEachChild(node, visit); };
  visit(ast); assert.equal(matches.length, 1);
  return matches[0].getText(ast);
}
function method(source, name) {
  const text = unique(source, n => ts.isMethodDeclaration(n) && n.name?.getText() === name);
  const compiled = ts.transpileModule(`class Probe { ${text} }`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, removeComments: true },
  }).outputText;
  return new (new Function('MeshBuilder', `${compiled}; return Probe;`)(MeshBuilder))();
}
function expression(source, name) {
  const declaration = unique(source, n => ts.isVariableDeclaration(n) && n.name.getText() === name);
  return new Function('style', 'resolvedStyle', `return (${declaration.slice(declaration.indexOf('=') + 1)});`);
}
let positionControls = 0;
const parent = {}, viewport = {}, dom = { context: { elements: new Map([['root-body', viewport]]) } };
for (const source of sources('app/services/dom/elements/element-dimension.service.ts')) {
  const probe = method(source, 'resolveLayoutParent'), positioned = expression(source, 'usesPositionedContainingBlock');
  for (const position of [undefined, 'static', 'relative', 'absolute', 'fixed']) {
    const style = position === undefined ? {} : { position };
    assert.equal(probe.resolveLayoutParent(dom, style, parent), position === 'fixed' ? viewport : parent);
    assert.equal(positioned(style), position === 'absolute' || position === 'fixed');
    positionControls += 2;
  }
  assert.equal(probe.resolveLayoutParent({ context: { elements: new Map() } }, { position: 'fixed' }, parent), parent);
  positionControls++;
}
for (const source of sources('app/services/dom/elements/element-creation.service.ts')) {
  const removed = expression(source, 'isRemovedFromFlow');
  for (const position of [undefined, 'static', 'relative', 'absolute', 'fixed']) {
    assert.equal(removed(undefined, { position }), position === 'absolute' || position === 'fixed'); positionControls++;
  }
}
for (const source of sources('app/services/dom/elements/flex.service.ts')) {
  const probe = method(source, 'classifyFlexChild');
  for (const position of [undefined, 'static', 'relative', 'absolute', 'fixed']) {
    assert.equal(probe.classifyFlexChild({ position }), ['absolute', 'fixed'].includes(position) ? 'positioned' : 'flow');
    assert.equal(probe.classifyFlexChild({ position, display: 'none' }), 'hidden'); positionControls += 2;
  }
}
for (const source of sources('app/services/dom/positioning/stacking-context.manager.ts')) {
  const probe = method(source, 'establishesStackingContext');
  for (const position of [undefined, 'static', 'relative', 'absolute', 'fixed']) {
    assert.equal(probe.establishesStackingContext({ position, zIndex: '7' }), position !== undefined && position !== 'static');
    assert.equal(probe.establishesStackingContext({ position, zIndex: 'auto' }), false); positionControls += 2;
  }
}

// Actual core mesh construction on the installed matching Babylon version.
// This tests initial visibility flags, not CSS visibility support or raster paint.
const engine = new NullEngine(), scene = new Scene(engine);
let meshControls = 0;
try {
  for (const source of sources('app/services/babylon-mesh.service.ts')) {
    const probe = method(source, 'createPlane'); probe.scene = scene;
    const mesh = probe.createPlane('omitted-owner-visibility', 40, 20);
    assert.equal(mesh.isVisible, true); assert.equal(mesh.visibility, 1); assert.equal(mesh.isEnabled(), true);
    mesh.isVisible = false; assert.equal(mesh.isVisible, false);
    mesh.isVisible = true; mesh.visibility = 0; assert.equal(mesh.visibility, 0);
    meshControls += 5; mesh.dispose();
  }
} finally { scene.dispose(); engine.dispose(); }
console.log(JSON.stringify({ producer: { file: 'scripts/check-divider-omitted-owner-consumers.mjs',
  sha256: hash(fs.readFileSync('scripts/check-divider-omitted-owner-consumers.mjs')) },
  previous: { file: previousFile, sha256: hash(previousBytes) },
  sourceMap: { file: mapFile, sha256: hash(mapBytes) }, sources: receipts,
  positionControls, meshControls,
  conclusion: 'Omitted and explicit static share the inspected captured/current layout-parent, containing-block, block/flex-flow and stacking branches. Captured/current plane construction starts with visible flags; absence in declaration snapshots is not a hidden flag.',
  boundary: 'Source-executed routing and NullEngine initial flags only. Not complete used geometry, CSS visibility inheritance/support, every visual owner, compositing/clipping, browser raster, current runtime or whole-case closure.',
  inspectionPromoted: false, currentRenderingAccepted: false }, null, 2));
