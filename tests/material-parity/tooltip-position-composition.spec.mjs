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

test('popup depth queued reader authenticates full case proposal without promoting inspection', async () => {
  const { createPopupDepthReviewReader, popupDepthInputsReview } = await import('./popup-depth-case-review-source.mjs');
  const { loadCaseObligationReview } = await import('../../scripts/audit-findings-store.mjs');
  assert.throws(() => createPopupDepthReviewReader({ root: process.cwd(), read: readFileSync, reviewSha256: '0'.repeat(64) }));
  const pointer = readFileSync('artifacts/material-parity/working-audit/current.json');
  const file = `artifacts/material-parity/working-audit/proposals/${popupDepthInputsReview}.json`;
  const envelope = JSON.parse(readFileSync(file));
  const adapter = createPopupDepthReviewReader({ root: process.cwd(), read: readFileSync, reviewSha256: popupDepthInputsReview });
  assert.equal(adapter.sourceApplicability.completePredecessorRecovered, true);
  const result = loadCaseObligationReview(file, popupDepthInputsReview, envelope.review.groups.map(g => g.case), { read: adapter.read });
  assert.equal(result.cases.length, 2311); assert.equal(result.evidenceFingerprints.length, 16186);
  assert.equal(result.inspectionComplete, false); assert.equal(result.currentRenderingAccepted, false);
  assert.deepEqual(result.unjoinedCases, []);
  assert.deepEqual(readFileSync('artifacts/material-parity/working-audit/current.json'), pointer);
  const wrong = (file, encoding) => {
    const bytes = readFileSync(file, encoding);
    return String(file).endsWith('audit-material-tooltip-applied-theme-ownership.mjs')
      ? (encoding ? bytes + '\n// drift' : Buffer.concat([bytes, Buffer.from('\n// drift')])) : bytes;
  };
  assert.throws(() => createPopupDepthReviewReader({ root: process.cwd(), read: wrong, reviewSha256: popupDepthInputsReview }));
  console.log(JSON.stringify({ proof: 'popup-depth-queued-reader', cases: 2311, dependencies: 16186,
    completePredecessorRecovered: true, selectedForExport: false, canonicalPublication: false, currentRenderingAccepted: false }));
});

