import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { openSupplementalCapture, parseSupplementalCaptureArguments, validateSupplementalCapture } from './supplemental-capture-evidence.mjs';
import { collectSupplementalBehavior, collectSupplementalOverlays, collectSupplementalSlider } from './input-equivalence-audit.mjs';
import { validateCalendarCloseCapture } from './calendar-close-evidence.mjs';
import { propertyGroups } from './input-equivalence-policy.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const script = 'scripts/audit-material-picker-commits.mjs';
const sourceFiles = [script, 'tests/material-parity/supplemental-capture-evidence.mjs', 'tests/material-parity/input-tree-evidence.mjs'];
const propertyNames = ['fontFamily', 'lineHeight', 'direction'];
const assetTypes = ['document', 'script', 'stylesheet', 'font'];
const assetFiles = ['index.csr.html', 'main.js', 'styles.css', 'media/font.woff2'];
const args = ['--base-url=http://127.0.0.1:4431', '--checkpoint=artifacts/material-parity/run/checkpoint',
  '--output=artifacts/material-parity/fresh/picker-commit-audit'];

function calendarFixture() {
  const f = fixture();
  const raw = f.raw;
  raw.schemaVersion = 1;
  raw.profile = 'light';
  raw.viewport = { width: 1440, height: 900 };
  raw.capture.styleProperties = Object.values(propertyGroups).flat();
  raw.capture.sources = ['scripts/audit-material-calendar-close.mjs', ...sourceFiles.slice(1)].map(file => f.put(file, file));
  const runtime = structuredClone(raw.results[0].reference.runtime);
  raw.results = [1, 2].flatMap(deviceScaleFactor => ['month', 'multi-year'].map(view => {
    const sides = {};
    for (const side of ['reference', 'astylar']) {
      const events = [{ type: 'click', trusted: true, close: false }];
      const samples = ['opened', 'tab-close', 'blur-close', 'refocus-close', 'activate-close'].map((state, i) => {
        const isRef = side === 'reference', focused = isRef && (i === 1 || i === 3), closed = isRef && i === 4;
        const key = [null, 'Tab', 'Shift+Tab', 'Tab', 'Enter'][i];
        if (i) events.push({ type: 'keydown', key: i === 4 ? 'Enter' : 'Tab', trusted: true, close: isRef && i === 4 });
        if (focused) events.push({ type: 'focusin', trusted: true, close: true });
        if (isRef && i === 2) events.push({ type: 'focusout', trusted: true, close: true });
        if (closed) events.push({ type: 'click', trusted: true, close: true });
        const clip = focused ? 'auto' : 'rect(0px, 0px, 0px, 0px)';
        const tree = { nodes: [{ key: 'root', parent: null }], errors: [], styles: [{ clip }] };
        if (isRef && !closed) tree.nodes.push(
          { key: 'dialog', parent: 'root', type: 'div', attributes: { role: 'dialog', 'aria-modal': 'true', class: 'mat-datepicker-content-container' } },
          { key: 'view', parent: 'dialog', type: view === 'month' ? 'mat-month-view' : 'mat-multi-year-view' },
          { key: 'close', parent: 'dialog', type: 'button', attributes: { type: 'button',
            class: `mat-datepicker-close-button${focused ? '' : ' cdk-visually-hidden'}` }, style: 0 },
          { key: 'label', parent: 'close', type: 'span', attributes: { class: 'mdc-button__label' }, ownText: 'Close calendar' });
        if (!isRef) {
          Object.assign(tree, { resolvedStyleEvidenceVersion: 2, resolvedStyleSource: 'core-style-inspection', resolvedStyleRevision: 0 });
          tree.nodes.push({ key: 'popup', parent: 'root', authored: { id: 'datepicker-popup', role: 'dialog' } });
          for (const id of ['datepicker-icon', 'datepicker-header', 'datepicker-month', 'datepicker-previous', 'datepicker-next']) {
            tree.nodes.push({ key: id, parent: 'popup', authored: { id } });
          }
          tree.nodes.push({ key: 'grid', parent: 'popup', authored: { id: view === 'month' ? 'datepicker-grid' : 'datepicker-year-grid' } });
          for (let n = 0; n < (view === 'month' ? 30 : 24); n++) tree.nodes.push({ key: `cell${n}`, parent: 'grid', authored: { type: 'button' } });
        }
        const stem = `artifacts/material-parity/fresh/picker-commit-audit/${view}-${deviceScaleFactor}-${side}-${state}`;
        const png = Buffer.alloc(24);
        Buffer.from('89504e470d0a1a0a', 'hex').copy(png);
        png.writeUInt32BE(1440 * deviceScaleFactor, 16);
        png.writeUInt32BE(900 * deviceScaleFactor, 20);
        f.bytes.set(path.resolve(f.options.root, `${stem}.png`), png);
        return { state, key, open: !closed, openerFocused: closed, activeIsClose: focused,
          active: { tag: 'button', text: focused ? 'Close calendar' : '12', label: closed ? 'Open calendar' : null,
            class: 'mat-calendar-body-cell' }, controls: [], events: structuredClone(events),
          close: isRef && !closed ? { text: 'Close calendar', clip, clipPath: 'none', position: 'absolute', display: 'flex',
            visibility: 'visible', opacity: '1', box: { left: 65, top: 599, width: 142, height: 40 } } : null,
          inputTree: f.put(`${stem}.json`, tree), screenshot: { file: `${stem}.png`, sha256: hash(png) } };
      });
      sides[side] = { samples, runtime: structuredClone(runtime) };
    }
    return { family: 'datepicker', view, deviceScaleFactor, sides };
  }));
  return f;
}

