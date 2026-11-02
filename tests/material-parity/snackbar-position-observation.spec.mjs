import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { restoreCursorInspectorCaptureSource } from './public-cursor-defaults-evidence.mjs';
import { PNG } from 'pngjs';
import { validateSupplementalCapture } from './supplemental-capture-evidence.mjs';
import { propertyGroups, sourceAuditDefinitions } from './input-equivalence-policy.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { proveSnackbarPositionRequests, applySnackbarPositionRequests, validateSnackbarPositionRequests } from './snackbar-position-observation.mjs';
import { joinRetainedTriggerPaintInputs, restoreRetainedTriggerPaintInputs, triggerPaintPredecessor, createTriggerPaintHistoricalRead, createTriggerPaintReviewReader } from '../../scripts/join-material-trigger-paint-inputs.mjs';

test('trigger paint historical reader restores exact accepted sources and rejects drift', async () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const read = createTriggerPaintHistoricalRead();
  const sources = [
    ['tests/material-parity/capture-availability-registration.mjs', 'c7f8b931ab00939e6c65b4adca555a02e4622d4be9f25dbe2546797ecfdd3254'],
    ['scripts/check-divider-omitted-owner-consumers.mjs', 'cf989605fc7c727111431c0b2deb1dc3e733b39c07a4751aaf19c798625c2bcd'],
    ['tests/material-parity/snackbar-position-observation.spec.mjs', '0fb3a5d539573fcc0dfc6e2f46069ff04630545109e988b7016ed6376202872b'],
    ['tests/material-parity/input-equivalence-policy.mjs', '8f1acb6af64b5cfdcddba911a4b3ddf61e241edfea74eec241d2276617fe1ea3'],
    ['tests/material-parity/input-equivalence-audit.mjs', '1bce9f85f8ea18be40dab632667a84f3ca1ed324a45a1606ff738f4a0e8dfd54'],
  ];
  for (const [file, sha256] of sources) {
    assert.equal(hash(read(file)), sha256);
    assert.equal(hash(read(file, 'utf8')), sha256);
    const forged = createTriggerPaintHistoricalRead({ read: name => String(name).replaceAll('\\', '/').endsWith(file) ? Buffer.from('unknown generation') : readFileSync(name) });
    assert.throws(() => forged(file), /Unknown trigger-paint source generation/);
  }
  const { createCaptureAvailabilityHistoricalRead } = await import('./capture-availability-registration.mjs');
  const shared = createCaptureAvailabilityHistoricalRead({ root: process.cwd(), read: readFileSync });
  for (const [file, expected] of [
    ['tests/material-parity/input-equivalence-audit.mjs', '6e8db2faa61eb96a69c7d43eac20f95e377651a5489612d9f311907d206fccd5'],
    ['scripts/run-material-input-audit.mjs', 'cffae75a36eeffe9bda5d799d43565c4833a3bbb751077420ac741528f8dd3a8'],
    ['scripts/export-material-input-audit-current-ancestry.mjs', 'bd12f66374002fd4897769e03c373f26c812744c44d5e18a35d1b39b9e4df05a'],
  ]) assert.equal(hash(shared(file)), expected, 'Shared historical entry must restore the exact older generation');
  const nested = createCaptureAvailabilityHistoricalRead({ root: process.cwd(), read: shared });
  assert.deepEqual(nested('tests/material-parity/input-equivalence-policy.mjs'), shared('tests/material-parity/input-equivalence-policy.mjs'),
    'Already-restored nested policy bytes must remain owned by the older reader');
});

