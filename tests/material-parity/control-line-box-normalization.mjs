import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';
import { preciseAuditNormalization } from './audit-normalization-contracts.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const digest = value => hash(JSON.stringify(value));
export const historicalControlLineBoxReportSha256 = '9e689c9a5d828a16214abbe55804a6ff72037d300c7f26272123ae008d948d11';
const historicalSourceSha256 = '5a9b9ebf0f8c10ec0cb4670a7ee71174bd19e6dcd8ac0ef9b9675da5d9d8ab29';
const historicalNormalization = { ...preciseAuditNormalization,
  sha256: '8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e' };

// Only the independently censused immutable capture can use this transition.
// The reader must still verify its complete source, tree, action and asset chain.
export function bindControlLineBoxNormalization(reportSha256, source, historicalBytes, currentBytes) {
  assert.equal(reportSha256, historicalControlLineBoxReportSha256, 'unreviewed line-box capture');
  assert.equal(source.file, preciseAuditNormalization.module);
  assert.equal(source.sha256, historicalSourceSha256);
  assert.equal(hash(historicalBytes), historicalSourceSha256, 'changed historical normalization snapshot');
  return {
    historical: bindOwnerCaretNormalization(historicalBytes.toString(), historicalNormalization),
    current: bindOwnerCaretNormalization(currentBytes.toString(), preciseAuditNormalization),
    receipt: { schemaVersion: 1, reportSha256, historicalSource: source,
      historicalNormalization, currentNormalization: preciseAuditNormalization,
      currentModuleSha256: hash(currentBytes),
      scope: 'Reference-color normalization only. Original physical metrics, other properties and candidate stages are unchanged.' },
  };
}

export function reconcileControlLineBoxMeasurement(measurement, target, rawReference, context) {
  assert.equal(measurement.element, target.element);
  assert.equal(measurement.referenceNode, target.referenceNode);
  assert.equal(measurement.checkpointReferenceNode, target.referenceNode);
  assert.equal(measurement.checkpointCandidateNode, target.astylarNode);
  const before = context.historical(rawReference).color, after = context.current(rawReference).color;
  assert.equal(measurement.checkpointTypography.color.reference, before, 'historical color differs from original source');
  assert.equal(target.properties.color.reference, after, 'current color differs from original source');
  const historicalTarget = structuredClone(target);
  historicalTarget.properties.color.reference = before;
  assert.deepEqual(JSON.parse(JSON.stringify(historicalTarget.properties)), measurement.checkpointTypography,
    'checkpoint changed outside reference-color normalization');
  if (before === after) return { historicalTarget, observation: measurement };
  return { historicalTarget, observation: { ...measurement,
    // This is a derived report projection, never a rewrite of the capture.
    // Preserve the exact captured properties alongside the current properties.
    checkpointTypography: JSON.parse(JSON.stringify(target.properties)),
    normalizationReconciliation: { ...context.receipt, property: 'color', stage: 'reference',
      raw: rawReference.color, before, after,
      originalMeasurementSha256: digest(measurement),
      historicalCheckpointTypography: measurement.checkpointTypography,
      currentCheckpointTypographySha256: digest(JSON.parse(JSON.stringify(target.properties))) },
  } };
}
