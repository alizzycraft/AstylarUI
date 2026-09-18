import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { rangeDragArtifactRoot, validateRangeDragEvidence } from '../tests/material-parity/public-range-drag-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reportFile = `${rangeDragArtifactRoot}/latest-report.json`;
const outputFile = 'docs/material-public-range-travel-audit.json';

// Native Chromium's blue thumb protrudes above/below its narrow track. Exclude
// the central eight CSS-pixel strip so the filled track cannot bias the center.
// This is a local raster measurement for this pinned capture, not a native-style
// API, a general theme classifier or an Astylar geometry measurement.
export function measureNativeRangeThumb(png, box, dpr) {
  assert.ok([1, 2].includes(dpr));
  for (const field of ['x', 'y', 'width', 'height']) assert.ok(Number.isFinite(box[field]));
  assert.ok(box.width > 0 && box.height >= 16);
  assert.equal(png.data.length, png.width * png.height * 4);
  const centerY = box.y + box.height / 2;
  const x0 = Math.floor(box.x * dpr), x1 = Math.ceil((box.x + box.width) * dpr);
  const y0 = Math.floor((centerY - 8) * dpr), y1 = Math.ceil((centerY + 8) * dpr);
  assert.ok(x0 >= 0 && y0 >= 0 && x1 <= png.width && y1 <= png.height);
  let weight = 0, weightedX = 0, left = Infinity, right = -Infinity;
  const halves = [0, 0];
  for (let y = y0; y < y1; y++) {
    const cy = (y + .5) / dpr;
    if (Math.abs(cy - centerY) < 4) continue;
    for (let x = x0; x < x1; x++) {
      const offset = (y * png.width + x) * 4;
      const [r, g, b, a] = png.data.subarray(offset, offset + 4);
      if (a !== 255 || b <= 180 || r >= 150 || b - g <= 40) continue;
      const w = 1 - r / 255;
      weight += w; weightedX += (x + .5) / dpr * w;
      left = Math.min(left, x / dpr); right = Math.max(right, (x + 1) / dpr);
      halves[cy < centerY ? 0 : 1] += w;
    }
  }
  assert.ok(halves.every(n => n > 0), 'thumb must protrude on both sides of the excluded track');
  assert.ok(right - left > 0 && right - left <= 16, 'missing or ambiguous blue thumb raster');
  return { centerX: weightedX / weight, localCenterX: weightedX / weight - box.x,
    bandBounds: { left, right }, weightedPixels: weight, halfWeightedPixels: halves };
}

export function rangeTravelValue(localX, lowCenter, highCenter, min, max, step) {
  assert.ok([localX, lowCenter, highCenter, min, max, step].every(Number.isFinite));
  assert.ok(highCenter > lowCenter && max > min && step > 0);
  const ratio = Math.max(0, Math.min(1, (localX - lowCenter) / (highCenter - lowCenter)));
  return Math.min(max, Math.max(min, min + Math.round(ratio * (max - min) / step) * step));
}

