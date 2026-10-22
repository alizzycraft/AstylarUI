import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { PNG } from 'pngjs';
import { measureTextInkCenter, textCenterOffsetError } from './text-alignment-metrics.mjs';
import { collectTooltipPositionComposition, proveTooltipPositionComposition, proveTooltipStackingComposition } from './tooltip-position-composition.mjs';
import { proveTooltipSizingRequests } from './overlay-surface-review.mjs';
import { queryFindings, loadFindingEvidence } from '../../scripts/audit-findings-store.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { validateSupplementalCapture } from './supplemental-capture-evidence.mjs';
import { propertyGroups } from './input-equivalence-policy.mjs';

test('tooltip z-index scalar compares different stacking owners in all 18 retained cases', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const review = collectTooltipPositionComposition();
  assert.equal(review.observations.length, 18);
  for (const observation of review.observations) {
    const pair = ['reference', 'astylar'].map(side => {
      const receipt = observation.inputTrees[side], bytes = readFileSync(receipt.file);
      assert.equal(hash(bytes), receipt.sha256); return JSON.parse(bytes);
    });
    const proof = proveTooltipStackingComposition(...pair);
    assert.equal(proof.classification, 'application-plugin-authoring-defect');
    assert.equal(proof.rendererCauseProven, false);
    for (const mutate of [
      ([r]) => { r.schemaVersion = 0; },
      ([r]) => { r.nodes.find(n => String(n.attributes?.class ?? '').split(/\s+/).includes('mat-mdc-tooltip-surface')).parent = 'missing'; },
      ([r]) => { for (const rule of r.rules) if (rule.selector === '.cdk-overlay-pane' && rule.declarations?.['z-index']) rule.declarations['z-index'].value = '999'; },
      ([, a]) => { a.nodes.find(n => n.authored?.id === 'tooltip-popup').normalResolvedStyle.zIndex = 'auto'; },
      ([, a]) => { a.rules.find(rule => rule.selector === '#tooltip-popup').zIndex = '999'; },
    ]) { const changed = structuredClone(pair); mutate(changed); assert.throws(() => proveTooltipStackingComposition(...changed)); }
  }
});

test('short viewport exposes missing tooltip fallback and unequal scroll extents', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const file = 'artifacts/material-parity/tooltip-boundary-depth-c479097f-fresh/latest-report.json';
  const bytes = readFileSync(file);
  assert.equal(hash(bytes), '79573fb4c070970f11f97b1eab90b08b340680aedd8b64df662b3f44ec3fa3e7');
  const report = JSON.parse(bytes), manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  const binding = validateSupplementalCapture(report, { reportFile: file,
    expectedProvenance: manifest.provenance, script: 'scripts/audit-material-tooltip-boundary.mjs',
    styleProperties: Object.values(propertyGroups).flat() });
  assert.equal(binding.status, 'checkpoint-bound', JSON.stringify(binding.errors));
  assert.deepEqual(report.results.map(row => [row.deviceScaleFactor, row.viewport.height, row.action]),
    [1, 2].flatMap(dpr => [1000, 240].flatMap(height => ['initial', 'hover', 'wheel'].map(action => [dpr, height, action]))));
  for (const row of report.results) {
    for (const side of ['reference', 'astylar']) {
      const sample = row[side];
      assert.equal(hash(readFileSync(sample.screenshot.file)), sample.screenshot.sha256);
      if (row.action === 'wheel') assert.ok(sample.events.some(event => event.type === 'wheel' && event.trusted && event.deltaY > 0));
    }
    if (row.viewport.height === 1000 && row.action !== 'initial') assert.ok(Math.abs(row.popupTopDelta) < .01);
    if (row.viewport.height !== 240) continue;
    assert.equal(row.reference.scrollHeight, 286); assert.equal(row.astylar.scrollHeight, 240);
    if (row.action === 'hover') {
      assert.ok(row.reference.referencePopup.box.bottom < row.reference.triggerBox.y);
      assert.ok(row.astylar.candidatePopupBox.top > row.astylar.triggerBox.y + row.astylar.triggerBox.height);
      assert.ok(row.astylar.candidatePopupBox.bottom > 240);
      assert.ok(Math.abs(row.popupTopDelta - 80) < .01);
      for (const side of ['reference', 'astylar']) {
        const image = PNG.sync.read(readFileSync(row[side].screenshot.file)), dpr = row.deviceScaleFactor;
        assert.equal(image.width, 900 * dpr); assert.equal(image.height, 240 * dpr);
        let dark = 0;
        for (let y = 140 * dpr; y < image.height; y++) for (let x = 70 * dpr; x < 200 * dpr; x++) {
          const i = (y * image.width + x) * 4;
          if (image.data[i] < 80 && image.data[i + 1] < 80 && image.data[i + 2] < 80) dark++;
        }
        assert.equal(dark, side === 'astylar' ? 0 : dpr === 1 ? 2078 : 8858);
      }
    }
    if (row.action === 'wheel') {
      assert.equal(row.reference.scrollY, 46); assert.equal(row.astylar.scrollY, 0);
      assert.equal(row.reference.popupCount, 0); assert.equal(row.astylar.popupCount, 1);
    }
  }
  // Different scroll extents mean disappearance alone cannot diagnose a
  // scroll-dismissal handler. The local-flow translation lacks native fallback;
  // neither that input difference nor this raster establishes a core cause.
});

