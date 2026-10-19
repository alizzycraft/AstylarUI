import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import ts from 'typescript';
import { PNG } from 'pngjs';
import { measureTextInkCenter, textCenterOffsetError } from './text-alignment-metrics.mjs';
import { materialLeftAlignedTextTargets, materialAbsoluteTextAlignmentTargets,
  materialTextAlignmentToleranceOverrides, materialThresholds, materialStaticCases, materialInteractionCases } from './benchmark.config.mjs';
import { fingerprintDirectory, fingerprintModuleGraph, openMaterialCheckpoint, materialCaseKey } from './run-checkpoint.mjs';
import { evaluateFocusedRaster } from './focused-raster-metrics.mjs';

const file = 'tests/material-parity/run-material-parity.mjs';
const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
const previous = execFileSync('git', ['show', `000394eb:${file}`], { encoding: 'utf8', maxBuffer: 2e6 }).replaceAll('\r\n', '\n');
const hash = source => createHash('sha256').update(source).digest('hex');

test('divider standalone batch registration conserves prior producer and bounded proof definitions', async () => {
  const producerFile = 'tests/material-parity/input-equivalence-audit.mjs';
  const producer = readFileSync(producerFile, 'utf8');
  const { restoreRootEditingProducerRegistration } = await import('./position-composition-producer-transition.mjs');
  assert.equal(restoreRootEditingProducerRegistration(producer), execFileSync('git', ['show', `82bf9cee:${producerFile}`],
    { encoding: 'utf8', maxBuffer: 4_000_000 }).replaceAll('\r\n', '\n'));
  assert.throws(() => restoreRootEditingProducerRegistration(producer.replace('Twenty physical contexts,sixty public remounts', 'All rendering accepted')));
  assert.throws(() => restoreRootEditingProducerRegistration(producer + '\n// unreviewed change'));
  for (const args of [
    ['scripts/audit-public-paragraph-linebox.mjs', '--verify', 'artifacts/material-parity/public-paragraph-linebox-20261015'],
    ['scripts/check-retained-paragraph-font-box.mjs', '--compare-current-browser'],
    ['scripts/check-material-divider-four-sample-model.mjs'],
  ]) {
    const output = execFileSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 4_000_000 });
    if (args[0] === 'scripts/check-retained-paragraph-font-box.mjs') {
      const proof = JSON.parse(output);
      assert.equal(proof.comparison.mode, 'fresh-current-browser-versus-retained-measurements');
      assert.equal(proof.comparison.recordedBrowser, '155.0.8059.40');
      assert.ok(proof.comparison.observedRuntime.browser);
      assert.equal(proof.comparison.observationsCompared, 8);
      assert.equal(proof.comparison.allNumericComparisonsUnchanged, true);
      assert.equal(proof.comparison.currentRenderingAccepted, false);
    }
  }
});

