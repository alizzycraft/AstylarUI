import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';

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
  const ast = ts.createSourceFile('captured-plugin.ts', plugin, 99, true);
  const requests = {};
  for (const variable of ['ratio', 'boundedStart', 'boundedEnd']) {
    assert.equal(plugin.split(`x: -widthCss / 2 + widthCss * ${variable},`).length, 2);
    const calls = [];
    const visit = node => {
      if (ts.isCallExpression(node) && node.expression.getText(ast) === 'context.coordinates.toRenderPoint' &&
        node.arguments[0]?.getText(ast).includes(`x: -widthCss / 2 + widthCss * ${variable},`)) calls.push(node);
      ts.forEachChild(node, visit);
    };
    visit(ast);
    assert.equal(calls.length, 1);
    requests[variable] = new Function('context', 'widthCss', variable, `return ${calls[0].getText(ast)};`);
  }
  const bytes = authenticated('artifacts/material-parity/slider-static-thumb-position-inputs-20261105.log',
    '8a916745d95c79153dd4b0683879933f744a52fc91d30e9ca681c11bbcf4f39d');
  const receipt = JSON.parse((bytes[0] === 255 ? bytes.toString('utf16le') : bytes.toString()).replace(/^\ufeff/, ''));
  assert.equal(receipt.rows.length, 12);
  const report = JSON.parse(authenticated('artifacts/material-parity/current-full-20261005/latest-report.json',
    'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62'));
  const cases = report.results.filter(row => row.family === 'slider');
  assert.equal(cases.length, 12);
  assert.deepEqual(receipt.rows.map(row => row.case).sort(),
    cases.map(row => `static:slider@${row.profile}/${row.viewport.id}`).sort());
  let positions = 0;
  for (const row of receipt.rows) {
    const original = cases.find(item => row.case === `static:slider@${item.profile}/${item.viewport.id}`);
    assert.deepEqual(row.trees, original.inputTrees);
    assert.equal(row.width, original.geometry.elements.find(item => item.id === 'slider-visual').expected.width);
    const trees = Object.fromEntries(Object.entries(row.trees).map(([side, tree]) =>
      [side, JSON.parse(authenticated(tree.file, tree.sha256))]));
    const thumbs = trees.reference.nodes.filter(node => node.attributes?.class?.split(/\s+/).includes('mdc-slider__thumb'));
    assert.equal(thumbs.length, 2);
    const visuals = trees.astylar.nodes.filter(node => node.authored?.id === 'slider-visual');
    assert.equal(visuals.length, 1);
    assert.deepEqual(row.positions.map(position => position.handle), ['start', 'end']);
    for (const [i, position] of row.positions.entries()) {
      assert.equal(position.ratio, visuals[0].authored.data[position.handle]);
      const transform = trees.reference.styles[thumbs[i].style].transform;
      assert.equal(transform, position.nativeTransform);
      const matrix = transform.match(/^matrix\(1, 0, 0, 1, ([-\d.]+), 0\)$/);
      assert.ok(matrix);
      assert.equal(Number(matrix[1]), position.nativeTranslateX);
      const owner = { percentage: position.ratio, _tickMarkOffset: 3,
        _slider: { _isRtl: false, _cachedWidth: row.width } };
      assert.ok(Math.abs(calculate.call(owner) - position.nativeTranslateX) < .001);
      assert.ok(Math.abs(row.width * position.ratio - position.nativeTranslateX) > .5);
      for (const scale of [.1, 1, 10]) for (const variable of ['ratio', position.handle === 'start' ? 'boundedStart' : 'boundedEnd']) {
        const incoming = [];
        const point = requests[variable]({ coordinates: { toRenderPoint: value => {
          incoming.push(value); return { x: value.x * scale, y: value.y * scale };
        } } }, row.width, position.ratio);
        assert.deepEqual(incoming, [{ x: -row.width / 2 + row.width * position.ratio, y: 0 }]);
        assert.ok(Math.abs(point.x / scale + row.width / 2 - position.nativeTranslateX) > .5);
      }
      owner._slider._isRtl = true;
      assert.ok(Math.abs(calculate.call(owner) + position.nativeTranslateX - row.width) < .001);
      positions++;
    }
  }
  assert.equal(positions, 24);
  const interactions = report.interactions.filter(row => row.family === 'slider');
  assert.equal(interactions.length, 66);
  const states = {};
  let interactionPositions = 0;
  for (const row of interactions) {
    states[row.state] = (states[row.state] ?? 0) + 1;
    const trees = Object.fromEntries(Object.entries(row.inputTrees).map(([side, tree]) =>
      [side, JSON.parse(authenticated(tree.file, tree.sha256))]));
    const thumbs = trees.reference.nodes.filter(node => node.attributes?.class?.split(/\s+/).includes('mdc-slider__thumb'));
    assert.equal(thumbs.length, 2);
    const visuals = trees.astylar.nodes.filter(node => node.authored?.id === 'slider-visual');
    assert.equal(visuals.length, 1);
    const width = row.geometry.elements.find(item => item.id === 'slider-visual').expected.width;
    for (const [i, handle] of ['start', 'end'].entries()) {
      const transform = trees.reference.styles[thumbs[i].style].transform;
      const matrix = transform.match(/^matrix\(1, 0, 0, 1, ([-\d.]+), 0\)$/);
      assert.ok(matrix);
      const tx = Number(matrix[1]), ratio = visuals[0].authored.data[handle];
      assert.ok(Number.isFinite(ratio));
      assert.ok(Math.abs(calculate.call({ percentage: ratio, _tickMarkOffset: 3,
        _slider: { _isRtl: false, _cachedWidth: width } }) - tx) < .001,
      `${row.profile}/${row.viewport.id}/${row.state}/${handle}`);
      const variable = handle === 'start' ? 'boundedStart' : 'boundedEnd';
      const point = requests[variable]({ coordinates: { toRenderPoint: value => value } }, width, ratio);
      assert.ok(Math.abs(point.x + width / 2 - tx) > .5);
      interactionPositions++;
    }
  }
  assert.deepEqual(states, { focus: 8, hover: 8, held: 8, activate: 8,
    'activate-leave': 8, 'drag-start': 9, 'drag-end': 9, disabled: 8 });
  assert.equal(interactionPositions, 132);
  // Captured input mismatch only: not current rendering, drag correctness or pixel causality.
});
