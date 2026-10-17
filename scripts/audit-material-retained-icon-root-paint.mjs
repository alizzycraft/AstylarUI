import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { PNG } from 'pngjs';
import { evaluateFocusedRaster } from '../tests/material-parity/focused-raster-metrics.mjs';
import { compareBottomShadowProfiles } from '../tests/material-parity/shadow-profile-metrics.mjs';
import { fingerprintModuleGraph, materialCaseKey, openMaterialCheckpoint } from '../tests/material-parity/run-checkpoint.mjs';
import { queryFindings } from './audit-findings-store.mjs';

// Retained-pixel diagnostic,not a browser capture or new release target.
const script = 'scripts/audit-material-retained-icon-root-paint.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const base = 'artifacts/material-parity/icon-fresh-producer-retained-build-20261016';
const reportFile = base + '/latest-report.json', reportBytes = readFileSync(reportFile);
assert.equal(hash(reportBytes), 'ec08642c4a7d5b7830805bf2de4489c318a4b1d338d7148483004ba16a5a4e26');
const captured = JSON.parse(reportBytes), manifestFile = base + '/checkpoint/manifest.json';
const manifestBytes = readFileSync(manifestFile), manifest = JSON.parse(manifestBytes);
const checkpoint = openMaterialCheckpoint({ directory: base, provenance: manifest.provenance, resume: true });
const runner = 'tests/material-parity/run-material-parity.mjs', runnerSource = readFileSync(runner, 'utf8');
const ast = ts.createSourceFile(runner, runnerSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const names = ['compareUniformBackgrounds', 'sampleFlatColor', 'colorChannelError'];
const helpers = ast.statements.filter(n => ts.isFunctionDeclaration(n) && names.includes(n.name?.text));
assert.equal(helpers.length, 3);
const original = new Function(helpers.map(n => n.getText(ast)).join('\n') + ';return {compareUniformBackgrounds,colorChannelError};')();
const sources = [...fingerprintModuleGraph(process.cwd(), script), { file: runner, sha256: hash(runnerSource) }];
const findings = queryFindings('artifacts/material-parity/working-audit', 'icon').filter(r => r.element === 'icon-root' && r.property === 'boxShadow');
assert.equal(findings.length, 1); assert.equal(findings[0].occurrences, 20);
assert.equal(findings[0].classification, 'application-plugin-authoring-defect');
assert.equal(findings[0].attribution, 'reviewed-root-shadow-inputs');
const pointerFile = 'artifacts/material-parity/working-audit/current.json', pointerBytes = readFileSync(pointerFile);
const pointer = JSON.parse(pointerBytes), indexFile = `artifacts/material-parity/working-audit/${pointer.generation}/index.json`;
assert.equal(hash(readFileSync(indexFile)), pointer.indexSha256);
function crop(image, b) {
  assert.ok(b.left >= 0 && b.top >= 0 && b.right <= image.width && b.bottom <= image.height);
  const width = b.right - b.left, height = b.bottom - b.top; assert.ok(width > 0 && height > 0);
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) data.set(image.data.subarray(((b.top + y) * image.width + b.left) * 4,
    ((b.top + y) * image.width + b.right) * 4), y * width * 4);
  return { width, height, data };
}
const records = [];
for (const [kind, cases] of [['static', captured.results], ['interaction', captured.interactions]]) for (const row of cases) {
  assert.equal(row.family, 'icon');
  const key = materialCaseKey(kind, row); assert.deepEqual(checkpoint.load(key), row);
  const checkpointFile = `${base}/checkpoint/${hash(key)}.json`, checkpointBytes = readFileSync(checkpointFile);
  const entry = JSON.parse(checkpointBytes), images = {}, imageReceipts = {};
  for (const side of ['reference', 'astylar']) {
    const file = path.join(path.dirname(row.inputTrees[side].file), side + '.png'), bytes = readFileSync(file);
    const receipt = entry.files.find(f => path.resolve(base, f.file) === path.resolve(file));
    assert.ok(receipt); assert.equal(hash(bytes), receipt.sha256);
    images[side] = PNG.sync.read(bytes); imageReceipts[side] = { file, sha256: receipt.sha256 };
  }
  const root = row.geometry.elements.find(e => e.id === 'icon-root'), child = row.geometry.elements.find(e => e.id === 'icon-primary');
  assert.equal(root.missing, false); assert.equal(child.missing, false);
  const a = root.expected, b = root.actual, scale = row.viewport.deviceScaleFactor;
  const input = row.styleInputs.find(s => s.id === 'icon-root'); assert.ok(input);
  const radius = Math.max(parseFloat(input.reference.borderTopLeftRadius), parseFloat(input.astylar.borderRadius) || 0);
  const union = { left: Math.min(a.left, b.left), top: Math.min(a.top, b.top), right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom) };
  const bounds = box => ({ left: Math.max(0, Math.floor(box.left * scale)), top: Math.max(0, Math.floor(box.top * scale)),
    right: Math.min(images.reference.width, Math.ceil(box.right * scale)), bottom: Math.min(images.reference.height, Math.ceil(box.bottom * scale)) });
  const regions = { full: bounds({ left: union.left - 8, top: union.top - 8, right: union.right + 8, bottom: union.bottom + 8 }) };
  for (const [name, right, bottom] of [['tl', false, false], ['tr', true, false], ['bl', false, true], ['br', true, true]]) {
    const extent = radius + 16, left = right ? union.right + 8 - extent : union.left - 8;
    const top = bottom ? union.bottom + 8 - extent : union.top - 8;
    regions[name] = bounds({ left, top, right: left + extent, bottom: top + extent });
  }
  const rasters = Object.fromEntries(Object.entries(regions).map(([name, box]) => [name, {
    bounds: box, metrics: evaluateFocusedRaster(crop(images.reference, box), crop(images.astylar, box), { maximumPhaseOffset: 0 }),
  }]));
  const centers = {};
  for (const [side, box, inner] of [['reference', a, child.expected], ['astylar', b, child.actual]]) {
    assert.ok(inner.left >= box.left && inner.right <= box.right && inner.top >= box.top && inner.bottom <= box.bottom);
    const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    assert.ok(!(cx >= inner.left && cx <= inner.right && cy >= inner.top && cy <= inner.bottom));
    const x = Math.round(cx * scale), y = Math.round(cy * scale), offset = (y * images[side].width + x) * 4;
    centers[side] = { cssPoint: { x: cx, y: cy }, rgba: [...images[side].data.subarray(offset, offset + 4)] };
  }
  const legacyFill = original.compareUniformBackgrounds(images.reference, images.astylar,
    { 'icon-root': { borderBox: a } }, { 'icon-root': { borderBox: b } }, { container: 'icon-root', surfaces: ['icon-root'] }, scale)[0];
  // Preserve the raw result:the original bottom-left sample falls outside a36px corner.
  const inside = r => r <= 10 || 2 * (r - 10) ** 2 <= r ** 2;
  const applicable = inside(parseFloat(input.reference.borderBottomLeftRadius)) && inside(parseFloat(input.astylar.borderRadius) || 0);
  const shadow = compareBottomShadowProfiles(images.reference, images.astylar, a, b, scale);
  records.push({ case: `${kind}:icon@${row.profile}/${row.viewport.id}${kind === 'interaction' ? '/' + row.state : ''}`,
    profile: row.profile, viewport: row.viewport, geometry: { root, child },
    evidence: { checkpoint: { file: checkpointFile, sha256: hash(checkpointBytes) }, images: imageReceipts, pairedTrees: row.inputTrees },
    inputs: { reference: input.reference, candidate: input.astylar }, rasters,
    centerFill: { samples: centers, maximumChannelError: original.colorChannelError(centers.reference.rgba, centers.astylar.rgba), boundary: 'Measured unobstructed center pixel,not full uniformity.' },
    legacyFill: { raw: legacyFill, applicableToBottomLeftCorner: applicable,
      boundary: 'Outside-rounded-fill samples are not usable fill failures;raw result is preserved.' },
    shadow: { ...shadow, tailRowsWithinOriginalThreshold: shadow.rowErrors.slice(1).every(error => error <= 18),
      boundary: 'Preserve the original five-row failure,including contact row0. It is not an isolated shadow-tail defect;unequal input classification and unresolved contact attribution remain.' } });
}
assert.equal(records.length, 20);
const result = { schemaVersion: 1, kind: 'retained-icon-root-paint-diagnostic',
  scope: 'Retained build/checkpoint pixels and measured boxes;phase0 diagnostic defaults,not new release gates,equal-input acceptance or complete clipping coverage.',
  browser: captured.browser, currentRenderingAccepted: false, sources,
  sourceReport: { file: reportFile, sha256: hash(reportBytes) }, checkpointManifest: { file: manifestFile, sha256: hash(manifestBytes) },
  canonicalPointer: { file: pointerFile, sha256: hash(pointerBytes) }, canonicalIndex: { file: indexFile, sha256: pointer.indexSha256 },
  existingShadowInputClassification: findings[0], records };
