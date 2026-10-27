import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { restoreCursorInspectorCaptureSource } from './public-cursor-defaults-evidence.mjs';
import { PNG } from 'pngjs';
import { validateSupplementalCapture } from './supplemental-capture-evidence.mjs';
import { propertyGroups } from './input-equivalence-policy.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { proveSnackbarPositionRequests, applySnackbarPositionRequests, validateSnackbarPositionRequests } from './snackbar-position-observation.mjs';

test('original snackbar auto-dismiss comparator does not witness the timed transition', async () => {
  const { gunzipSync } = await import('node:zlib');
  const { default: ts } = await import('typescript');
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const original = gunzipSync(Buffer.from(readFileSync(
    'docs/evidence/material-original-runner-e01.mjs.gz.b64', 'utf8').replace(/\s/g, ''), 'base64'));
  assert.equal(hash(original), 'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0');
  const ast = ts.createSourceFile('original.mjs', original.toString(), 99, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0);
  const extract = name => {
    const nodes = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
    assert.equal(nodes.length, 1);
    return nodes[0].getText(ast);
  };
  const compare = new Function(`return (${extract('compareInteractionState')})`)();
  const denied = new Proxy({}, { get() { throw new Error('Unexpected observation'); } });
  for (const open of [true, false]) {
    assert.deepEqual(await compare(denied, denied, 'snack-bar', 'auto-dismiss', { open }), { matches: true });
  }
  for (const mode of ['reference', 'astylar']) {
    const trace = [];
    const page = {
      mouse: Object.fromEntries(['move', 'down', 'up'].map(k => [k, async (...args) => trace.push([k, ...args])])),
      waitForTimeout: async ms => trace.push(['wait', ms]),
    };
    const perform = new Function('assert', 'interactionTargetBox', `return (${extract('performInteraction')})`)(
      assert, async () => ({ x: 10, y: 20, width: 30, height: 40 }));
    await perform(page, mode, { family: 'snack-bar', state: 'auto-dismiss' });
    assert.deepEqual(trace, [['move', 25, 40], ['down'], ['up'], ['wait', 5100]]);
  }
  const bytes = readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(hash(bytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const rows = JSON.parse(bytes).interactions.filter(r => r.family === 'snack-bar' && r.state === 'auto-dismiss');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].profile, 'light'); assert.equal(rows[0].viewport.id, 'desktop-dpr1');
  assert.deepEqual(rows[0].interactionState, { matches: true });
  assert.equal(rows[0].astylarState.open, false);
  assert.equal(rows[0].resourceSnapshots.length, 1);
  assert.deepEqual(rows[0].focusedRasters, []);
  assert.equal(Object.hasOwn(rows[0], 'actionTimeline'), false);
  for (const side of ['reference', 'astylar']) {
    const receipt = rows[0].inputTrees[side], treeBytes = readFileSync(receipt.file);
    assert.equal(hash(treeBytes), receipt.sha256);
    const tree = JSON.parse(treeBytes);
    const panels = tree.nodes.filter(n => side === 'reference'
      ? String(n.attributes?.class ?? '').split(/\s+/).includes('mat-mdc-snackbar-surface')
      : n.authored?.id === 'snack-bar-surface');
    assert.equal(panels.length, 0);
  }
  const capture = extract('captureInteractionCase');
  const action = capture.indexOf("performInteraction(astylar.page, 'astylar', benchmarkCase)");
  const snapshot = capture.indexOf('resourceSnapshots.push(');
  assert.ok(action >= 0 && snapshot > action);
  assert.equal(capture.split('resourceSnapshots.push(').length - 1, 1);
  assert.match(capture, /const cycles = state === 'open-dismiss' \? 3 : 1/);
  // Recipe replay is not historical execution: a closed endpoint cannot prove
  // prior visibility, timer origin, elapsed runtime, or the cause of dismissal.
});

