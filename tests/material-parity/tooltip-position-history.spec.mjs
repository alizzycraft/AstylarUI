import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const file = 'examples/material-showcase/src/app/astylar.component.ts';
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
