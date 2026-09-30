import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { fingerprintDirectory } from './run-checkpoint.mjs';
import { validateSupplementalCapture } from './supplemental-capture-evidence.mjs';
import { propertyGroups } from './input-equivalence-policy.mjs';

const file = 'artifacts/material-parity/input-boundaries-keypress-559f95c/latest-report.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = readFileSync(file);
assert.equal(hash(bytes), '39df94e0eb87480d3824927a41a9950d1d275f7c97ab97a571c449efdc6da7d7');
const report = JSON.parse(bytes);

test('served core isolates Home and End selection collapse from Material popup behavior', async () => {
  const source = readFileSync('examples/material-showcase/dist/material-showcase/browser/chunk-3JXWRYJY.js');
  assert.equal(hash(source), 'f366533bd9f80b7f85379db5031c0dea8c9c1840c14fb6ec35f57f1b65ad9eab');
  const ast = ts.createSourceFile('served.js', source.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0);
  const methods = [];
  const visit = node => {
    if (ts.isMethodDeclaration(node) && node.name.getText(ast) === 'moveCursor') methods.push(node);
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.equal(methods.length, 1);
  // Execute the complete shipped arithmetic method. No mesh/controller is
  // needed for these horizontal cases; public Material evidence above supplies
  // the composed application proof. This is not a replacement renderer.
  const directions = Object.fromEntries(['Left', 'Right', 'Up', 'Down', 'Home', 'End'].map(k => [k, k.toLowerCase()]));
  const move = new Function('CursorDirection', `return ({${methods[0].getText(ast)}}).moveCursor;`)(directions);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    assert.equal(browser.version(), report.browser);
    const page = await browser.newPage();
    await page.setContent('<input value="Atlas" aria-label="isolated text input">');
    for (const c of [
      { key: 'End', range: [0, 3], native: 5, shipped: 3 },
      { key: 'Home', range: [2, 5], native: 0, shipped: 2 },
      { key: 'End', range: [2, 2], native: 5, shipped: 5 },
      { key: 'Home', range: [2, 2], native: 0, shipped: 0 },
      { key: 'ArrowRight', range: [0, 3], native: 3, shipped: 3 },
      { key: 'ArrowLeft', range: [2, 5], native: 2, shipped: 2 },
    ]) {
      await page.locator('input').focus();
      await page.locator('input').evaluate((input, range) => input.setSelectionRange(...range), c.range);
      await page.keyboard.press(c.key);
      const native = await page.locator('input').evaluate(input => [input.selectionStart, input.selectionEnd]);
      const input = { textContent: 'Atlas', selectionStart: c.range[0], selectionEnd: c.range[1], cursorPosition: c.range[1],
        cursorState: { position: c.range[1], selectionStart: c.range[0], selectionEnd: c.range[1], selectionActive: c.range[0] !== c.range[1] } };
      move.call({}, input, directions[c.key.replace('Arrow', '')], false);
      assert.deepEqual(native, [c.native, c.native], c.key);
      assert.deepEqual([input.selectionStart, input.selectionEnd], [c.shipped, c.shipped], c.key);
    }
  } finally { await browser.close(); }
});