export function inspectNativeRangeTravel(report, readScreenshot) {
  const pictures = new Map(), calibrations = new Map();
  const identity = e => JSON.stringify([e.dpr, e.translated, e.stackTracing]);
  for (const entry of report.results) {
    const target = entry.target === 'first' ? 0 : 1;
    for (const name of ['initial', 'released']) {
      const sample = entry.stages.find(s => s.name === name).reference, control = sample.controls[target];
      const bytes = readScreenshot(sample.screenshot.file);
      assert.equal(hash(bytes), sample.screenshot.sha256);
      const png = PNG.sync.read(bytes);
      assert.equal(png.width, report.viewport.width * entry.dpr);
      assert.equal(png.height, report.viewport.height * entry.dpr);
      pictures.set(sample.screenshot.file, { screenshot: sample.screenshot, control: control.id,
        value: Number(control.value), box: control.nativeBox, dpr: entry.dpr,
        ...measureNativeRangeThumb(png, control.nativeBox, entry.dpr) });
    }
    if (entry.update !== 'none') continue;
    const id = identity(entry); if (!calibrations.has(id)) calibrations.set(id, { dpr: entry.dpr,
      translated: entry.translated, stackTracing: entry.stackTracing });
    const group = calibrations.get(id), released = entry.stages.at(-1).reference;
    const measurement = pictures.get(released.screenshot.file), endpoint = target === 0 ? 'high' : 'low';
    assert.equal(measurement.value, target === 0 ? 100 : 0); assert.equal(group[endpoint], undefined);
    group[endpoint] = measurement;
  }
  assert.equal(calibrations.size, 8); assert.equal(pictures.size, 64);
  for (const group of calibrations.values()) {
    assert.equal(group.high.box.width, group.low.box.width);
    assert.equal(group.high.box.height, group.low.box.height);
    group.travel = group.high.localCenterX - group.low.localCenterX;
    assert.ok(group.low.localCenterX > 0 && group.high.localCenterX < group.high.box.width);
    assert.ok(group.travel > 0);
  }
  const observations = [];
  for (const entry of report.results) {
    const index = entry.target === 'first' ? 0 : 1, group = calibrations.get(identity(entry));
    const initial = entry.stages[0].reference, control = initial.controls[index];
    const { width, x } = control.nativeBox;
    assert.equal(width, group.low.box.width);
    const min = Number(control.min), max = Number(control.max), step = Number(control.step);
    const initialRaster = pictures.get(initial.screenshot.file);
    const expectedInitialCenter = group.low.localCenterX + (Number(control.value) - min) / (max - min) * group.travel;
    assert.ok(Math.abs(initialRaster.localCenterX - expectedInitialCenter) <= .5,
      'initial native raster must agree with endpoint-derived travel within CSS raster rounding');
    const moves = entry.stages.slice(4, 12).map(stage => {
      const nativeMove = stage.reference.nativeEvents.filter(e => e.type === 'pointermove').at(-1);
      const localX = nativeMove.clientX - x;
      const nativeValue = Number(stage.reference.controls[index].value);
      const astylarValue = Number(stage.astylar.controls[index].value);
      const predictedNative = rangeTravelValue(localX, group.low.localCenterX, group.high.localCenterX, min, max, step);
      const fullBoxModel = rangeTravelValue(localX, 0, width, min, max, step);
      assert.equal(predictedNative, nativeValue, `native travel model: ${identity(entry)} ${entry.target} ${stage.name}`);
      if (entry.update === 'none') assert.equal(fullBoxModel, astylarValue);
      return { stage: stage.name, localX, nativeValue, astylarValue, predictedNative, fullBoxModel,
        nativeMatchesTravel: nativeValue === predictedNative, nativeMatchesFullBox: nativeValue === fullBoxModel,
        astylarMatchesFullBox: astylarValue === fullBoxModel };
    });
    observations.push({ dpr: entry.dpr, translated: entry.translated, stackTracing: entry.stackTracing,
      target: entry.target, update: entry.update, initialRaster, expectedInitialCenter,
      lowCenter: group.low.localCenterX, highCenter: group.high.localCenterX, travel: group.travel, moves });
  }
  assert.equal(observations.length, 32);
  return { cases: observations.length, measuredScreenshots: pictures.size, calibrationPairs: calibrations.size,
    nativeMoveSamples: observations.reduce((n, o) => n + o.moves.length, 0),
    nativeFullBoxMismatches: observations.reduce((n, o) => n + o.moves.filter(m => !m.nativeMatchesFullBox).length, 0),
    noUpdateCandidateMoveSamples: observations.filter(o => o.update === 'none').reduce((n, o) => n + o.moves.length, 0),
    calibrations: [...calibrations.values()], observations,
    capturedNativeTravelModelVerified: true, generalNativeRangeMetricProven: false,
    materialSwappedThumbCauseProven: false, renderingEquivalent: false, rendererChanged: false };
}

export function collectPublicRangeTravel() {
  const bytes = readFileSync(reportFile);
  assert.equal(hash(bytes), '8c298293efb0e464af4a3ba73bf80055fcbab469c196e666e22b02f17ad85962');
  const report = JSON.parse(bytes), original = validateRangeDragEvidence(report);
  const result = inspectNativeRangeTravel(report, file => {
    assert.equal(path.basename(file), file); return readFileSync(`${rangeDragArtifactRoot}/${file}`);
  });
  assert.equal(result.cases, original.cases);
  return { schemaVersion: 1, kind: 'public-range-native-travel-raster-audit',
    originalReport: { file: reportFile, sha256: hash(bytes) }, browser: report.browser, packages: report.packages,
    sourceFingerprints: ['scripts/audit-public-range-travel.mjs', 'tests/material-parity/public-range-drag-evidence.mjs',
      'src/app/services/dom/input/input-element.service.ts', 'src/app/services/dom/input/range.manager.ts']
      .map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
    ...result,
    limits: ['This reuses authenticated captured native rasters and pointer traces; it is not a new browser run or a general UA-style contract.',
      'Endpoint centers are measured from different identically sized controls under the same captured declarations. They are not DOM pseudo-element box measurements.',
      'The model is established for this Chromium native theme, 160px horizontal LTR ranges and the sampled paths. Other sizes, themes, RTL, custom thumbs and pointer grab offsets require independent experiments.',
      'Core blank range paint, premature release during updates, and swapped overlapping Material thumbs remain separate findings.',
      'Do not add an 8px fixture or renderer magic offset; native/core appearance and travel geometry need an explicit owning contract.'] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectPublicRangeTravel(), output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(outputFile, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(outputFile, output);
  console.log(JSON.stringify({ cases: report.cases, measuredScreenshots: report.measuredScreenshots,
    nativeMoveSamples: report.nativeMoveSamples, nativeFullBoxMismatches: report.nativeFullBoxMismatches,
    noUpdateCandidateMoveSamples: report.noUpdateCandidateMoveSamples, sha256: hash(output) }));
}
