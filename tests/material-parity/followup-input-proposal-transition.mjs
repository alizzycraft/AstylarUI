import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
const raw = row => Object.fromEntries(Object.entries(row).filter(([k]) => !metadata.has(k)));
const definitions = {
  leafFamily: ['reviewed-leaf-font-family-observation-stage', 'parity-harness-defect'],
  leafWeightTracking: ['reviewed-leaf-weight-tracking-observation-stage', 'parity-harness-defect'],
  expansionOwner: ['reviewed-expansion-panel-header-owner-mismatch', 'parity-harness-defect'],
  controlFontStyle: ['reviewed-control-font-style-inheritance-reset-omission', 'application-plugin-authoring-defect'],
};
export const followupInputAttributions = Object.values(definitions).map(d => d[0]);
const flags = ['inputEquivalent', 'wholeElementInputEquivalent', 'renderingEquivalent', 'rendererCauseProven'];

// Metadata-only projection, not source authentication. Callers must obtain the
// binding from independent original-source and complete-canonical replay.
export function stageFollowupInputTransitions(rows, binding) {
  assert.equal(binding.kind, 'source-replayed-followup-input-proposal-binding');
  assert.equal(binding.sourceProofsReplayed, true); assert.equal(binding.originalCanonicalJoinsReplayed, true);
  for (const k of ['canonicalIntegration', 'canonicalAttributionChanged', 'completeAuditAccepted', 'inputEquivalent', 'renderingEquivalent'])
    assert.equal(binding[k], false);
  assert.deepEqual(Object.keys(binding.plans).sort(), Object.keys(definitions).sort());
  assert.equal(rows.length, binding.canonicalRows);
  assert.equal(rows.filter(r => r.attribution === 'unresolved').length, binding.baselineUnresolved);
  assert.equal(binding.groups.length, binding.proposedGroups);
  const before = digest(rows), byHash = new Map(), selected = new Map(), observations = new Set();
  rows.forEach((r, i) => { const key = digest(r); if (!byHash.has(key)) byHash.set(key, []); byHash.get(key).push(i); });
  for (const g of binding.groups) {
    const p = g.proposal, original = g.originalCompleteRow, definition = definitions[g.kind]; assert.ok(definition);
    assert.equal(p.proposedAttribution, definition[0]); assert.equal(p.proposedClassification, definition[1]);
    assert.equal(digest(original), p.canonicalRowSha256); assert.equal(original.attribution, 'unresolved');
    assert.equal(p.previousAttribution, 'unresolved');
    const matches = byHash.get(p.canonicalRowSha256) ?? [];
    assert.equal(matches.length, 1, 'original complete row missing, changed or duplicated');
    const index = matches[0]; assert.ok(!selected.has(index), 'overlapping transition');
    for (const k of ['family', 'element', 'property', 'reference', 'astylar', 'occurrences', 'cases', 'states'])
      assert.deepEqual(p[k], original[k]);
    for (const flag of flags) assert.equal(p[flag], false);
    const limitations = {};
    for (const flag of ['physicalFontSelectionVerified', 'canonicalMappingChanged', 'candidateComputedVerified', 'nonNormalAncestorBehaviorVerified']) {
      if (Object.hasOwn(p, flag)) { assert.equal(p[flag], false); limitations[flag] = false; }
    }
    assert.equal(p.observations.length, p.occurrences);
    assert.deepEqual(p.cases, p.observations.slice(0, 12).map(o => o.case));
    for (const o of p.observations) {
      const key = JSON.stringify([o.case, p.family, p.element, p.property]);
      assert.ok(!observations.has(key), 'overlapping property observation'); observations.add(key);
    }
    const descriptor = binding.plans[g.kind];
    assert.equal(descriptor.sourceProofsReplayed, true); assert.equal(descriptor.originalCanonicalJoinReplayed, true);
    assert.ok(p.justification.length > 50); assert.ok(p.proposedOwner.length > 10);
    const row = { ...original, classification: p.proposedClassification, attribution: p.proposedAttribution,
      justification: p.justification, recommendedOwner: p.proposedOwner,
      reviewEvidence: { proposalKind: g.kind, sourcePlan: descriptor, sourceProposalSha256: digest(p),
        originalCompleteRowSha256: p.canonicalRowSha256, originalObservationsSha256: digest(p.observations),
        inputEquivalent: false, wholeElementInputEquivalent: false, computedCandidateVerified: false,
        renderingEquivalent: false, rendererCauseProven: false, ...limitations },
      reviewedCases: p.observations.map(o => o.case) };
    assert.deepEqual(raw(row), raw(original), 'transition changed original input evidence');
    selected.set(index, row);
  }
  assert.equal(observations.size, binding.proposedObservations);
  const other = rows.filter((_r, i) => !selected.has(i));
  assert.equal(other.length, binding.otherCompleteRows);
  assert.equal(digest(other.map(digest)), binding.otherOrderedRowDigestsSha256);
  const projected = rows.map((r, i) => selected.get(i) ?? r);
  assert.equal(digest(rows), before, 'original rows mutated');
  return { rows: projected, changedGroups: selected.size, changedObservations: observations.size,
    remainingUnresolved: projected.filter(r => r.attribution === 'unresolved').length,
    originalOrderedRowDigestsSha256: digest(rows.map(digest)), projectedOrderedRowDigestsSha256: digest(projected.map(digest)),
    otherCompleteRows: other.length, otherOrderedRowDigestsSha256: digest(other.map(digest)),
    canonicalFilesChanged: false, inputEquivalent: false, renderingEquivalent: false };
}
