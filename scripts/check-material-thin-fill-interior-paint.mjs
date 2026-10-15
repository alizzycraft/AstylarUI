import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PNG } from 'pngjs';

// Resolve one retained-pixel gap without another capture or canonical export.
const directory = 'artifacts/material-parity/public-thin-fill-phase-corrected-20261015';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const bytes = fs.readFileSync(`${directory}/latest-report.json`);
assert.equal(hash(bytes), '7eef112b2c7615874d4bbced11a2e04f40ab8c3e71ce7eda30e593a6075907b8');
const report = JSON.parse(bytes);
assert.equal(report.results.length, 8);
const foreground = [18, 52, 86], background = [238, 238, 238];
let pixels = 0, wrongDeviceSnapCases = 0, wrongCandidateCSSSnapCases = 0;
const observations = [];
for (const row of report.results) {
  const dpr = row.dpr, box = row.reference.bounds.child;
  assert.deepEqual(row.astylar.bounds.child, box);
  let nativeDeviceSnapWrong = false, candidateCSSSnapWrong = false;
  for (const side of ['reference', 'astylar']) {
    const receipt = row[side].screenshot;
    const pngBytes = fs.readFileSync(`${directory}/${receipt.file}`);
    assert.equal(hash(pngBytes), receipt.sha256);
    const png = PNG.sync.read(pngBytes);
    assert.equal(png.width, 400 * dpr);
    assert.equal(png.height, 260 * dpr);
    const top = (side === 'reference' ? Math.round(box.top) : box.top) * dpr;
    const bottom = top + box.height * dpr;
    const alternate = side === 'reference' ? Math.round(box.top * dpr) : Math.round(box.top) * dpr;
    for (let y = Math.floor(box.top * dpr) - 3; y <= Math.ceil((box.top + box.height) * dpr) + 3; y++) {
      for (let x = (box.left + 2) * dpr; x < (box.left + box.width - 2) * dpr; x++) {
        const coverage = Math.max(0, Math.min(y + 1, bottom) - Math.max(y, top));
        const other = Math.max(0, Math.min(y + 1, alternate + box.height * dpr) - Math.max(y, alternate));
        let differs = false;
        for (let channel = 0; channel < 3; channel++) {
          const value = png.data[(y * png.width + x) * 4 + channel];
          const expected = background[channel] + coverage * (foreground[channel] - background[channel]);
          assert.ok(Math.abs(value - expected) <= 1, JSON.stringify({ dpr, phase: row.phase, side, x, y, channel, value, expected }));
          if (Math.abs(value - (background[channel] + other * (foreground[channel] - background[channel]))) > 1) differs = true;
        }
        assert.equal(png.data[(y * png.width + x) * 4 + 3], 255);
        pixels++;
        if (differs) {
          if (side === 'reference') nativeDeviceSnapWrong = true;
          else candidateCSSSnapWrong = true;
        }
      }
    }
  }
  wrongDeviceSnapCases += nativeDeviceSnapWrong;
  wrongCandidateCSSSnapCases += candidateCSSSnapWrong;
  observations.push({ dpr, phase: row.phase, nativeDeviceOriginSnapRejected: nativeDeviceSnapWrong, candidateCSSOriginSnapRejected: candidateCSSSnapWrong });
}
assert.equal(pixels, 16872);
assert.equal(wrongDeviceSnapCases, 2);
assert.equal(wrongCandidateCSSSnapCases, 6);
console.log(JSON.stringify({ phase: 'retained-thin-fill-interior-paint-model', authenticatedPNGs: 16, checkedPixels: pixels,
  channelTolerance: 1, nativeModel: 'round CSS top then multiply by DPR',
  candidateModel: 'linear row coverage from unsnapped projected device rectangle', observations,
  boundary: 'Observed interior raster model only;not browser/WebGL causal mechanism,general CSS snapping rule,edge/whole-frame parity,or renderer fix' }));
