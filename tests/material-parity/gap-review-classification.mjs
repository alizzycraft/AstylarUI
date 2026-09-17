import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

export const gapReviewAttributions = {
  motion: 'reviewed-motion-gap-observation-stage',
  'scalar-layer-loss': 'original-overlay-scalar-layer-rule-loss',
};
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const candidateRequest = declarations => Object.keys(declarations ?? {}).some(key =>
  ['gap', 'rowgap', 'columngap', 'all'].includes(key.replaceAll('-', '').toLowerCase()) || /^(animation|transition)/i.test(key));

// A consumer of independently authenticated full-tree review and membership,
// not a replacement for source/coverage validation. Preserve original values.
export function classifyGapReview(input, property, reference, candidate, context) {
  const group = context?.group, observation = context?.observation;
  if (!input || !group || !observation || !['columnGap', 'rowGap'].includes(property) ||
      group.family !== context.family || group.element !== input.id || group.property !== property ||
      group.reference !== 'normal' || reference !== 'normal' || input.reference?.[property] !== 'normal' ||
      candidate !== undefined || group.candidate !== '<omitted>' || group.priorAttribution !== 'unresolved' ||
      ['inputEquivalent', 'computedCandidateVerified', 'usedGapVerified', 'rendererCauseProven'].some(flag => group[flag] !== false) ||
      !digest(group.canonicalRowSha256) || !digest(group.originalProofSha256) ||
      observation.inputSha256 !== hash(input) || observation.case !== context.case ||
      !isDeepStrictEqual(observation.inputTrees, context.inputTrees) ||
      !['reference', 'astylar'].every(side => typeof observation.inputTrees?.[side]?.file === 'string' &&
        digest(observation.inputTrees[side].sha256)) ||
      observation.referenceRaw !== 'normal' || observation.candidateRaw !== '<omitted>' ||
      observation.candidateRawShorthand !== '<omitted>' || !Array.isArray(group.observations) ||
      group.observations.filter(o => o.case === context.case).length !== 1 ||
      !isDeepStrictEqual(group.observations.find(o => o.case === context.case), observation) ||
      input.astylarResolvedStyleEvidenceVersion !== 2 ||
      ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'].some(stage =>
        !input[stage] || candidateRequest(input[stage]))) return;
  const motion = group.kind === 'motion' && group.reviewDisposition === 'captured-motion-does-not-name-gap' &&
    observation.review?.disposition === group.reviewDisposition &&
    Array.isArray(observation.review.reasons) && observation.review.reasons.length === 0;
  const scalar = group.kind === 'scalar-layer-loss' && group.reviewDisposition === gapReviewAttributions['scalar-layer-loss'] &&
    observation.review?.attribution === group.reviewDisposition && observation.review.classification === 'parity-harness-defect' &&
    ['inputEquivalent', 'computedCandidateVerified', 'usedGapVerified', 'renderingEquivalent']
      .every(flag => observation.review[flag] === false);
  if (!motion && !scalar) return; // The two unresolved dialog groups remain unresolved.
  return {
    classification: 'parity-harness-defect', attribution: gapReviewAttributions[group.kind],
    owner: motion ? 'Material computed-versus-local-style observation boundary; motion remains separately scoped'
      : 'Material scalar authored-rule capture; shared CSS grouping-rule collection',
    reviewEvidence: { case: context.case, family: context.family, element: input.id, property,
      inputSha256: observation.inputSha256, inputTrees: observation.inputTrees,
      canonicalRevision: group.canonicalRevision, canonicalRowSha256: group.canonicalRowSha256,
      originalProofSha256: group.originalProofSha256, kind: group.kind, review: observation.review,
      rawReference: observation.referenceRaw, rawCandidateLonghand: observation.candidateRaw,
      rawCandidateShorthand: observation.candidateRawShorthand,
      inputEquivalent: false, wholeElementInputEquivalent: false, computedCandidateVerified: false,
      usedGapVerified: false, renderingEquivalent: false, rendererCauseProven: false },
    justification: motion
      ? 'Complete original-tree review retains local motion declarations that name no direct gap target, while the browser-computed normal value is compared with omitted candidate local declarations. This attributes unequal observation stages only. It neither resolves motion/cascade nor supplies candidate computed gaps, excludes indirect geometry/paint effects, accepts unequal structure, or proves renderer equivalence. Empty or unresolved motion requests stay outside this attribution.'
      : 'Original scalar/full-tree mapping proves the specific layered z-index rule was lost by scalar authored-rule capture. The gap comparison still mixes browser-computed normal with omitted candidate local declarations. This is a capture/observation defect, not a demonstrated gap-layout cause, a repaired historical record, or proof that adding z-index fixes overlay rendering. Computed candidate gaps, layer precedence and equal-input renderer behavior remain separate.',
  };
}
