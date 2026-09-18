import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !metadata.has(key)));
const kindAttributions = {
  containerSize: ['reviewed-container-font-size-declaration-stage'], leafSize: ['reviewed-leaf-font-size-observation-stage'],
  authoring: ['reviewed-container-fixed-font-authoring', 'reviewed-range-font-reset-omission', 'reviewed-slider-disabled-visual-state-omission'],
  ownership: ['reviewed-component-font-declaration-scope', 'reviewed-expansion-header-font-input-omission',
    'reviewed-tab-panel-private-typography-inputs', 'reviewed-overlay-font-inheritance-inputs'],
  buttonPaint: ['reviewed-button-state-layer-preblending'], hostTokens: ['reviewed-component-host-font-token-omission'],
  containerFamily: ['reviewed-container-font-family-declaration-stage'],
};
export const reviewedInputAttributions = Object.values(kindAttributions).flat();
const explanations = {
  'reviewed-container-font-size-declaration-stage': ['Material audit inherited versus local font-size measurement boundary',
    'The original own-text-empty owner paths share the same authored page font-size dependency while the scalar compares browser computed inheritance with omitted candidate local declarations. No candidate computed value, descendant typography, layout, or raster equivalence is inferred.'],
  'reviewed-leaf-font-size-observation-stage': ['Material audit local versus retained text font-size measurement boundary',
    'Original own-text ancestry and retained core-text font size match browser computed size, while local candidate declarations omit it. Only this measurement-stage difference is explained; glyph paint, other properties and layout remain unproven.'],
  'reviewed-container-fixed-font-authoring': ['Material list/table container font inheritance authoring',
    'The candidate fixes container font size while the reference inherits its scaled page font size. This changes authored dependencies; matching values in other profiles do not establish equivalent inputs.'],
  'reviewed-range-font-reset-omission': ['Material range-input font reset authoring',
    'The candidate range input omits the reference font-reset dependency. The unequal inherited/default font inputs remain recorded; this does not establish a range geometry or interaction cause.'],
  'reviewed-slider-disabled-visual-state-omission': ['Material slider disabled visual-state authoring',
    'The candidate visual owner omits the reference disabled-state opacity input. Control semantics and matching enabled values do not establish equivalent disabled visual inputs.'],
  'reviewed-component-font-declaration-scope': ['Material component host versus descendant font declaration ownership',
    'A reference component-host font token is omitted at the candidate host and supplied on a descendant instead. Different inheritance scope is an authoring difference, not evidence that local omission is a core inheritance failure.'],
  'reviewed-expansion-header-font-input-omission': ['Material expansion header typography authoring',
    'The reference expansion-header font token is omitted on the candidate inheritance path. Existing compact-title authoring and previously reviewed observations remain separate; no layout or glyph-equivalence claim follows.'],
  'reviewed-tab-panel-private-typography-inputs': ['Material tab-panel plugin versus core typography ownership',
    'The candidate tab-panel plugin owns private font/text/baseline inputs rather than using equivalent inherited core text inputs. This is competing typography ownership, not an equivalent serialization of the reference span.'],
  'reviewed-overlay-font-inheritance-inputs': ['Material overlay ancestry and component font-token authoring',
    'The reference overlay is outside the scaled frame while the candidate remains under the scaled page; the bottom-sheet panel also omits a component font token. The original ancestry/token dependencies differ. Visibility, positioning and font raster are not established by this font-size finding.'],
  'reviewed-button-state-layer-preblending': ['Material button state-layer paint authoring',
    'The reference uses a separately generated alpha state layer while the candidate replaces the host background with an opaque preblend. This changes paint composition; arithmetic agreement is not proof of composited pixels or renderer correctness.'],
  'reviewed-component-host-font-token-omission': ['Material component host typography-token authoring',
    'The candidate host omits the reference component/system font token request. An inherited page stack, weight or tracking value is not the same authoring dependency, even when a visible sample looks similar.'],
  'reviewed-container-font-family-declaration-stage': ['Material audit inherited versus local font-family measurement boundary',
    'The original own-text-empty owner paths inherit the same authored page family stack while the scalar compares computed reference inheritance with candidate local omission. Candidate computed/physical font selection, descendants and rendered output remain unproven.'],
};