test('retained tooltip and snackbar endpoints distinguish high-z root inputs from absent popups', () => {
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  const id = '821919099916339a177403d8c6cc66ede9aeaa20501a23ace9c568df75160f11';
  const file = `artifacts/material-parity/working-audit/proposals/${id}.json`;
  const review = JSON.parse(readFileSync(file)).review;
  assert.equal(sha(JSON.stringify(review)), id);
  const selected = review.groups.filter(g => ['tooltip', 'snack-bar'].includes(g.family));
  assert.equal(selected.length, 133);
  const inspect = (tree, targetId) => {
    assert.equal(tree.schemaVersion, 1); assert.deepEqual(tree.errors, []);
    const index = new Map(tree.nodes.map(n => [n.key, n]));
    assert.equal(index.size, tree.nodes.length);
    const matches = tree.nodes.filter(n => n.authored?.id === targetId);
    assert.ok(matches.length <= 1);
    if (!matches.length) return { popup: 'absent', highZWithNoRecordedStackingAncestor: false };
    const target = matches[0], chain = [], seen = new Set(); let node = target;
    while (node) {
      assert.ok(!seen.has(node.key)); seen.add(node.key);
      if (node.key === 'root') {
        assert.equal(node.parent, null); assert.deepEqual(node.authored, {});
        assert.equal(node.normalResolvedStyle, undefined); assert.equal(node.resolvedStyle, undefined);
        chain.push({ key: node.key, parent: null, snapshotBoundary: true }); break;
      }
      assert.ok(node.normalResolvedStyle); assert.ok(node.resolvedStyle);
      chain.push({ key: node.key, parent: node.parent, id: node.authored?.id ?? null,
        position: node.normalResolvedStyle.position ?? '<omitted>', zIndex: node.normalResolvedStyle.zIndex ?? '<omitted>',
        transform: node.normalResolvedStyle.transform ?? '<omitted>', opacity: node.normalResolvedStyle.opacity ?? '<omitted>' });
      if (node.parent === null) break;
      assert.ok(index.has(node.parent), 'Missing ancestor'); node = index.get(node.parent);
    }
    assert.equal(chain.at(-1).parent, null);
    assert.equal(target.normalResolvedStyle.zIndex, '1000');
    assert.equal(target.resolvedStyle.zIndex, '1000');
    assert.equal(target.normalResolvedStyle.position, targetId === 'tooltip-popup' ? 'relative' : 'fixed');
    for (const ancestor of chain.slice(1).filter(n => !n.snapshotBoundary)) {
      assert.ok(ancestor.transform === '<omitted>' || ancestor.transform === 'none');
      assert.ok(ancestor.opacity === '<omitted>' || Number.parseFloat(ancestor.opacity) >= 1);
      assert.ok(ancestor.position === '<omitted>' || ancestor.position === 'static' || ['<omitted>', 'auto'].includes(ancestor.zIndex));
    }
    return { popup: 'present', highZWithNoRecordedStackingAncestor: true, syntheticRootStyleUnobserved: true, chain };
  };
  const counts = {}, observations = [];
  for (const group of selected) {
    assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
    const receipt = group.evidence.pairedTrees.astylar, bytes = readFileSync(receipt.file);
    assert.equal(sha(bytes), receipt.sha256);
    const tree = JSON.parse(bytes), targetId = group.family === 'tooltip' ? 'tooltip-popup' : 'snack-bar-overlay';
    const result = inspect(tree, targetId), key = `${group.family}:${result.popup}`;
    counts[key] = (counts[key] ?? 0) + 1;
    observations.push({ case: group.case, family: group.family, targetId, result, inputTree: receipt });
    if (result.popup === 'present') {
      for (const mutate of [
        t => { t.nodes.find(n => n.authored?.id === targetId).normalResolvedStyle.zIndex = 'auto'; },
        t => { t.nodes.find(n => n.authored?.id === targetId).resolvedStyle.zIndex = 'auto'; },
        t => { t.nodes.find(n => n.authored?.id === targetId).parent = 'missing'; },
        t => { const n = t.nodes.find(n => n.authored?.id === targetId); t.nodes.push(structuredClone(n)); },
        t => { const n = t.nodes.find(n => n.authored?.id === targetId); t.nodes.find(a => a.key === n.parent).normalResolvedStyle.transform = 'translateX(0px)'; },
      ]) { const changed = structuredClone(tree); mutate(changed); assert.throws(() => inspect(changed, targetId)); }
    }
  }
  assert.deepEqual(counts, { 'tooltip:absent': 36, 'snack-bar:absent': 37, 'snack-bar:present': 34, 'tooltip:present': 26 });
  console.log(JSON.stringify({ proof: 'retained-popup-root-depth-input-applicability', predecessorReview: id,
    counts, observations, negativeControlsRejected: 300,
    boundary: 'Captured normal/effective z-index and normal ancestor requests only.60 present endpoints have high-z1000 with no recorded stacking ancestor;73 endpoints lack the popup. Synthetic root has no style observation,so actual root-context participation is NOT established. Not final world depth,camera,visible paint,first-bad history,current capture or full case acceptance.',
    canonicalPublication: false, currentRenderingAccepted: false }));
});

test('root depth registration preserves all191 predecessor findings and binds current failure receipts', async () => {
  const { execFileSync } = await import('node:child_process');
  const { sourceAuditDefinitions } = await import('./input-equivalence-policy.mjs');
  const file = 'tests/material-parity/input-equivalence-policy.mjs';
  const previous = execFileSync('git', ['show', `c60c7206:${file}`], { maxBuffer: 4000000 }).toString().replaceAll('\r\n', '\n');
  const prior = new Function(previous.replace(/^export const /gm, 'const ') + ';return sourceAuditDefinitions;')();
  assert.equal(prior.length, 191); assert.equal(sourceAuditDefinitions.length, 192);
  assert.deepEqual(sourceAuditDefinitions.slice(0, -1), prior);
  const source = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const ast = ts.createSourceFile(file, source, 99, true);
  const entries = ast.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations])
    .find(n => n.name.getText(ast) === 'sourceAuditDefinitions').initializer.arguments[0].elements;
  assert.equal(source.slice(0, entries.at(-1).getFullStart()) + source.slice(entries.at(-1).end + 1), previous);
  const finding = sourceAuditDefinitions.at(-1);
  assert.equal(finding.id, 'core-root-paint-depth-crosses-viewport-camera');
  assert.equal(finding.classification, 'confirmed-core-renderer-defect');
  assert.ok(new RegExp(finding.pattern).test(readFileSync(finding.file, 'utf8')));
  for (const r of finding.evidence) assert.equal(createHash('sha256').update(readFileSync(r.file)).digest('hex'), r.sha256);
  assert.equal(finding.publicReproduction.equalAuthoredInputs, true);
  assert.equal(finding.publicReproduction.currentRenderingAccepted, false);
});