test('supplementary single-open snackbar is present before expiry and absent afterwards', () => {
  const file = 'artifacts/material-parity/snackbar-single-open-20261027/latest-report.json';
  const bytes = readFileSync(file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    '1cc0846c8d56c58312bd47ede2c8c2c8ef1774682466b2b7f625d13682fbf804');
  const report = JSON.parse(bytes), manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  assert.deepEqual(validateSupplementalCapture(report, { reportFile: file,
    expectedProvenance: manifest.provenance, script: 'scripts/audit-material-snackbar-lifetime.mjs',
    styleProperties: Object.values(propertyGroups).flat() }), { status: 'checkpoint-bound', errors: [] });
  assert.equal(report.mode, 'single-open');
  assert.deepEqual(report.results.map(r => r.state), ['closed', 'first-open', 'before-expiry', 'expired']);
  for (const row of report.results) {
    assert.equal(row.profile, 'light');
    assert.deepEqual(row.viewport, { width: 1440, height: 1000, deviceScaleFactor: 1 });
  }
  for (const side of ['reference', 'astylar']) {
    const observations = report.results.map(r => r[side].observation);
    assert.deepEqual(observations.map(o => o.popupCount), [0, 1, 1, 0]);
    assert.deepEqual(observations.map(o => o.clicks.length), [0, 1, 1, 1]);
    assert.equal(observations[1].clicks[0].trusted, true);
    assert.equal(observations[0].elapsedSinceFirstClickMs, null);
    assert.ok(observations[1].elapsedSinceFirstClickMs > 0 && observations[1].elapsedSinceFirstClickMs < 4000);
    assert.ok(observations[2].elapsedSinceFirstClickMs >= 4000 && observations[2].elapsedSinceFirstClickMs < 5000);
    assert.ok(observations[3].elapsedSinceFirstClickMs >= 6000);
    for (const row of report.results) {
      const screenshot = row[side].screenshot, pixels = readFileSync(screenshot.file);
      assert.equal(createHash('sha256').update(pixels).digest('hex'), screenshot.sha256);
      const png = PNG.sync.read(pixels);
      assert.equal(png.width, 1440); assert.equal(png.height, 1000);
      assert.deepEqual(row[side].runtime.errors, []);
    }
  }
  assert.equal(report.inputEquivalent, false); assert.equal(report.renderingEquivalent, false);
});

test('single-open coverage join preserves every other case and unresolved obligation', async () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const generation = 'cd84d26cacb5f9fbce67938bdadbd418c3d5051ca489e2f8950d2007cce8ac87';
  const bytes = readFileSync(`artifacts/material-parity/working-audit/${generation}/index.json`);
  assert.equal(hash(bytes), '28230d0ce2369102c6931a3cd8ae4792dac9631e5223b185bc2c781bb4b00bf7');
  const coverage = JSON.parse(bytes).metadata.coverage.inspectionEvidence;
  const parent = { kind: 'case-obligation-coverage-extension', status: 'proposal-not-canonical', scope: coverage.scope, groups: coverage.cases };
  const { joinSnackbarSingleOpen: join, restoreSnackbarSingleOpen: restore,
    snackbarSingleOpenPredecessor: predecessor } = await import('../../scripts/join-material-snackbar-single-open.mjs');
  const joined = join(parent);
  assert.equal(joined.cases, 1); assert.equal(joined.review.groups.length, 2311);
  assert.equal(hash(JSON.stringify(parent)), predecessor);
  assert.deepEqual(restore(joined.review), parent);
  let changed = 0;
  for (const [i, before] of parent.groups.entries()) {
    const after = joined.review.groups[i];
    if (before === after) continue;
    changed++;
    assert.equal(before.case, 'interaction:snack-bar@light/desktop-dpr1/auto-dismiss');
    assert.equal(after.inspection, before.inspection); assert.equal(after.currentRendering, before.currentRendering);
    for (const [name, obligation] of Object.entries(before.obligations)) {
      assert.deepEqual(after.obligations[name].remaining, obligation.remaining);
      if (name !== 'authoredActivation') assert.deepEqual(after.obligations[name], obligation);
    }
    assert.equal(after.obligations.authoredActivation.disposition, 'partial');
    assert.equal(after.obligations.authoredActivation.supplementarySingleOpenVisibility.remaining.length, 2);
  }
  assert.equal(changed, 1);
  assert.throws(() => join(joined.review));
  const capture = JSON.parse(readFileSync('artifacts/material-parity/snackbar-single-open-20261027/latest-report.json'));
  for (const suffix of ['latest-report.json', 'manifest.json', '.png', capture.results[0].reference.inputTree.file]) {
    let intercepted = 0;
    const read = (file, ...args) => {
      if (String(file).endsWith(suffix)) { intercepted++; return Buffer.from('forged'); }
      return readFileSync(file, ...args);
    };
    assert.throws(() => join(parent, read)); assert.ok(intercepted > 0);
  }
  console.log(JSON.stringify({ review: joined.sha256, changedActivationObligations: changed,
    predecessorRecovered: true, canonicalUnchanged: true, parentCasesRemainPartial: 2311 }));
});

