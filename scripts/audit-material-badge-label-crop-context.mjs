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
  records.push({ case: row.case, bounds: row.bounds, paddingResults, images: row.evidence.images });
}
assert.equal(records.length, 10);
console.log(JSON.stringify({ source: { file: 'scripts/audit-material-badge-label-crop-context.mjs',
  sha256: hash(readFileSync('scripts/audit-material-badge-label-crop-context.mjs')) },
  input: { file, sha256: hash(bytes) }, metricSha256: hash(readFileSync('tests/material-parity/focused-raster-metrics.mjs')),
  records, scope: 'Historical contrast label crop-boundary sensitivity; padding adds context, never replaces original metrics. Not an equal-input or renderer-cause proof.' }));