test('trigger paint staged selection preserves every older option and rejects mixtures', async () => {
  const { prepareTriggerPaintSelection, restoreTriggerPaintSelection } = await import('../../scripts/join-material-trigger-paint-inputs.mjs');
  const { default: ts } = await import('typescript'), vm = await import('node:vm'), path = await import('node:path');
  const { fileURLToPath, pathToFileURL } = await import('node:url');
  const review = '1'.repeat(64);
  for (const [kind, file] of Object.entries({ runner: 'scripts/run-material-input-audit.mjs', launcher: 'scripts/export-material-input-audit-current-ancestry.mjs' })) {
    const live = readFileSync(file), historical = createTriggerPaintHistoricalRead();
    const original = historical(file), staged = prepareTriggerPaintSelection(original, kind, review);
    assert.deepEqual(ts.createSourceFile(file, staged, 99, true, ts.ScriptKind.JS).parseDiagnostics, []);
    assert.equal(restoreTriggerPaintSelection(staged, kind, review), original.toString().replaceAll('\r\n', '\n'));
    assert.throws(() => restoreTriggerPaintSelection(staged + '\n// drift', kind, review));
    assert.throws(() => prepareTriggerPaintSelection(original, kind, 'not-a-review'));
    assert.deepEqual(readFileSync(file), live, 'Staged selection must not mutate live exporter');
    if (kind === 'runner') {
      const match = staged.match(/const applicability=([\s\S]*?);\n    assert.ok\(!applicability/); assert.ok(match);
      const choose = Function('options', 'createTriggerPaintReviewReader', 'auditReadFileSync', 'root', 'dividerConsumerReaderFactory', 'captureAvailabilityEvidenceRead', `return ${match[1]}`);
      const next = () => 'new', prior = () => 'old';
      assert.equal(choose({ caseObligationReviewSha256: review }, next, null, '.', prior, null), 'new');
      assert.equal(choose({ caseObligationReviewSha256: 'old' }, next, null, '.', prior, null), 'old');
      continue;
    }
    const execute = (source, flags) => {
      const outputs = [];
      vm.runInNewContext(source.replace(/^import .*;\n/gm, '').replaceAll('import.meta.url', 'moduleUrl'), {
        assert, path, fileURLToPath, moduleUrl: pathToFileURL(path.resolve(file)).href,
        statSync: () => ({ isFile: () => true, isDirectory: () => true }),
        process: { argv: ['node', file, ...flags], execPath: 'node', env: {} },
        spawnSync: (_exe, args) => { outputs.push({ args }); return { status: 0, signal: null }; },
        console: { log: value => outputs.push(JSON.parse(value)) },
      });
      assert.equal(outputs.length, 1); return JSON.parse(JSON.stringify(outputs[0]));
    };
    const before = original.toString().replaceAll('\r\n', '\n');
    const older = [...before.matchAll(/rawRequested\.includes\('(.*?)'\)/g)].map(row => row[1]);
    for (const flags of [[], ...older.map(flag => [flag])])
      assert.deepEqual(execute(staged, [...flags, '--dry-run']), execute(before, [...flags, '--dry-run']));
    for (const suffix of [[], ['--check'], ['--dry-run']]) {
      const result = execute(staged, ['--trigger-paint', ...suffix]);
      assert.ok(result.args.includes(`--case-obligation-review-sha256=${review}`));
      assert.ok(result.args.includes(`--case-obligation-review=artifacts/material-parity/working-audit/proposals/${review}.json`));
      assert.equal(result.args.includes('--check'), suffix.includes('--check'));
    }
    for (const flag of [...older, '--unknown']) assert.throws(() => execute(staged, ['--trigger-paint', flag, '--dry-run']));
    console.log(JSON.stringify({ stagedSelection: true, olderOptionsPreserved: older.length, liveExporterChanged: false }));
  }
});

test('trigger paint successor passes the complete existing receipt loader', async () => {
  const { loadCaseObligationReview } = await import('../../scripts/audit-findings-store.mjs');
  const reader = createTriggerPaintReviewReader(), envelope = JSON.parse(reader.read(reader.file));
  console.log(JSON.stringify({ phase: 'trigger-paint-reader-constructed', review: reader.sha256, cases: envelope.review.groups.length }));
  const loaded = loadCaseObligationReview(`artifacts/material-parity/working-audit/proposals/${reader.sha256}.json`, reader.sha256,
    envelope.review.groups.map(row => row.case), { root: process.cwd(), read: reader.read });
  assert.equal(loaded.cases.length, 2311); assert.equal(loaded.inspectionComplete, false);
  assert.equal(loaded.currentRenderingAccepted, false);
  console.log(JSON.stringify({ phase: 'trigger-paint-reader-validated', review: reader.sha256,
    dependencies: loaded.evidenceFingerprints.length, inspectionComplete: loaded.inspectionComplete,
    currentRenderingAccepted: loaded.currentRenderingAccepted }));
});

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

test('original snackbar expired frames leave no residual paint outside the focused trigger', t => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const root = 'artifacts/material-parity/current-full-20261005/';
  const reportBytes = readFileSync(root + 'latest-report.json');
  assert.equal(hash(reportBytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const report = JSON.parse(reportBytes);
  const initial = report.results.find(r => r.family === 'snack-bar' && r.profile === 'light' && r.viewport.id === 'desktop');
  const expired = report.interactions.find(r => r.family === 'snack-bar' && r.profile === 'light' && r.viewport.id === 'desktop-dpr1' && r.state === 'auto-dismiss');
  const checkpoint = (kind, result, expected) => {
    assert.ok(result);
    const key = JSON.stringify({ kind, family: result.family, profile: result.profile, viewport: result.viewport, state: result.state ?? null });
    const file = root + 'checkpoint/' + hash(key) + '.json', bytes = readFileSync(file);
    assert.equal(hash(bytes), expected);
    const value = JSON.parse(bytes); assert.equal(value.key, key);
    assert.deepEqual(value.result, result); assert.equal(hash(JSON.stringify(value.result)), value.sha256);
    for (const row of value.files) assert.equal(hash(readFileSync(root + row.file)), row.sha256);
    return { file, sha256: expected, value };
  };
  const before = checkpoint('static', initial, '275387fe064602b9bd83be585e9902d24f74709b1aa379c92c1dd0e86b6d5b38');
  const after = checkpoint('interaction', expired, 'f3905aa9641a912fdc90788f00501a548e66157280fdd42a4152c2a67c0c333d');
  assert.equal(expired.astylarState.open, false);
  const overlays = expired.geometry.elements.filter(r => ['snack-bar-overlay', 'snack-bar-surface'].includes(r.id));
  assert.equal(overlays.length, 2); assert.ok(overlays.every(r => r.missing));
  assert.deepEqual(expired.focus, { reference: 'snack-bar-primary', astylar: 'snack-bar-primary', matches: true });
  const observations = [];
  for (const side of ['reference', 'astylar']) {
    const image = record => {
      const receipt = record.value.files.find(r => r.file.endsWith('/' + side + '.png')); assert.ok(receipt);
      return { receipt: { file: root + receipt.file, sha256: receipt.sha256 }, png: PNG.sync.read(readFileSync(root + receipt.file)) };
    };
    const a = image(before), b = image(after);
    for (const png of [a.png, b.png]) { assert.equal(png.width, 1440); assert.equal(png.height, 1000); }
    const trigger = expired.geometry.elements.find(r => r.id === 'snack-bar-primary'); assert.ok(trigger && !trigger.missing);
    const box = side === 'reference' ? trigger.expected : trigger.actual;
    const outsideChanges = data => {
      let changed = 0, outside = 0;
      for (let pixel = 0; pixel < 1440 * 1000; pixel++) {
        if (a.png.data.subarray(pixel * 4, pixel * 4 + 4).equals(data.subarray(pixel * 4, pixel * 4 + 4))) continue;
        changed++;
        const x = pixel % 1440, y = Math.floor(pixel / 1440);
        if (x < Math.floor(box.left) || x >= Math.ceil(box.right) || y < Math.floor(box.top) || y >= Math.ceil(box.bottom)) outside++;
      }
      return { changed, outside };
    };
    const actual = outsideChanges(b.png.data);
    assert.ok(actual.changed > 0); assert.equal(actual.outside, 0);
    const forged = Buffer.from(b.png.data); forged[(980 * 1440 + 720) * 4] ^= 1;
    assert.equal(outsideChanges(forged).outside, 1, 'A residual bottom-screen pixel must be detected');
    observations.push({ side, initial: a.receipt, expired: b.receipt, changedPixels: actual.changed, outsideTrigger: actual.outside, rejectedPixelControl: 1 });
  }
  t.diagnostic(JSON.stringify({ checkpoints: [before, after].map(({ file, sha256 }) => ({ file, sha256 })), observations,
    boundary: 'Per-renderer original closed-versus-expired full-frame pixels only. Newly inspected checkpoint receipts match the pinned original report;not prior accepted-review dependencies. No first-open/timing/cause,current rendering,cross-renderer equal inputs or whole-case acceptance follows.' }));
});

test('retained snackbar focus-layer inputs differ while the original paint comparator accepts them', async t => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const root = 'artifacts/material-parity/current-full-20261005/';
  const reportBytes = readFileSync(root + 'latest-report.json');
  assert.equal(hash(reportBytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const report = JSON.parse(reportBytes);
  const row = report.interactions.find(r => r.family === 'snack-bar' && r.profile === 'light' && r.viewport.id === 'desktop-dpr1' && r.state === 'focus');
  assert.ok(row);
  const checkpointFile = root + 'checkpoint/aad85d65f08c81ab7b919738039cad8032be30219c31d907e50a1cf3541e72bc.json';
  const checkpointBytes = readFileSync(checkpointFile);
  assert.equal(hash(checkpointBytes), 'af0cc215d1602569193b84ee4255c4a4fcda1e79ccc6578698ae818935537749');
  const checkpoint = JSON.parse(checkpointBytes);
  assert.deepEqual(checkpoint.result, row); assert.equal(hash(JSON.stringify(row)), checkpoint.sha256);
  for (const receipt of checkpoint.files) assert.equal(hash(readFileSync(root + receipt.file)), receipt.sha256);
  assert.deepEqual(row.focus, { reference: 'snack-bar-primary', astylar: 'snack-bar-primary', matches: true });
  const trees = Object.fromEntries(['reference', 'astylar'].map(side => {
    const receipt = row.inputTrees[side], bytes = readFileSync(receipt.file);
    assert.equal(hash(bytes), receipt.sha256); return [side, JSON.parse(bytes)];
  }));
  const ripple = trees.reference.nodes.find(n => n.attributes?.class === 'mat-mdc-button-persistent-ripple mdc-button__ripple');
  assert.ok(ripple);
  const pseudo = ripple.pseudoElements.find(p => p.pseudo === '::before'); assert.ok(pseudo?.generated);
  const style = trees.reference.styles[pseudo.style];
  assert.equal(style.backgroundColor, 'rgb(255, 255, 255)'); assert.equal(style.opacity, '0.12');
  const focusRule = pseudo.rules.map(i => trees.reference.rules[i]).find(r => r.active && r.selector.includes('cdk-program-focused') && r.declarations.opacity);
  assert.ok(focusRule);
  const button = trees.astylar.nodes.find(n => n.authored?.id === 'snack-bar-primary'); assert.ok(button);
  assert.equal(button.normalResolvedStyle.background, '#6750a4');
  assert.equal(button.interactionResolvedStyle.background, '#6750a4');
  assert.equal(button.interactionResolvedStyle.boxShadow, '0 0 0 1px rgba(0,0,0,0)');
  assert.equal(trees.astylar.nodes.filter(n => n.parent === button.key).length, 0);
  const candidateFocusRules = trees.astylar.rules.filter(r => r.selector === '.material-button:focus');
  assert.equal(candidateFocusRules.length, 2);
  for (const rule of candidateFocusRules) {
    assert.equal(rule.boxShadow, '0 0 0 1px rgba(0,0,0,0)');
    assert.equal(rule.background, undefined);
  }
  const pixels = [];
  for (const side of ['reference', 'astylar']) {
    const receipt = checkpoint.files.find(f => f.file.endsWith('/' + side + '.png')); assert.ok(receipt);
    const png = PNG.sync.read(readFileSync(root + receipt.file)); assert.equal(png.width, 1440); assert.equal(png.height, 1000);
    const box = row.geometry.elements.find(e => e.id === 'snack-bar-primary')[side === 'reference' ? 'expected' : 'actual'];
    const x = Math.floor(box.left) + 12, y = Math.floor(box.top + box.height / 2);
    pixels.push({ side, file: root + receipt.file, sha256: receipt.sha256, x, y, rgba: [...png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 4)] });
  }
  assert.deepEqual(pixels.map(p => p.rgba), [[121, 101, 175, 255], [103, 80, 164, 255]]);
  const { gunzipSync } = await import('node:zlib'), { default: ts } = await import('typescript');
  const original = gunzipSync(Buffer.from(readFileSync('docs/evidence/material-original-runner-e01.mjs.gz.b64', 'utf8').replace(/\s/g, ''), 'base64'));
  assert.equal(hash(original), 'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0');
  const ast = ts.createSourceFile('original.mjs', original.toString(), 99, true, ts.ScriptKind.JS);
  const nodes = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'compareStatePaint'); assert.equal(nodes.length, 1);
  const compare = new Function('normalizeColor', `return (${nodes[0].getText(ast)})`)(
    () => { throw new Error('Unexpected normalization after denied measurement'); });
  const reached = new Error('measurement read'), denied = new Proxy({}, { get() { throw reached; } });
  assert.deepEqual(compare(denied, denied, 'snack-bar', 'light', 'focus'), { matches: true });
  assert.throws(() => compare(denied, denied, 'button', 'light', 'activate-leave'), error => error === reached);
  assert.deepEqual(row.statePaint, { matches: true });
  t.diagnostic(JSON.stringify({ case: 'interaction:snack-bar@light/desktop-dpr1/focus', pixels,
    nativeFocus: { selector: focusRule.selector, whiteOpacity: style.opacity }, candidateFocusRules,
    comparatorSha256: hash(nodes[0].getText(ast)), rejectedMeasuredBranchControl: 1,
    boundary: 'One original focus case:unequal native pseudo-layer versus candidate focus inputs and a paint-comparator coverage gap. Not an equal-input core failure,all button families/themes,complete glyph/edge/ripple paint,current rendering or permission to patch fixture colors.' }));
});

test('original snackbar hover and held fill samples do not establish equivalent layer composition', async t => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const root = 'artifacts/material-parity/current-full-20261005/';
  const bytes = readFileSync(root + 'latest-report.json');
  assert.equal(hash(bytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const report = JSON.parse(bytes), observations = [];
  for (const [state, checkpointId, checkpointSha, alpha, background] of [
    ['hover', '006f2470f55df7e5216eda18f2faa95ea9e9eafae3ba03b9256462351e9a5bc5', '25f829bf709f91f46a361cc2117b5718077f53e925525a8ff8da64bcb09eb1e9', .08, '#735eab'],
    ['held', '7edef9b8fd31da13635660bff8d86d6635efc007a751e96a4b5585b370d36928', 'ccf1117e742b485101b59b357efe61ccacdd62098db3803303f1bf574499bf16', .12, '#7965af'],
  ]) {
    const row = report.interactions.find(r => r.family === 'snack-bar' && r.profile === 'light' && r.viewport.id === 'desktop-dpr1' && r.state === state); assert.ok(row);
    const checkpointFile = root + 'checkpoint/' + checkpointId + '.json', checkpointBytes = readFileSync(checkpointFile);
    assert.equal(hash(checkpointBytes), checkpointSha);
    const checkpoint = JSON.parse(checkpointBytes);
    assert.deepEqual(checkpoint.result, row); assert.equal(hash(JSON.stringify(row)), checkpoint.sha256);
    for (const receipt of checkpoint.files) assert.equal(hash(readFileSync(root + receipt.file)), receipt.sha256);
    const trees = Object.fromEntries(['reference', 'astylar'].map(side => {
      const receipt = row.inputTrees[side], b = readFileSync(receipt.file); assert.equal(hash(b), receipt.sha256);
      return [side, JSON.parse(b)];
    }));
    const nativeButton = trees.reference.nodes.find(n => n.attributes?.id === 'snack-bar-primary'); assert.ok(nativeButton);
    assert.equal(trees.reference.styles[nativeButton.style].backgroundColor, 'rgb(103, 80, 164)');
    const ripple = trees.reference.nodes.find(n => n.attributes?.class === 'mat-mdc-button-persistent-ripple mdc-button__ripple'); assert.ok(ripple);
    const pseudo = ripple.pseudoElements.find(p => p.pseudo === '::before'); assert.ok(pseudo?.generated);
    const layer = trees.reference.styles[pseudo.style];
    assert.equal(layer.backgroundColor, 'rgb(255, 255, 255)'); assert.equal(Number(layer.opacity), alpha);
    const button = trees.astylar.nodes.find(n => n.authored?.id === 'snack-bar-primary'); assert.ok(button);
    assert.equal(button.normalResolvedStyle.background, '#6750a4');
    assert.equal(button.interactionResolvedStyle.background, background);
    assert.equal(trees.astylar.nodes.filter(n => n.parent === button.key).length, 0);
    const samples = [];
    // One retained opaque base/white-layer interior only,not a color parser or
    // general compositing model. Raw requests remain separately represented.
    const expectedRGB = [103, 80, 164].map(value => Math.round(value * (1 - alpha) + 255 * alpha));
    for (const side of ['reference', 'astylar']) {
      const receipt = checkpoint.files.find(f => f.file.endsWith('/' + side + '.png')); assert.ok(receipt);
      const png = PNG.sync.read(readFileSync(root + receipt.file)); assert.equal(png.width, 1440); assert.equal(png.height, 1000);
      const box = row.geometry.elements.find(e => e.id === 'snack-bar-primary')[side === 'reference' ? 'expected' : 'actual'];
      const x = Math.floor(box.left) + 12, y = Math.floor(box.top + box.height / 2);
      const rgba = [...png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 4)];
      assert.deepEqual(rgba, [...expectedRGB, 255]);
      samples.push({ side, file: root + receipt.file, sha256: receipt.sha256, x, y, rgba });
    }
    assert.equal(row.astylarState.open, false);
    observations.push({ state, checkpoint: { file: checkpointFile, sha256: checkpointSha }, nativeWhiteLayerOpacity: layer.opacity,
      candidateHostBackground: background, candidateLayerChildren: 0, samples });
  }
  const { gunzipSync } = await import('node:zlib'), { default: ts } = await import('typescript');
  const original = gunzipSync(Buffer.from(readFileSync('docs/evidence/material-original-runner-e01.mjs.gz.b64', 'utf8').replace(/\s/g, ''), 'base64'));
  assert.equal(hash(original), 'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0');
  const ast = ts.createSourceFile('original.mjs', original.toString(), 99, true, ts.ScriptKind.JS);
  const nodes = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'captureInteractionCase'); assert.equal(nodes.length, 1);
  const capture = nodes[0].getText(ast), image = capture.indexOf('const [referenceBuffer, astylarBuffer]'), release = capture.indexOf('for (const release of heldReleases) await release();'), events = capture.indexOf('const referenceEvents =');
  assert.ok(image >= 0 && release > image && events > release);
  t.diagnostic(JSON.stringify({ observations, captureMethodSha256: hash(capture), imageBeforeReleaseBeforeEvents: true,
    boundary: 'Two original light/DPR1 states and one opaque interior per side. Equal sampled RGB is mathematically accounted for but does not equate pseudo-layer/host composition,animation,ripple,edges,glyphs,other themes or current rendering. Source recipe order is not original elapsed timing;post-release event lists are not held-image event timelines. No case or raster acceptance promoted.' }));
});