test('calendar close live evidence requires both views, DPRs, all action boundaries and bound artifacts', () => {
  const { raw, options } = calendarFixture();
  const before = JSON.stringify(raw);
  const result = validateCalendarCloseCapture(raw, options);
  assert.deepEqual(result.errors, []);
  assert.equal(result.binding.status, 'checkpoint-bound');
  assert.equal(result.complete, true);
  assert.equal(result.cases.length, 4);
  assert.ok(result.cases.every(c => c.referenceFocusRevealBlurAndCloseVerified && c.referenceFocusRestorationVerified &&
    c.candidateAuthoredCloseControlAbsent && !c.inputEquivalent && !c.finalRasterVerified));
  assert.equal(JSON.stringify(raw), before);
});

test('calendar close evidence rejects incomplete, mismapped, fabricated or changed action records', () => {
  const mutations = [
    f => f.raw.results.pop(),
    f => { f.raw.results[1].view = 'month'; },
    f => { f.raw.profile = 'dark'; },
    f => { f.raw.results[0].sides.reference.samples.pop(); },
    f => { f.raw.results[0].sides.reference.samples[1].key = 'Enter'; },
    f => { f.raw.results[0].sides.reference.samples[1].activeIsClose = false; },
    f => { f.raw.results[0].sides.reference.samples[1].close.clip = 'rect(0px, 0px, 0px, 0px)'; },
    f => { f.raw.results[0].sides.reference.samples[1].close.box.top = 1000; },
    f => { f.raw.results[0].sides.reference.samples[1].close.opacity = '0'; },
    f => { f.raw.results[0].sides.reference.samples[4].open = true; },
    f => { f.raw.results[0].sides.reference.samples[4].openerFocused = false; },
    f => { f.raw.results[0].sides.reference.samples[4].events.at(-1).trusted = false; },
    f => { f.raw.results[0].sides.reference.samples[2].events.at(-1).close = false; },
    f => { f.raw.results[0].sides.reference.samples[1].events = []; },
    f => { f.raw.results[0].sides.astylar.samples[0].controls.push({ text: 'Close calendar' }); },
    f => { f.raw.results[0].sides.astylar.samples[4].open = false; },
    f => { f.raw.results[0].sides.astylar.runtime.errors.push('bad runtime'); },
    f => { f.raw.capture.sources.pop(); },
    f => { f.raw.results[0].sides.reference.samples[1].screenshot = f.raw.results[0].sides.reference.samples[0].screenshot; },
    f => { const s = f.raw.results[0].sides.reference.samples[1]; f.bytes.get(path.resolve(f.options.root, s.screenshot.file))[0] = 0; },
    f => { f.raw.results[0].sides.reference.samples[1].inputTree.sha256 = '0'.repeat(64); },
  ];
  for (const mutate of mutations) {
    const f = calendarFixture(); mutate(f);
    const result = validateCalendarCloseCapture(f.raw, f.options);
    assert.ok(result.errors.length, String(mutate));
    assert.equal(result.complete, false);
    assert.deepEqual(result.cases, [], 'An invalid capture must not retain partial accepted cases');
  }
});