test('native Tab selection is collapsed by the served semantic-state synchronization', async () => {
  const manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  const browserRoot = path.resolve('examples/material-showcase/dist/material-showcase/browser');
  assert.deepEqual(fingerprintDirectory(browserRoot), manifest.provenance.browserFiles,
    'served showcase differs from the retained input-boundary build');
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const candidate = path.resolve(browserRoot, pathname.replace(/^\/+/, ''));
    const target = candidate.startsWith(browserRoot + path.sep) && path.extname(candidate) && existsSync(candidate)
      ? candidate : path.join(browserRoot, 'index.csr.html');
    const extension = path.extname(target);
    const contentType = extension === '.js' ? 'text/javascript' : extension === '.css' ? 'text/css' :
      extension === '.woff2' ? 'font/woff2' : extension === '.svg' ? 'image/svg+xml' : 'text/html';
    response.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-store' });
    response.end(readFileSync(target));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const referencePage = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await referencePage.goto(`http://127.0.0.1:${server.address().port}/reference/form-field?benchmark=1&profile=light&interaction=audit-tab-focus`);
    await referencePage.locator('.frame').waitFor();
    await referencePage.keyboard.press('Tab');
    const currentReference = await referencePage.locator('#form-field-control').evaluate(input =>
      [document.activeElement === input, input.value, input.selectionStart, input.selectionEnd]);
    assert.deepEqual(currentReference, [true, 'Atlas', 0, 5],
      'current browser no longer selects the HTML reference value on Tab');
    await referencePage.close();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.addInitScript(() => {
      window.__tabSelectionEvidence = { focus: [], writes: [] };
      const original = HTMLInputElement.prototype.setSelectionRange;
      HTMLInputElement.prototype.setSelectionRange = function(start, end, direction) {
        if (this.dataset.astylarId === 'form-field-control') {
          window.__tabSelectionEvidence.writes.push({
            before: [this.selectionStart, this.selectionEnd], after: [start, end],
            stack: new Error().stack,
          });
        }
        return original.call(this, start, end, direction);
      };
      document.addEventListener('focusin', event => {
        if (event.target instanceof HTMLInputElement &&
            event.target.dataset.astylarId === 'form-field-control') {
          window.__tabSelectionEvidence.focus.push([
            event.target.selectionStart, event.target.selectionEnd,
          ]);
        }
      }, true);
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/astylar/form-field?benchmark=1&profile=light&interaction=audit-tab-focus`);
    await page.locator('.frame').waitFor();
    await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
    await page.keyboard.press('Tab');
    await page.evaluate(async () => {
      await window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const observed = await page.evaluate(() => {
      const semantic = document.querySelector('[data-astylar-id="form-field-control"]');
      const input = window.ng.getComponent(document.querySelector('app-astylar-showcase'))
        .surface.host.inputElementService.getInputElement('form-field-control');
      return {
        evidence: window.__tabSelectionEvidence,
        active: document.activeElement === semantic,
        semantic: [semantic.selectionStart, semantic.selectionEnd],
        scene: [input.selectionStart, input.selectionEnd],
      };
    });
    const retained = report.results.find(row => row.family === 'form-field' &&
      row.viewport.deviceScaleFactor === 1 && row.state === 'keyboard-focus');
    assert.ok(retained);
    assert.deepEqual([retained.reference.observation.control.selectionStart,
      retained.reference.observation.control.selectionEnd], [0, 5]);
    assert.deepEqual([retained.astylar.observation.control.selectionStart,
      retained.astylar.observation.control.selectionEnd], [0, 0]);
    assert.deepEqual(observed.evidence.focus[0], [0, 5],
      'native Tab focus did not initially select the semantic value');
    assert.ok(observed.evidence.writes.some(write =>
      write.before[0] === 0 && write.before[1] === 5 &&
      write.after[0] === 0 && write.after[1] === 0 &&
      write.stack.includes('AstylarSemanticBridge.applyControlState') &&
      write.stack.includes('AstylarSemanticBridge.syncControlStates')),
    'served semantic-state sync did not overwrite the native selection');
    assert.equal(observed.active, true);
    assert.deepEqual(observed.semantic, [0, 0]);
    assert.deepEqual(observed.scene, [0, 0]);
    assert.deepEqual(errors, []);
    await page.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});

test('retained reference screenshots suppress the native caret by Playwright default', async () => {
  const producer = 'scripts/audit-material-input-boundaries.mjs';
  const source = readFileSync(producer);
  assert.equal(hash(source), report.capture.sources.find(item => item.file === producer)?.sha256);
  assert.match(source.toString(), /page\.screenshot\(\{ clip \}\)/,
    'retained capture did not use the default screenshot caret setting');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 300, height: 100 } });
    await page.setContent('<input id="probe">');
    await page.locator('#probe').evaluate(input => {
      input.style.font = '20px Arial';
      input.style.caretColor = 'black';
      input.style.width = '200px';
      input.style.height = '40px';
    });
    await page.locator('#probe').focus();
    assert.equal(await page.locator('#probe').evaluate(input => document.activeElement === input), true);
    const clip = { x: 0, y: 0, width: 240, height: 60 };
    const hidden = PNG.sync.read(await page.screenshot({ clip, caret: 'hide' }));
    let observedNativeCaret = false;
    for (let sample = 0; sample < 8; sample++) {
      const initial = PNG.sync.read(await page.screenshot({ clip, caret: 'initial' }));
      let pixels = 0, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let y = 0; y < initial.height; y++) for (let x = 0; x < initial.width; x++) {
        const i = (y * initial.width + x) * 4;
        if (initial.data[i] === hidden.data[i] &&
            initial.data[i + 1] === hidden.data[i + 1] &&
            initial.data[i + 2] === hidden.data[i + 2]) continue;
        pixels++; minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      if (pixels > 0) {
        assert.ok(maxX - minX <= 3 && maxY - minY >= 10,
          `Screenshot option changed more than the native caret: ${JSON.stringify({ pixels, minX, maxX, minY, maxY })}`);
        observedNativeCaret = true;
        break;
      }
      await page.waitForTimeout(100);
    }
    assert.equal(observedNativeCaret, true,
      'Explicit initial caret option did not reveal a native caret in timed screenshots');
    await page.close();
  } finally { await browser.close(); }
});

test('current paired caret-visible capture binds its pixels to unequal caret authoring', () => {
  const currentFile = 'artifacts/material-parity/caret-visible-form-field-154/latest-report.json';
  const currentBytes = readFileSync(currentFile);
  assert.equal(hash(currentBytes), '8111da2cef29dd5a79af5e2723f4cdb73f98a56328860178a14d7301628992c3');
  const current = JSON.parse(currentBytes);
  const manifest = JSON.parse(readFileSync(current.capture.checkpointManifest.file));
  const historicalManifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  assert.equal(current.browser, '154.0.8037.58');
  assert.deepEqual(manifest.provenance.browserFiles, historicalManifest.provenance.browserFiles);
  assert.equal(manifest.provenance.installedDependencies, historicalManifest.provenance.installedDependencies);
  assert.equal(manifest.provenance.browserFiles.length, 1887);
  assert.deepEqual(validateSupplementalCapture(current, { reportFile: currentFile,
    expectedProvenance: manifest.provenance, script: 'scripts/audit-material-visible-caret.mjs',
    styleProperties: Object.values(propertyGroups).flat() }), { status: 'checkpoint-bound', errors: [] });
  assert.deepEqual(current.results.map(row => row.state), Array.from({ length: 6 }, (_, i) => `focused-empty-${i}`));
  for (const row of current.results) for (const mode of ['reference', 'astylar']) {
    const side = row[mode];
    assert.equal(side.observation.control.value, '');
    assert.equal(side.observation.control.focused, true);
    for (const item of [side.screenshot, side.hiddenCaretControl]) {
      assert.equal(hash(readFileSync(item.file)), item.sha256, `${row.state}/${mode}/${item.caret}`);
      assert.deepEqual(item.clip, side.screenshot.clip);
    }
    assert.equal(side.screenshot.caret, 'initial');
    assert.equal(side.hiddenCaretControl.caret, 'hide');
    assert.equal(side.nativeCaretPixelDelta.changedPixels,
      rasterDifference(readFileSync(side.screenshot.file), readFileSync(side.hiddenCaretControl.file)).count);
  }
  const first = current.results[0], off = current.results[2];
  assert.deepEqual(first.reference.nativeCaretPixelDelta,
    { changedPixels: 19, bounds: { minX: 16, minY: 19, maxX: 16, maxY: 37 } });
  assert.equal(first.astylar.nativeCaretPixelDelta.changedPixels, 0);
  assert.deepEqual(off.reference.nativeCaretPixelDelta, { changedPixels: 0, bounds: null });
  const referenceOnOff = rasterDifference(readFileSync(first.reference.screenshot.file),
    readFileSync(off.reference.screenshot.file));
  const astylarOnOff = rasterDifference(readFileSync(first.astylar.screenshot.file),
    readFileSync(off.astylar.screenshot.file));
  assert.deepEqual(referenceOnOff, { count: 19, bounds: { minX: 16, minY: 19, maxX: 16, maxY: 37 },
    colors: ['103,80,164'] });
  assert.deepEqual(astylarOnOff.bounds, { minX: 15, minY: 18, maxX: 16, maxY: 37 });
  assert.ok(astylarOnOff.colors.includes('29,27,32'));
  const referenceTree = JSON.parse(readFileSync(first.reference.inputTree.file));
  const candidateTree = JSON.parse(readFileSync(first.astylar.inputTree.file));
  const referenceInput = referenceTree.nodes.find(node => node.attributes?.id === 'form-field-control');
  const candidateInput = candidateTree.nodes.find(node => node.authored?.id === 'form-field-control');
  assert.equal(referenceTree.styles[referenceInput.style].caretColor, 'rgb(103, 80, 164)');
  assert.ok(referenceInput.rules.map(index => referenceTree.rules[index]).some(rule =>
    rule.declarations?.['caret-color']?.value.includes('--mat-form-field-filled-caret-color')));
  assert.equal(candidateInput.resolvedStyle.caretColor, undefined);
  assert.equal(candidateInput.resolvedStyle.color, '#1d1b20');
});

test('dark mobile empty inputs expose caret pixels without changing retained producers', async t => {
  const browserRoot = path.resolve('examples/material-showcase/dist/material-showcase/browser');
  const checkpoint = JSON.parse(readFileSync('artifacts/material-parity/caret-visible-checkpoint-154/checkpoint/manifest.json'));
  assert.deepEqual(fingerprintDirectory(browserRoot), checkpoint.provenance.browserFiles);
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const candidate = path.resolve(browserRoot, pathname.replace(/^\/+/, ''));
    const target = candidate.startsWith(browserRoot + path.sep) && path.extname(candidate) && existsSync(candidate)
      ? candidate : path.join(browserRoot, 'index.csr.html');
    const extension = path.extname(target);
    response.writeHead(200, { 'content-type': extension === '.js' ? 'text/javascript' : extension === '.css' ? 'text/css' :
      extension === '.woff2' ? 'font/woff2' : extension === '.svg' ? 'image/svg+xml' : 'text/html', 'cache-control': 'no-store' });
    response.end(readFileSync(target));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    assert.equal(browser.version(), '154.0.8037.58');
    const observations = {};
    for (const family of ['form-field', 'input']) {
      observations[family] = {};
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
        const errors = [], samples = [];
        page.on('pageerror', error => errors.push(String(error)));
        await page.goto(`http://127.0.0.1:${server.address().port}/${mode}/${family}?benchmark=1&profile=dark`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        await page.keyboard.press('Tab');
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        for (let index = 0; index < 6; index++) {
          if (index) await page.waitForTimeout(125);
          if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          await page.evaluate(async () => { await document.fonts.ready;
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
          const control = await page.evaluate(({ mode, family }) => {
            const id = `${family}-control`;
            const node = mode === 'reference' ? document.querySelector(`#${id}`) : document.querySelector(`[data-astylar-id="${id}"]`);
            let box = node.getBoundingClientRect().toJSON();
            if (mode === 'astylar') {
              const measured = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id], false).elements[id].borderBox;
              const canvas = document.querySelector('canvas').getBoundingClientRect();
              box = { x: canvas.x + measured.left, y: canvas.y + measured.top, width: measured.width, height: measured.height };
            }
            return { value: node.value, focused: document.activeElement === node, type: node.type,
              selection: [node.selectionStart, node.selectionEnd], caretColor: getComputedStyle(node).caretColor, box };
          }, { mode, family });
          const { box } = control;
          const clip = { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 8),
            width: Math.min(390, box.x + box.width + 8) - Math.max(0, box.x - 8),
            height: Math.min(844, box.y + box.height + 8) - Math.max(0, box.y - 8) };
          const visible = await page.screenshot({ clip, caret: 'initial' });
          const hidden = await page.screenshot({ clip, caret: 'hide' });
          samples.push({ control, visible, delta: rasterDifference(visible, hidden) });
        }
        const pairs = samples.flatMap((sample, index) => samples.slice(index + 1).flatMap(other => [
          rasterDifference(sample.visible, other.visible), rasterDifference(other.visible, sample.visible),
        ]));
        const authoring = mode === 'reference' ? await page.evaluate(({ family }) => {
          const node = document.querySelector(`#${family}-control`);
          return { color: getComputedStyle(node).color, caretColor: getComputedStyle(node).caretColor };
        }, { family }) : await page.evaluate(family => {
          const id = `${family}-control`;
          const measurement = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id]);
          const node = measurement.inputTree.nodes.find(node => node.authored?.id === id);
          return { color: node.resolvedStyle.color, caretColor: node.resolvedStyle.caretColor ?? null };
        }, family);
        observations[family][mode] = { controls: samples.map(sample => sample.control),
          authoring, deltas: samples.map(sample => sample.delta), blink: pairs.sort((a, b) => b.count - a.count)[0],
          // Both directions retain the caret-on palette even when the first
          // sampled image has an off-phase background at these pixels.
          blinkColors: [...new Set(pairs.flatMap(pair => pair.colors))].sort(), errors };
        await page.close();
      }
    }
    for (const family of ['form-field', 'input']) {
      for (const mode of ['reference', 'astylar']) {
        const side = observations[family][mode];
        assert.deepEqual(side.errors, []);
        assert.equal(side.controls.length, 6);
        for (const control of side.controls) {
          assert.equal(control.value, '');
          assert.equal(control.focused, true);
          assert.equal(control.type, family === 'input' ? 'email' : 'text');
          assert.deepEqual(control.selection, family === 'input' ? [null, null] : [0, 0]);
        }
      }
      const reference = observations[family].reference, candidate = observations[family].astylar;
      const nativeOn = reference.deltas.find(delta => delta.count > 0);
      assert.ok(nativeOn, 'six samples never exposed the native caret');
      assert.deepEqual(nativeOn, { count: 76, bounds: { minX: 16, minY: 22, maxX: 17, maxY: 59 }, colors: ['208,188,255'] });
      assert.deepEqual(reference.authoring, { color: 'rgb(230, 225, 229)', caretColor: 'rgb(208, 188, 255)' });
      assert.deepEqual(candidate.authoring, { color: '#1d1b20', caretColor: null });
      assert.equal(candidate.blink.count, 156);
      assert.deepEqual(candidate.blink.bounds, { minX: 14, minY: 21, maxX: 17, maxY: 59 });
      assert.ok(candidate.blinkColors.includes('29,27,32'), 'canvas caret color never appeared in sampled pixels');
      for (const key of ['x', 'y', 'width', 'height']) {
        assert.ok(Math.abs(reference.controls[0].box[key] - candidate.controls[0].box[key]) < .01, `control ${key} differs`);
      }
      t.diagnostic(JSON.stringify({ family, referenceCaret: nativeOn, candidateBlink: candidate.blink,
        candidateBlinkColors: candidate.blinkColors, referenceAuthoring: reference.authoring, candidateAuthoring: candidate.authoring }));
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});

