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
  let targets = 0;
  for (const row of report.results) {
    assert.deepEqual(row.runtime.errors, []);
    for (const type of ['document', 'script', 'stylesheet', 'font']) assert.ok(row.runtime.assets.some(asset => asset.type === type));
    for (const asset of row.runtime.assets) assert.equal(asset.sha256, assets.get(asset.file));
    const original = readFileSync(row.originalFrame.file);
    assert.equal(hash(original), row.originalFrame.sha256);
    assert.equal(hash(PNG.sync.read(original).data), row.originalFrame.decodedRGBA);
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
      assert.equal(target.retainedStyle.fontSize, '14.4px');
      // Current context state is not the historical draw-call font.
      assert.equal(texture.font, '10px sans-serif');
      targets++;
    }
  }
  assert.equal(targets, 8);
  t.diagnostic('4 configured cases/8 owners/16 texture PNGs authenticated; vertically reversed readback has identical alpha and only 15/37 one-level RGB residuals. This does not establish native glyph equality or explain final-frame differences.');
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