test('calendar close evidence replays current trees instead of trusting scalar absence and clipping claims', () => {
  const mutations = [
    ['reference', tree => { tree.styles[0].clip = 'auto'; }],
    ['reference', tree => { tree.nodes.find(n => n.key === 'close').parent = 'root'; }],
    ['reference', tree => { tree.nodes.find(n => n.key === 'view').type = 'mat-multi-year-view'; }],
    ['reference', tree => { tree.nodes.find(n => n.key === 'label').ownText = 'Other action'; }],
    ['astylar', tree => { tree.resolvedStyleEvidenceVersion = 1; }],
    ['astylar', tree => { tree.resolvedStyleSource = 'fixture'; }],
    ['astylar', tree => { tree.resolvedStyleRevision = -1; }],
    ['astylar', tree => { tree.nodes.push({ key: 'missing', authored: { type: 'button', ariaLabel: 'Close calendar' } }); }],
    ['astylar', tree => { tree.nodes = tree.nodes.filter(n => n.key !== 'grid'); }],
    ['astylar', tree => { tree.nodes = tree.nodes.filter(n => !n.key.startsWith('cell')); }],
    ['astylar', tree => { tree.nodes.push(structuredClone(tree.nodes[0])); }],
  ];
  for (const [side, mutate] of mutations) {
    const f = calendarFixture(), sample = f.raw.results[0].sides[side].samples[0];
    const tree = JSON.parse(f.options.readBytes(path.resolve(f.options.root, sample.inputTree.file)));
    mutate(tree);
    sample.inputTree = f.put(sample.inputTree.file, tree);
    const result = validateCalendarCloseCapture(f.raw, f.options);
    assert.ok(result.errors.length, String(mutate));
    assert.equal(result.complete, false);
  }
});

test('supplemental capture requires explicit local run and new artifact destination', () => {
  const root = path.resolve('virtual-capture-root');
  assert.deepEqual(parseSupplementalCaptureArguments(args, root), { baseUrl: 'http://127.0.0.1:4431',
    checkpoint: path.join(root, 'artifacts/material-parity/run/checkpoint'), output: path.join(root, 'artifacts/material-parity/fresh/picker-commit-audit') });
  const invalid = [[], args.slice(0, 2), [...args, '--check'], [...args, '--output=another'],
    args.map(arg => arg.startsWith('--output=') ? '--output=' : arg),
    args.map(arg => arg.startsWith('--output=') ? '--output=artifacts/material-parity/../outside' : arg),
    args.map(arg => arg.startsWith('--output=') ? '--output=artifacts/material-parity' : arg),
    args.map(arg => arg.startsWith('--output=') ? '--output=artifacts/material-parity/run/checkpoint' : arg)];
  for (const url of ['https://127.0.0.1:4431', 'http://example.com', 'http://localhost/astylar', 'http://localhost/?x=1',
    'http://localhost/#x', 'http://user:password@localhost']) invalid.push([`--base-url=${url}`, ...args.slice(1)]);
  for (const value of invalid) assert.throws(() => parseSupplementalCaptureArguments(value, root), undefined, JSON.stringify(value));
});

function fixture(root = path.resolve('virtual-capture-root')) {
  const bytes = new Map();
  const put = (file, value) => {
    const content = Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));
    bytes.set(path.resolve(root, file), content);
    return { file, sha256: hash(content) };
  };
  const assets = assetFiles.map((file, index) => ({ file, type: assetTypes[index], sha256: hash(`runtime ${file}`) }));
  const expectedProvenance = { browser: '152.0.0.0', browserFiles: assets.map(({ file, sha256 }) => ({ file, sha256 })), cases: ['pinned'] };
  const checkpointManifest = put('artifacts/material-parity/run/checkpoint/manifest.json', { schemaVersion: 1, provenance: expectedProvenance });
  const sources = sourceFiles.map(file => put(file, `source ${file}`));
  const reportFile = 'artifacts/material-parity/fresh/picker-commit-audit/latest-report.json';
  const sides = Object.fromEntries(['reference', 'astylar'].map(side => [side, {
    runtime: { assets: structuredClone(assets), errors: [] },
    inputTree: put(`artifacts/material-parity/fresh/picker-commit-audit/${side}.json`, { nodes: [{ key: side }], errors: [] }),
  }]));
  const raw = { browser: expectedProvenance.browser,
    capture: { schemaVersion: 1, checkpointManifest, sources, styleProperties: [...propertyNames] }, results: [sides] };
  const options = { root, reportFile, expectedProvenance, script, styleProperties: propertyNames,
    readBytes: absolute => { assert.ok(bytes.has(absolute), `Missing virtual evidence: ${absolute}`); return bytes.get(absolute); } };
  return { raw, options, bytes, put };
}