test('Snackbar paint batch classifications preserve prior definitions proofs and plans', async () => {
  const { default: ts } = await import('typescript'), path = await import('node:path');
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const metadataFile = 'artifacts/material-parity/divider-consumer-corrected-sections-metadata-20261102.log';
  const metadataBytes = readFileSync(metadataFile);
  assert.equal(hash(metadataBytes), 'a9e837c7b1dd564e1f5a46dd008d1c255736c37e73a82cd6f253204875091cd6');
  const accepted = JSON.parse((metadataBytes[0] === 255 ? metadataBytes.toString('utf16le') : metadataBytes.toString()).replace(/^\ufeff/, '')).current.metadata;
  const policyFile = 'tests/material-parity/input-equivalence-policy.mjs';
  const priorPolicy = execFileSync('git', ['show', 'c8095ca7:' + policyFile], { maxBuffer: 8 * 1024 * 1024 });
  assert.equal(hash(priorPolicy.toString().replace(/\r\n/g, '\n')), accepted.sourceFingerprints.find(r => r.file === policyFile).sha256);
  const prior = await import('data:text/javascript;base64,' + priorPolicy.toString('base64'));
  assert.equal(prior.sourceAuditDefinitions.length, 206); assert.equal(sourceAuditDefinitions.length, 208);
  assert.deepEqual(sourceAuditDefinitions.slice(0, 206), prior.sourceAuditDefinitions);
  for (const name of ['propertyGroups', 'inputDifferenceClassifications', 'pluginBoundaryVerdict']) {
    const current = await import('./input-equivalence-policy.mjs'); assert.deepEqual(current[name], prior[name]);
  }
  const producerFile = 'tests/material-parity/input-equivalence-audit.mjs';
  const currentProducer = readFileSync(producerFile, 'utf8').replace(/\r\n/g, '\n');
  const oldProducer = execFileSync('git', ['show', 'c8095ca7:' + producerFile], { maxBuffer: 8 * 1024 * 1024 }).toString().replace(/\r\n/g, '\n');
  assert.equal(hash(oldProducer.replace(/\r\n/g, '\n')), accepted.sourceFingerprints.find(r => r.file === producerFile).sha256);
  const extract = (source, name) => {
    const ast = ts.createSourceFile('audit.mjs', source, 99, true, ts.ScriptKind.JS);
    assert.deepEqual(ast.parseDiagnostics, []);
    const matches = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name); assert.equal(matches.length, 1);
    return matches[0];
  };
  const entries = (source, name) => {
    let result;
    const visit = node => { if (!result && ts.isArrayLiteralExpression(node)) result = node; ts.forEachChild(node, visit); };
    visit(extract(source, name)); assert.ok(result);
    return result.elements.map(n => n.getText());
  };
  for (const [name, additions, oldCount] of [['sourceFingerprints', 2, 1149], ['focusedProofInventory', 8, 477], ['implementationPlan', 2, 73]]) {
    const before = entries(oldProducer, name), after = entries(currentProducer, name);
    assert.equal(before.length, oldCount); assert.equal(after.length, oldCount + additions);
    assert.deepEqual(after.slice(additions), before);
  }
  const scan = new Function('sourceAuditDefinitions', 'path', 'readFileSync', `return (${extract(currentProducer, 'scanMaterialSources').getText()})`)(sourceAuditDefinitions, path, readFileSync);
  const rows = scan(process.cwd()); assert.equal(rows.length, 208);
  assert.ok(rows.every(r => r.detected), 'Every existing and new source anchor must still match');
  const expected = ['fixture-filled-button-programmatic-focus-layer-omitted', 'audit-state-paint-unmeasured-family-returns-success'];
  assert.deepEqual(rows.slice(-2).map(r => r.id), expected);
  for (const row of rows.slice(-2)) {
    assert.equal(row.locations.length, 1); assert.equal(row.inputEquivalent, false); assert.equal(row.currentRenderingAccepted, false);
    for (const receipt of row.evidence) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
    const source = readFileSync(row.file, 'utf8'), expression = new RegExp(row.pattern, 'g');
    assert.equal([...source.matchAll(expression)].length, 1);
    assert.equal(new RegExp(row.pattern).test(source.replace(expression, '/* rejected detector control */')), false);
  }
  console.log(JSON.stringify({ sources: 1151, proofs: 485, findings: 208, plans: 75,
    priorDefinitionsPreserved: 206, priorProofEntriesPreserved: 477, newFindingIds: expected,
    newDetectorControls: 2, canonicalPublished: false, casePromoted: false }));
});

