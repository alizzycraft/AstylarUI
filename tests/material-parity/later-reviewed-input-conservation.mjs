import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { validateReviewedInputAuditInputs, validateReviewedInputClassifications } from './reviewed-input-audit-source-binding.mjs';
import { reviewedInputAttributions } from './reviewed-input-proposal-transition.mjs';
import { validateFollowupInputAuditInputs, validateFollowupInputClassifications } from './followup-input-audit-source-binding.mjs';
import { followupInputAttributions } from './followup-input-proposal-transition.mjs';
import { validateAlignmentFontAuditInputs, validateAlignmentFontClassifications, alignmentFontAttributions } from './alignment-font-audit-source-binding.mjs';
import { validateTextAlignAuditInputs, validateTextAlignClassifications, textAlignAttributions } from './text-align-audit-source-binding.mjs';
import { validateLtrAlignmentAuditInputs, validateLtrAlignmentClassifications, ltrAlignmentAttribution } from './ltr-alignment-audit-source-binding.mjs';

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
  // The fresh replay validates all twelve source proofs and exact original
  // subset membership, not just flags, counts or attribution names in a report.
  assert.deepEqual(validateReviewedInputAuditInputs(audit.reviewedInputs,
    { ...options, requireComplete: false }), []);
  const result = reconstructBeforeReviewedInputMetadata(previous.discrepancies, current, audit.reviewedInputs);
  // Existing callers keep their original 134-set counts and complete-row checks.
  // The separately authenticated follow-up population is reported independently.
  return { ...result, ...(followupChanges === undefined ? {} : { followupChanges }),
    ...(alignmentChanges.length ? { alignmentChanges } : {}) };
}
