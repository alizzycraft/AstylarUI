import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { fingerprintDirectory } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// This is a new, narrow capture. The Chrome 153 producer and its historical
// source-bound evidence must remain unchanged because its default screenshots
// suppressed the browser-native caret.
const args = process.argv.slice(2);
assert.equal(args.length, 2, 'Supply --checkpoint and a new --output directory.');
const browserRoot = path.resolve('examples/material-showcase/dist/material-showcase/browser');
const checkpointArg = args.find(arg => arg.startsWith('--checkpoint='));
assert.ok(checkpointArg, 'Missing checkpoint argument.');
const manifest = JSON.parse(readFileSync(path.join(checkpointArg.slice('--checkpoint='.length), 'manifest.json')));
assert.deepEqual(fingerprintDirectory(browserRoot), manifest.provenance.browserFiles,
  'The current served build differs from the selected checkpoint.');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const properties = Object.values(propertyGroups).flat();
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
  const options = parseSupplementalCaptureArguments([...args,
    `--base-url=http://127.0.0.1:${server.address().port}`]);
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const evidence = openSupplementalCapture({ options, browser,
    script: 'scripts/audit-material-visible-caret.mjs', styleProperties: properties });
  const results = new Map();
  for (const mode of ['reference', 'astylar']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const finishRuntime = evidence.observe(page), samples = [];
    try {
      await page.goto(`${options.baseUrl}/${mode}/form-field?benchmark=1&profile=light&interaction=audit-visible-caret`);
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
        const observation = await observe(page, mode);
        assert.deepEqual(observation.control.value, '', `${mode} was not empty`);
        assert.equal(observation.control.focused, true, `${mode} lost focus`);
        const tree = mode === 'reference'
          ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties })
          : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree);
        assert.ok(tree.nodes.length && tree.errors.length === 0, `Incomplete ${mode} input tree`);
        const box = observation.box;
        const clip = { x: Math.max(0, box.x - 16), y: Math.max(0, box.y - 16),
          width: Math.min(1440, box.x + box.width + 16) - Math.max(0, box.x - 16),
          height: Math.min(900, box.y + box.height + 16) - Math.max(0, box.y - 16) };
        assert.ok(clip.width > 0 && clip.height > 0);
        const stem = `${evidence.directory}/form-field-${mode}-empty-${index}`;
        const treeBytes = Buffer.from(JSON.stringify(tree));
        const visible = await page.screenshot({ clip, caret: 'initial' });
        const hidden = await page.screenshot({ clip, caret: 'hide' });
        const delta = pixelDelta(visible, hidden);
        writeFileSync(`${stem}-input-tree.json`, treeBytes, { flag: 'wx' });
        writeFileSync(`${stem}-visible.png`, visible, { flag: 'wx' });
        writeFileSync(`${stem}-hidden.png`, hidden, { flag: 'wx' });
        const state = `focused-empty-${index}`;
        if (!results.has(state)) results.set(state, { family: 'form-field', profile: 'light',
          viewport: { width: 1440, height: 900, deviceScaleFactor: 1 }, state,
          action: index ? 'wait 125ms' : 'real Tab, Control+A, Backspace' });
        const row = { observation, inputTree: { file: `${stem}-input-tree.json`, sha256: hash(treeBytes) },
          screenshot: { file: `${stem}-visible.png`, sha256: hash(visible), clip, caret: 'initial' },
          hiddenCaretControl: { file: `${stem}-hidden.png`, sha256: hash(hidden), clip, caret: 'hide' },
          nativeCaretPixelDelta: delta };
        results.get(state)[mode] = row; samples.push(row);
      }
      const runtime = await finishRuntime();
      for (const row of samples) row.runtime = runtime;
    } finally { await page.close(); }
  }
  const rows = [...results.values()];
  assert.equal(rows.length, 6);
  assert.ok(rows.some(row => row.reference.nativeCaretPixelDelta.changedPixels > 0),
    'Reference caret never appeared in the visible-caret samples.');
  const report = { schemaVersion: 1, browser: browser.version(), capture: evidence.capture,
    results: rows, scope: 'Form-field light desktop DPR1, real Tab/delete and six 125ms focused-empty samples. Both screenshot caret modes retained. Diagnostic only.',
    inputEquivalent: false, renderingEquivalent: false };
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ browser: report.browser, states: rows.length,
    nativeCaretPixels: rows.map(row => row.reference.nativeCaretPixelDelta.changedPixels),
    astylarCaretModePixels: rows.map(row => row.astylar.nativeCaretPixelDelta.changedPixels) }));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}

function pixelDelta(visibleBytes, hiddenBytes) {
  const visible = PNG.sync.read(visibleBytes), hidden = PNG.sync.read(hiddenBytes);
  assert.equal(visible.width, hidden.width); assert.equal(visible.height, hidden.height);
  let changedPixels = 0, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let y = 0; y < visible.height; y++) for (let x = 0; x < visible.width; x++) {
    const i = (y * visible.width + x) * 4;
    if (visible.data[i] === hidden.data[i] && visible.data[i + 1] === hidden.data[i + 1] &&
        visible.data[i + 2] === hidden.data[i + 2]) continue;
    changedPixels++; minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { changedPixels, bounds: changedPixels ? { minX, minY, maxX, maxY } : null };
}

async function observe(page, mode) {
  return page.evaluate(mode => {
    const id = 'form-field-control';
    const node = mode === 'reference' ? document.getElementById(id)
      : document.querySelector(`[data-astylar-id="${id}"]`);
    assertNode(node);
    if (mode === 'reference') {
      return { box: node.getBoundingClientRect().toJSON(), control: { type: node.type,
        value: node.value, focused: document.activeElement === node,
        selectionStart: node.selectionStart, selectionEnd: node.selectionEnd,
        selectionDirection: node.selectionDirection, caretColor: getComputedStyle(node).caretColor } };
    }
    const surface = window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface;
    const input = surface.host.inputElementService.getInputElement(id);
    assertNode(input);
    const measured = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id], false).elements[id]?.borderBox;
    const canvas = document.querySelector('canvas').getBoundingClientRect();
    const mesh = input.cursorMesh;
    return { box: { x: canvas.x + measured.left, y: canvas.y + measured.top,
      width: measured.width, height: measured.height }, control: { type: input.type,
      value: input.value, focused: input.focused, selectionStart: input.selectionStart ?? null,
      selectionEnd: input.selectionEnd ?? null,
      caretMesh: mesh ? { enabled: mesh.isEnabled(), visible: mesh.isVisible } : null } };
    function assertNode(value) { if (!value) throw Error(`Missing ${id} control`); }
  }, mode);
}
