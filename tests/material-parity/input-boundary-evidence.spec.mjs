import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { chromium } from 'playwright-core';
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
