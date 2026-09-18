import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { measureNativeRangeThumb, rangeTravelValue, inspectNativeRangeTravel }
  from '../../scripts/audit-public-range-travel.mjs';
import { rangeDragArtifactRoot } from './public-range-drag-evidence.mjs';

const file = 'docs/material-public-range-travel-audit.json';
test('range travel replays authenticated original assets, traces and native rasters without writes', () => {
  const before = readFileSync(file);
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const receipt = JSON.parse(execFileSync(process.execPath, ['--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/audit-public-range-travel.mjs', '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.equal(receipt.cases, 32); assert.equal(receipt.measuredScreenshots, 64);
  assert.equal(receipt.nativeMoveSamples, 256); assert.equal(receipt.nativeFullBoxMismatches, 80);
  assert.equal(receipt.noUpdateCandidateMoveSamples, 128);
  assert.deepEqual(readFileSync(file), before);
});

function synthetic(dpr, centers = [35.5], half = false) {
  const png = new PNG({ width: 100 * dpr, height: 40 * dpr }); png.data.fill(255);
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const cx = (x + .5) / dpr, cy = (y + .5) / dpr;
    const track = cy >= 17 && cy < 23;
    const thumb = (!half || cy < 20) && centers.some(center => (cx - center) ** 2 + (cy - 20) ** 2 <= 64);
    if (track || thumb) { const i = (y * png.width + x) * 4; png.data[i] = 0; png.data[i + 1] = 117; png.data[i + 2] = 255; }
  }
  return png;
}
const box = { x: 0, y: 0, width: 100, height: 40 };
test('thumb raster isolation rejects track-only, ambiguous and clipped shapes and detects shifts at both DPRs', () => {
  for (const dpr of [1, 2]) {
    const centered = measureNativeRangeThumb(synthetic(dpr), box, dpr);
    assert.ok(Math.abs(centered.centerX - 35.5) < .00001);
    const shifted = measureNativeRangeThumb(synthetic(dpr, [39.5]), box, dpr);
    assert.ok(Math.abs(shifted.centerX - centered.centerX - 4) < .00001);
    assert.throws(() => measureNativeRangeThumb(synthetic(dpr, []), box, dpr));
    assert.throws(() => measureNativeRangeThumb(synthetic(dpr, [25.5, 65.5]), box, dpr));
    assert.throws(() => measureNativeRangeThumb(synthetic(dpr, [35.5], true), box, dpr));
    assert.throws(() => measureNativeRangeThumb(synthetic(dpr), { ...box, x: -1 }, dpr));
  }
});

test('native endpoint model is measured, predicts all samples, and does not claim universal metrics or fixed rendering', () => {
  const report = JSON.parse(readFileSync(file));
  for (const c of report.calibrations) {
    assert.ok(Math.abs(c.low.localCenterX - 8) < .00001);
    assert.ok(Math.abs(c.high.localCenterX - 152) < .00001);
    assert.ok(Math.abs(c.travel - 144) < .00001);
    assert.equal(c.low.control, 'second'); assert.equal(c.high.control, 'first');
  }
  for (const o of report.observations) {
    assert.equal(o.moves.length, 8); assert.ok(o.moves.every(m => m.nativeMatchesTravel));
    if (o.update === 'none') assert.ok(o.moves.every(m => m.astylarMatchesFullBox));
    assert.equal(o.moves.filter(m => !m.nativeMatchesFullBox).length, o.target === 'first' ? 2 : 3);
  }
  assert.equal(report.capturedNativeTravelModelVerified, true);
  for (const flag of ['generalNativeRangeMetricProven', 'materialSwappedThumbCauseProven', 'renderingEquivalent', 'rendererChanged'])
    assert.equal(report[flag], false);
  assert.equal(rangeTravelValue(127.375, 8, 152, 0, 100, 5), 85);
  assert.equal(rangeTravelValue(127.375, 0, 160, 0, 100, 5), 80);
  assert.equal(rangeTravelValue(44.5, 8, 152, 0, 100, 5), 25);
  assert.equal(rangeTravelValue(44.5, 0, 160, 0, 100, 5), 30);
  assert.equal(rangeTravelValue(-100, 8, 152, 0, 100, 5), 0);
  assert.equal(rangeTravelValue(200, 8, 152, 0, 100, 5), 100);
  assert.throws(() => rangeTravelValue(80, 8, 8, 0, 100, 5));
  assert.throws(() => rangeTravelValue(NaN, 8, 152, 0, 100, 5));
});

test('range travel rejects changed original values, pointer positions, box geometry and raster provenance', () => {
  const original = JSON.parse(readFileSync(`${rangeDragArtifactRoot}/latest-report.json`));
  const read = file => readFileSync(`${rangeDragArtifactRoot}/${file}`);
  const changes = [
    r => { r.results[0].stages[4].reference.controls[0].value = '45'; },
    r => { r.results[0].stages[4].astylar.controls[0].value = '45'; },
    r => { r.results[0].stages[4].reference.nativeEvents.filter(e => e.type === 'pointermove').at(-1).clientX += 20; },
    r => { r.results[0].stages[0].reference.controls[0].nativeBox.x += 20; },
    r => { r.results[0].stages[12].reference.controls[0].value = '95'; },
    r => { r.results[0].stages[0].reference.screenshot.sha256 = '0'.repeat(64); },
    r => { r.results[0].stages[0].reference.screenshot.file = r.results[0].stages[0].astylar.screenshot.file; },
    r => { r.results[0].dpr = 2; },
    r => { r.results.pop(); },
  ];
  for (const [index, mutate] of changes.entries()) {
    const r = structuredClone(original); mutate(r);
    assert.throws(() => inspectNativeRangeTravel(r, read), `mutation ${index}`);
  }
});