test('root depth historical boundary conserves exact prior population and rejects source drift', async () => {
  const { retainedStaticSemanticPopulation, restoreRootDepthPolicy } = await import('./static-semantic-registration.mjs');
  const { sourceAuditDefinitions } = await import('./input-equivalence-policy.mjs');
  const file = 'tests/material-parity/input-equivalence-policy.mjs', text = readFileSync(file, 'utf8');
  const prior = retainedStaticSemanticPopulation(sourceAuditDefinitions);
  assert.equal(prior.length, 191);
  assert.deepEqual(prior, sourceAuditDefinitions.slice(0, 191));
  const restored = restoreRootDepthPolicy(text);
  assert.equal(createHash('sha256').update(restored).digest('hex'), '85491fc1e6bb7a9d98f160bed17c2c90b8b75081d20f056a87135cb0635cdeec');
  for (const index of [0, 180, 190, 191]) {
    const changed = structuredClone(sourceAuditDefinitions); changed[index].classification = 'equivalent-representation';
    assert.throws(() => retainedStaticSemanticPopulation(changed));
  }
  assert.throws(() => retainedStaticSemanticPopulation([...sourceAuditDefinitions, sourceAuditDefinitions.at(-1)]));
  assert.throws(() => restoreRootDepthPolicy(text + '\n// drift'));
  assert.throws(() => restoreRootDepthPolicy(text.replace('unbounded root paint depth', 'changed root paint depth')));
  assert.equal(sourceAuditDefinitions.length, 192, 'Historical read must not mutate production');
});

test('root depth producer inventory conserves all prior proofs and source paths', async () => {
  const { restoreRootDepthProducer } = await import('./static-semantic-registration.mjs');
  const file = 'tests/material-parity/input-equivalence-audit.mjs', text = readFileSync(file, 'utf8');
  const prior = restoreRootDepthProducer(text);
  assert.equal(createHash('sha256').update(prior).digest('hex'), 'a0480845099038416ce2f420dca03e3cd99712ea083c18075c8bebabbc00f747');
  assert.throws(() => restoreRootDepthProducer(text + '\n// drift'));
  assert.throws(() => restoreRootDepthProducer(text.replace('one honest high-z short-viewport', 'no high-z short-viewport')));
  const ast = ts.createSourceFile(file, text, 99, true);
  const owner = name => ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  const files = owner('sourceFingerprints').body.statements[0].declarationList.declarations[0].initializer.elements;
  assert.equal(files.length, 936); assert.equal(new Set(files.map(n => n.text)).size, 936);
  for (const n of files.slice(0,4)) assert.ok(readFileSync(n.text).length > 0);
  const proofs = owner('focusedProofInventory').body.statements[0].expression.elements;
  assert.equal(proofs.length, 265);
  for (const n of proofs.slice(0,4)) {
    const pattern = new Function(`return ${n.arguments[2].getText(ast)};`)();
    assert.ok(pattern.test(readFileSync(n.arguments[1].text, 'utf8')));
  }
});

