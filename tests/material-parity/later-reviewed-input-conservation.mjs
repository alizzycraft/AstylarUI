import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { validateReviewedInputAuditInputs, validateReviewedInputClassifications } from './reviewed-input-audit-source-binding.mjs';
import { reviewedInputAttributions } from './reviewed-input-proposal-transition.mjs';

const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !metadata.has(key)));
const signature = row => JSON.stringify([row.family, row.element, row.property, row.reference,
  row.astylar, row.occurrences, row.cases, row.states]);

// Pure reconstruction for historical conservation assertions, not permission to
// classify a row. Authenticate `evidence` independently before calling this.
// The returned rows retain every later non-reviewed change so historical tests
// still detect an unrelated mutation; no property/family exemption is applied.
export function reconstructBeforeReviewedInputMetadata(previous, current, evidence) {
  assert.deepEqual(validateReviewedInputClassifications(evidence, current), []);
  const before = new Map(previous.map(row => [signature(row), row]));
  assert.equal(before.size, previous.length, 'ambiguous historical scalar membership');
  const seen = new Set(), changes = [];
  const rows = current.map(row => {
    if (!reviewedInputAttributions.includes(row.attribution)) return row;
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
  // The fresh replay validates all twelve source proofs and exact original
  // subset membership, not just flags, counts or attribution names in a report.
  assert.deepEqual(validateReviewedInputAuditInputs(audit.reviewedInputs,
    { ...options, requireComplete: false }), []);
  return reconstructBeforeReviewedInputMetadata(previous.discrepancies,
    audit.discrepancies, audit.reviewedInputs);
}
