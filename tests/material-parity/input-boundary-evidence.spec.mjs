import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { validateSupplementalCapture } from './supplemental-capture-evidence.mjs';
import { propertyGroups } from './input-equivalence-policy.mjs';

const file = 'artifacts/material-parity/input-boundaries-keypress-559f95c/latest-report.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = readFileSync(file);
assert.equal(hash(bytes), '39df94e0eb87480d3824927a41a9950d1d275f7c97ab97a571c449efdc6da7d7');
const report = JSON.parse(bytes);

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
