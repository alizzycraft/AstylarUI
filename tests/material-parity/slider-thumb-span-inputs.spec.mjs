import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const authenticated = (file, sha256) => {
  const bytes = readFileSync(file);
  assert.equal(hash(bytes), sha256, file);
  return bytes;
};

test('retained Slider native inset span differs from captured plugin request before projection', () => {
  const directory = 'artifacts/material-parity/retained-evidence/component-map-recovery-20261011/';
  const map = JSON.parse(authenticated(directory + 'chunk-7SL66K3U.js.map',
    '67e956a6f4b3b0325fc51b7b45688a27d5e9307095f8b4a20391a96f68244df4'));
  const index = map.sources.indexOf('node_modules/@angular/material/fesm2022/slider.mjs');
  assert.ok(index >= 0);
  const native = map.sourcesContent[index];
  assert.equal(native.split('_tickMarkOffset = 3;').length, 2);
  const body = native.match(/_calcTranslateXByValue\(\) \{([\s\S]*?)\n  \}/g);
  assert.equal(body.length, 1);
  const calculate = new Function(body[0].slice(body[0].indexOf('{') + 1, -1));
  const pluginMap = JSON.parse(authenticated(directory + 'main.js.map',
    'c0764b03e6a2e5332dc927a63b2f45396678ceb45abe23378377f343ab622473'));
  const plugin = pluginMap.sourcesContent[pluginMap.sources.indexOf('src/app/material-plugin/material-showcase.plugin.ts')];
  assert.equal(hash(plugin), 'dee2c10af7f3116bc6a476d63182ac182e5717b90f5333a327b77213e0b9107e');
  for (const variable of ['ratio', 'boundedStart', 'boundedEnd'])
    assert.equal(plugin.split(`x: -widthCss / 2 + widthCss * ${variable},`).length, 2);
  const bytes = authenticated('artifacts/material-parity/slider-static-thumb-position-inputs-20261105.log',
    '8a916745d95c79153dd4b0683879933f744a52fc91d30e9ca681c11bbcf4f39d');
  const receipt = JSON.parse((bytes[0] === 255 ? bytes.toString('utf16le') : bytes.toString()).replace(/^\ufeff/, ''));
  assert.equal(receipt.rows.length, 12);
  let positions = 0;
  for (const row of receipt.rows) {
    for (const tree of Object.values(row.trees)) authenticated(tree.file, tree.sha256);
    for (const position of row.positions) {
      const owner = { percentage: position.ratio, _tickMarkOffset: 3,
        _slider: { _isRtl: false, _cachedWidth: row.width } };
      assert.ok(Math.abs(calculate.call(owner) - position.nativeTranslateX) < .001);
      assert.ok(Math.abs(row.width * position.ratio - position.nativeTranslateX) > .5);
      owner._slider._isRtl = true;
      assert.ok(Math.abs(calculate.call(owner) + position.nativeTranslateX - row.width) < .001);
      positions++;
    }
  }
  assert.equal(positions, 24);
  // Captured input mismatch only: not current rendering, drag correctness or pixel causality.
});