test('current public depth reduction loses only the high-z short pane despite equal CSS geometry', () => {
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  const dir = 'artifacts/material-parity/current-depth-public-reduction-20261022';
  const raw = readFileSync(`${dir}/result.json`), provenanceRaw = readFileSync(`${dir}/provenance.json`);
  assert.equal(sha(raw), 'd464b8d4931c652dcc46d6e1da3114641b38c9205477dcb7271f5024d7797257');
  assert.equal(sha(provenanceRaw), 'da3ff1622585e00f10d7df0ba51739d2fe9585a053ac3bb8c56893c56f79f979');
  const report = JSON.parse(raw), provenance = JSON.parse(provenanceRaw);
  const prior = readFileSync('artifacts/material-parity/divider-context-verified-angular-20261013-dpr1/provenance.json');
  assert.equal(sha(prior), '8a82dc61c5ca4ab78cc3ca705a4e26ea66fea535df058bde66f611371c5529cd');
  // Reuse the authenticated Angular compilation, not a newly labelled old build.
  assert.deepEqual(provenance.compiledReceipts, JSON.parse(prior).compiledReceipts);
  assert.equal(provenance.compiledReceipts.length, 104);
  for (const receipt of provenance.compiledReceipts) {
    assert.equal(sha(readFileSync(receipt.source)), receipt.sourceSha256);
    for (const root of ['dist/lib', 'examples/material-showcase/node_modules/astylarui/dist/lib', provenance.freshBuild])
      assert.equal(sha(readFileSync(`${root}/${receipt.file}`)), receipt.emittedSha256);
  }
  assert.equal(provenance.specFilter, 'depth-');
  assert.equal(provenance.inputs.length, 2516);
  for (const receipt of provenance.inputs) assert.equal(sha(readFileSync(receipt.file)), receipt.sha256);
  assert.equal(sha(readFileSync('scripts/audit-overlay-layout-stage.mjs')), provenance.runnerSha256);
  assert.equal(sha(readFileSync(`${dir}/audit.js`)), provenance.bundleSha256);
  for (const asset of provenance.runtimeAssets) if (asset.url === '/audit.js') assert.equal(asset.sha256, provenance.bundleSha256);
  assert.equal(report.browser, '155.0.8059.85');
  assert.deepEqual(report.runtimeContext.initial, { width: 900, height: 800, devicePixelRatio: 1 });
  assert.deepEqual(report.runtimeContext.final, report.runtimeContext.initial);
  assert.deepEqual(report.errors, []);
  const executed = report.result.results.filter(row => row.status !== 'excluded');
  assert.equal(executed.length, 4);
  assert.equal(executed.filter(row => row.status === 'passed').length, 3);
  assert.equal(executed.filter(row => row.status === 'failed').length, 1);
  assert.match(executed.find(row => row.status === 'failed').description, /depth-high at 320 x 240$/);
  assert.equal(report.observations.length, 4); assert.equal(report.screenshots.length, 4);
  for (const entry of report.observations) {
    const [pane] = entry.observations;
    assert.equal(entry.observations.length, 1);
    assert.deepEqual(pane.css, pane.reference); assert.deepEqual(pane.projected, pane.css);
    assert.deepEqual(pane.css, { x: 20, y: 20, width: 120, height: 24 });
    assert.equal(entry.viewport.dpr, 1);
    assert.equal(entry.viewport.canvasClientHeight, entry.height);
    assert.equal(entry.viewport.referenceInnerHeight, entry.height);
    assert.equal(pane.depth.enabled, true); assert.equal(pane.depth.visible, true); assert.equal(pane.depth.visibility, 1);
    const failed = entry.composition === 'depth-high' && entry.height === 240;
    assert.equal(pane.depth.meshZ > pane.depth.cameraZ, failed);
    const image = report.screenshots.find(row => row.composition === entry.composition && row.height === entry.height);
    assert.ok(image);
    for (const side of ['reference', 'astylar']) {
      const bytes = readFileSync(`${dir}/${image.captures[side].file}`);
      assert.equal(sha(bytes), image.captures[side].sha256);
      const png = PNG.sync.read(bytes); assert.equal(png.width, 320); assert.equal(png.height, entry.height);
      let dark = 0;
      for (let i = 0; i < png.data.length; i += 4)
        if (png.data[i] === 48 && png.data[i + 1] === 45 && png.data[i + 2] === 50 && png.data[i + 3] === 255) dark++;
      assert.equal(dark, side === 'astylar' && failed ? 0 : 2880);
      assert.equal(dark, image.paint[side === 'reference' ? 'referencePanePixels' : 'candidatePanePixels']);
    }
  }
  console.log(JSON.stringify({ proof: 'current-public-root-depth-camera', compiledSources: 104, bundleInputs: 2516,
    executed: 4, honestRendererFailures: 1, controls: 3, errors: 0,
    boundary: 'Equal-input reduced root pane,DPR1,current authenticated installed code;not complete Material cases or full raster equivalence.',
    currentRenderingAccepted: false }));
});