test('tooltip short-surface paint failure crosses the shared camera depth boundary', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const file = 'artifacts/material-parity/tooltip-boundary-depth-c479097f-fresh/latest-report.json';
  const bytes = readFileSync(file);
  assert.equal(hash(bytes), '79573fb4c070970f11f97b1eab90b08b340680aedd8b64df662b3f44ec3fa3e7');
  const report = JSON.parse(bytes);
  assert.equal(report.browser, '154.0.8037.58');
  const rows = report.results.filter(row => row.action === 'hover');
  assert.equal(rows.length, 4);
  for (const row of rows) {
    const sample = row.astylar;
    const depth = sample.candidatePaintDepth, camera = sample.candidateCamera;
    assert.ok(depth && camera, `${row.deviceScaleFactor}/${row.viewport.height} lacks paint receipt`);
    assert.equal(depth.enabled, true); assert.equal(depth.visible, true); assert.equal(depth.visibility, 1);
    assert.ok(Math.abs(depth.meshZ - 249.84799999999998) < 1e-9);
    const expectedCameraZ = row.viewport.height === 240 ? 207.84609690826528 : 866.0254037844387;
    assert.ok(Math.abs(camera.position.z - expectedCameraZ) < 1e-9);
    const image = PNG.sync.read(readFileSync(sample.screenshot.file));
    let dark = 0;
    for (let y = 220 * row.deviceScaleFactor; y < Math.min(260 * row.deviceScaleFactor, image.height); y++) {
      for (let x = 60 * row.deviceScaleFactor; x < 220 * row.deviceScaleFactor; x++) {
        const i = (y * image.width + x) * 4;
        if (image.data[i] < 80 && image.data[i + 1] < 80 && image.data[i + 2] < 80) dark++;
      }
    }
    if (row.viewport.height === 240) {
      assert.ok(depth.meshZ > camera.position.z);
      assert.equal(dark, 0);
    } else {
      assert.ok(depth.meshZ < camera.position.z);
      assert.ok(dark > 0);
    }
  }
  // The local popup box and open state survive in both viewports; only the
  // final camera/depth paint boundary changes. This proves a shared renderer
  // boundary with snackbar, not a candidate placement workaround.
});

