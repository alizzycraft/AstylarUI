import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { evaluateFocusedRaster } from '../tests/material-parity/focused-raster-metrics.mjs';

// Historical diagnostics only: no alignment, image mutation or acceptance override.
const hash = b => createHash('sha256').update(b).digest('hex');
const file = 'artifacts/material-parity/badge-label-interaction-paint-20261028.log';
const bytes = readFileSync(file);
assert.equal(hash(bytes), '2fc649fab505e49bfe919ebcf978fb172fd5fca1cf1a921d7861e08770ab3bcc');
const [, report] = bytes.toString('utf16le').replace(/^\uFEFF/, '').trim().split(/\r?\n/).map(JSON.parse);
const fullFile = 'artifacts/material-parity/current-full-20261005/latest-report.json';
const fullBytes = readFileSync(fullFile);
assert.equal(hash(fullBytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
const full = JSON.parse(fullBytes);
const crop = (image, bounds, padding) => {
  const left = bounds.left - padding, top = bounds.top - padding;
  const width = bounds.right - bounds.left + 2 * padding;
  const height = bounds.bottom - bounds.top + 2 * padding;
  assert.ok(left >= 0 && top >= 0 && left + width <= image.width && top + height <= image.height);
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) data.set(image.data.subarray(((top + y) * image.width + left) * 4,
    ((top + y) * image.width + left + width) * 4), y * width * 4);
  return { width, height, data };
};
const records = [];
for (const row of report.records.filter(r => r.case.includes('@contrast/'))) {
  const images = {};
  for (const side of ['reference', 'astylar']) {
    const receipt = row.evidence.images[side], b = readFileSync(receipt.file);
    assert.equal(hash(b), receipt.sha256); images[side] = PNG.sync.read(b);
  }
  const paddingResults = [0, 2, 8].map(padding => {
    const a = crop(images.reference, row.bounds, padding), b = crop(images.astylar, row.bounds, padding);
    const metric = evaluateFocusedRaster(a, b, { maximumPhaseOffset: 0 });
    assert.ok(metric.phaseOffset.x === 0 && metric.phaseOffset.y === 0);
    if (padding === 0) assert.deepEqual(JSON.parse(JSON.stringify(metric)), row.metrics);
    return { paddingDevicePixels: padding, referenceCropSha256: hash(a.data), candidateCropSha256: hash(b.data),
      similarity: metric.similarity, matches: metric.matches, sharpness: metric.sharpness };
  });
  const original = full.interactions.find(r => `interaction:${r.family}@${r.profile}/${r.viewport.id}/${r.state}` === row.case);
  assert.ok(original);
  const count = original.geometry.elements.find(g => g.id === 'badge-count');
  assert.ok(count && !count.missing);
  const scale = original.viewport.deviceScaleFactor;
  const countLeft = Math.min(count.expected.left, count.actual.left) * scale;
  assert.ok(countLeft < row.bounds.right, 'Count must overlap label-region crop');
  // A separate visible text subset, NOT a mask or substitute acceptance region.
  // Stop two device pixels before either count rectangle; retain full metrics above.
  const prefixBounds = { ...row.bounds, right: Math.floor(countLeft) - 2 };
  const prefixMetric = evaluateFocusedRaster(crop(images.reference, prefixBounds, 0),
    crop(images.astylar, prefixBounds, 0), { maximumPhaseOffset: 0 });
  records.push({ case: row.case, bounds: row.bounds, paddingResults, images: row.evidence.images,
    countGeometry: count, prefixBounds, prefixMetric });
}
assert.equal(records.length, 10);
console.log(JSON.stringify({ source: { file: 'scripts/audit-material-badge-label-crop-context.mjs',
  sha256: hash(readFileSync('scripts/audit-material-badge-label-crop-context.mjs')) },
  input: { file, sha256: hash(bytes) }, fullReport: { file: fullFile, sha256: hash(fullBytes) },
  metricSha256: hash(readFileSync('tests/material-parity/focused-raster-metrics.mjs')),
  records, scope: 'Historical contrast label-rectangle crop includes overlapping count paint. Padding and separate visible prefix never replace original metrics. Not complete glyph acceptance,equal-input or renderer-cause proof.' }));
