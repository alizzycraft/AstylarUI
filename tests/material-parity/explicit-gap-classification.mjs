import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

export const explicitGapAttribution = 'reviewed-unequal-spacing-composition';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

// A consumer of the independently replayed composition and canonical binding,
// not a replacement for either proof. Only call after their source validation.
// Explicit shorthand is preserved; absent local longhands are not computed zero.
export function classifyExplicitGapComposition(input, property, reference, candidate, context) {
  const row = context?.group, observation = context?.observation;
  if (!input || !row || !observation || !['columnGap', 'rowGap'].includes(property) ||
      row.family !== context.family || row.element !== input.id || row.property !== property ||
      reference !== 'normal' || row.reference !== reference || input.reference?.[property] !== reference ||
      typeof candidate !== 'string' || !candidate.length || candidate !== row.candidate ||
      observation.rawCandidateShorthand !== candidate ||
      observation.rawReference !== reference || observation.rawCandidateLonghand !== '<omitted>' ||
      row.priorAttribution !== 'unresolved' || row.classification !== 'application-plugin-authoring-defect' ||
      row.proposedAttribution !== explicitGapAttribution || typeof row.cause !== 'string' || !row.cause.length ||
      ['inputEquivalent', 'usedGapVerified', 'rendererCauseProven'].some(flag => row[flag] !== false) ||
      !digest(row.canonicalRowSha256) || !digest(row.originalProofSha256) ||
      !digest(observation.compositionSha256) || observation.inputSha256 !== hash(input) ||
      observation.case !== context.case || !isDeepStrictEqual(observation.inputTrees, context.inputTrees) ||
      !['reference', 'astylar'].every(side => typeof observation.inputTrees?.[side]?.file === 'string' &&
        digest(observation.inputTrees[side].sha256)) ||
      !Array.isArray(row.observations) || row.observations.filter(o => o.case === context.case).length !== 1 ||
      !isDeepStrictEqual(row.observations.find(o => o.case === context.case), observation) ||
      input.astylarResolvedStyleEvidenceVersion !== 2 ||
      ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'].some(stage =>
        !input[stage] || input[stage].gap !== candidate || Object.hasOwn(input[stage], property))) return;

  return {
    classification: row.classification,
    attribution: explicitGapAttribution,
    owner: 'Material application/plugin composition; equivalent-input core layout reduction required',
    reviewEvidence: {
      case: context.case, family: context.family, element: input.id, property,
      inputTrees: observation.inputTrees, inputSha256: observation.inputSha256,
      compositionSha256: observation.compositionSha256,
      canonicalRowSha256: row.canonicalRowSha256, originalProofSha256: row.originalProofSha256,
      rawReference: observation.rawReference, rawCandidateLonghand: observation.rawCandidateLonghand,
      rawCandidateShorthand: observation.rawCandidateShorthand, compositionFinding: row.cause,
      inputEquivalent: false, wholeElementInputEquivalent: false, usedGapVerified: false,
      rendererCauseProven: false,
    },
    justification: 'The complete original-tree composition proof establishes unequal spacing/layout requests: ' +
      row.cause + '. Browser-computed normal and the explicit candidate shorthand are retained, including ' +
      'the omitted raw candidate longhand. This classifies application/plugin input inequality, not a ' +
      'computed-gap equivalence, confirmed renderer cause, historical motivation or visual resolution. ' +
      'Equivalent-input public reproductions must establish core support before removing the substitution; ' +
      'component-specific spacing adjustments are not a renderer fix.',
  };
}