test('retained trigger paint join conserves all accepted parents and source generations', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const file = 'artifacts/material-parity/working-audit/695dea7b4cf15915138ac671c75edf2655587db4719c3be9fe7724b402ed6249/index.json';
  const bytes = readFileSync(file);
  assert.equal(hash(bytes), '23dc19f652886ea2c02b2a3e8aedb6074beb2046837223fbd222f36cbb3ea045');
  const inspection = JSON.parse(bytes).metadata.coverage.inspectionEvidence, parents = inspection.cases;
  assert.equal(hash(JSON.stringify(parents)), triggerPaintPredecessor);
  const joined = joinRetainedTriggerPaintInputs(parents);
  assert.deepEqual(joined.changed, { divider: 24, snackbar: 4 });
  assert.deepEqual(restoreRetainedTriggerPaintInputs(joined.cases), parents);
  const dependencies = new Map(inspection.evidenceFingerprints.map(r => [r.file, r.sha256]));
  for (let i = 0; i < parents.length; i++) {
    const row = joined.cases[i], before = parents[i];
    assert.equal(row.inspection, before.inspection); assert.equal(row.currentRendering, before.currentRendering);
    assert.deepEqual(row.obligations.inputStyleStructure.remaining, before.obligations.inputStyleStructure.remaining);
    assert.deepEqual(row.obligations.localPaint.remaining, before.obligations.localPaint.remaining);
    const children = [row.obligations.inputStyleStructure.retainedClippingCallerRouting, row.obligations.localPaint.retainedTriggerStatePaint].filter(Boolean);
    if (!children.length) assert.equal(row, before);
    for (const child of children) for (const receipt of child.evidence) {
      if (dependencies.has(receipt.file)) assert.equal(dependencies.get(receipt.file), receipt.sha256, 'Never replace a historical source receipt');
      dependencies.set(receipt.file, receipt.sha256);
      assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
    }
  }
  assert.throws(() => joinRetainedTriggerPaintInputs(joined.cases));
  for (const suffix of ['divider-clipping-caller-routing-ancestry-bound-20261102.log', 'snackbar-paint-classification-array-integration-20261102.log', 'trigger-paint-clipping-producer-20261102.mjs'])
    assert.throws(() => joinRetainedTriggerPaintInputs(parents, file => file.endsWith(suffix) ? Buffer.from('forged') : readFileSync(file)));
  console.log(JSON.stringify({ predecessor: triggerPaintPredecessor, successorCasesSha256: joined.sha256,
    cases: parents.length, changed: joined.changed, dependencies: dependencies.size, rejectedControls: 4,
    canonicalPublished: false, inspectionPromoted: false, currentRenderingAccepted: false }));
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
