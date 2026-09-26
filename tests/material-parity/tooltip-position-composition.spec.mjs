import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { PNG } from 'pngjs';
import { measureTextInkCenter, textCenterOffsetError } from './text-alignment-metrics.mjs';
import { collectTooltipPositionComposition, proveTooltipPositionComposition } from './tooltip-position-composition.mjs';
import { proveTooltipSizingRequests } from './overlay-surface-review.mjs';
import { queryFindings, loadFindingEvidence } from '../../scripts/audit-findings-store.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

test('tooltip pixel width is a computed observation, not an explicit owner width request', () => {
  const report = collectTooltipPositionComposition(); // authenticates all original tree receipts
  const snapshot = { generation: '77595d08eb0f857cf058eb072074a433702f11e022dac2f1bfb666375d923752',
    indexSha256: 'd84236477a9da75dc58de0e5d3d48db58c98bab5232d746cdf5d88501ced2459' };
  const rows = queryFindings('artifacts/material-parity/working-audit', 'tooltip', snapshot)
    .filter(r => r.evidence.section === 'discrepancies' && r.element === 'tooltip-popup' && r.property === 'width');
  assert.equal(rows.length, 1);
  const row = rows[0]; assert.equal(row.reference, '106.812px');
  assert.equal(Object.hasOwn(row, 'astylar'), false);
  const keys = [];
  // Include both logical axes conservatively; this is not a CSS default or
  // computed candidate reconstruction, and does not classify min/max constraints.
  const relevant = k => /^(width|inlinesize|blocksize|all)$/.test(k.replaceAll('-', '').toLowerCase());
  for (const observation of report.observations) {
    const [r, a] = ['reference', 'astylar'].map(side => JSON.parse(readFileSync(observation.inputTrees[side].file)));
    const rn = r.nodes.find(n => n.key === observation.paths.reference[0].key);
    const an = a.nodes.find(n => n.key === observation.paths.astylar[0].key);
    assert.equal(r.styles[rn.style].width, row.reference);
    assert.equal(r.styles[rn.style].writingMode, 'horizontal-tb');
    assert.deepEqual(rn.inline, {});
    for (const rule of rn.rules.map(i => r.rules[i]).filter(rule => rule.active))
      assert.deepEqual(Object.keys(rule.declarations).filter(relevant), []);
    assert.equal(an.authored.style, undefined); assert.equal(an.authored.attributes?.style, undefined);
    for (const rule of a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, an.authored)))
      assert.deepEqual(Object.keys(rule).filter(relevant), []);
    for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle'])
      assert.deepEqual(Object.keys(an[stage]).filter(relevant), []);
    keys.push(observation.case);
  }
  assert.equal(new Set(keys).size, 18); assert.equal(row.occurrences, keys.length);
  assert.deepEqual(row.cases, keys.slice(0, 12));
  assert.deepEqual(row.states, [...new Set(keys.map(key => key.split('/').at(-1)))]);
  // The width row remains unresolved until production binding and independent
  // replay; no equivalence, used size, clipping or renderer-cause claim follows.
});

test('paired tooltip rasters retain small DPR-dependent ink offsets, not the earlier large displacement', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const source = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(source), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const entries = JSON.parse(source).interactions.filter(e => e.family === 'tooltip' && e.overlayPlacement?.targetId);
  assert.equal(entries.length, 18);
  const receipts = [], residuals = [];
  for (const entry of entries) {
    assert.ok(['hover', 'held'].includes(entry.state)); // Unpaired `open` is a separate known defect.
    const ink = {};
    for (const side of ['reference', 'astylar']) {
      const file = entry.inputTrees[side].file.replace(`${side}-input-tree.json`, `${side}.png`);
      const bytes = readFileSync(file), image = PNG.sync.read(bytes), p = entry.overlayPlacement[side];
      receipts.push({ file, sha256: hash(bytes) });
      const dpr = entry.viewport.deviceScaleFactor;
      assert.equal(image.width, entry.viewport.width * dpr); assert.equal(image.height, entry.viewport.height * dpr);
      ink[side] = measureTextInkCenter(image, { left: p.x, top: p.y, right: p.x + p.width,
        bottom: p.y + p.height, width: p.width, height: p.height }, dpr);
      assert.ok(ink[side]);
    }
    const delta = textCenterOffsetError(ink.reference, ink.astylar);
    if (entry.viewport.deviceScaleFactor === 2 && ['contrast', 'custom'].includes(entry.profile)) {
      const expected = entry.profile === 'contrast' ? .5099912457409914 : .486895961290827;
      assert.ok(Math.abs(delta - expected) < 1e-6);
      residuals.push(`${entry.profile}/${entry.viewport.id}/${entry.state}`);
    } else assert.ok(delta < .03);
  }
  assert.equal(residuals.length, 4);
  assert.equal(hash(JSON.stringify(receipts)), '249d82e2152cf05fd58742674310332210862725f26a05ea8e56c165f64abc6c');
  // These are immutable diagnostic observations, not a widened acceptance
  // threshold or a claim about horizontal centering, sharpness or equal inputs.
});

// Size constraints are independent of the already-proven flow substitution.
// This checks authored requests, not whether the short captured label hits them.

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