test('real Tab reaches both tooltip triggers but only reference authors an open popup', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const file = 'artifacts/material-parity/tooltip-keyboard-813f658-v2/latest-report.json';
  const bytes = readFileSync(file);
  assert.equal(hash(bytes), '7bc0a3e60a7f875196b0d75ab60d63de05b1419a9c2bed1b370cfe5de4f3477a');
  const report = JSON.parse(bytes);
  const manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  const binding = validateSupplementalCapture(report, { reportFile: file,
    expectedProvenance: manifest.provenance, script: 'scripts/audit-material-tooltip-keyboard.mjs',
    styleProperties: Object.values(propertyGroups).flat() });
  assert.equal(binding.status, 'checkpoint-bound', JSON.stringify(binding.errors));
  assert.deepEqual(report.actions, ['initial', 'keyboard-focus', 'keyboard-blur']);
  assert.deepEqual(report.results.map(row => [row.deviceScaleFactor, row.action]),
    [1, 2].flatMap(dpr => report.actions.map(action => [dpr, action])));
  assert.equal(manifest.provenance.core.length, 104);
  for (const receipt of manifest.provenance.core) {
    assert.equal(hash(readFileSync(receipt.source)), receipt.sourceSha256);
    assert.equal(hash(readFileSync(`examples/material-showcase/node_modules/astylarui/dist/lib/${receipt.file}`)), receipt.sha256);
  }
  for (const row of report.results) {
    const focused = row.action === 'keyboard-focus';
    for (const side of ['reference', 'astylar']) {
      const sample = row[side], tree = JSON.parse(readFileSync(sample.inputTree.file));
      const expected = side === 'reference' && focused;
      const popups = tree.nodes.filter(node => side === 'reference'
        ? String(node.attributes?.class ?? '').split(/\s+/).includes('mat-mdc-tooltip-surface')
        : node.authored?.id === 'tooltip-popup');
      assert.equal(popups.length, Number(expected));
      assert.equal(sample.popupCount, popups.length);
      assert.equal(hash(readFileSync(sample.screenshot.file)), sample.screenshot.sha256);
      const active = side === 'reference' ? sample.activeId : sample.activeAstylarId;
      assert.equal(active === 'tooltip-primary', focused);
      if (focused) {
        assert.ok(sample.events.some(event => event.type === 'keydown' && event.key === 'Tab' && event.trusted));
        assert.ok(sample.events.some(event => event.type === 'focusin' && event.trusted &&
          (side === 'reference' ? event.id : event.astylarId) === 'tooltip-primary'));
      }
    }
    assert.equal(row.astylar.candidateOpen, false);
    assert.equal(row.presenceMatches, !focused);
  }
  // Candidate's state and authored tree both omit the popup: not evidence of
  // an existing popup rendered off-screen, clipped, or lost in projection.
});

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