test('ordinary snackbar opens in bounds but loses paint behind the short-surface camera', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const file = 'artifacts/material-parity/snackbar-boundary-e331e79/latest-report.json';
  const bytes = readFileSync(file);
  assert.equal(hash(bytes), '51434ca9c9a9d375e778c3185881b9bb09be2e28baa8133b99f67d216d4c0994');
  const report = JSON.parse(bytes), manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  const binding = validateSupplementalCapture(report, { reportFile: file,
    expectedProvenance: manifest.provenance, script: 'scripts/audit-material-snackbar-boundary.mjs',
    styleProperties: Object.values(propertyGroups).flat() });
  assert.equal(binding.status, 'checkpoint-bound', JSON.stringify(binding.errors));
  assert.equal(manifest.provenance.core.length, 104);
  // Historical replay only: authenticate the complete diagnostic-only revision,
  // not today's rendering. All other captured dependency checks remain exact.
  const sourceTransitions = new Map([
    ['src/lib/astylar-surface.ts', 'cc874b030ffdd0960db4b68fea88e1864824b40ce72d716f69a2ec025f0e182a'],
    ['src/lib/astylar.ts', '5742ba6c19debd5c18ad7d407f1a10e14271cbcd38bf99889d4b4e2474f17451'],
  ]);
  let projectedSources = 0, projectedInstalled = 0;
  for (const receipt of manifest.provenance.core) {
    let source = readFileSync(receipt.source);
    if (sourceTransitions.has(receipt.source)) {
      assert.equal(hash(source), sourceTransitions.get(receipt.source));
      assert.deepEqual(source, execFileSync('git', ['show', `39b3e0fd:${receipt.source}`], { maxBuffer: 4_000_000 }));
      source = execFileSync('git', ['show', `39b3e0fd^:${receipt.source}`], { maxBuffer: 4_000_000 });
      projectedSources++;
    }
    assert.equal(hash(source), receipt.sourceSha256);
    let installed = readFileSync(`examples/material-showcase/node_modules/astylarui/dist/lib/${receipt.file}`);
    if (hash(installed) === 'a18630bdc31067ac75907e41f9031865fa192edc164ebf93edacb8b836b09abd') {
      assert.match(receipt.file.replaceAll('\\', '/'), /^lib\/astylar\.js$/);
      assert.throws(() => restoreCursorInspectorCaptureSource(installed.toString() + '\n// unexpected drift'));
      installed = Buffer.from(restoreCursorInspectorCaptureSource(installed.toString()));
      projectedInstalled++;
    }
    assert.equal(hash(installed), receipt.sha256);
  }
  assert.equal(projectedSources, 2); assert.equal(projectedInstalled, 1);
  assert.deepEqual(report.results.map(e => [e.deviceScaleFactor, e.viewport.height, e.action]),
    [1, 2].flatMap(d => [1000, 240].flatMap(h => ['initial', 'click'].map(a => [d, h, a]))));
  for (const row of report.results) {
    const clicked = row.action === 'click', short = row.viewport.height === 240, dpr = row.deviceScaleFactor;
    assert.equal(row.astylar.candidateOpen, clicked);
    for (const side of ['reference', 'astylar']) {
      const sample = row[side], tree = JSON.parse(readFileSync(sample.inputTree.file));
      const popups = tree.nodes.filter(n => side === 'reference'
        ? String(n.attributes?.class ?? '').split(/\s+/).includes('mat-mdc-snackbar-surface')
        : n.authored?.id === 'snack-bar-surface');
      assert.equal(popups.length, Number(clicked));
      const pngBytes = readFileSync(sample.screenshot.file);
      assert.equal(hash(pngBytes), sample.screenshot.sha256);
      const png = PNG.sync.read(pngBytes);
      assert.equal(png.width, 900 * dpr); assert.equal(png.height, row.viewport.height * dpr);
      if (!clicked) { assert.equal(sample.box, null); assert.equal(sample.darkPixels, 0); continue; }
      assert.ok(sample.clicks.some(e => e.trusted && e.x >= sample.trigger.x && e.x <= sample.trigger.x + sample.trigger.width &&
        e.y >= sample.trigger.y && e.y <= sample.trigger.y + sample.trigger.height));
      for (const [key, expected] of Object.entries({ left: 278, top: row.viewport.height - 56, width: 344, height: 48 })) {
        assert.ok(Math.abs(sample.box[key] - expected) < .01, `${side} ${key}`);
      }
      let darkPixels = 0;
      for (let y = Math.ceil(sample.box.top * dpr); y < Math.floor(sample.box.bottom * dpr); y++) {
        for (let x = Math.ceil(sample.box.left * dpr); x < Math.floor(sample.box.right * dpr); x++) {
          const i = (y * png.width + x) * 4;
          if (png.data[i] < 80 && png.data[i + 1] < 80 && png.data[i + 2] < 80) darkPixels++;
        }
      }
      assert.equal(darkPixels, sample.darkPixels);
      if (side === 'astylar' && short) assert.equal(darkPixels, 0);
      else assert.ok(darkPixels > 15000 * dpr * dpr);
    }
    if (clicked) {
      assert.equal(row.astylar.meshes.length, 1);
      const mesh = row.astylar.meshes[0];
      assert.equal(mesh.enabled, true); assert.equal(mesh.visible, true); assert.equal(mesh.visibility, 1);
      assert.equal(mesh.z > row.astylar.cameraZ, short);
    }
  }
});