// Compare the JSON contract,not an in-memory negative-zero sign. Reject invalid
// numbers rather than allowing JSON to hide them as null;nonzero offsets remain.
const serialized = JSON.stringify(result, (_key, value) => {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), 'Nonfinite diagnostic value');
  return value;
});
const arg = process.argv[2];
if (arg) {
  const match = /^--(output|check)=(.+)$/.exec(arg); assert.ok(match);
  const file = path.resolve(match[2]); assert.ok(file.startsWith(path.resolve('artifacts/material-parity') + path.sep));
  if (match[1] === 'check') assert.equal(JSON.stringify(JSON.parse(readFileSync(file))), serialized);
  else writeFileSync(file, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
} else console.log(serialized);
console.log(JSON.stringify({ cases: records.length, fullRootSimilarityMatches: records.filter(r => r.rasters.full.metrics.matches).length,
  cornerSimilarityMatches: records.reduce((n, r) => n + ['tl', 'tr', 'bl', 'br'].filter(k => r.rasters[k].metrics.matches).length, 0),
  exactCenterFillMatches: records.filter(r => r.centerFill.maximumChannelError === 0).length,
  invalidLegacyFillSamples: records.filter(r => !r.legacyFill.applicableToBottomLeftCorner).length,
  originalShadowFailures: records.filter(r => !r.shadow.matches).length,
  shadowTailRowsWithinOriginalThreshold: records.every(r => r.shadow.tailRowsWithinOriginalThreshold), currentRenderingAccepted: false }));