test('tooltip focus matrix does not establish keyboard-origin opening', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const cases = JSON.parse(bytes).interactions.filter(row => row.family === 'tooltip' && row.state === 'focus');
  assert.equal(cases.length, 8);
  for (const row of cases) for (const side of ['reference', 'astylar']) {
    const receipt = row.inputTrees[side], treeBytes = readFileSync(receipt.file);
    assert.equal(hash(treeBytes), receipt.sha256);
    const tree = JSON.parse(treeBytes);
    const popup = tree.nodes.filter(node => side === 'reference'
      ? String(node.attributes?.class ?? '').split(/\s+/).includes('mat-mdc-tooltip-surface')
      : node.authored?.id === 'tooltip-popup');
    assert.equal(popup.length, 0, 'review changed focus capture before reusing this conclusion');
  }
  const harness = readFileSync('tests/material-parity/run-material-parity.mjs', 'utf8');
  const branch = harness.slice(harness.indexOf("if (state === 'focus')"), harness.indexOf("if (state === 'hover')"));
  assert.equal(branch.match(/target\.focus\(\)/g)?.length, 2);
  assert.doesNotMatch(branch, /keyboard\.press/);
  const reference = readFileSync('examples/material-showcase/node_modules/@angular/material/fesm2022/module-CWxMD37a.mjs', 'utf8');
  assert.match(reference, /origin === 'keyboard'[\s\S]{0,100}this\.show\(\)/);
  // Both captured owners lack a popup; that is not evidence that real Tab
  // focus opens/dismisses equivalent content. Do not change fixture behavior
  // or reinterpret programmatic focus as keyboard-origin input to close it.
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

test('tooltip short-boundary opt-in preserves the original applied-theme viewport matrix', () => {
  const source = readFileSync('scripts/audit-material-tooltip-applied-theme-ownership.mjs', 'utf8');
  const ast = ts.createSourceFile('producer.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const initializer = name => ast.statements.filter(ts.isVariableStatement)
    .flatMap(statement => [...statement.declarationList.declarations])
    .find(declaration => declaration.name.getText(ast) === name).initializer.getText(ast);
  const original = new Function(`return (${initializer('defaultViewports')});`)();
  assert.deepEqual(original, [
    { id: 'desktop-dpr1', width: 1440, height: 1000, deviceScaleFactor: 1 },
    { id: 'desktop-dpr2', width: 1440, height: 1000, deviceScaleFactor: 2 },
    { id: 'tablet-dpr1', width: 768, height: 1024, deviceScaleFactor: 1 },
    { id: 'mobile-dpr2', width: 390, height: 844, deviceScaleFactor: 2 },
  ]);
  const select = new Function('shortBoundary', 'defaultViewports', `return (${initializer('viewports')});`);
  assert.equal(select(false, original), original);
  const contexts = select(true, original);
  assert.deepEqual(contexts.map(v => [v.width, v.height, v.deviceScaleFactor]),
    [[900, 1000, 1], [900, 240, 1], [900, 1000, 2], [900, 240, 2]]);
  assert.equal(new Set(contexts.map(v => v.id)).size, 4);
  assert.deepEqual(select(false, original), original, 'opt-in must not mutate ordinary context inputs');
});

import { execFileSync } from 'node:child_process';

test('actual-theme short tooltip contexts preserve fallback versus flow input inequality', () => {
  const file = 'artifacts/material-parity/tooltip-actual-theme-short-boundary-20261022/latest-report.json';
  const bytes = readFileSync(file), hash = value => createHash('sha256').update(value).digest('hex');
  assert.equal(hash(bytes), '5ec72acad66a4c3be382df77ae3d8fb32af3141da2ddcc03748ed645d05d6c83');
  const report = JSON.parse(bytes);
  const verified = JSON.parse(execFileSync(process.execPath,
    ['scripts/audit-material-tooltip-applied-theme-ownership.mjs', '--verify', file, '--short-boundary'], { encoding: 'utf8' }));
  assert.deepEqual(verified, { contexts: 12, pairedCycles: 36, currentRenderingAccepted: false });
  const contexts = [['tall-dpr1', 1000, 1], ['short-dpr1', 240, 1], ['tall-dpr2', 1000, 2], ['short-dpr2', 240, 2]];
  const expected = ['dark', 'contrast', 'custom'].flatMap(profile => contexts.map(([id]) => `${profile}/${id}`));
  const analyze = rows => {
    assert.deepEqual(rows.map(row => `${row.profile}/${row.viewport.id}`), expected);
    let above = 0, below = 0, candidateOutside = 0, candidateInside = 0;
    const near = (value, expected) => assert.ok(Math.abs(value - expected) < 1e-6,
      'CSS anchor relationship changed; this is not a raster tolerance');
    for (const row of rows) {
      const [, height, dpr] = contexts.find(([id]) => id === row.viewport.id);
      assert.deepEqual([row.viewport.width, row.viewport.height, row.viewport.deviceScaleFactor], [900, height, dpr]);
      for (const side of ['reference', 'astylar']) {
        assert.deepEqual(row[side].runtime.errors, []);
        assert.equal(row[side].benchmarkMode, false);
        assert.deepEqual(row[side].openBoundary.viewport, { width: 900, height });
      }
      const native = row.reference.openBoundary, candidate = row.astylar.openBoundary;
      near(candidate.popup.top - candidate.trigger.bottom, 8);
      if (height === 240) {
        near(native.trigger.top - native.popup.bottom, 8);
        assert.ok(native.popup.bottom < native.trigger.top); above++;
        if (candidate.popup.bottom > height) candidateOutside++; else candidateInside++;
      } else {
        near(native.popup.top - native.trigger.bottom, 8); below++;
      }
    }
    return { nativeAboveShort: above, nativeBelowTall: below, candidateOutsideShort: candidateOutside,
      candidateInsideShort: candidateInside, candidateLayoutBelow: rows.length };
  };
  const result = analyze(report.results);
  assert.deepEqual(result, { nativeAboveShort: 6, nativeBelowTall: 6,
    candidateOutsideShort: 4, candidateInsideShort: 2, candidateLayoutBelow: 12 });
  for (const row of report.results) {
    const trees = ['reference', 'astylar'].map(side => {
      const open = row[side].openBoundary;
      assert.equal(hash(readFileSync(open.inputTree.file)), open.inputTree.sha256);
      assert.equal(hash(readFileSync(open.screenshot.file)), open.screenshot.sha256);
      const image = PNG.sync.read(readFileSync(open.screenshot.file));
      assert.deepEqual([image.width, image.height],
        [row.viewport.width * row.viewport.deviceScaleFactor, row.viewport.height * row.viewport.deviceScaleFactor]);
      return JSON.parse(readFileSync(open.inputTree.file));
    });
    const proof = proveTooltipStackingComposition(...trees);
    assert.equal(proof.classification, 'application-plugin-authoring-defect');
    assert.equal(proof.inputEquivalent, false); assert.equal(proof.rendererCauseProven, false);
    const expectedClass = row.viewport.height === 240 ? 'mat-mdc-tooltip-panel-above' : 'mat-mdc-tooltip-panel-below';
    assert.equal(trees[0].nodes.filter(node => node.attributes?.class?.split(/\s+/).includes(expectedClass)).length, 1);
  }
  let rejected = 0;
  for (let i = 0; i < report.results.length; i++) for (const mutate of [
    row => { row.reference.openBoundary.trigger.top += 1; row.reference.openBoundary.trigger.bottom += 1; },
    row => { row.astylar.openBoundary.popup.top += 1; },
    row => { row.astylar.runtime.errors.push('invented runtime failure'); },
    row => { row.viewport.width += 1; },
  ]) {
    const rows = structuredClone(report.results); mutate(rows[i]); assert.throws(() => analyze(rows)); rejected++;
  }
  for (const mutate of [rows => rows.pop(), rows => { rows[1] = structuredClone(rows[0]); }, rows => { rows[0].profile = 'light'; }]) {
    const rows = structuredClone(report.results); mutate(rows); assert.throws(() => analyze(rows)); rejected++;
  }
  assert.equal(rejected, 51);
  console.log(JSON.stringify({ proof: 'actual-theme-tooltip-short-fallback-inputs', evidence: { file, sha256: hash(bytes) },
    ...result, negativeControlsRejected: rejected, existingFinding: 'fixture-tooltip-replaces-connected-overlay-with-flow',
    boundary: 'Frozen application with verified actual themes and viewport geometry. Native capture is mid-animation;do not compare settled height/sharpness or infer current-renderer paint causality. Candidate layout boxes do not prove visible popup paint. Not complete scroll/lifetime,canonical case closure or rendering acceptance.',
    canonicalPublication: false, currentRenderingAccepted: false }));
});

test('actual-theme tooltip capture conserves depth-proof assets but does not retain new depth observations', () => {
  const hash = value => createHash('sha256').update(value).digest('hex');
  const load = (file, expected) => {
    const bytes = readFileSync(file); assert.equal(hash(bytes), expected); return JSON.parse(bytes);
  };
  const previous = load('artifacts/material-parity/tooltip-boundary-depth-c479097f-fresh/latest-report.json',
    '79573fb4c070970f11f97b1eab90b08b340680aedd8b64df662b3f44ec3fa3e7');
  const current = load('artifacts/material-parity/tooltip-actual-theme-short-boundary-20261022/latest-report.json',
    '5ec72acad66a4c3be382df77ae3d8fb32af3141da2ddcc03748ed645d05d6c83');
  const manifest = report => load(report.capture.checkpointManifest.file, report.capture.checkpointManifest.sha256);
  const before = manifest(previous), after = manifest(current);
  assert.equal(before.provenance.browserFiles.length, 1887);
  assert.deepEqual(after.provenance.browserFiles, before.provenance.browserFiles);
  assert.equal(previous.browser, '154.0.8037.58');
  assert.equal(current.browser, '155.0.8059.85');
  const oldDepthSamples = previous.results.filter(row => row.action === 'hover');
  assert.equal(oldDepthSamples.length, 4);
  for (const row of oldDepthSamples) assert.ok(row.astylar.candidatePaintDepth && row.astylar.candidateCamera);
  // This checks the scope of a fixed historical report, not a desired omission
  // in future producers. Equal source bytes do not manufacture runtime fields.
  for (const row of current.results) {
    assert.equal(Object.hasOwn(row.astylar.openBoundary, 'paintDepth'), false);
    assert.equal(Object.hasOwn(row.astylar.openBoundary, 'camera'), false);
  }
  const forged = structuredClone(after.provenance.browserFiles); forged[0].sha256 = '0'.repeat(64);
  assert.throws(() => assert.deepEqual(forged, before.provenance.browserFiles));
  assert.throws(() => assert.deepEqual(after.provenance.browserFiles.slice(1), before.provenance.browserFiles));
  console.log(JSON.stringify({ proof: 'tooltip-depth-build-applicability-only', identicalServedAssets: 1887,
    previousBrowser: previous.browser, currentBrowser: current.browser, browserIdentityChanged: true,
    freshDepthObservationPresent: false, freshCameraCauseProven: false,
    boundary: 'Changed served application bytes are excluded. Browser and theme/state applicability remain separate;prior camera observations are not observations of the new capture.',
    canonicalPublication: false, currentRenderingAccepted: false }));
});
