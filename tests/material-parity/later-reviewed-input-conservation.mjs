import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { validateReviewedInputAuditInputs, validateReviewedInputClassifications } from './reviewed-input-audit-source-binding.mjs';
import { reviewedInputAttributions } from './reviewed-input-proposal-transition.mjs';
import { validateFollowupInputAuditInputs, validateFollowupInputClassifications } from './followup-input-audit-source-binding.mjs';
import { followupInputAttributions } from './followup-input-proposal-transition.mjs';
import { validateAlignmentFontAuditInputs, validateAlignmentFontClassifications, alignmentFontAttributions } from './alignment-font-audit-source-binding.mjs';
import { validateTextAlignAuditInputs, validateTextAlignClassifications, textAlignAttributions } from './text-align-audit-source-binding.mjs';
import { validateLtrAlignmentAuditInputs, validateLtrAlignmentClassifications, ltrAlignmentAttribution } from './ltr-alignment-audit-source-binding.mjs';
import { validateReviewedSourceBatchAuditInputs, validateReviewedSourceBatchClassifications,
  reviewedSourceBatchAttributions } from './reviewed-source-batch-audit-source-binding.mjs';
import { collectFullTreeInventory, collectControlTypographyEvidence, collectRetainedTypographyEvidence,
  collectStyleDiscrepancies, replayMaterialScalarReviewStages } from './input-equivalence-audit.mjs';
import { readOwnerInitialStyleSource, collectOwnerInitialStyleEvidence, validateOwnerInitialStyleSource,
  ownerInitialStyleAttribution } from './owner-initial-style-attribution.mjs';
import { collectOriginStageEvidence, validateOriginStageEvidence, originStageAttribution } from './origin-stage-inventory-evidence.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';

const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !metadata.has(key)));
const signature = row => JSON.stringify([row.family, row.element, row.property, row.reference,
  row.astylar, row.occurrences, row.cases, row.states]);

// Pure reconstruction for historical conservation assertions, not permission to
// classify a row. Authenticate `evidence` independently before calling this.
// The returned rows retain every later non-reviewed change so historical tests
// still detect an unrelated mutation; no property/family exemption is applied.
export function reconstructBeforeReviewedInputMetadata(previous, current, evidence) {
  return reconstructMetadata(previous, current, evidence, reviewedInputAttributions, validateReviewedInputClassifications);
}

export function reconstructBeforeFollowupInputMetadata(previous, current, evidence) {
  return reconstructMetadata(previous, current, evidence, followupInputAttributions, validateFollowupInputClassifications);
}

export function reconstructBeforeReviewedSourceBatchMetadata(previous, current, evidence) {
  for (const row of current.filter(r => reviewedSourceBatchAttributions.includes(r.attribution))) {
    assert.equal(row.reviewedCases.length, row.occurrences, 'source-batch reviewed membership count changed');
    assert.deepEqual(row.cases, row.reviewedCases.slice(0, 12), 'source-batch ordered case prefix changed');
  }
  return reconstructMetadata(previous, current, evidence, reviewedSourceBatchAttributions, validateReviewedSourceBatchClassifications);
}

function reconstructMetadata(previous, current, evidence, attributions, validate) {
  assert.deepEqual(validate(evidence, current), []);
  const before = new Map(previous.map(row => [signature(row), row]));
  assert.equal(before.size, previous.length, 'ambiguous historical scalar membership');
  const seen = new Set(), changes = [];
  const rows = current.map(row => {
    if (!attributions.includes(row.attribution)) return row;
    const key = signature(row), prior = before.get(key);
    assert.ok(prior, 'reviewed row has no exact historical scalar membership');
    assert.ok(!seen.has(key), 'duplicate later reviewed row'); seen.add(key);
    assert.equal(prior.attribution, 'unresolved', 'later review cannot overwrite a historical attribution');
    assert.ok(isDeepStrictEqual(raw(row), raw(prior)), 'later review changed original raw evidence');
    changes.push({ family: row.family, element: row.element, property: row.property,
      occurrences: row.occurrences, attribution: row.attribution,
      originalCompleteRowSha256: row.reviewEvidence.originalCompleteRowSha256 });
    return prior;
  });
  assert.equal(changes.length, evidence.groups.length);
  assert.equal(changes.reduce((n, r) => n + r.occurrences, 0), evidence.coverage.suppliedObservations);
  return { rows, changes };
}