test('current source retains viewport-dependent camera crossing for unbounded root paint depth', () => {
  // Execute complete owning method bodies, not copied arithmetic. This is a
  // source-stage applicability check, deliberately not a browser reproduction.
  const receipts = [];
  const source = file => {
    const bytes = readFileSync(file);
    receipts.push({ file, sha256: createHash('sha256').update(bytes).digest('hex') });
    return ts.createSourceFile(file, bytes.toString('utf8'), ts.ScriptTarget.Latest, true);
  };
  const camera = source('src/app/services/babylon-camera.service.ts');
  const stacking = source('src/app/services/dom/positioning/stacking-context.manager.ts');
  const projection = source('src/app/services/css-babylon-projection.ts');
  const member = (tree, name) => {
    const owner = tree.statements.find(ts.isClassDeclaration);
    const matches = owner.members.filter(node => node.name?.getText(tree) === name);
    assert.equal(matches.length, 1, name);
    return matches[0];
  };
  const compile = text => {
    const js = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    return new Function(`${js}; return Probe;`)();
  };
  const initialize = member(camera, 'initialize');
  const declarations = initialize.body.statements.filter(ts.isVariableStatement)
    .flatMap(node => [...node.declarationList.declarations]);
  const distance = declarations.find(node => node.name.getText(camera) === 'cameraDistance');
  assert.ok(distance?.initializer);
  const CameraProbe = compile(`class Probe {
    ${member(camera, 'getFOV').getText(camera)}
    ${member(camera, 'calculateUiClipRange').getText(camera)}
    distance(cssHeight:number) { const fov=this.getFOV(); return ${distance.initializer.getText(camera)}; }
  }`);
  const StackProbe = compile(`class Probe {
    ${member(stacking, 'rootContextStep').getText(stacking)}
    ${member(stacking, 'rootContextDepth').getText(stacking)}
  }`);
  const ProjectProbe = compile(`class Probe {
    worldUnitsPerCssPixel=1;
    ${member(projection, 'projectLocalPoint').getText(projection)}
  }`);
  // Orthographic x/y is independent of depth; it does not bound paint Z.
  assert.match(member(camera, 'updateViewport').getText(camera), /Camera\.ORTHOGRAPHIC_CAMERA/);
  const c = new CameraProbe(), s = new StackProbe(), p = new ProjectProbe();
  const depth = s.rootContextDepth(1000);
  assert.equal(depth, 250.01);
  assert.equal(p.projectLocalPoint({ x: 10, y: 20 }, depth).z, depth);
  const observations = [1000, 240].map(height => {
    const cameraZ = c.distance(height), clip = c.calculateUiClipRange(cameraZ, height);
    return { height, cameraZ, depth, forwardDistance: cameraZ - depth, ...clip };
  });
  assert.ok(observations[0].forwardDistance > observations[0].minZ);
  assert.ok(observations[0].forwardDistance < observations[0].maxZ);
  assert.ok(observations[1].forwardDistance < 0);
  assert.ok(s.rootContextDepth(1) < c.distance(240));
  console.log(JSON.stringify({ proof: 'current-source-root-depth-camera-applicability', receipts,
    observations, boundary: 'Extracted current source arithmetic only;not current browser paint,exact tooltip world depth,full ancestry or case acceptance.',
    currentRenderingAccepted: false }));
});

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
  const active = new Function('depthPair', 'viewports', `return (${initializer('activeViewports')});`);
  assert.equal(active(false, contexts), contexts);
  assert.deepEqual(active(true, contexts).map(v => [v.width, v.height, v.deviceScaleFactor]),
    [[900, 1000, 1], [900, 240, 1]]);
  const profiles = new Function('depthPair', `return (${initializer('profiles')});`);
  assert.deepEqual(profiles(false), ['dark', 'contrast', 'custom']);
  assert.deepEqual(profiles(true), ['contrast']);
  assert.match(source, /!depthPair \|\| shortBoundary/);
});