test('configured divider texture observations preserve source frames and bound upload residuals', t => {
  const directory = 'artifacts/material-parity/divider-configured-texture-boundary-20261015';
  const bytes = readFileSync(`${directory}/latest-report.json`);
  assert.equal(hash(bytes), 'e78434351000b4ec6802a229578f4b5729c35816e419104c57bc424aaa0c050d');
  const report = JSON.parse(bytes), baselineBytes = readFileSync(report.baseline.file);
  assert.equal(hash(baselineBytes), report.baseline.sha256);
  assert.equal(report.baseline.sha256, '4be9c6d199952f35203f31d08def08d0d936071f4eb313b75ad3bbf72dd46f11');
  const baseline = JSON.parse(baselineBytes), provenance = baseline.captureProvenance;
  for (const receipt of [report.capture.checkpointManifest, ...report.capture.sources]) {
    assert.equal(hash(readFileSync(receipt.file)), receipt.sha256, receipt.file);
  }
  const manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  assert.deepEqual(manifest.provenance.browserFiles, provenance.browserFiles);
  assert.deepEqual(fingerprintDirectory(path.resolve('examples/material-showcase/dist/material-showcase/browser')), provenance.browserFiles);
  const selected = [...baseline.results.map(row => ['static', row]), ...baseline.interactions.map(row => ['interaction', row])]
    .filter(([, row]) => row.profile === 'contrast' && row.viewport.deviceScaleFactor === 1);
  assert.deepEqual(report.results.map(row => row.case).sort(), selected.map(([kind, row]) => materialCaseKey(kind, row)).sort());
  const assets = new Map(provenance.browserFiles.map(row => [row.file, row.sha256]));
  let targets = 0, interiorPixels = 0, interiorResiduals = 0;
  let edgeHaloPixels = 0, edgeHaloInkPixels = 0, changedPixelControls = 0;
  for (const row of report.results) {
    assert.deepEqual(row.runtime.errors, []);
    for (const type of ['document', 'script', 'stylesheet', 'font']) assert.ok(row.runtime.assets.some(asset => asset.type === type));
    for (const asset of row.runtime.assets) assert.equal(asset.sha256, assets.get(asset.file));
    const original = readFileSync(row.originalFrame.file);
    assert.equal(hash(original), row.originalFrame.sha256);
    const frame = PNG.sync.read(original);
    assert.equal(hash(frame.data), row.originalFrame.decodedRGBA);
    assert.deepEqual(row.observation.targets.map(target => target.id), ['divider-above', 'divider-below']);
    const key = JSON.parse(row.case), label = `${key.kind}-${key.viewport.id}`;
    for (const target of row.observation.targets) {
      const texture = target.texture, { width, height } = texture.size;
      assert.equal(texture.rgba.length, width * height * 4);
      assert.equal(texture.gpuRGBA.length, texture.rgba.length);
      for (const [name, pixels] of [['canvas', texture.rgba], ['gpu-readback', texture.gpuRGBA]]) {
        const image = PNG.sync.read(readFileSync(`${directory}/${label}-${target.id}-${name}.png`));
        assert.equal(image.width, width); assert.equal(image.height, height);
        assert.deepEqual([...image.data], pixels);
      }
      let changed = 0, max = 0, alphaChanged = 0;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) for (let channel = 0; channel < 4; channel++) {
        const delta = Math.abs(texture.rgba[(y * width + x) * 4 + channel] -
          texture.gpuRGBA[((height - 1 - y) * width + x) * 4 + channel]);
        changed += delta !== 0; max = Math.max(max, delta); alphaChanged += channel === 3 && delta !== 0;
      }
      assert.equal(changed, target.id === 'divider-above' ? 15 : 37);
      assert.equal(max, 1); assert.equal(alphaChanged, 0);
      const vertices = target.projected.map(point => point.css);
      const left = Math.min(...vertices.map(point => point.x)), right = Math.max(...vertices.map(point => point.x));
      const top = Math.min(...vertices.map(point => point.y)), bottom = Math.max(...vertices.map(point => point.y));
      const backgroundOffset = (Math.floor(top) * frame.width + Math.floor(left) - 2) * 4;
      const background = [...frame.data.subarray(backgroundOffset, backgroundOffset + 4)];
      assert.deepEqual(background, [240, 240, 240, 255]);
      assert.equal(texture.samplingMode, 1);
      assert.deepEqual(target.uvs, [0, 0, 1, 0, 1, 1, 0, 1]);
      // Same bounded pixel-center/nearest-texel/straight-alpha model as the
      // existing public reduction. Exclude plane-edge coverage; no HTML claim.
      let modelResiduals = 0, shiftedGreaterThanTwo = 0;
      for (let y = Math.ceil(top); y < Math.floor(bottom); y++) for (let x = Math.ceil(left); x < Math.floor(right); x++) {
        const u = (x + .5 - left) / (right - left), v = (y + .5 - top) / (bottom - top);
        const texelX = Math.floor(u * width), texelY = Math.floor(v * height);
        const pixel = (y * frame.width + x) * 4;
        const error = rowShift => {
          const index = (Math.min(height - 1, texelY + rowShift) * width + texelX) * 4;
          const alpha = texture.rgba[index + 3] / 255;
          return Math.max(...[0, 1, 2].map(channel => Math.abs(Math.round(texture.rgba[index + channel] * alpha +
            background[channel] * (1 - alpha)) - frame.data[pixel + channel])));
        };
        const delta = error(0);
        assert.ok(delta <= 1, 'configured interior exceeds bounded sampler residual');
        assert.equal(frame.data[pixel + 3], 255);
        modelResiduals += delta > 0; shiftedGreaterThanTwo += error(1) > 2; interiorPixels++;
      }
      assert.equal(modelResiduals, target.id === 'divider-above' ? 9 : 8);
      assert.ok(shiftedGreaterThanTwo > 0, 'one-row wrong-address control must reject');
      interiorResiduals += modelResiduals;
      // Extend the SAME retained model to its previously omitted plane-edge
      // band and a one-device-pixel exterior halo. This is an empirical fit,
      // not a measurement of hardware coverage/sample locations.
      let firstEdge;
      for (let y = Math.floor(top) - 1; y <= Math.ceil(bottom); y++) for (let x = Math.floor(left) - 1; x <= Math.ceil(right); x++) {
        if (x >= Math.ceil(left) && x < Math.floor(right) && y >= Math.ceil(top) && y < Math.floor(bottom)) continue;
        assert.ok(x >= 0 && y >= 0 && x < frame.width && y < frame.height);
        const u = (x + .5 - left) / (right - left), v = (y + .5 - top) / (bottom - top);
        const inside = u >= 0 && u < 1 && v >= 0 && v < 1;
        const texel = (Math.max(0, Math.min(height - 1, Math.floor(v * height))) * width +
          Math.max(0, Math.min(width - 1, Math.floor(u * width)))) * 4;
        const alpha = inside ? texture.rgba[texel + 3] / 255 : 0;
        const predicted = [0, 1, 2].map(channel => Math.round((inside ? texture.rgba[texel + channel] * alpha : 0) +
          background[channel] * (1 - alpha)));
        const pixel = (y * frame.width + x) * 4;
        assert.deepEqual([...frame.data.subarray(pixel, pixel + 4)], [...predicted, 255],
          'configured edge/halo disagrees with retained model');
        edgeHaloInkPixels += predicted.some((value, channel) => value !== background[channel]);
        edgeHaloPixels++;
        firstEdge ??= { actual: [...frame.data.subarray(pixel, pixel + 4)], expected: [...predicted, 255] };
      }
      assert.ok(firstEdge);
      const changedEdge = [...firstEdge.actual]; changedEdge[0] = changedEdge[0] === 255 ? 254 : changedEdge[0] + 1;
      assert.throws(() => assert.deepEqual(changedEdge, firstEdge.expected), 'one-channel edge mutation must reject');
      changedPixelControls++;
      assert.equal(target.retainedStyle.fontSize, '14.4px');
      // Current context state is not the historical draw-call font.
      assert.equal(texture.font, '10px sans-serif');
      targets++;
    }
  }
  assert.equal(targets, 8);
  assert.equal(interiorPixels, 5287); assert.equal(interiorResiduals, 68);
  assert.equal(edgeHaloPixels, 1916); assert.equal(edgeHaloInkPixels, 36); assert.equal(changedPixelControls, 8);
  t.diagnostic('4 configured cases/8 owners/16 texture PNGs authenticated; reversed readback alpha agrees. Existing nearest-texel model predicts5287 interior pixels within1RGB level (68 one-level residuals) and1916 edge/halo pixels exactly (36 nonbackground);wrong-row and8 changed-edge-pixel controls reject. Empirical retained fit,not hardware sample locations,shader identity,native glyph equality or full-case acceptance.');
});
assert.equal(hash(previous), '082d6d7b3e0b0e5c1789f3d2ceff8862e3244de5319cc941e79c53fa634d6502');

