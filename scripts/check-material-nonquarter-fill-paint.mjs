import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

// Distinguish models which coincide on the original quarter-phase population.
// This is a retained-pixel check;no new capture or renderer manipulation.
const directory = 'artifacts/material-parity/public-thin-fill-nonquarter-20261017';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = readFileSync(`${directory}/latest-report.json`);
assert.equal(hash(bytes), '970ef77b21fd432e3eed6d210482411dad7c6126349ef4f3fce9d4dea992c2d9');
const report = JSON.parse(bytes);
const verified = JSON.parse(execFileSync(process.execPath, ['scripts/audit-public-thin-fill-nonquarter.mjs', '--verify', directory], { encoding: 'utf8' }));
assert.equal(verified.verified.pixelControls, 8); assert.equal(verified.negativeControlsRejected, 2);
assert.equal(hash(readFileSync(`${directory}/audit.js`)), report.runtime.bundleSha256);
assert.equal(hash(readFileSync(`${directory}/index.html`)), report.runtime.htmlSha256);
const foreground = [18, 52, 86], background = [238, 238, 238], observations = [];
let checkedPixels = 0;
for (const row of report.results) {
  assert.deepEqual(row.reference.bounds.child, row.astylar.bounds.child);
  assert.equal(row.reference.site.styles[1].background, '#eeeeee');
  assert.equal(row.reference.site.styles[2].background, '#123456');
  assert.equal(row.reference.site.styles[2].height, '1px');
  const box = row.reference.bounds.child, dpr = row.dpr, images = {};
  for (const side of ['reference', 'astylar']) {
    const receipt = row[side].screenshot, pixels = readFileSync(`${directory}/${receipt.file}`);
    assert.equal(hash(pixels), receipt.sha256); images[side] = PNG.sync.read(pixels);
    assert.equal(images[side].width, 400 * dpr); assert.equal(images[side].height, 260 * dpr);
  }
  const top = box.top * dpr, bottom = top + box.height * dpr, nativeTop = Math.round(box.top) * dpr;
  let nativeError = 0, areaError = 0, priorFourError = 0, oppositeBoundaryError = 0, unequalPixels = 0;
  const error = (rgb, coverage) => Math.max(...rgb.map((value, channel) =>
    Math.abs(value - (background[channel] + coverage * (foreground[channel] - background[channel])))));
  for (let y = Math.floor(top) - 3; y <= Math.ceil(bottom) + 3; y++) {
    const area = Math.max(0, Math.min(y + 1, bottom) - Math.max(y, top));
    const native = Math.max(0, Math.min(y + 1, nativeTop + box.height * dpr) - Math.max(y, nativeTop));
    const samples = [.125, .375, .625, .875];
    const prior = samples.filter(v => y + v >= top && y + v < bottom).length / 4;
    const opposite = samples.filter(v => y + v > top && y + v <= bottom).length / 4;
    for (let x = (box.left + 2) * dpr; x < (box.left + box.width - 2) * dpr; x++) {
      const offset = (y * images.reference.width + x) * 4;
      const a = images.reference.data.subarray(offset, offset + 3), b = images.astylar.data.subarray(offset, offset + 3);
      assert.equal(images.reference.data[offset + 3], 255); assert.equal(images.astylar.data[offset + 3], 255);
      nativeError = Math.max(nativeError, error([...a], native));
      areaError = Math.max(areaError, error([...b], area));
      priorFourError = Math.max(priorFourError, error([...b], prior));
      oppositeBoundaryError = Math.max(oppositeBoundaryError, error([...b], opposite));
      unequalPixels += !a.equals(b); checkedPixels++;
    }
  }
  assert.ok(nativeError <= 1); assert.ok(oppositeBoundaryError <= 1);
  if (row.phase === 0) assert.equal(unequalPixels, 0);
  observations.push({ dpr, phase: row.phase, nativeError, areaError, priorFourError, oppositeBoundaryError, unequalPixels });
}
assert.equal(observations.length, 8);
assert.equal(observations.filter(r => r.areaError > 1).length, 5);
assert.equal(observations.filter(r => r.priorFourError > 1).length, 2);
assert.equal(observations.filter(r => r.unequalPixels > 0).length, 5);
console.log(JSON.stringify({ phase: 'nonquarter-interior-model-discrimination', cases: 8, authenticatedPNGs: 16, checkedPixels,
  continuousModelRejected: 5, previousBoundaryInclusionRejected: 2, localNativeCandidateDifferences: 5,
  originalVerifierNegativeControls: 2, observations,
  boundary: 'Empirical interior prediction and tie inclusion only. GPU sample positions/mechanism unmeasured;not universal snapping,whole-frame parity,complete Material border/shadow attribution or a renderer fix.' }));
