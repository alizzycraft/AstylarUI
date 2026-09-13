import assert from 'node:assert/strict';

const fontProperties = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'wordSpacing',
  'textAlign', 'textTransform', 'textDecoration', 'whiteSpace', 'direction', 'writingMode', 'fontKerning',
  'textRendering', 'fontVariantLigatures', 'fontFeatureSettings', 'fontVariationSettings'];

// Shared strict metric validation; this does not assign an equivalence verdict.
export function validateControlLineBoxMeasurement({ measurement, target, fresh, original, inventory, selected }) {
  assert.equal(measurement.schemaVersion, 1); assert.equal(measurement.source, 'browser-control-natural-css-line-box');
  assert.equal(measurement.inputEquivalent, undefined, 'metric cannot assert equivalent inputs');
  assert.equal(measurement.finalRasterVerified, undefined, 'metric cannot assert raster parity');
  assert.equal(measurement.checkpointReferenceNode, target.referenceNode, 'changed reference mapping');
  assert.equal(measurement.checkpointCandidateNode, target.astylarNode, 'changed candidate mapping');
  // Checkpoint JSON omits undefined stage properties. Compare its exact
  // serialized shape, preserving explicit nulls and all defined values.
  assert.deepEqual(measurement.checkpointTypography, JSON.parse(JSON.stringify(target.properties)), 'changed checkpoint typography');
  assert.equal(measurement.checkpointPaint, target.properties.lineHeight.painted, 'changed paint metric');
  assert.equal(measurement.fontReady, true, 'unsettled fonts');
  assert.ok(Number.isFinite(measurement.naturalHeight) && measurement.naturalHeight > 0, 'invalid CSS height');
  assert.ok(Number.isFinite(measurement.naturalWidth) && measurement.naturalWidth > 0, 'invalid CSS width');
  for (const box of [measurement.observerViewportBox, measurement.referenceViewportBox])
    for (const field of ['x', 'y', 'width', 'height', 'top', 'right', 'bottom', 'left']) assert.ok(Number.isFinite(box?.[field]), 'missing viewport geometry');
  assert.deepEqual(measurement.viewport, { width: selected.viewport.width, height: selected.viewport.height, deviceScaleFactor: selected.viewport.deviceScaleFactor }, 'changed measurement viewport');
  const node = fresh.nodes.find(n => n.key === target.referenceNode), old = original.nodes.filter(n => n.key === target.referenceNode);
  assert.ok(node); assert.equal(old.length, 1); assert.equal(node.type, 'span'); assert.equal(old[0].type, 'span');
  assert.ok(!fresh.nodes.some(n => n.parent === node.key), 'text owner is not a leaf');
  assert.equal(measurement.text, node.ownText); assert.equal(measurement.text, old[0].ownText, 'changed original text');
  assert.ok(measurement.text.trim() && !/[\r\n\t]/.test(measurement.text), 'unsupported text');
  const chain = [], visited = new Set(); let ancestor = node;
  while (ancestor) {
    assert.ok(!visited.has(ancestor.key), 'cyclic ancestry'); visited.add(ancestor.key);
    chain.unshift({ key: ancestor.key, parent: ancestor.parent, type: ancestor.type, attributes: ancestor.attributes, ownText: ancestor.ownText });
    if (ancestor.parent === null) break;
    ancestor = fresh.nodes.find(n => n.key === ancestor.parent); assert.ok(ancestor, 'missing fresh ancestor');
  }
  assert.match(chain[0].key, /^(frame|overlay:(0|[1-9]\d*))$/, 'unsupported root');
  for (let i = 1; i < chain.length; i++) {
    assert.ok(chain[i].key.startsWith(chain[i - 1].key + '/'), 'wrong parent path prefix');
    assert.match(chain[i].key.slice(chain[i - 1].key.length), /^\/(0|[1-9]\d*)$/, 'broken child path');
  }
  assert.deepEqual(measurement.chain, chain, 'changed observer ownership chain');
  const pooled = inventory.styles[old[0].style], currentStyle = fresh.styles[node.style];
  assert.equal(pooled?.side, 'reference');
  for (const property of fontProperties) {
    assert.equal(typeof measurement.typography?.[property], 'string', `missing ${property}`);
    assert.equal(measurement.typography[property], pooled.value[property], `changed original ${property}`);
    assert.equal(measurement.typography[property], currentStyle[property], `changed fresh ${property}`);
  }
  assert.equal(measurement.typography.lineHeight, 'normal'); assert.equal(measurement.typography.writingMode, 'horizontal-tb');
  assert.ok(Array.isArray(measurement.fonts) && measurement.fonts.length && measurement.fonts.every(font => font.status === 'loaded'), 'missing loaded font faces');
}
