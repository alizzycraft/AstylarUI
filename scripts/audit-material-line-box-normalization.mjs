import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectControlTypographyEvidence, collectFullTreeInventory } from '../tests/material-parity/input-equivalence-audit.mjs';
import { bindOwnerCaretNormalization } from '../tests/material-parity/owner-caret-source-binding.mjs';
import { bindPreciseAuditNormalization, preciseAuditNormalization } from '../tests/material-parity/audit-normalization-contracts.mjs';
import { validateControlLineBoxMeasurement } from '../tests/material-parity/control-line-box-validation.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const digest = value => hash(JSON.stringify(value));
const capture = { file: 'artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json',
  sha256: '9e689c9a5d828a16214abbe55804a6ff72037d300c7f26272123ae008d948d11' };
const historicalNormalization = { ...preciseAuditNormalization,
  sha256: '8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e' };
const readHashed = receipt => {
  const bytes = readFileSync(receipt.file);
  assert.equal(hash(bytes), receipt.sha256, `changed evidence: ${receipt.file}`);
  return bytes;
};

// A deliberately narrow diagnostic join, NOT a production acceptance path.
// Reject everything except a separately derived reference-color transition.
export function inspectLineBoxColorTransition(measurement, target, rawReference, historical, current) {
  assert.equal(measurement.element, target.element);
  assert.equal(measurement.referenceNode, target.referenceNode);
  assert.equal(measurement.checkpointReferenceNode, target.referenceNode);
  assert.equal(measurement.checkpointCandidateNode, target.astylarNode);
  const before = historical(rawReference).color, after = current(rawReference).color;
  assert.equal(measurement.checkpointTypography.color.reference, before, 'historical color differs from original source');
  assert.equal(target.properties.color.reference, after, 'current color differs from original source');
  const historicalTarget = structuredClone(target);
  historicalTarget.properties.color.reference = before;
  assert.deepEqual(JSON.parse(JSON.stringify(historicalTarget.properties)), measurement.checkpointTypography,
    'checkpoint changed outside reference-color normalization');
  return { historicalTarget, changed: before !== after, before, after,
    historicalPropertiesSha256: digest(measurement.checkpointTypography),
    currentPropertiesSha256: digest(JSON.parse(JSON.stringify(target.properties))) };
}

export function collectLineBoxNormalizationTransitions() {
  const report = JSON.parse(readHashed(capture));
  assert.equal(report.cases, 477); assert.equal(report.observations, 671);
  assert.equal(report.results.length, report.cases);
  for (const source of report.capture.sources) readHashed(source);
  for (const source of report.measurementSources) readHashed({ file: source.snapshot, sha256: source.sha256 });
  const source = report.measurementSources.find(row => row.file === preciseAuditNormalization.module);
  const historical = bindOwnerCaretNormalization(readFileSync(source.snapshot, 'utf8'), historicalNormalization);
  const current = bindPreciseAuditNormalization();
  const algorithm = report.measurementSources.find(row => row.file.endsWith('/control-line-box-evidence.mjs'));
  readHashed(algorithm);
  const observations = [], seen = new Set();
  for (const index of report.results) {
    assert.ok(!seen.has(index.case), 'duplicate case'); seen.add(index.case);
    const evidence = JSON.parse(readHashed(index));
    assert.equal(evidence.case, index.case);
    const record = JSON.parse(readFileSync(evidence.checkpointRecord.file));
    assert.equal(digest(record.result), evidence.checkpointRecord.sha256);
    assert.equal(record.sha256, evidence.checkpointRecord.sha256);
    const selected = { ...record.result, kind: 'interaction' };
    assert.equal(`interaction:${selected.family}@${selected.profile}/${selected.viewport.id}/${selected.state}`, index.case);
    assert.deepEqual(selected.inputTrees, evidence.checkpointInputTrees);
    for (const tree of Object.values(selected.inputTrees)) readHashed(tree);
    const inventory = collectFullTreeInventory([selected]);
    assert.deepEqual(inventory.errors, []);
    const controls = collectControlTypographyEvidence([selected], inventory);
    const reference = inventory.cases.find(row => row.side === 'reference');
    const original = inventory.variants[reference.variant];
    const fresh = JSON.parse(readHashed(evidence.inputTree));
    readHashed(evidence.screenshot);
    assert.equal(evidence.measurements.length, index.observations);
    const owners = new Set();
    for (const measurement of evidence.measurements) {
      const identity = JSON.stringify([measurement.element, measurement.referenceNode]);
      assert.ok(!owners.has(identity), 'duplicate owner'); owners.add(identity);
      const targets = controls.comparisons.filter(row => row.element === measurement.element && row.referenceNode === measurement.referenceNode);
      assert.equal(targets.length, 1);
      const target = targets[0], node = original.nodes.find(row => row.key === target.referenceNode);
      const rawReference = inventory.styles[node.style];
      assert.equal(rawReference.side, 'reference');
      const transition = inspectLineBoxColorTransition(measurement, target, rawReference.value, historical, current);
      const options = { measurement, target, fresh, original, inventory, selected };
      if (transition.changed) assert.throws(() => validateControlLineBoxMeasurement(options), /changed checkpoint typography/);
      else validateControlLineBoxMeasurement(options);
      validateControlLineBoxMeasurement({ ...options, target: transition.historicalTarget });
      observations.push({ case: index.case, family: selected.family, element: target.element,
        referenceNode: target.referenceNode, candidateNode: target.astylarNode,
        changed: transition.changed, property: 'color', stage: 'reference',
        raw: rawReference.value.color, before: transition.before, after: transition.after,
        historicalPropertiesSha256: transition.historicalPropertiesSha256,
        currentPropertiesSha256: transition.currentPropertiesSha256,
        measurementSha256: digest(measurement), evidence: index,
        naturalHeight: measurement.naturalHeight, naturalWidth: measurement.naturalWidth });
    }
  }
  assert.equal(observations.length, report.observations);
  return { schemaVersion: 1, kind: 'interactive-line-box-normalization-census', capture,
    historicalNormalization: { ...historicalNormalization, source }, currentNormalization: preciseAuditNormalization,
    counts: { cases: seen.size, observations: observations.length,
      changed: observations.filter(row => row.changed).length, unchanged: observations.filter(row => !row.changed).length },
    observations, captureModified: false, productionAcceptanceChanged: false,
    inputEquivalent: false, renderingEquivalent: false,
    limitation: 'Complete census of the pinned line-box report, not the full comparison population. Historical-target replay isolates normalization only; full report provenance, action trace and current target completeness must still pass the independent production reader before acceptance.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--check');
  const report = collectLineBoxNormalizationTransitions(), output = JSON.stringify(report, null, 2) + '\n';
  const file = 'docs/material-line-box-normalization-census.json';
  if (process.argv[2] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(file, output);
  console.log(JSON.stringify({ ...report.counts, sha256: hash(output) }));
}