function rasterDifference(firstBytes, secondBytes) {
  const first = PNG.sync.read(firstBytes), second = PNG.sync.read(secondBytes);
  assert.equal(first.width, second.width);
  assert.equal(first.height, second.height);
  let count = 0, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const colors = new Set();
  for (let y = 0; y < first.height; y++) for (let x = 0; x < first.width; x++) {
    const i = (y * first.width + x) * 4;
    if (first.data[i] === second.data[i] && first.data[i + 1] === second.data[i + 1] &&
        first.data[i + 2] === second.data[i + 2]) continue;
    count++; minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    colors.add([first.data[i], first.data[i + 1], first.data[i + 2]].join(','));
  }
  return { count, bounds: count ? { minX, minY, maxX, maxY } : null, colors: [...colors].sort() };
}

test('retained input boundaries authenticate all runtime assets, trees, actions and local rasters', () => {
  const manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  assert.deepEqual(validateSupplementalCapture(report, { reportFile: file,
    expectedProvenance: manifest.provenance, script: 'scripts/audit-material-input-boundaries.mjs',
    styleProperties: Object.values(propertyGroups).flat() }), { status: 'checkpoint-bound', errors: [] });
  const expected = ['initial', 'keyboard-focus', 'pointer-focus', 'focused-empty-0', 'focused-empty-1',
    'focused-empty-2', 'focused-empty-3', 'typed', 'selection-forward', 'selection-backward', 'blur'];
  assert.equal(report.results.length, 110);
  for (const family of ['form-field', 'input', 'autocomplete', 'datepicker', 'timepicker']) for (const dpr of [1, 2]) {
    const rows = report.results.filter(r => r.family === family && r.viewport.deviceScaleFactor === dpr);
    assert.deepEqual(rows.map(r => r.state), expected);
    for (const row of rows) {
      assert.equal(row.profile, 'light');
      assert.deepEqual(row.viewport, { width: 1440, height: 900, deviceScaleFactor: dpr });
      for (const side of ['reference', 'astylar']) {
        const sample = row[side];
        assert.equal(hash(readFileSync(sample.screenshot.file)), sample.screenshot.sha256);
        assert.ok(sample.screenshot.clip.width > 0 && sample.screenshot.clip.height > 0);
        assert.ok(sample.observation.events.every(e => e.trusted));
        if (row.state.startsWith('focused-empty')) {
          assert.equal(sample.observation.control.value, '');
          assert.equal(sample.observation.control.focused, true);
        }
      }
      if (row.state === 'typed') assert.equal(row.reference.observation.control.value, row.astylar.observation.control.value);
    }
  }
  assert.equal(report.inputEquivalent, false);
  assert.equal(report.renderingEquivalent, false);
});