import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

function verifyRetainedAppliedThemeBoundary(report, file) {
  const script = 'scripts/audit-material-tooltip-applied-theme-ownership.mjs';
  const original = execFileSync('git', ['show', `ac2b624d:${script}`], { maxBuffer: 4000000 });
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  assert.equal(hash(original), report.capture.sources.find(receipt => receipt.file === script).sha256);
  const ast = ts.createSourceFile(script, original.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const initializer = name => ast.statements.filter(ts.isVariableStatement)
    .flatMap(statement => [...statement.declarationList.declarations])
    .find(declaration => declaration.name.getText(ast) === name).initializer.getText(ast);
  const defaultViewports = new Function(`return (${initializer('defaultViewports')});`)();
  const viewports = new Function('shortBoundary', 'defaultViewports', `return (${initializer('viewports')});`)(true, defaultViewports);
  const themes = {};
  new Function('exports', ts.transpileModule(readFileSync(report.themeSource.file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText)(themes);
  const readBytes = path => resolve(path) === resolve(script) ? original : readFileSync(path);
  const validate = (raw, options) => validateSupplementalCapture(raw, { ...options, readBytes });
  const verify = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'verify').getText(ast);
  // Execute every original assertion with its actual captured producer bytes.
  // This is historical source validation, not a waiver for the current producer.
  return new Function('raw', 'file', 'assert', 'hash', 'readFileSync', 'validateSupplementalCapture',
    'script', 'properties', 'themes', 'viewports', 'shortBoundary', `${verify};return verify(raw,file);`)(
    report, file, assert, hash, readBytes, validate, script, Object.values(propertyGroups).flat(), themes, viewports, true);
}

test('actual-theme short tooltip contexts preserve fallback versus flow input inequality', () => {
  const file = 'artifacts/material-parity/tooltip-actual-theme-short-boundary-20261022/latest-report.json';
  const bytes = readFileSync(file), hash = value => createHash('sha256').update(value).digest('hex');
  assert.equal(hash(bytes), '5ec72acad66a4c3be382df77ae3d8fb32af3141da2ddcc03748ed645d05d6c83');
  const report = JSON.parse(bytes);
  const verified = verifyRetainedAppliedThemeBoundary(report, file);
  assert.deepEqual(verified, { contexts: 12, pairedCycles: 36, currentRenderingAccepted: false });
  const forgedSource = structuredClone(report);
  forgedSource.capture.sources.find(receipt => receipt.file === 'scripts/audit-material-tooltip-applied-theme-ownership.mjs').sha256 = '0'.repeat(64);
  assert.throws(() => verifyRetainedAppliedThemeBoundary(forgedSource, file));
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

test('contrast tooltip remains in bounds and open while short camera crosses its retained depth', () => {
  const file = 'artifacts/material-parity/tooltip-contrast-depth-pair-20261022/latest-report.json';
  const bytes = readFileSync(file), hash = value => createHash('sha256').update(value).digest('hex');
  assert.equal(hash(bytes), 'a52ca04cc72a504d312b3596a6cee14d44bbe274bd6eae005598f496829d162d');
  const report = JSON.parse(bytes);
  assert.deepEqual(JSON.parse(execFileSync(process.execPath,
    ['scripts/audit-material-tooltip-applied-theme-ownership.mjs', '--verify', file, '--short-boundary', '--paint-depth-pair'],
    { encoding: 'utf8' })), { contexts: 2, pairedCycles: 6, currentRenderingAccepted: false });
  const cropCounts = report.results.map(row => {
    const open = row.astylar.openBoundary;
    assert.equal(hash(readFileSync(open.screenshot.file)), open.screenshot.sha256);
    const image = PNG.sync.read(readFileSync(open.screenshot.file)), box = open.popup;
    assert.deepEqual([image.width, image.height], [900, row.viewport.height]);
    const crop = { left: Math.ceil(box.left + 4), top: Math.ceil(box.top + 4),
      right: Math.floor(box.right - 4), bottom: Math.floor(box.bottom - 4) };
    assert.deepEqual(crop, { left: 85, top: 214, right: 183, bottom: 229 });
    let dark = 0;
    for (let y = crop.top; y < crop.bottom; y++) for (let x = crop.left; x < crop.right; x++) {
      const at = (y * image.width + x) * 4;
      if (image.data[at] < 80 && image.data[at + 1] < 80 && image.data[at + 2] < 80) dark++;
    }
    return dark;
  });
  assert.deepEqual(cropCounts, [1000, 0]);
  const trees = report.results.map(row => {
    const receipt = row.astylar.openBoundary.inputTree, raw = readFileSync(receipt.file);
    assert.equal(hash(raw), receipt.sha256); return raw;
  });
  assert.deepEqual(trees[0], trees[1], 'complete recorded candidate inputs differ');
  const inspect = rows => {
    assert.deepEqual(rows.map(row => [row.profile, row.viewport.id, row.viewport.width, row.viewport.height, row.viewport.deviceScaleFactor]),
      [['contrast', 'tall-dpr1', 900, 1000, 1], ['contrast', 'short-dpr1', 900, 240, 1]]);
    const observations = rows.map(row => {
      assert.deepEqual(row.astylar.runtime.errors, []); assert.deepEqual(row.reference.runtime.errors, []);
      const open = row.astylar.openBoundary;
      assert.equal(open.opened, true);
      assert.deepEqual(open.paintDepth, { meshZ: 249.84799999999998, enabled: true, visible: true, visibility: 1 });
      assert.deepEqual(open.drawingBuffer, { width: 900, height: row.viewport.height });
      assert.ok(open.popup.left >= open.canvas.left && open.popup.right <= open.canvas.right);
      assert.ok(open.popup.top >= open.canvas.top && open.popup.bottom <= open.canvas.bottom);
      return open;
    });
    const [tall, short] = observations;
    assert.deepEqual(tall.popup, short.popup); assert.deepEqual(tall.trigger, short.trigger);
    assert.equal(tall.camera.position.z, 866.0254037844387);
    assert.equal(short.camera.position.z, 207.84609690826528);
    assert.ok(tall.paintDepth.meshZ < tall.camera.position.z);
    assert.ok(short.paintDepth.meshZ > short.camera.position.z);
  };
  inspect(report.results);
  const mutations = [
    rows => { rows[1].astylar.openBoundary.opened = false; },
    rows => { rows[1].astylar.openBoundary.paintDepth.enabled = false; },
    rows => { rows[1].astylar.openBoundary.paintDepth.visible = false; },
    rows => { rows[1].astylar.openBoundary.paintDepth.visibility = 0; },
    rows => { rows[1].astylar.openBoundary.paintDepth.meshZ = 0; },
    rows => { rows[1].astylar.openBoundary.camera.position.z = rows[0].astylar.openBoundary.camera.position.z; },
    rows => { rows[1].astylar.openBoundary.popup.bottom = 241; },
    rows => { rows[1].astylar.runtime.errors.push('invented'); },
    rows => { rows[1].astylar.openBoundary.drawingBuffer.height = 1000; },
    rows => { delete rows[1].astylar.openBoundary.camera; },
    rows => { rows.pop(); },
    rows => { rows[1] = structuredClone(rows[0]); },
  ];
  for (const mutate of mutations) { const rows = structuredClone(report.results); mutate(rows); assert.throws(() => inspect(rows)); }
  console.log(JSON.stringify({ proof: 'contrast-tooltip-short-camera-depth', evidence: { file, sha256: hash(bytes) },
    byteIdenticalCandidateTrees: true, identicalInBoundsPopupGeometry: true, cropCounts, negativeControlsRejected: mutations.length,
    boundary: 'New contrast DPR1 frozen-build tall/short observation corroborates the existing depth failure. Native fallback authoring and mid-animation raster remain separate;not current-repository,all-theme/DPR,scroll or whole-case acceptance.',
    canonicalPublication: false, currentRenderingAccepted: false }));
});