test('reader binds every side to unchanged checkpoint, runtime assets, sources and complete tree bytes', () => {
  const { raw, options } = fixture();
  const before = JSON.stringify(raw);
  assert.deepEqual(validateSupplementalCapture(raw, options), { status: 'checkpoint-bound', errors: [] });
  assert.equal(JSON.stringify(raw), before, 'Validation must not rewrite evidence');
  assert.deepEqual(validateSupplementalCapture({}, { root: options.root }), { status: 'legacy-unbound', errors: [] });
  assert.equal(validateSupplementalCapture({}, options).status, 'invalid', 'A selected run cannot accept unbound legacy evidence');
});

const mutations = {
  'missing capture': f => { delete f.raw.capture; },
  'missing selected run': f => { delete f.options.expectedProvenance; },
  'wrong browser': f => { f.raw.browser = 'another'; },
  'changed manifest bytes': f => { f.put(f.raw.capture.checkpointManifest.file, '{}'); },
  'different manifest run despite valid digest': f => {
    f.raw.capture.checkpointManifest = f.put(f.raw.capture.checkpointManifest.file,
      { schemaVersion: 1, provenance: { ...f.options.expectedProvenance, cases: ['other'] } });
  },
  'changed source bytes': f => { f.put(script, 'changed'); },
  'missing source': f => { f.raw.capture.sources.pop(); },
  'duplicate source': f => { f.raw.capture.sources[1] = f.raw.capture.sources[0]; },
  'different property list': f => { f.raw.capture.styleProperties.pop(); },
  'missing cases': f => { f.raw.results = []; },
  'missing side': f => { delete f.raw.results[0].astylar; },
  'missing runtime': f => { delete f.raw.results[0].astylar.runtime; },
  'runtime errors': f => { f.raw.results[0].reference.runtime.errors.push('load failed'); },
  'missing document': f => { f.raw.results[0].reference.runtime.assets.shift(); },
  'missing script': f => { f.raw.results[0].astylar.runtime.assets.splice(1, 1); },
  'missing stylesheet': f => { f.raw.results[0].reference.runtime.assets.splice(2, 1); },
  'missing font': f => { f.raw.results[0].astylar.runtime.assets.pop(); },
  'unknown asset type': f => { f.raw.results[0].astylar.runtime.assets.push({ ...f.raw.results[0].astylar.runtime.assets[0], type: 'image' }); },
  'wrong asset digest': f => { f.raw.results[0].astylar.runtime.assets[0].sha256 = 'f'.repeat(64); },
  'unknown asset without digest': f => { f.raw.results[0].astylar.runtime.assets.push({ type: 'font', file: 'unknown' }); },
  'missing asset digest': f => { delete f.raw.results[0].astylar.runtime.assets[0].sha256; },
  'changed tree bytes': f => { f.put(f.raw.results[0].astylar.inputTree.file, '{}'); },
  'tree errors with valid digest': f => {
    f.raw.results[0].astylar.inputTree = f.put(f.raw.results[0].astylar.inputTree.file, { nodes: [{}], errors: ['missing node'] });
  },
  'empty tree with valid digest': f => {
    f.raw.results[0].astylar.inputTree = f.put(f.raw.results[0].astylar.inputTree.file, { nodes: [], errors: [] });
  },
  'tree in different capture directory': f => {
    f.raw.results[0].astylar.inputTree = f.put('artifacts/material-parity/old/astylar.json', { nodes: [{}], errors: [] });
  },
  'duplicate tree': f => { f.raw.results[0].astylar.inputTree = f.raw.results[0].reference.inputTree; },
  'source path escape': f => { f.raw.capture.sources[0].file = '../outside.mjs'; },
  'manifest path escape': f => { f.raw.capture.checkpointManifest = f.put('outside.json', { schemaVersion: 1, provenance: f.options.expectedProvenance }); },
};
for (const [name, mutate] of Object.entries(mutations)) test(`supplemental provenance rejects ${name}`, () => {
  const evidence = fixture();
  mutate(evidence);
  const result = validateSupplementalCapture(evidence.raw, evidence.options);
  assert.equal(result.status, 'invalid');
  assert.equal(result.errors.length, 1);
});

function diskFixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'astylar-supplemental-proof-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const f = fixture(root);
  for (const [file, bytes] of f.bytes) {
    // Output tree files are reader fixtures, not pre-existing producer outputs.
    if (file.includes(`${path.sep}fresh${path.sep}`)) continue;
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, bytes);
  }
  const options = parseSupplementalCaptureArguments(args, root);
  const browser = { version: () => f.raw.browser };
  const open = overrides => openSupplementalCapture({ root, options, browser, script, styleProperties: propertyNames, ...overrides });
  return { ...f, root, options, browser, open };
}

function pageFixture() {
  const page = new EventEmitter();
  page.evaluate = async () => {};
  const emit = (index, overrides = {}) => page.emit('response', { request: () => ({ resourceType: () => assetTypes[index] }),
    url: () => `http://127.0.0.1:4431/${index === 0 ? 'reference/datepicker?benchmark=1' : assetFiles[index]}`,
    body: async () => Buffer.from(`runtime ${assetFiles[index]}`), status: () => 200, ...overrides });
  return { page, emit };
}

test('producer fingerprints sources, observes response bytes, and removes its listeners', async t => {
  const f = diskFixture(t), capture = f.open();
  assert.ok(existsSync(f.options.output));
  assert.deepEqual(capture.capture, f.raw.capture);
  const { page, emit } = pageFixture();
  const finish = capture.observe(page);
  for (let index = 0; index < 4; index++) emit(index);
  const runtime = await finish();
  assert.equal(runtime.assets.length, 4);
  assert.deepEqual(runtime.errors, []);
  assert.deepEqual(page.eventNames(), []);
  assert.throws(() => f.open(), /new output directory/);
});

for (const failure of ['wrong bytes', 'external asset', 'failed status', 'missing font', 'page error', 'console error']) {
  test(`producer rejects ${failure} without converting failure into parity evidence`, async t => {
    const f = diskFixture(t), capture = f.open(), { page, emit } = pageFixture();
    const finish = capture.observe(page);
    for (let index = 0; index < (failure === 'missing font' ? 3 : 4); index++) {
      const override = index !== 1 ? {} : failure === 'wrong bytes' ? { body: async () => Buffer.from('changed') }
        : failure === 'external asset' ? { url: () => 'http://external/main.js' }
          : failure === 'failed status' ? { status: () => 404 } : {};
      emit(index, override);
    }
    if (failure === 'page error') page.emit('pageerror', new Error('renderer failed'));
    if (failure === 'console error') page.emit('console', { type: () => 'error', text: () => 'font failed' });
    await assert.rejects(finish());
    assert.deepEqual(page.eventNames(), []);
  });
}

test('producer rejects browser or malformed asset provenance before creating output', t => {
  const f = diskFixture(t);
  assert.throws(() => f.open({ browser: { version: () => 'different' } }), /Browser differs/);
  assert.equal(existsSync(f.options.output), false);
  const manifestFile = path.join(f.options.checkpoint, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestFile));
  delete manifest.provenance.browserFiles[0].sha256;
  writeFileSync(manifestFile, JSON.stringify(manifest));
  assert.throws(() => f.open(), /asset digest/);
  assert.equal(existsSync(f.options.output), false);
});

test('audit collectors select all supplemental reports from the requested root without fallback', t => {
  const f = diskFixture(t);
  for (const [directory, collect, count] of [['picker-commit-audit', collectSupplementalBehavior, 6],
    ['overlay-breakpoint-audit', collectSupplementalOverlays, 3], ['slider-domain-audit', collectSupplementalSlider, 4]]) {
    const reportFile = path.join(f.root, 'artifacts/material-parity', directory, 'latest-report.json');
    mkdirSync(path.dirname(reportFile), { recursive: true });
    writeFileSync(reportFile, JSON.stringify({ browser: 'old', results: [] }));
    assert.equal(collect(f.root).browser, 'old');
    const missing = collect(f.root, { supplementalRoot: 'artifacts/material-parity/fresh' });
    assert.equal(missing.binding.status, 'missing');
    assert.equal(missing.missing.length, count);
    assert.equal(missing.browser, undefined);
    const selected = path.join(f.root, 'artifacts/material-parity/fresh', directory, 'latest-report.json');
    mkdirSync(path.dirname(selected), { recursive: true });
    writeFileSync(selected, JSON.stringify({ browser: 'selected', results: [] }));
    assert.equal(collect(f.root, { supplementalRoot: 'artifacts/material-parity/fresh' }).browser, 'selected');
    const unbound = collect(f.root, { supplementalRoot: 'artifacts/material-parity/fresh', expectedProvenance: f.raw.capture });
    assert.equal(unbound.binding.status, 'invalid');
    assert.ok(unbound.errors.length > 0);
  }
});