function withoutProvenance(source) {
  const replacements = [
    ["    const measurementGeometry = { reference: expectedBox ? { ...expectedBox } : null,\n      astylar: actualBox ? { ...actualBox } : null, deviceScaleFactor: scale };\n", '', 1],
    ['{ id, measurementGeometry, matches:', '{ id, matches:', 3],
    ['    const cropProvenance = writeAlignmentArtifacts(', '    writeAlignmentArtifacts(', 1],
    ['      measurementGeometry,\n      cropProvenance,\n', '', 1],
    ["  return { anchor: 'reference-border-box', paddingCSSpx: 4, boundsDevicePx: { ...bounds } };\n", '', 1],
  ];
  for (const [from, to, count] of replacements) {
    assert.equal(source.split(from).length - 1, count); source = source.replaceAll(from, to);
  }
  return source;
}

function comparator(source) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(tree.parseDiagnostics.length, 0);
  const names = ['compareTextAlignment', 'writeAlignmentArtifacts', 'cropPng'];
  const functions = tree.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text));
  assert.equal(functions.length, names.length);
  const writes = new Map();
  const compare = new Function('PNG', 'writeFileSync', 'path', 'measureTextInkCenter', 'textCenterOffsetError',
    'materialLeftAlignedTextTargets', 'materialAbsoluteTextAlignmentTargets', 'materialTextAlignmentToleranceOverrides', 'materialThresholds',
    functions.map(node => node.getText(tree)).join('\n') + '\nreturn compareTextAlignment;')(
    PNG, (name, bytes) => { assert.ok(!writes.has(name)); writes.set(name, Buffer.from(bytes)); }, path,
    measureTextInkCenter, textCenterOffsetError, materialLeftAlignedTextTargets, materialAbsoluteTextAlignmentTargets,
    materialTextAlignmentToleranceOverrides, materialThresholds);
  return { compare, writes };
}
const legacyFields = row => Object.fromEntries(Object.entries(row).filter(([key]) => !['measurementGeometry', 'cropProvenance'].includes(key)));
function image(scale, ink = true) {
  const result = new PNG({ width: 64 * scale, height: 32 * scale }); result.data.fill(255);
  if (ink) for (let y = 8 * scale; y < 14 * scale; y++) for (let x = 8 * scale; x < 24 * scale; x++) {
    const offset = (y * result.width + x) * 4; result.data[offset] = result.data[offset + 1] = result.data[offset + 2] = 0;
  }
  return result;
}