// Pure metadata transition, NOT an evidence authenticator. The caller must
// obtain `binding` by the complete original-source/canonical replay collector,
// not merely trust a saved object's flags. Applying this twice is an error:
// previously reviewed rows cannot be overwritten as if they were unreviewed.
export function stageReviewedInputTransitions(rows, binding) {
  assert.equal(binding.kind, 'source-replayed-reviewed-input-proposal-binding');
  assert.equal(binding.sourceProofsReplayed, true); assert.equal(binding.canonicalIntegration, false);
  for (const flag of ['inputEquivalent', 'renderingEquivalent', 'canonicalAttributionChanged', 'completeAuditAccepted']) assert.equal(binding[flag], false);
  assert.equal(rows.length, binding.canonicalRows);
  assert.equal(rows.filter(r => r.attribution === 'unresolved').length, binding.baselineUnresolved);
  assert.equal(binding.groups.length, binding.proposedGroups);
  const originalHash = digest(rows), byHash = new Map(), selected = new Map();
  rows.forEach((row, index) => {
    const hash = digest(row); if (!byHash.has(hash)) byHash.set(hash, []); byHash.get(hash).push(index);
  });
  let observations = 0;
  for (const group of binding.groups) {
    const { proposal: p, originalCompleteRow: before } = group;
    assert.equal(digest(before), p.canonicalRowSha256); assert.equal(before.attribution, 'unresolved');
    for (const key of ['family', 'element', 'property', 'reference', 'astylar', 'occurrences']) assert.deepEqual(p[key], before[key]);
    assert.ok(kindAttributions[group.kind]?.includes(p.proposedAttribution));
    for (const flag of ['inputEquivalent', 'wholeElementInputEquivalent', 'renderingEquivalent', 'rendererCauseProven', 'computedCandidateVerified', 'renderedCompositeVerified'])
      if (Object.hasOwn(p, flag)) assert.equal(p[flag], false);
    const indexes = byHash.get(p.canonicalRowSha256) ?? []; assert.equal(indexes.length, 1, 'complete original row missing or duplicated');
    const index = indexes[0]; assert.ok(!selected.has(index), 'proposed transition overlaps');
    const descriptor = binding.plans[group.kind]; assert.ok(descriptor); assert.equal(descriptor.sourceProofsReplayed, true);
    const explanation = explanations[p.proposedAttribution]; assert.ok(explanation, 'unreviewed attribution');
    assert.equal(p.proposedClassification, ['containerSize', 'leafSize', 'containerFamily'].includes(group.kind)
      ? 'parity-harness-defect' : 'application-plugin-authoring-defect');
    assert.equal(p.observations.length, before.occurrences); observations += before.occurrences;
    assert.deepEqual(p.cases, before.cases); assert.deepEqual(p.states, before.states);
    const row = { ...before, classification: p.proposedClassification, attribution: p.proposedAttribution,
      justification: p.justification ?? explanation[1], recommendedOwner: p.proposedOwner ?? explanation[0],
      reviewEvidence: { proposalKind: group.kind, sourcePlan: descriptor, sourceProposalSha256: digest(p),
        originalCompleteRowSha256: p.canonicalRowSha256, originalObservationsSha256: digest(p.observations),
        inputEquivalent: false, wholeElementInputEquivalent: false, computedCandidateVerified: false,
        renderingEquivalent: false, rendererCauseProven: false }, reviewedCases: p.observations.map(o => o.case) };
    assert.deepEqual(raw(row), raw(before), 'classification transition changed raw/authored fields');
    selected.set(index, row);
  }
  assert.equal(observations, binding.proposedObservations);
  const other = rows.filter((_row, index) => !selected.has(index));
  assert.equal(other.length, binding.otherCompleteRows);
  assert.equal(digest(other.map(digest)), binding.otherOrderedRowDigestsSha256);
  const projected = rows.map((row, index) => selected.get(index) ?? row);
  assert.equal(digest(rows), originalHash, 'transition mutated source rows');
  return { rows: projected, changedGroups: selected.size, changedObservations: observations,
    remainingUnresolved: projected.filter(r => r.attribution === 'unresolved').length,
    originalOrderedRowDigestsSha256: digest(rows.map(digest)), projectedOrderedRowDigestsSha256: digest(projected.map(digest)),
    otherCompleteRows: other.length, otherOrderedRowDigestsSha256: digest(other.map(digest)),
    canonicalFilesChanged: false, inputEquivalent: false, renderingEquivalent: false };
}
