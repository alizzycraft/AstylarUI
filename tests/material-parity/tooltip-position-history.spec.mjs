import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const file = 'examples/material-showcase/src/app/astylar.component.ts';
test('tooltip open join preserves all predecessor obligations and rejects changed receipts', async () => {
  const { readFileSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const { joinTooltipOpen, restoreTooltipOpen } = await import('../../scripts/join-material-tooltip-open.mjs');
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const indexBytes = readFileSync('artifacts/material-parity/working-audit/a58e7a479344f0e809010974627ab188fb4e84b5258f4895f52bbb2911dcad07/index.json');
  assert.equal(hash(indexBytes), '4abe8026ba5add4a80a471ba20fd9a5124c5dde2385354d04843c48f9f5cb413');
  const evidence = JSON.parse(indexBytes).metadata.coverage.inspectionEvidence;
  const parent = { kind: 'case-obligation-coverage-extension', status: 'proposal-not-canonical',
    ...(evidence.schemaVersion === 2 ? { inspectionSchemaVersion: 2 } : {}), scope: evidence.scope, groups: evidence.cases };
  const original = JSON.stringify(parent);
  const result = joinTooltipOpen(parent);
  assert.equal(result.cases, 8); assert.equal(result.review.groups.length, 2311);
  assert.deepEqual(restoreTooltipOpen(result.review), parent);
  assert.equal(JSON.stringify(parent), original);
  const changed = result.review.groups.filter((g, i) => JSON.stringify(g) !== JSON.stringify(parent.groups[i]));
  assert.equal(changed.length, 8);
  for (const group of result.review.groups) {
    assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
  }
  assert.throws(() => joinTooltipOpen({ ...parent, scope: 'altered scope' }));
  for (const suffix of ['latest-report.json', 'manifest.json', '.png', '-astylar.json']) {
    let changedRead = false;
    assert.throws(() => joinTooltipOpen(parent, name => {
      const bytes = readFileSync(name);
      if (name.endsWith(suffix)) { changedRead = true; return Buffer.concat([bytes, Buffer.from('corrupt')]); }
      return bytes;
    }));
    assert.equal(changedRead, true, suffix);
  }
});

test('tooltip diagnostic source applicability authenticates both exact driver revisions', async () => {
  const { readFileSync } = await import('node:fs');
  const { reconcileTooltipActivationDriver, createTooltipOpenHistoricalRead } = await import('../../scripts/join-material-tooltip-open.mjs');
  const { createDatepickerHistoricalRead } = await import('./datepicker-opening-registration.mjs');
  const path = await import('node:path');
  const { createHash } = await import('node:crypto');
  const name = 'scripts/audit-material-configured-control-activation.mjs';
  const current = readFileSync(name), previous = execFileSync('git', ['show', `a566bdf0:${name}`]);
  assert.deepEqual(reconcileTooltipActivationDriver(current, previous), previous);
  assert.throws(() => reconcileTooltipActivationDriver(Buffer.concat([current, Buffer.from('drift')]), previous));
  assert.throws(() => reconcileTooltipActivationDriver(current, Buffer.concat([previous, Buffer.from('drift')])));
  const root = process.cwd(), read = (name, options) => readFileSync(path.resolve(root, name), options);
  const historical = createTooltipOpenHistoricalRead({ root, read });
  assert.deepEqual(historical(name), previous);
  assert.equal(historical(name, 'utf8'), previous.toString());
  const nested = createDatepickerHistoricalRead({ root, read: historical });
  assert.equal(createHash('sha256').update(nested(name)).digest('hex'),
    '26d7a294d0c5b4aaa2179fa7a697178b099391493ba28f9ac0261a04bd2d6d46');
  assert.deepEqual(readFileSync(name), current);
});

test('configured tooltip open clicks retain eight exact divergent popup endpoints', async () => {
  const { readFileSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const directory = 'artifacts/material-parity/tooltip-configured-open-20261028';
  const bytes = readFileSync(`${directory}/latest-report.json`);
  assert.equal(hash(bytes), '48dfc121bb0788f4f2d595fd0d3097adae4a48edd53bd1bd6eb381b75ca26dbd');
  const report = JSON.parse(bytes);
  const verified = JSON.parse(execFileSync(process.execPath,
    ['scripts/audit-material-configured-control-activation.mjs', '--verify', directory, '--tooltip-open'], { encoding: 'utf8' }));
  assert.equal(verified.cases, 8); assert.equal(verified.sourceRecipeVerified, true);
  const manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  assert.deepEqual(manifest.provenance.browserFiles, JSON.parse(readFileSync(
    'artifacts/material-parity/current-full-20261005/checkpoint/manifest.json')).provenance.browserFiles);
  const inspect = raw => {
    assert.equal(raw.browser, '156.0.8078.48');
    assert.deepEqual(raw.results.map(r => `${r.profile}/${r.viewport.deviceScaleFactor}`).sort(),
      ['light', 'dark', 'contrast', 'custom'].flatMap(p => [1, 2].map(d => `${p}/${d}`)).sort());
    for (const row of raw.results) for (const side of ['reference', 'astylar']) {
      assert.equal(row.state, 'open');
      const evidence = row[side], samples = evidence.observations;
      assert.deepEqual(samples.map(s => s.boundary), ['before', 'after-action', 'settled']);
      assert.deepEqual(samples.map(s => s.state.open), side === 'reference' ? [false, false, false] : [false, true, true]);
      assert.equal(samples.at(-1).active.logicalId, 'tooltip-primary');
      const pointer = samples.at(-1).events.filter(e => ['pointerdown', 'pointerup', 'click'].includes(e.type));
      assert.deepEqual(pointer.map(e => e.type), ['pointerdown', 'pointerup', 'click']);
      assert.ok(pointer.every(e => e.trusted));
      const treeBytes = readFileSync(evidence.inputTree.file);
      assert.equal(hash(treeBytes), evidence.inputTree.sha256);
      const popup = JSON.parse(treeBytes).nodes.filter(n => side === 'reference'
        ? String(n.attributes?.class ?? '').split(/\s+/).includes('mat-mdc-tooltip-surface')
        : n.authored?.id === 'tooltip-popup');
      assert.equal(popup.length, side === 'reference' ? 0 : 1);
    }
  };
  inspect(report);
  for (const mutate of [r => r.results.pop(),
    r => { r.results[0].astylar.observations.at(-1).state.open = false; },
    r => { r.results[0].reference.observations.at(-1).events.find(e => e.type === 'click').trusted = false; }]) {
    const changed = structuredClone(report); mutate(changed); assert.throws(() => inspect(changed));
  }
  // Current Chrome over retained assets, not the original Chrome154 execution,
  // intermediate paint, native anonymous hit ancestry, or whole-case closure.
});
test('supplementary Android tooltip actions cannot close responsive canonical cases', async () => {
  const { readFileSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const { gunzipSync } = await import('node:zlib');
  const ts = await import('typescript');
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  const original = gunzipSync(Buffer.from(readFileSync(
    'docs/evidence/material-original-runner-e01.mjs.gz.b64', 'utf8').replace(/\s/g, ''), 'base64'));
  assert.equal(sha(original), 'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0');
  const checkContexts = source => {
    const ast = ts.createSourceFile('retained-runner.mjs', source, ts.ScriptTarget.Latest, true);
    assert.deepEqual(ast.parseDiagnostics, []);
    const contexts = [];
    const visit = node => {
      if (ts.isCallExpression(node) && node.expression.getText(ast) === 'browser.newContext') {
        const options = node.arguments[0];
        assert.ok(ts.isObjectLiteralExpression(options));
        assert.ok(options.properties.every(p => ts.isPropertyAssignment(p)));
        contexts.push(options.properties.map(p => p.name.getText(ast)).sort());
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
    assert.equal(contexts.length, 2);
    for (const keys of contexts) assert.deepEqual(keys,
      ['colorScheme', 'deviceScaleFactor', 'reducedMotion', 'viewport']);
  };
  checkContexts(original.toString());
  for (const addition of ['hasTouch: true,', 'isMobile: true,', "userAgent: 'Android',", '...unknownContext,']) {
    assert.throws(() => checkContexts(original.toString().replace('browser.newContext({', `browser.newContext({${addition}`)));
  }
  const fullBytes = readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(sha(fullBytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const provenance = JSON.parse(fullBytes).captureProvenance;
  const cases = [...provenance.cases, ...provenance.interactionCases, ...provenance.mobileFlowCases]
    .filter(row => row.family === 'tooltip');
  assert.equal(cases.length, 62);
  const traceBytes = readFileSync('artifacts/material-parity/tooltip-release-component-caller-20261027/latest-report.json');
  assert.equal(sha(traceBytes), '2c88162f006c9e17a53983d479ae90f4b5388396bb8674e2fc3bee3ed536445b');
  const trace = JSON.parse(traceBytes);
  assert.equal(trace.hasTouch, true); assert.equal(trace.isMobile, true);
  assert.match(trace.userAgent, /Android/);
  assert.equal(trace.results.length, 4);
  for (const row of trace.results) {
    assert.equal(row.cohort, 'android-trusted-touch');
    assert.ok(!cases.some(c => c.state === row.action));
  }
  // These four actions supplement the input-contract investigation. Matching
  // dimensions/DPR do not turn them into any of the 62 original case states.
  // No original obligation, current rendering status or acceptance gate changes.
});
test('first release trace retains exact producer recovery without changing current capture reads', async () => {
  const { readFileSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const { validateSupplementalCapture } = await import('./supplemental-capture-evidence.mjs');
  const { propertyGroups } = await import('./input-equivalence-policy.mjs');
  const hash = value => createHash('sha256').update(value).digest('hex');
  const reportFile = 'artifacts/material-parity/tooltip-release-caller-20261027/latest-report.json';
  const bytes = readFileSync(reportFile);
  assert.equal(hash(bytes), '564dc47771b271115b23cb42523fdc41f9d135b0e6392c17b5cf076f71baad04');
  const report = JSON.parse(bytes), script = 'scripts/audit-material-tooltip-touch.mjs';
  const current = readFileSync(script, 'utf8');
  const recover = source => {
    const start = source.indexOf('          const originalShow = tooltip.show;');
    const end = source.indexOf("          record('installation'", start);
    assert.ok(start >= 0 && end > start);
    const restored = source.slice(0, start) + source.slice(end);
    assert.equal(hash(restored), report.capture.sources.find(row => row.file === script).sha256);
    return Buffer.from(restored);
  };
  const restored = recover(current);
  assert.throws(() => recover(current.replace("const script =", "const alteredScript =")));
  assert.throws(() => recover(current.replace('const originalShow = tooltip.show;', 'const missing = tooltip.show;')));
  const options = { reportFile, script, expectedProvenance: JSON.parse(readFileSync(report.capture.checkpointManifest.file)).provenance,
    styleProperties: Object.values(propertyGroups).flat() };
  // Strict normal validation rejects the changed producer; only this pinned
  // historical read may substitute its fully recovered original bytes.
  assert.equal(validateSupplementalCapture(report, options).status, 'invalid');
  const path = await import('node:path');
  assert.deepEqual(validateSupplementalCapture(report, { ...options,
    readBytes: file => path.resolve(file) === path.resolve(script) ? restored : readFileSync(file) }),
  { status: 'checkpoint-bound', errors: [] });
  for (const row of report.results) for (const side of ['reference', 'astylar']) {
    const receipt = row[side].screenshot;
    assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  }
  assert.equal(readFileSync(script, 'utf8'), current);
});
test('fresh tooltip release trace observes body-interaction immediate component hide after trusted click', async () => {
  const { readFileSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const { validateSupplementalCapture } = await import('./supplemental-capture-evidence.mjs');
  const { propertyGroups } = await import('./input-equivalence-policy.mjs');
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const reportFile = 'artifacts/material-parity/tooltip-release-component-caller-20261027/latest-report.json';
  const bytes = readFileSync(reportFile);
  assert.equal(hash(bytes), '2c88162f006c9e17a53983d479ae90f4b5388396bb8674e2fc3bee3ed536445b');
  const report = JSON.parse(bytes);
  const expectedProvenance = JSON.parse(readFileSync(report.capture.checkpointManifest.file)).provenance;
  assert.equal(report.browser, '156.0.8078.48');
  assert.deepEqual(expectedProvenance.browserFiles, JSON.parse(readFileSync(
    'artifacts/material-parity/current-full-20261005/checkpoint/manifest.json')).provenance.browserFiles);
  assert.deepEqual(validateSupplementalCapture(report, { reportFile, expectedProvenance,
    script: 'scripts/audit-material-tooltip-touch.mjs', styleProperties: Object.values(propertyGroups).flat() }),
  { status: 'checkpoint-bound', errors: [] });
  for (const row of report.results) for (const side of ['reference', 'astylar']) {
    const receipt = row[side].screenshot;
    assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  }
  const inspect = raw => {
    const held = raw.results.find(row => row.action === 'long-held').reference.samples.at(-1);
    const release = raw.results.find(row => row.action === 'long-release').reference;
    assert.equal(held.shown, true); assert.equal(release.samples[0].shown, false);
    const events = release.releaseTrace.filter(row => row.time > held.time);
    assert.deepEqual(events.map(row => row.kind), ['hide', 'component-hide', 'event', 'component-hide']);
    assert.deepEqual(events.filter(row => row.kind.includes('hide')).map(row => row.delay), [1500, 1500, 0]);
    assert.equal(events[2].type, 'click'); assert.equal(events[2].trusted, true);
    assert.match(events[0].stack, /HTMLButtonElement\.touchendListener/);
    assert.match(events[3].stack, /_TooltipComponent\._handleBodyInteraction/);
    assert.ok(events.every((row, i) => i === 0 || row.time >= events[i - 1].time));
    assert.ok(events[3].time < release.samples[0].time);
  };
  inspect(report);
  for (const mutate of [
    r => { r.results.find(row => row.action === 'long-release').reference.releaseTrace.at(-1).delay = 1500; },
    r => { r.results.find(row => row.action === 'long-release').reference.releaseTrace.at(-1).stack = 'unknown'; },
    r => { r.results.find(row => row.action === 'long-held').reference.samples.at(-1).shown = false; },
  ]) { const altered = structuredClone(report); mutate(altered); assert.throws(() => inspect(altered)); }
  // This diagnoses the fresh instrumented run, not the unobserved Chrome154 caller.
});
test('retained tooltip touch release timing excludes capture-delay expiry, not unobserved dismissal paths', async () => {
  const { readFileSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const read = (file, expected) => {
    const bytes = readFileSync(file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected);
    return bytes.toString('utf8');
  };
  const report = JSON.parse(read('artifacts/material-parity/tooltip-trusted-touch-20261008/latest-report.json',
    '7949f5618b27fd71f0523db844428ecc8f3c9b52e9bf7414e23e0712eeb40332'));
  const producer = execFileSync('git', ['show', 'e34e0c23:scripts/audit-material-tooltip-touch.mjs'], { encoding: 'utf8' });
  assert.equal(createHash('sha256').update(producer).digest('hex'),
    '50628b4edf89d4fb33c9b0bc810f806a8a4e1ed72a378048bd5adaec9c162bb3');
  assert.ok(producer.indexOf("await capture('long-held', [early, late]);") <
    producer.indexOf("const releaseEarly = await observe('release-early', 100)"));
  // This producer did not observe click/focusout/hide calls. Do not assign a cause
  // merely because pointerleave is present in its restricted event stream.
  const eventTypes = producer.slice(producer.indexOf('for (const type of ['), producer.indexOf('document.addEventListener(type'));
  assert.ok(!eventTypes.includes("'click'") && !eventTypes.includes("'focusout'"));
  const inspect = samples => {
    const held = samples.find(e => e.action === 'long-held').reference.samples.at(-1);
    const early = samples.find(e => e.action === 'long-release').reference.samples[0];
    const end = early.events.findLast(e => e.type === 'touchend');
    assert.equal(held.shown, true); assert.equal(early.shown, false);
    assert.equal(end.trusted, true);
    assert.equal(early.time - end.time, 105.5);
    assert.ok(end.time > held.time && end.time - held.time < 117);
    return { sinceTouchEndMs: early.time - end.time, hideCause: 'unobserved' };
  };
  assert.deepEqual(inspect(report.results), { sinceTouchEndMs: 105.5, hideCause: 'unobserved' });
  for (const mutate of [
    r => { r.find(e => e.action === 'long-release').reference.samples[0].time += 1500; },
    r => { r.find(e => e.action === 'long-release').reference.samples[0].events = []; },
    r => { r.find(e => e.action === 'long-release').reference.samples[0].shown = true; },
  ]) { const altered = structuredClone(report.results); mutate(altered); assert.throws(() => inspect(altered)); }
});
test('captured native tooltip touch exits request delayed hide while body interaction can hide immediately', async () => {
  const { readFileSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  const checkpointBytes = readFileSync('artifacts/material-parity/current-full-20261005/checkpoint/manifest.json');
  assert.equal(sha(checkpointBytes), '7ae2cba1739353661a0c84e28ef70819157311cc824fd00ae94ced29fadeb352');
  const checkpoint = JSON.parse(checkpointBytes);
  const root = 'examples/material-showcase/.audit-historical-build-1275fa1d/dist/authenticated-replay/browser/';
  for (const file of ['chunk-7SL66K3U.js', 'chunk-7SL66K3U.js.map']) {
    assert.equal(sha(readFileSync(root + file)), checkpoint.provenance.browserFiles.find(row => row.file === file).sha256);
  }
  const map = JSON.parse(readFileSync(root + 'chunk-7SL66K3U.js.map'));
  const source = map.sourcesContent[map.sources.indexOf('node_modules/@angular/material/fesm2022/module-CWxMD37a.mjs')];
  assert.equal(sha(source), 'ec40d42a49f6c3b660cd08110c263f99e91481f6edaf2c37e1330832a76fd409');
  const ts = await import('typescript');
  const ast = ts.createSourceFile('captured.mjs', source, ts.ScriptTarget.Latest, true);
  const method = name => {
    const matches = [];
    const visit = node => { if (ts.isMethodDeclaration(node) && node.name.getText(ast) === name) matches.push(node); ts.forEachChild(node, visit); };
    visit(ast); assert.equal(matches.length, 1);
    return new Function(matches[0].body.getText(ast).slice(1, -1));
  };
  const hides = [], installed = [];
  const host = { _platform: { ANDROID: true, IOS: false }, touchGestures: 'auto',
    _defaultOptions: { touchendHideDelay: 1500 }, _passiveListeners: [],
    _platformSupportsMouseEvents: method('_platformSupportsMouseEvents'),
    _disableNativeGesturesIfNecessary() {}, _addListeners(rows) { installed.push(...rows); },
    hide(delay) { hides.push(delay); } };
  method('_setupPointerExitEventsIfNeeded').call(host);
  assert.deepEqual(installed.map(([type]) => type), ['touchend', 'touchcancel']);
  for (const [, callback] of installed) callback();
  assert.deepEqual(hides, [1500, 1500]);
  method('_handleBodyInteraction').call({ _closeOnInteraction: true, hide: delay => hides.push(delay) });
  assert.deepEqual(hides, [1500, 1500, 0]);
  // Conditional source execution, not a claim that body interaction caused the
  // retained runtime hide: the original trace omitted that event/caller.
});
const source = commit => execFileSync('git', ['show', `${commit}:${file}`], { encoding: 'utf8' });
const rule = (text, selector) => {
  const matches = text.split(/\r?\n/).filter(line => line.includes(`selector: '${selector}'`));
  assert.equal(matches.length, 1);
  return matches[0];
};

test('tooltip history records calibration followed by local-flow substitution, not restored overlay equivalence', () => {
  const calibrated = source('662c179399121a8d05d9235dac42c560eb255e93');
  assert.match(calibrated, /const tooltipTransform = devicePixelRatio >= 1\.5/);
  for (const value of ['47.5px, 11.5px', '50.5px, 20.5px', '92px, 26px', '92px, 25px', '92px, 39px']) {
    assert.ok(calibrated.includes(`translate(${value})`));
  }
  assert.match(rule(calibrated, '#tooltip-popup'), /position: 'absolute'.*top: '76px'.*left: '44px'.*transform: tooltipTransform/);

  const flow = source('f3c8254');
  assert.ok(!flow.includes('const tooltipTransform'));
  assert.match(rule(flow, '.tooltip-anchor'), /width: '141px'.*height: '72px'.*flexDirection: 'column'/);
  assert.match(rule(flow, '#tooltip-popup'), /position: 'relative'.*marginLeft: '16px'.*transform: 'translate\(93px, 37px\)'/);
  assert.ok(flow.includes("id: 'tooltip-anchor', class: 'tooltip-anchor', children:"));

  const centered = source('899c741771d1a75db578d6bb0dabec8b40cd48ba');
  assert.match(rule(centered, '.tooltip-anchor'), /alignItems: 'center'.*gap: '8px'/);
  const centeredPopup = rule(centered, '#tooltip-popup');
  assert.match(centeredPopup, /position: 'relative'.*width: '107px'.*justifyContent: 'center'/);
  assert.ok(!centeredPopup.includes('transform:'));

  const typography = source('f324bd1');
  assert.match(rule(typography, '.tooltip-anchor'), /width: '138px'.*height: '72px'/);
  const finalPopup = rule(typography, '#tooltip-popup');
  assert.match(finalPopup, /position: 'relative'.*height: '24px'.*fontSize: '12px'.*lineHeight: '16px'/);
  assert.ok(!finalPopup.includes('width:'));
  assert.ok(!finalPopup.includes('transform:'));
});