test('alignment provenance is an exact metadata-only whole-runner extension', () => {
  assert.equal(withoutProvenance(current), previous);
  const changed = current.replace('const horizontalInsetFraction =', 'const unreviewedInsetFraction =');
  assert.notEqual(hash(withoutProvenance(changed)), hash(previous));
});

test('fractional and clipped alignment crops retain both measured boxes and unchanged PNG bytes at DPR1/2', () => {
  for (const scale of [1, 2]) for (const box of [
    { left: 4.25, top: 2.5, right: 35.75, bottom: 23.5, width: 31.5, height: 21 },
    { left: -2.25, top: -1.5, right: 30.75, bottom: 35.5, width: 33, height: 37 },
  ]) {
    const astylarBox = { ...box, top: box.top + 1, bottom: box.bottom + 1 };
    const before = comparator(previous), after = comparator(current), expected = { 'divider-above': { borderBox: box } },
      actual = { 'divider-above': { borderBox: astylarBox } }, pixels = image(scale);
    const oldRows = before.compare(pixels, pixels, expected, actual, ['divider-above'], scale, '/memory');
    const rows = after.compare(pixels, pixels, expected, actual, ['divider-above'], scale, '/memory');
    assert.deepEqual(rows.map(legacyFields), oldRows); assert.equal(rows.length, 1);
    assert.deepEqual(after.writes, before.writes); assert.equal(after.writes.size, 2);
    assert.deepEqual(rows[0].measurementGeometry, { reference: box, astylar: astylarBox, deviceScaleFactor: scale });
    assert.deepEqual(rows[0].cropProvenance, { anchor: 'reference-border-box', paddingCSSpx: 4, boundsDevicePx: {
      left: Math.max(0, Math.floor((box.left - 4) * scale)), top: Math.max(0, Math.floor((box.top - 4) * scale)),
      right: Math.min(pixels.width, Math.ceil((box.right + 4) * scale)), bottom: Math.min(pixels.height, Math.ceil((box.bottom + 4) * scale)),
    } });
    assert.notEqual(rows[0].measurementGeometry.reference, box);
    assert.notEqual(rows[0].measurementGeometry.astylar, astylarBox);
  }
});

test('absent geometry and missing ink preserve original decisions and write no invented crops', () => {
  const box = { left: 0, top: 0, right: 40, bottom: 20, width: 40, height: 20 }, pixels = image(1, false);
  for (const [reference, astylar] of [[{}, {}], [{ target: { borderBox: box } }, {}],
    [{ target: { borderBox: box } }, { target: { borderBox: box } }]]) {
    const before = comparator(previous), after = comparator(current);
    const oldRows = before.compare(pixels, pixels, reference, astylar, ['target'], 1, '/memory');
    const rows = after.compare(pixels, pixels, reference, astylar, ['target'], 1, '/memory');
    assert.deepEqual(rows.map(legacyFields), oldRows); assert.equal(after.writes.size, 0);
    assert.equal(rows[0].cropProvenance, undefined);
    assert.equal(rows[0].measurementGeometry.deviceScaleFactor, 1);
  }
});

