import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { evaluateFocusedRaster } from '../tests/material-parity/focused-raster-metrics.mjs';
import { materialCaseKey, openMaterialCheckpoint } from '../tests/material-parity/run-checkpoint.mjs';
import { queryFindings } from './audit-findings-store.mjs';

// Reuse original full PNGs. Local diagnostics do not create new release gates.
const hash = value => createHash('sha256').update(value).digest('hex');
const base = 'artifacts/material-parity/current-full-20261005';
const reportFile = `${base}/latest-report.json`, reportBytes = readFileSync(reportFile);
assert.equal(hash(reportBytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
const report = JSON.parse(reportBytes), manifestFile = `${base}/checkpoint/manifest.json`;
const manifestBytes = readFileSync(manifestFile), manifest = JSON.parse(manifestBytes);
const checkpoint = openMaterialCheckpoint({ directory: base, provenance: manifest.provenance, resume: true });
const findings = queryFindings('artifacts/material-parity/working-audit', 'badge')
  .filter(row => row.element === 'badge-count' && row.property === 'backgroundColor');
assert.equal(findings.length, 4);
for (const finding of findings) {
  assert.equal(finding.classification, 'application-plugin-authoring-defect');
  assert.equal(finding.attribution, 'reviewed-authored-rule');
}
const crop = (image, bounds) => {
  assert.ok(bounds.left >= 0 && bounds.top >= 0 && bounds.right <= image.width && bounds.bottom <= image.height);
  const width = bounds.right - bounds.left, height = bounds.bottom - bounds.top;
  assert.ok(width > 0 && height > 0); const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) data.set(image.data.subarray(((bounds.top + y) * image.width + bounds.left) * 4,
    ((bounds.top + y) * image.width + bounds.right) * 4), y * width * 4);
  return { width, height, data };
};
const records = []; let controls = 0;
for (const [kind, rows] of [['static', report.results], ['interaction', report.interactions]]) {
  for (const row of rows.filter(row => row.family === 'badge')) {
    const key = materialCaseKey(kind, row); assert.deepEqual(checkpoint.load(key), row);
    const checkpointFile = `${base}/checkpoint/${hash(key)}.json`, checkpointBytes = readFileSync(checkpointFile);
    const entry = JSON.parse(checkpointBytes), images = {}, imageReceipts = {};
    for (const side of ['reference', 'astylar']) {
      const file = path.join(path.dirname(row.inputTrees[side].file), `${side}.png`), bytes = readFileSync(file);
      const receipt = entry.files.find(value => path.resolve(base, value.file) === path.resolve(file));
      assert.ok(receipt); assert.equal(hash(bytes), receipt.sha256);
      images[side] = PNG.sync.read(bytes); imageReceipts[side] = { file, sha256: receipt.sha256 };
    }
    assert.equal(images.reference.width, images.astylar.width); assert.equal(images.reference.height, images.astylar.height);
    const geometry = row.geometry.elements.find(value => value.id === 'badge-count');
    assert.ok(geometry); assert.equal(geometry.missing, false);
    const a = geometry.expected, b = geometry.actual, scale = row.viewport.deviceScaleFactor;
    const bounds = { left: Math.floor(Math.min(a.left, b.left) * scale), top: Math.floor(Math.min(a.top, b.top) * scale),
      right: Math.ceil(Math.max(a.right, b.right) * scale), bottom: Math.ceil(Math.max(a.bottom, b.bottom) * scale) };
    const pair = { reference: crop(images.reference, bounds), astylar: crop(images.astylar, bounds) };
    const metrics = evaluateFocusedRaster(pair.reference, pair.astylar, { maximumPhaseOffset: 0 });
    assert.ok(metrics.phaseOffset.x === 0 && metrics.phaseOffset.y === 0);
    if (!controls) {
      assert.equal(evaluateFocusedRaster(pair.reference, pair.reference, { maximumPhaseOffset: 0 }).similarity, 1);
      const forged = { ...pair.astylar, data: new Uint8Array(pair.astylar.data.length).fill(255) };
      assert.notEqual(evaluateFocusedRaster(pair.reference, forged, { maximumPhaseOffset: 0 }).similarity, metrics.similarity);
      assert.throws(() => crop(images.reference, { ...bounds, left: -1 })); controls = 3;
    }
    const input = row.styleInputs.find(value => value.id === 'badge-count'); assert.ok(input);
    records.push({ case: `${kind}:badge@${row.profile}/${row.viewport.id}${kind === 'interaction' ? `/${row.state}` : ''}`,
      profile: row.profile, viewport: row.viewport, geometry, bounds, metrics,
      inputs: { referenceBackground: input.reference.backgroundColor, candidateBackground: input.astylar.background },
      evidence: { checkpoint: { file: checkpointFile, sha256: hash(checkpointBytes) }, images: imageReceipts, pairedTrees: row.inputTrees },
      originalOutputGate: row.meetsAcceptance });
  }
}
assert.equal(records.length, 52); assert.equal(controls, 3);
console.log(JSON.stringify({ scope: 'Retained count-only union-box diagnostics,no phase adjustment or new acceptance gate. Unequal authored colours remain;not equal-input renderer colour,full glyph/corner/label/root paint,current source or case closure.',
  evidence: { report: { file: reportFile, sha256: hash(reportBytes) }, manifest: { file: manifestFile, sha256: hash(manifestBytes) },
    producer: { file: 'scripts/audit-material-retained-badge-paint.mjs', sha256: hash(readFileSync('scripts/audit-material-retained-badge-paint.mjs')) },
    metric: { file: 'tests/material-parity/focused-raster-metrics.mjs', sha256: hash(readFileSync('tests/material-parity/focused-raster-metrics.mjs')) } },
  cases: records.length, imageReceipts: records.length * 2, controls, existingBackgroundFindings: findings.map(row => row.id),
  diagnosticsBelowExistingDefault: records.filter(row => !row.metrics.matches).length,
  minimumSimilarity: Math.min(...records.map(row => row.metrics.similarity)), maximumSimilarity: Math.max(...records.map(row => row.metrics.similarity)),
  records, currentRenderingAccepted: false }));
