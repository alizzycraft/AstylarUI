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
  materialTextAlignmentToleranceOverrides, materialThresholds } from './benchmark.config.mjs';

const file = 'tests/material-parity/run-material-parity.mjs';
const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
const previous = execFileSync('git', ['show', `000394eb:${file}`], { encoding: 'utf8', maxBuffer: 2e6 }).replaceAll('\r\n', '\n');
const hash = source => createHash('sha256').update(source).digest('hex');
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