test('fresh divider crop provenance reconstructs all96 images from authenticated full captures', t => {
  const directory = 'artifacts/material-parity/divider-alignment-provenance-20261015';
  const bytes = readFileSync(`${directory}/latest-report.json`);
  assert.equal(hash(bytes), '4be9c6d199952f35203f31d08def08d0d936071f4eb313b75ad3bbf72dd46f11');
  const report = JSON.parse(bytes), provenance = report.captureProvenance;
  assert.equal(report.mode, 'report-only');
  assert.deepEqual(fingerprintModuleGraph(process.cwd(), file), provenance.harnessFiles);
  assert.deepEqual(fingerprintDirectory(path.resolve('examples/material-showcase/dist/material-showcase/browser')), provenance.browserFiles);
  const checkpoint = openMaterialCheckpoint({ directory, provenance, resume: true });
  const actual = [...report.results.map(row => ['static', row]), ...report.interactions.map(row => ['interaction', row])];
  const expected = [...materialStaticCases.map(row => ['static', row]), ...materialInteractionCases.map(row => ['interaction', row])]
    .filter(([, row]) => row.family === 'divider').map(([kind, row]) => materialCaseKey(kind, row));
  assert.deepEqual(actual.map(([kind, row]) => materialCaseKey(kind, row)).sort(), expected.sort());
  assert.equal(actual.length, 24);
  let crops = 0, diagnosticsPassing = 0, diagnosticsFailing = 0;
  const metrics = [];
  for (const [kind, row] of actual) {
    assert.deepEqual(checkpoint.load(materialCaseKey(kind, row)), row);
    assert.deepEqual(row.runtimeErrors, []);
    assert.deepEqual(row.textAlignment.map(value => value.id), ['divider-above', 'divider-below']);
    const parent = path.dirname(row.inputTrees.reference.file);
    const full = Object.fromEntries(['reference', 'astylar'].map(side => [side, PNG.sync.read(readFileSync(path.join(parent, `${side}.png`)))]));
    for (const alignment of row.textAlignment) {
      const geometry = alignment.measurementGeometry, crop = alignment.cropProvenance, scale = row.viewport.deviceScaleFactor;
      assert.equal(geometry.deviceScaleFactor, scale); assert.ok(geometry.reference && geometry.astylar);
      assert.equal(crop.anchor, 'reference-border-box'); assert.equal(crop.paddingCSSpx, 4);
      const box = geometry.reference, bounds = crop.boundsDevicePx;
      assert.deepEqual(bounds, { left: Math.max(0, Math.floor((box.left - 4) * scale)),
        top: Math.max(0, Math.floor((box.top - 4) * scale)), right: Math.min(full.reference.width, Math.ceil((box.right + 4) * scale)),
        bottom: Math.min(full.reference.height, Math.ceil((box.bottom + 4) * scale)) });
      const images = {};
      const reconstruct = (image, area) => {
        const result = Buffer.alloc((area.right - area.left) * (area.bottom - area.top) * 4);
        let offset = 0;
        for (let y = area.top; y < area.bottom; y++) for (let x = area.left; x < area.right; x++) {
          image.data.copy(result, offset, (y * image.width + x) * 4, (y * image.width + x) * 4 + 4); offset += 4;
        }
        return result;
      };
      for (const side of ['reference', 'astylar']) {
        const image = PNG.sync.read(readFileSync(path.join(parent, `${alignment.id}-alignment-${side}.png`)));
        assert.equal(image.width, bounds.right - bounds.left); assert.equal(image.height, bounds.bottom - bounds.top);
        assert.deepEqual(Buffer.from(image.data), reconstruct(full[side], bounds));
        if (crops === 0) assert.notDeepEqual(Buffer.from(image.data), reconstruct(full[side],
          { ...bounds, top: bounds.top + 1, bottom: bounds.bottom + 1 }));
        images[side] = image; crops++;
      }
      // Same retained diagnostic as the historical divider review,not a new
      // configured threshold or a replacement for equal-input investigation.
      const metric = evaluateFocusedRaster(images.reference, images.astylar, { minimumSsim: .8 });
      if (metric.matches) diagnosticsPassing++; else diagnosticsFailing++;
      metrics.push({ case: materialCaseKey(kind, row), id: alignment.id, metric });
    }
  }
  assert.equal(crops, 96); assert.equal(metrics.length, 48);
  assert.equal(report.summary.meetsAcceptance, false); assert.equal(report.interactionSummary.meetsAcceptance, false);
  t.diagnostic(JSON.stringify({ sourceBoundCases: 24, reconstructedCrops: crops, diagnosticTargets: 48,
    diagnosticsPassing, diagnosticsFailing, metrics, shiftedCropRejected: true,
    boundary: 'Fresh served-build crop extraction and unchanged diagnostic metric;not recovered historical producer,full matrix,input equivalence or current-library acceptance.' }));
});
