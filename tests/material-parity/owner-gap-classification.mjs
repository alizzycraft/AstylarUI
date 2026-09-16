import { createHash } from 'node:crypto';
import { ownerGapProperties } from './owner-gap-input-evidence.mjs';

export const ownerGapAttribution = 'reviewed-owner-gap-observation-stage';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const emptyObject = value => value !== null && typeof value === 'object' && !Array.isArray(value) && !Object.keys(value).length;

// Use only with complete independent original-tree replay. This join explains
// different diagnostic stages, not different used gaps or equivalent layouts.
export function classifyOwnerGapInput(input, property, reference, candidate, observation) {
  const p = observation?.proof;
  if (!input || !p || !ownerGapProperties.includes(property) || p.property !== property || p.element !== input.id ||
      observation.inputSha256 !== hash(input) || p.disposition !== 'captured-normal-versus-local-omission' ||
      !Array.isArray(p.issues) || p.issues.length || reference !== 'normal' || candidate !== undefined ||
      input.reference?.[property] !== reference || p.referenceComputed !== reference || p.candidateLocal !== '<omitted>' ||
      ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'].some(stage => !input[stage] ||
        Object.keys(input[stage]).some(key => /^(?:gap|rowgap|columngap|gridgap|gridrowgap|gridcolumngap|all|animation.*|transition.*)$/.test(key.replaceAll('-', '').toLowerCase()))) ||
      input.astylarResolvedStyleEvidenceVersion !== 2 || p.source !== 'core-style-inspection' ||
      !Number.isInteger(p.revision) || p.revision < 0 ||
      !p.referenceNode || !p.astylarNode || !['unique-shared-id', 'unique-reference-data-parity-id',
        'existing-overlay-owner-and-exact-list-order', 'existing-paginator-text-owner-proof',
        'existing-generated-owner-proof'].includes(p.mapping) ||
      p.formatting?.reference !== input.reference.display || p.formatting?.astylar !== input.astylar.display ||
      !Array.isArray(p.requests?.reference) || p.requests.reference.length ||
      !Array.isArray(p.requests?.astylar) || p.requests.astylar.length ||
      !p.candidateStages || !['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'].every(stage => emptyObject(p.candidateStages[stage])) ||
      ['computedCandidateVerified', 'renderingEquivalent', 'inputEquivalent'].some(flag => p[flag] !== false)) return;
  return { classification: 'parity-harness-defect', attribution: ownerGapAttribution,
    owner: 'Material input audit computed gap values versus local declaration stages',
    reviewEvidence: { case: observation.case, family: observation.family, profile: observation.profile,
      viewport: observation.viewport, state: observation.state, inputSha256: observation.inputSha256,
      ...p, wholeElementInputEquivalent: false, usedGapVerified: false },
    justification: 'Original scalar/tree joins retain browser-computed normal while the mapped owner has no relevant captured local gap/reset/motion request and all three candidate local declaration stages omit it. This establishes unequal observation stages only. It neither supplies candidate computed normal/zero nor accepts different formatting, child composition, ancestor reset context, used spacing, plugin ownership or final rendering. Explicit requests, motion and scalar-rule gaps remain separate review cases; the public gap grammar/unit/axis failures are not waived.' };
}