// Replay the production sequence against independently read original trees,
// not a category exemption or the row's own claimed previous metadata.
export function independentlyReconstructLaterScalarReviews(audit, previous, current = audit.discrepancies, options = {}) {
  assert.equal(audit.ownerInitialStyleBinding?.status, 'bound');
  const original = readOwnerInitialStyleSource(audit.ownerInitialStyleBinding, options);
  const cases = [...original.results.map(e => ({ ...e, kind: 'static' })),
    ...original.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const inventory = collectFullTreeInventory(cases, options), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []);
  const owner = collectOwnerInitialStyleEvidence(original, inventory);
  assert.deepEqual(validateOwnerInitialStyleSource(audit.ownerInitialStyleBinding, owner, options), []);
  const origin = collectOriginStageEvidence(cases, inventory, normalize, { reviewedDisjointMotion: true });
  // Only these two initial observation classifiers are being reconstructed.
  // Other earlier input proofs remain owned by the original caller's gates.
  const initial = collectStyleDiscrepancies(cases, origin, { comparisons: [], differences: [] },
    ...Array.from({ length: 19 }, () => []), { observations: [] }, { observations: [] }, { observations: [] }, [], owner);
  assert.deepEqual(validateOriginStageEvidence(origin, inventory, initial, normalize, { reviewedDisjointMotion: true }), []);
  const sourceRows = new Map(initial.map(r => [signature(r), r]));
  const before = new Map(previous.discrepancies.map(r => [signature(r), r]));
  assert.equal(before.size, previous.discrepancies.length, 'ambiguous historical scalar membership');
  const supplied = new Map(current.map(r => [signature(r), r]));
  assert.equal(supplied.size, current.length, 'duplicate current scalar membership');
  const candidates = current.filter(row => {
    const prior = before.get(signature(row));
    return prior?.attribution === 'unresolved' && JSON.stringify(row) !== JSON.stringify(prior);
  });
  const seeds = candidates.map(row => {
    const prior = before.get(signature(row)), source = sourceRows.get(signature(row));
    assert.ok(source, 'later review lacks original scalar observation');
    assert.equal(JSON.stringify(raw(prior)), JSON.stringify(raw(source)), 'historical raw evidence differs from captured source');
    if ([originStageAttribution, ownerInitialStyleAttribution].includes(row.attribution)) {
      assert.equal(source.attribution, row.attribution, 'initial observation stage is not independently proved');
      return source;
    }
    return prior;
  });
  const control = collectControlTypographyEvidence(cases, inventory);
  const retained = collectRetainedTypographyEvidence(cases, inventory, control);
  const replay = replayMaterialScalarReviewStages(seeds, cases, inventory, retained, control, audit.ownerInitialStyleBinding);
  const restored = new Map(), changes = [];
  for (const expected of replay) {
    const key = signature(expected), prior = before.get(key), actual = supplied.get(key);
    if (JSON.stringify(expected) === JSON.stringify(prior)) continue; // Unproved changes remain detectable.
    assert.equal(JSON.stringify(actual), JSON.stringify(expected), 'later scalar metadata does not match production source replay');
    assert.equal(JSON.stringify(raw(actual)), JSON.stringify(raw(prior)), 'later scalar review changed complete raw evidence');
    restored.set(key, prior);
    changes.push({ family: actual.family, element: actual.element, property: actual.property,
      occurrences: actual.occurrences, attribution: actual.attribution });
  }
  return { rows: current.map(row => restored.get(signature(row)) ?? row), changes };
}

export function independentlyReconstructBeforeReviewedInputs(audit, previous, options = {}) {
  let current = audit.discrepancies, followupChanges;
  const alignmentChanges = [];
  for (const [field, attributions, validateSource, validateRows] of [
    ['alignmentFontInputs', alignmentFontAttributions, validateAlignmentFontAuditInputs, validateAlignmentFontClassifications],
    ['textAlignInputs', textAlignAttributions, validateTextAlignAuditInputs, validateTextAlignClassifications],
    ['ltrAlignmentInputs', [ltrAlignmentAttribution], validateLtrAlignmentAuditInputs, validateLtrAlignmentClassifications],
  ]) {
    if (audit[field] !== undefined || current.some(row => attributions.includes(row.attribution))) {
      assert.deepEqual(validateSource(audit[field], { ...options, requireComplete: false }), []);
      const restored = reconstructMetadata(previous.discrepancies, current, audit[field], attributions, validateRows);
      current = restored.rows; alignmentChanges.push(...restored.changes);
    }
  }
  if (audit.followupInputs !== undefined || current.some(row => followupInputAttributions.includes(row.attribution))) {
    // Later findings are not a blanket exclusion. Re-read the original capture
    // and replay every follow-up source proof for this exact historical subset.
    assert.deepEqual(validateFollowupInputAuditInputs(audit.followupInputs,
      { ...options, requireComplete: false }), []);
    const restored = reconstructBeforeFollowupInputMetadata(previous.discrepancies, current, audit.followupInputs);
    current = restored.rows; followupChanges = restored.changes;
  }
  let sourceBatchChanges;
  if (audit.reviewedSourceBatchInputs !== undefined || current.some(row => reviewedSourceBatchAttributions.includes(row.attribution))) {
    // Full-group receipts are not subset-row digests. Authenticate the actual
    // source projection and ordered subset before restoring any metadata.
    assert.deepEqual(validateReviewedSourceBatchAuditInputs(audit.reviewedSourceBatchInputs,
      { ...options, requireComplete: false }), []);
    const restored = reconstructBeforeReviewedSourceBatchMetadata(previous.discrepancies, current, audit.reviewedSourceBatchInputs);
    current = restored.rows; sourceBatchChanges = restored.changes;
  }
  // The fresh replay validates all twelve source proofs and exact original
  // subset membership, not just flags, counts or attribution names in a report.
  assert.deepEqual(validateReviewedInputAuditInputs(audit.reviewedInputs,
    { ...options, requireComplete: false }), []);
  const result = reconstructBeforeReviewedInputMetadata(previous.discrepancies, current, audit.reviewedInputs);
  const scalar = audit.ownerInitialStyleBinding?.status === 'bound'
    ? independentlyReconstructLaterScalarReviews(audit, previous, result.rows, options) : undefined;
  // Existing callers keep their original 134-set counts and complete-row checks.
  // The separately authenticated follow-up population is reported independently.
  return { ...result, ...(scalar === undefined ? {} : { rows: scalar.rows, scalarReviewChanges: scalar.changes }),
    ...(followupChanges === undefined ? {} : { followupChanges }),
    ...(sourceBatchChanges === undefined ? {} : { sourceBatchChanges }),
    ...(alignmentChanges.length ? { alignmentChanges } : {}) };
}
