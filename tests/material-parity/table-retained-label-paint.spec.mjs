import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { materialCaseKey, openMaterialCheckpoint } from './run-checkpoint.mjs';
import { cropRgba } from '../parity/sharpness-metrics.mjs';
import { evaluateFocusedRaster } from './focused-raster-metrics.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const pinned = (file, sha256) => {
  const bytes = readFileSync(file); assert.equal(hash(bytes), sha256, file); return bytes;
};
const textInputs = style => Object.fromEntries(['fontSize', 'lineHeight', 'fontFamily', 'fontWeight', 'color']
  .map(name => [name, style[name]]));
const caseId = row => `interaction:table@${row.profile}/${row.viewport.id}/${row.state}`;

// Standalone supplement: do not register or alter the frozen scrollbar batch.
test('retained table interaction label paint authenticates all cases and replays unique physical cohorts', t => {
  const paintFile = 'artifacts/material-parity/table-retained-interaction-paint-20261023.log';
  const paint = pinned(paintFile, 'cf0ed917473aa4b3e93405ecbb8e9c2b860e3e03a7dc8ca61f09197ef34f3322')
    .toString().trim().split(/\r?\n/).map(JSON.parse);
  const rows = paint.filter(row => row.case), summary = paint.at(-1).summary;
  const phaseFile = 'artifacts/material-parity/table-retained-interaction-phase-boundary-20261023.log';
  const phase = JSON.parse(pinned(phaseFile, '610216b68632f5ce6a4b0d9a426614a083d2756c32034883e974f08dd76377f4'));
  const cohortFile = 'artifacts/material-parity/table-retained-paint-cohort-applicability-20261023.log';
  const cohort = JSON.parse(pinned(cohortFile, '31e19444b8a05bc708907af49f50e57cb265d7f2963731c2da0916c51087437a'));
  assert.equal(rows.length, 40); assert.equal(new Set(rows.map(row => row.case)).size, 40);
  assert.equal(summary.currentRenderingAccepted, false); assert.equal(phase.summary.newAcceptanceGate, false);
  for (const receipt of summary.verifiers) pinned(receipt.file, receipt.sha256);
  const report = JSON.parse(pinned(summary.report.file, summary.report.sha256));
  const manifest = JSON.parse(pinned(summary.checkpointManifest.file, summary.checkpointManifest.sha256));
  assert.deepEqual(manifest.provenance, report.captureProvenance);
  const root = path.dirname(summary.report.file);
  const checkpoint = openMaterialCheckpoint({ directory: root, provenance: manifest.provenance, resume: true });
  const captured = new Map(report.interactions.filter(row => row.family === 'table').map(row => [caseId(row), row]));
  assert.equal(captured.size, 40);
  const trees = new Map(), images = new Map();
  const tree = receipt => {
    const bytes = pinned(receipt.file, receipt.sha256);
    if (!trees.has(receipt.sha256)) trees.set(receipt.sha256, JSON.parse(bytes));
    return trees.get(receipt.sha256);
  };
  const image = receipt => {
    const bytes = pinned(receipt.file, receipt.sha256);
    if (!images.has(receipt.sha256)) images.set(receipt.sha256, PNG.sync.read(bytes));
    return images.get(receipt.sha256);
  };
  const verifyCase = (record, capture) => {
    assert.equal(record.case, caseId(capture)); assert.equal(record.acceptance, false);
    assert.equal(capture.viewport.id, `desktop-dpr${capture.viewport.deviceScaleFactor}`);
    assert.deepEqual(capture.focusedRasters, []);
    const key = materialCaseKey('interaction', capture);
    assert.equal(path.basename(record.checkpoint.file), `${hash(key)}.json`);
    const saved = JSON.parse(pinned(record.checkpoint.file, record.checkpoint.sha256));
    assert.deepEqual(saved.result, capture);
    const data = {};
    for (const side of ['reference', 'astylar']) {
      assert.deepEqual(record.receipts[side].tree, capture.inputTrees[side]);
      data[side] = tree(record.receipts[side].tree);
      const png = record.receipts[side].png;
      const savedPng = saved.files.filter(item => item.file.endsWith(`/${side}.png`));
      assert.equal(savedPng.length, 1);
      assert.equal(path.resolve(root, savedPng[0].file), path.resolve(png.file));
      assert.equal(savedPng[0].sha256, png.sha256); pinned(png.file, png.sha256);
    }
    const geometry = capture.geometry.elements.find(row => row.id === 'table-primary');
    assert.deepEqual(record.geometry, geometry); assert.equal(geometry.missing, false);
    const box = geometry.expected, dpr = capture.viewport.deviceScaleFactor;
    const nativeRows = data.reference.nodes.filter(node => node.type === 'tr');
    assert.equal(nativeRows.length, 3);
    const heights = nativeRows.map(node => parseFloat(data.reference.styles[node.style].height));
    assert.ok(Math.abs(heights.reduce((a, b) => a + b, 0) - box.height) < .1);
    assert.deepEqual(record.observations.map(row => row.text), ['Name', 'Atlas', 'Northstar']);
    let offset = 0;
    for (const [i, observed] of record.observations.entries()) {
      const native = data.reference.nodes.filter(node => node.ownText === observed.text);
      const candidate = data.astylar.nodes.filter(node => node.authored?.textContent === observed.text);
      assert.equal(native.length, 1); assert.equal(candidate.length, 1);
      assert.equal(observed.referenceKey, native[0].key); assert.equal(observed.candidateKey, candidate[0].key);
      assert.deepEqual(observed.referenceFont, textInputs(data.reference.styles[native[0].style]));
      assert.equal(candidate[0].retainedText.source, 'core-text-registry');
      assert.deepEqual(observed.candidateRetainedFont, textInputs(candidate[0].retainedText.style));
      assert.notEqual(observed.referenceFont.fontSize, observed.candidateRetainedFont.fontSize);
      assert.deepEqual(observed.commonPhysicalBounds, {
        left: Math.floor((box.left + 8) * dpr), right: Math.ceil((box.left + 128) * dpr),
        top: Math.floor((box.top + offset + 8) * dpr), bottom: Math.ceil((box.top + offset + heights[i] - 8) * dpr),
      });
      offset += heights[i];
    }
  };
  for (const row of rows) {
    const capture = captured.get(row.case); assert.ok(capture);
    assert.deepEqual(checkpoint.load(materialCaseKey('interaction', capture)), capture);
    verifyCase(row, capture);
  }
  assert.equal(cohort.cohorts.length, 8);
  let replayedLabels = 0, standardFailures = 0;
  for (const group of cohort.cohorts) {
    const members = group.cases.map(id => rows.find(row => row.case === id));
    assert.equal(members.length, 5); assert.ok(members.every(Boolean));
    assert.equal(new Set(members.map(row => row.case)).size, 5);
    const representative = rows.find(row => row.case === group.representative); assert.ok(representative);
    for (const member of members) {
      assert.deepEqual(member.observations, representative.observations);
      for (const side of ['reference', 'astylar'])
        assert.equal(member.receipts[side].png.sha256, representative.receipts[side].png.sha256);
    }
    assert.equal(hash(JSON.stringify(representative.observations)), group.labelMeasurementSha256);
    for (const observed of representative.observations) {
      const a = cropRgba(image(representative.receipts.reference.png), observed.commonPhysicalBounds);
      const b = cropRgba(image(representative.receipts.astylar.png), observed.commonPhysicalBounds);
      assert.deepEqual(a.bounds, b.bounds);
      // A zero-width phase loop returns -0,which the original JSON artifact
      // represents as 0. Compare the complete serialized contract,not rounded
      // scores or relaxed thresholds; signed zero cannot move a physical crop.
      assert.equal(JSON.stringify(evaluateFocusedRaster(a, b, { maximumPhaseOffset: 0 })), JSON.stringify(observed.metric));
      const expected = phase.results.filter(row => row.case === representative.case && row.text === observed.text);
      assert.equal(expected.length, 1);
      const standard = evaluateFocusedRaster(a, b);
      assert.deepEqual(standard, expected[0].standardPhaseMetric);
      standardFailures += Number(!standard.matches); replayedLabels++;
    }
  }
  assert.equal(replayedLabels, 24); assert.equal(standardFailures, 14);
  const sample = rows[0], capture = captured.get(sample.case);
  const mutations = [
    row => row.case = row.case.replace('/focus', '/hover'),
    row => row.acceptance = true,
    row => row.checkpoint.sha256 = '0'.repeat(64),
    row => row.receipts.reference.png.sha256 = '0'.repeat(64),
    row => row.receipts.astylar.tree.sha256 = '0'.repeat(64),
    row => row.geometry.expected.width += 1,
    row => row.observations.pop(),
    row => row.observations[0].text = 'Wrong label',
    row => row.observations[0].referenceKey = 'wrong-owner',
    row => row.observations[0].candidateKey = 'wrong-owner',
    row => row.observations[0].referenceFont.fontSize = '16px',
    row => row.observations[0].candidateRetainedFont.fontSize = '14px',
    row => row.observations[0].commonPhysicalBounds.left += 1,
  ];
  for (const mutate of mutations) { const altered = structuredClone(sample); mutate(altered); assert.throws(() => verifyCase(altered, capture)); }
  t.diagnostic(JSON.stringify({ cases: rows.length, checkpointFilesAuthenticated: 160,
    labelObservations: 120, uniqueLabelMeasurementsReplayed: replayedLabels,
    standardPhaseBelowExistingDefault: standardFailures, mutationsRejected: mutations.length,
    sourceCurrentness: 'historical-checkpoint-and-bound-inputs-only',
    existingFinding: 'fixture-table-font-increased-during-renderer-fix',
    registeredInFrozenExport: false, canonicalPublication: false, currentRenderingAccepted: false,
    boundary: 'No full-table/behavior/whole-tree input equivalence or new renderer cause. All raw case receipts preserve; zero-phase and standard-phase diagnostics stay separate.' }));
});