test('34 snackbar wrappers distinguish authored composition from computed-only right/bottom offsets', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const captured = JSON.parse(bytes);
  const cases = captured.interactions.filter(e => e.family === 'snack-bar' &&
    e.styleInputs.some(i => i.id === 'snack-bar-overlay')).map(e => ({ ...e, kind: 'interaction' }));
  assert.equal(cases.length, 34);
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const trees = entry => modalInventoryTrees(inventory,
    `interaction:${entry.family}@${entry.profile}/${entry.viewport.id}/${entry.state}`);
  for (const entry of cases) {
    const proof = proveSnackbarPositionRequests(entry, ...trees(entry));
    assert.equal(proof.mapping.status, 'mapped-with-scalar-rule-gap');
    assert.equal(proof.originalMissingSnackbarCauseProven, false);
    assert.equal(proof.candidateUsedOffsetsVerified, false);
  }
  const entry = cases[0];
  for (const mutate of [
    ([r]) => { r.ruleEvidenceComplete = false; },
    ([, a]) => { a.resolvedStyleSource = 'paint-guess'; },
    ([r]) => { r.nodes.find(n => n.attributes?.class === 'cdk-overlay-container').parent = 'missing'; },
    ([r]) => { r.nodes.find(n => n.attributes?.class === 'cdk-global-overlay-wrapper').inline.right = { value: '0px' }; },
    ([r]) => { const rule = r.rules.find(n => n.selector === '.cdk-global-overlay-wrapper' && n.declarations.position);
      rule.cssText += 'inset-inline-end:0;'; },
    ([r]) => { const rule = r.rules.find(n => n.selector === '.cdk-global-overlay-wrapper' && n.declarations.position);
      rule.declarations.position.value = 'fixed'; },
    ([, a]) => { a.rules.push({ selector: '.snack-overlay', insetBlockEnd: '0' }); },
    ([, a]) => { a.rules.push({ selector: '[unknown]', right: '0' }); },
    ([, a]) => { a.nodes.find(n => n.authored.id === 'snack-bar-overlay').authored.style = { bottom: '0' }; },
    ([, a]) => { a.nodes.find(n => n.authored.id === 'snack-bar-overlay').normalResolvedStyle.right = '0'; },
  ]) {
    const pair = structuredClone(trees(entry)); mutate(pair);
    assert.throws(() => proveSnackbarPositionRequests(entry, ...pair));
  }
  const rows = queryFindings('artifacts/material-parity/working-audit', 'snack-bar', {
    generation: 'fea569edc8edf1e05d1686bcb7c2a8eecc0bfb53bff5d5b8baeb6fbb59602040',
    indexSha256: '672b4d61922a8ef775f4e2c723ca09c9ab70684d93822cd3fe3b53d0df6c9d57',
  }).filter(row => row.evidence.section === 'discrepancies');
  const before = structuredClone(rows), applied = applySnackbarPositionRequests(rows, cases, inventory, normalize);
  assert.deepEqual(rows, before);
  const changed = applied.filter((row, i) => row !== rows[i]);
  assert.equal(changed.length, 3); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 102);
  for (const row of changed) {
    assert.equal(row.element, 'snack-bar-overlay');
    assert.equal(row.reviewedCases.length, 34);
    assert.equal(new Set(row.reviewedCases).size, 34);
    const restored = { ...row };
    for (const key of ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewedCases', 'reviewEvidence']) delete restored[key];
    Object.assign(restored, row.reviewEvidence.priorMetadata);
    assert.deepEqual(restored, rows.find(r => r.id === row.id));
  }
  const validate = values => validateSnackbarPositionRequests(values, rows, cases, inventory, normalize);
  assert.deepEqual(validate(applied), []);
  for (const mutate of [r => { r.reference = 'forged'; }, r => r.reviewedCases.pop(),
    r => { r.reviewEvidence.observations[0].originalMissingSnackbarCauseProven = true; },
    r => { r.reviewEvidence.observations[0].mapping.missingRules = []; }]) {
    const altered = structuredClone(applied); mutate(altered.find(r => r.reviewedCases?.length === 34 && r.element === 'snack-bar-overlay' && r.attribution.startsWith('reviewed-snackbar-')));
    assert.ok(validate(altered).length);
  }
  assert.throws(() => applySnackbarPositionRequests(rows, cases.slice(1), inventory, normalize));
  assert.throws(() => applySnackbarPositionRequests(rows, [...cases, cases[0]], inventory, normalize));
});
