import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { collectTooltipPositionComposition, proveTooltipPositionComposition } from './tooltip-position-composition.mjs';
import { inspectOverlayOwnerDeclarations } from './overlay-owner-declaration-review.mjs';
import { queryFindings, loadFindingEvidence } from '../../scripts/audit-findings-store.mjs';

// Size constraints are independent of the already-proven flow substitution.
// This checks authored requests, not whether the short captured label hits them.
function proveTooltipSizingRequests(observation, reference, candidate) {
  const identity = { inputEquivalent: false, status: 'mapped',
    referenceNode: observation.paths.reference[0].key,
    candidateNode: observation.paths.astylar[0].key,
    referencePath: observation.paths.reference.map(n => n.key),
    candidatePath: observation.paths.astylar.map(n => n.key),
    missingRules: [], extraRules: [] };
  const expected = { minWidth: '40px', maxWidth: '200px', minHeight: '24px', maxHeight: '40vh' };
  for (const [property, value] of Object.entries(expected)) {
    const trace = inspectOverlayOwnerDeclarations(property, identity, reference, candidate);
    const css = property.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
    const native = trace.referencePath[0], owner = trace.candidatePath[0];
    assert.equal(owner.authored.id, 'tooltip-popup');
    assert.ok(native.attributes.class.split(/\s+/).includes('mat-mdc-tooltip-surface'));
    assert.deepEqual(native.inline, {});
    const active = native.rules.filter(rule => rule.active && Object.hasOwn(rule.declarations, css));
    assert.equal(active.length, 1);
    assert.equal(active[0].selector, '.mat-mdc-tooltip-surface');
    assert.equal(active[0].declarations[css].value, value);
    if (property !== 'maxHeight') assert.equal(native.computed, value);
    else assert.ok(['400px', '337.6px'].includes(native.computed));
    assert.deepEqual(Object.values(owner.localValues), ['<omitted>', '<omitted>', '<omitted>']);
    assert.deepEqual(owner.inline, {});
    const relevant = key => [property.toLowerCase(), 'all'].includes(key.replaceAll('-', '').toLowerCase());
    assert.ok(owner.possibleRules.every(rule => !Object.keys(rule.declarations).some(relevant)));
    assert.doesNotMatch(owner.authored.attributes?.style ?? '', /(?:min|max)-(?:width|height)|\ball\s*:/i);
  }
  return Object.keys(expected);
}

test('all 18 tooltip owners omit the four active reference sizing constraints', async () => {
  const report = collectTooltipPositionComposition(); // authenticates each original paired tree
  let observations = 0;
  const expected = new Map();
  for (const observation of report.observations) {
    const trees = ['reference', 'astylar'].map(side => JSON.parse(readFileSync(observation.inputTrees[side].file)));
    const properties = proveTooltipSizingRequests(observation, ...trees);
    observations += properties.length;
    const node = trees[0].nodes.find(n => n.key === observation.paths.reference[0].key);
    for (const property of properties) {
      const signature = JSON.stringify([property, trees[0].styles[node.style][property]]);
      if (!expected.has(signature)) expected.set(signature, []);
      expected.get(signature).push(observation.case);
    }
  }
  assert.equal(observations, 72);
  const directory = 'artifacts/material-parity/working-audit';
  assert.equal(JSON.parse(readFileSync(`${directory}/current.json`)).generation,
    JSON.parse(readFileSync('docs/material-input-equivalence-audit.json')).compressedSha256);
  const rows = queryFindings(directory, 'tooltip').filter(row => row.element === 'tooltip-popup' &&
    ['minWidth', 'maxWidth', 'minHeight', 'maxHeight'].includes(row.property));
  assert.equal(rows.length, 5);
  const seen = new Set();
  for (const compact of rows) {
    const row = await loadFindingEvidence(directory, 'tooltip', compact.id);
    const signature = JSON.stringify([row.property, row.reference]), cases = expected.get(signature);
    assert.ok(cases); assert.ok(!seen.has(signature)); seen.add(signature);
    assert.equal(Object.hasOwn(row, 'astylar'), false, 'preserve omitted candidate value');
    assert.equal(row.occurrences, cases.length);
    assert.deepEqual(row.cases, cases.slice(0, 12));
    assert.deepEqual(row.states, [...new Set(cases.map(key => key.split('/').at(-1)))]);
  }
  assert.equal(seen.size, expected.size);
});

test('tooltip sizing proof rejects changed reference rules and candidate constraint requests', () => {
  const observation = collectTooltipPositionComposition().observations[0];
  const original = ['reference', 'astylar'].map(side => JSON.parse(readFileSync(observation.inputTrees[side].file)));
  for (const property of ['minWidth', 'maxWidth', 'minHeight', 'maxHeight']) {
    const css = property.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
    const candidateOwner = a => a.nodes.find(n => n.authored?.id === 'tooltip-popup');
    const referenceRule = r => r.rules.find(rule => rule.active && rule.selector === '.mat-mdc-tooltip-surface' && rule.declarations[css]);
    for (const mutate of [
      ([r]) => { referenceRule(r).declarations[css].value = '999px'; },
      ([r]) => { referenceRule(r).active = false; },
      ([, a]) => { candidateOwner(a).authored.style = { [property]: '40px' }; },
      ([, a]) => { a.rules.push({ selector: '#tooltip-popup', [property]: '40px' }); },
      ...['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'].map(stage =>
        ([, a]) => { candidateOwner(a)[stage][property] = '40px'; }),
    ]) {
      const changed = structuredClone(original); mutate(changed);
      assert.throws(() => proveTooltipSizingRequests(observation, ...changed));
    }
  }
});

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
