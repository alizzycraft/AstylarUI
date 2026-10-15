import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';

// A narrow prediction check for the retained divider residual, outside the
// running canonical producer. This neither captures nor changes any fixture.
const file = 'artifacts/material-parity/divider-separator-endpoint-footprints-20261015.log';
const bytes = fs.readFileSync(file);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(bytes), '0d36f94f2fcc9f3d93ac8b2dd4f6f483d5a4e4437579d8515acf5c9798378d0a');
const report = JSON.parse(bytes);
const observations = report.observations.filter(row => row.side === 'astylar');
assert.equal(observations.length, 24);
let checkedPixels = 0, continuousRejected = 0, alternateSamplesRejected = 0;
const results = [];
for (const row of observations) {
  const pngBytes = fs.readFileSync(row.image.file);
  assert.equal(hash(pngBytes), row.image.sha256);
  const treeBytes = fs.readFileSync(row.tree.file);
  assert.equal(hash(treeBytes), row.tree.sha256);
  const png = PNG.sync.read(pngBytes), dpr = row.requestedDpr, box = row.recordedBox;
  assert.equal(row.declaredOwner.type, 'div');
  assert.equal(row.declaredOwner.position, 'absolute');
  assert.equal(row.declaredOwner.height, '1px');
  assert.equal(row.declaredOwner.borderWidth, '0');
  assert.equal(box.height, 1);
  assert.match(row.declaredOwner.background, /^#[0-9a-f]{6}$/i);
  const foreground = [1, 3, 5].map(i => parseInt(row.declaredOwner.background.slice(i, i + 2), 16));
  assert.equal(row.backgroundRuns.length, 1);
  const background = row.backgroundRuns[0].rgba;
  const top = box.top * dpr, bottom = box.bottom * dpr;
  let error = 0, areaError = 0, alternateError = 0;
  for (let y = Math.floor(top) - 2; y <= Math.ceil(bottom) + 2; y++) {
    const fraction = [.125, .375, .625, .875].filter(sample => y + sample >= top && y + sample < bottom).length / 4;
    const alternate = [.25, .25, .75, .75].filter(sample => y + sample >= top && y + sample < bottom).length / 4;
    const area = Math.max(0, Math.min(y + 1, bottom) - Math.max(y, top));
    for (let x = Math.ceil((box.left + 2) * dpr); x < Math.floor((box.right - 2) * dpr); x++) {
      assert.ok(x >= 0 && x < png.width && y >= 0 && y < png.height);
      for (let channel = 0; channel < 3; channel++) {
        const actual = png.data[(y * png.width + x) * 4 + channel];
        const predicted = coverage => background[channel] + coverage * (foreground[channel] - background[channel]);
        error = Math.max(error, Math.abs(actual - predicted(fraction)));
        areaError = Math.max(areaError, Math.abs(actual - predicted(area)));
        alternateError = Math.max(alternateError, Math.abs(actual - predicted(alternate)));
      }
      assert.equal(png.data[(y * png.width + x) * 4 + 3], 255);
      checkedPixels++;
    }
  }
  assert.ok(error <= 1, `${row.case}: four-row-sample prediction disagrees with retained PNG`);
  continuousRejected += areaError > 1;
  alternateSamplesRejected += alternateError > 1;
  results.push({ case: row.case, dpr, physicalPhase: top - Math.floor(top),
    maximumRGBError: error, continuousAreaError: areaError, alternateSampleError: alternateError });
}
assert.equal(continuousRejected, 24);
assert.ok(alternateSamplesRejected > 0);
console.log(JSON.stringify({ phase: 'retained-divider-four-row-sample-prediction', cases: results.length,
  checkedPixels, continuousRejected, alternateSamplesRejected, results,
  boundary: 'Empirical interior prediction only. Exact GPU sample locations unmeasured; native border and candidate fill inputs remain unequal. Not full-edge/whole-frame parity,universal sample positions,or a renderer fix.' }));
