import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const same = (a, b, message) => assert.ok(isDeepStrictEqual(a, b), message);
export const reviewedSourceBatchDescriptor = Object.freeze({
  file: 'docs/material-reviewed-source-batch.json', revision: 'e66deef',
  sha256: '6a9335ebb748681bc2d1b390464b64c558ed28c30104323e03899e23803fdbd3',
});
const supplemental = {
  'reviewed-control-self-alignment-in-replacement-flex-context': {
    justification: 'The original control host requests align-self:auto in its reference formatting context; the replacement candidate flex composition explicitly requests flex-start. These are different authoring inputs, not demonstrated equivalent alignment or evidence that compensation is necessary.',
  },
  'reviewed-component-content-flex-request-omitted': {
    justification: 'The original component content owner has an explicit flex request that is absent from the replacement candidate owner. The source-bound structure and declarations differ before rendering; resulting used sizes, visual effects and renderer causality remain unproved.',
  },
  'reviewed-badge-label-explicit-nowrap-versus-reference-normal': {
    justification: 'The candidate badge label explicitly requests nowrap while the captured reference owner computes normal without the same authored request. Preserve the differing wrapping inputs; a short label fitting on one line does not make the inputs equivalent.',
  },
  'reviewed-outlined-base-transparency-replaced-by-opaque-fill': {
    recommendedOwner: 'Material comparison outlined-button base background authoring',
    justification: 'The original outlined-button base is transparent, while the candidate authors an opaque surface fill. Source-bound inactive pseudo-layer observations isolate the base-alpha mismatch; final composition, rendering and compensation necessity remain unproved.',
  },
  'reviewed-disabled-base-alpha-replaced-by-opaque-fill': {
    recommendedOwner: 'Material comparison disabled-button base background authoring',
    justification: 'The original disabled-button base uses on-surface ink at alpha 0.12, while the candidate authors an opaque replacement fill. Source-bound inactive pseudo-layer observations isolate the base-alpha mismatch; final composition, rendering and compensation necessity remain unproved.',
  },
  'reviewed-owner-delay-target-observation-stage': {
    recommendedOwner: 'input audit computed-value versus local-declaration and motion observation boundary',
    justification: 'The captured initial browser value is compared with candidate local omission. Separate delay-only rules have explicit disjoint transition-target witnesses on the same captured node. This establishes an observation-stage mismatch only, not a cascade winner, inactive motion, candidate computed values or equivalent rendering.',
  },
};

// This is a pure metadata transition, NOT a source authenticator. Its caller
// must independently replay the pinned plan's source reports. The pinned plan
// hash is necessary but not sufficient proof that source observations still hold.
export function stageReviewedSourceBatch(rows, plan) {
  assert.equal(hash(JSON.stringify(plan, null, 2) + '\n'), reviewedSourceBatchDescriptor.sha256,
    'prepared source batch changed; independently review and pin a new batch');
  assert.equal(plan.groups, 146); assert.equal(plan.observations, 6295);
  assert.equal(plan.sourceReportsFreshlyReplayed, true);
  assert.equal(plan.canonicalFilesChanged, false);
  assert.equal(plan.canonicalPayload.compressedSha256,
    'c08d24e94671c18e0c640638ca234b9571720080474115cc2b8388a2883a810e');
  assert.equal(rows.length, 8339);
  assert.equal(rows.reduce((n, r) => n + r.occurrences, 0), 386891);
  assert.equal(rows.filter(r => r.attribution === 'unresolved').length, plan.baselineUnresolved);
  const byHash = new Map(plan.findings.map(g => [g.canonicalRowSha256, g]));
  assert.equal(byHash.size, plan.groups);
  const seen = new Set(), changes = [], unchanged = [];
  const projected = rows.map(row => {
    const previousCompleteRowSha256 = digest(row), group = byHash.get(previousCompleteRowSha256);
    if (!group) { unchanged.push(previousCompleteRowSha256); return row; }
    assert.ok(!seen.has(previousCompleteRowSha256), 'duplicate original canonical row');
    seen.add(previousCompleteRowSha256);
    assert.equal(row.attribution, 'unresolved', 'prior classifications cannot be replaced');
    for (const field of ['family', 'element', 'property', 'reference', 'astylar', 'occurrences', 'states'])
      same(row[field], group[field], `original ${field} changed`);
    same(row.cases, group.cases.slice(0, 12), 'original case order changed');
    assert.equal(group.cases.length, row.occurrences);
    assert.equal(new Set(group.cases).size, row.occurrences);
    for (const flag of ['inputEquivalent', 'renderingEquivalent', 'rendererCauseProven'])
      assert.equal(group[flag], false);
    const defaults = supplemental[group.attribution] ?? {};
    const justification = group.justification ?? defaults.justification;
    const recommendedOwner = group.recommendedOwner ?? group.owner ?? defaults.recommendedOwner;
    assert.equal(typeof justification, 'string'); assert.ok(justification.length > 40);
    assert.equal(typeof recommendedOwner, 'string'); assert.ok(recommendedOwner.length > 10);
    const after = { ...row, classification: group.classification, attribution: group.attribution,
      justification, recommendedOwner,
      reviewEvidence: { sourcePlan: reviewedSourceBatchDescriptor,
        originalCompleteRowSha256: previousCompleteRowSha256, sourceProposalSha256: digest(group),
        originalObservationsSha256: group.orderedObservationSha256 ?? digest(group.observations),
        inputEquivalent: false, wholeElementInputEquivalent: false, computedCandidateVerified: false,
        cascadeWinnerProven: false, inactiveMotionProven: false, renderingEquivalent: false,
        rendererCauseProven: false, compensationNecessityProven: false },
      reviewedCases: [...group.cases] };
    changes.push({ family: row.family, element: row.element, property: row.property, batch: group.batch,
      occurrences: row.occurrences, previousCompleteRowSha256,
      projectedCompleteRowSha256: digest(after), attribution: after.attribution });
    return after;
  });
  assert.equal(seen.size, plan.groups, 'missing or changed original complete row');
  assert.equal(unchanged.length, plan.otherCompleteRows);
  assert.equal(digest(unchanged), plan.otherOrderedRowDigestsSha256, 'unselected complete rows changed');
  assert.equal(changes.reduce((n, g) => n + g.occurrences, 0), plan.observations);
  assert.equal(projected.filter(r => r.attribution === 'unresolved').length, 1689);
  return { rows: projected, changes, changedGroups: changes.length,
    changedObservations: plan.observations, unchangedCompleteRows: unchanged.length,
    unchangedOrderedRowDigestsSha256: digest(unchanged),
    previousUnresolved: plan.baselineUnresolved, projectedUnresolved: 1689,
    canonicalFilesChanged: false, inputEquivalent: false, renderingEquivalent: false,
    sourceProofsReplayedByTransition: false };
}