test('historical keyboard evidence retains selection mismatch and native email observability limits', () => {
  for (const dpr of [1, 2]) {
    const get = (family, state) => report.results.find(r => r.family === family && r.state === state && r.viewport.deviceScaleFactor === dpr);
    for (const family of ['form-field', 'autocomplete', 'datepicker']) {
      const forward = get(family, 'selection-forward'), backward = get(family, 'selection-backward');
      const pair = c => [c.selectionStart, c.selectionEnd];
      assert.deepEqual(pair(forward.reference.observation.control), [0, 3]);
      assert.deepEqual(pair(forward.astylar.observation.control), [0, 3]);
      const native = backward.reference.observation.control;
      assert.deepEqual(pair(native), [native.value.length - 3, native.value.length]);
      assert.deepEqual(pair(backward.astylar.observation.control), [0, 3]);
      assert.equal(backward.astylar.observation.control.cursorPosition, 0);
      for (const side of ['reference', 'astylar']) assert.ok(backward[side].observation.events.some(e => e.type === 'keydown' && e.key === 'End'));
    }
    const tab = get('form-field', 'keyboard-focus');
    assert.deepEqual([tab.reference.observation.control.selectionStart, tab.reference.observation.control.selectionEnd], [0, 5]);
    assert.deepEqual([tab.astylar.observation.control.selectionStart, tab.astylar.observation.control.selectionEnd], [0, 0]);
    for (const state of ['selection-forward', 'selection-backward']) {
      const native = get('input', state).reference.observation.control;
      assert.equal(native.type, 'email');
      assert.equal(native.selectionStart, null); assert.equal(native.selectionEnd, null);
      assert.equal(native.selectionDirection, null);
    }
  }
});
