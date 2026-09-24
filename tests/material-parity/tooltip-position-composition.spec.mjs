import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { collectTooltipPositionComposition, proveTooltipPositionComposition } from './tooltip-position-composition.mjs';

test('all 18 tooltip cases demonstrate overlay-to-local-flow input substitution', () => {
  const report = collectTooltipPositionComposition();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-tooltip-position-composition.json')));
  assert.equal(report.observations.length, 18);
  assert.equal(new Set(report.observations.map(o => o.case)).size, 18);
  for (const observation of report.observations) {
    assert.equal(observation.proof.classification, 'application-plugin-authoring-defect');
    assert.equal(observation.proof.rendererCauseProven, false);
    assert.equal(observation.proof.inputEquivalent, false);
  }
});

test('tooltip proof rejects changed containing blocks, layout, mapping and omitted-value claims', () => {
  const original = collectTooltipPositionComposition().observations[0];
  for (const mutate of [
    o => { o.paths.reference[3].styles.position.value = 'relative'; },
    o => { o.paths.reference[5].styles.position.value = 'absolute'; },
    o => { o.paths.astylar[0].styles.position.value = 'absolute'; },
    o => { o.paths.astylar[1].styles.position = { present: true, value: 'static' }; },
    o => { o.paths.astylar[1].styles.flexDirection.value = 'row'; },
    o => { o.paths.astylar[0].parent = o.paths.astylar[2].key; },
    o => { o.paths.astylar[0].styles.transform = { present: true, value: 'none' }; },
    o => { o.paths.reference[3].attributes.class = 'unrelated'; },
    o => { o.paths.astylar[1].authored.id = 'unrelated'; },
    o => { o.paths.reference.pop(); },
  ]) {
    const changed = structuredClone(original); mutate(changed);
    assert.throws(() => proveTooltipPositionComposition(changed));
  }
});

test('connected placement is a reference behavior and only a private select primitive in current core', () => {
  const read = file => readFileSync(file, 'utf8');
  const parse = file => ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true);
  const members = (file, name) => {
    const declaration = parse(file).statements.find(node => ts.isInterfaceDeclaration(node) && node.name.text === name);
    assert.ok(declaration, name);
    return declaration.members.map(member => member.name.getText()).sort();
  };
  const expectedRender = ['coordinates', 'dimensions', 'element', 'meshId', 'parent', 'properties',
    'report', 'requestInvalidation', 'resources', 'scene', 'style'].sort();
  const expectedSurface = ['capabilities', 'createResourceOwner', 'report', 'requestInvalidation', 'resources', 'surfaceId'].sort();
  for (const file of ['src/lib/astylar-plugin.ts',
    'examples/material-showcase/node_modules/astylarui/dist/lib/lib/astylar-plugin.d.ts']) {
    assert.deepEqual(members(file, 'AstylarPluginRenderContext'), expectedRender);
    assert.deepEqual(members(file, 'AstylarPluginSurfaceContext'), expectedSurface);
  }
  const selectFile = 'src/app/services/dom/input/select.manager.ts';
  const select = parse(selectFile).statements.find(node => ts.isClassDeclaration(node) && node.name.text === 'SelectManager');
  for (const name of ['positionDropdown', 'shouldPlacePopupAbove', 'choosePopupDirection']) {
    const method = select.members.find(member => member.name?.getText() === name);
    assert.ok(method?.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.PrivateKeyword), name);
  }
  assert.match(read(selectFile), /resolveAnchorViewportRect\(\)/);
  assert.match(read(selectFile), /spaceBelow < requiredSpace && spaceAbove > spaceBelow/);
  assert.doesNotMatch(read('src/lib/index.ts'), /SelectManager/);
  const referenceFile = 'examples/material-showcase/node_modules/@angular/material/fesm2022/module-CWxMD37a.mjs';
  const reference = read(referenceFile);
  assert.equal(JSON.parse(read('examples/material-showcase/node_modules/@angular/material/package.json')).version, '20.0.5');
  for (const fragment of ['createFlexibleConnectedPositionStrategy(', '.withFlexibleDimensions(false)',
    '.withViewportMargin(this._viewportMargin)', '.withScrollableContainers(scrollableAncestors)',
    'this._addOffset({ ...origin.main, ...overlay.main })',
    'this._addOffset({ ...origin.fallback, ...overlay.fallback })',
    'change.scrollableViewProperties.isOverlayClipped']) assert.ok(reference.includes(fragment), fragment);
  console.log(JSON.stringify({ kind: 'source-contract-inspection', referenceFile,
    referenceSha256: createHash('sha256').update(readFileSync(referenceFile)).digest('hex'),
    publicConnectedPlacementProven: false, privateSelectPrimitive: true,
    liveTooltipEdgeFallbackProven: false }));
});
