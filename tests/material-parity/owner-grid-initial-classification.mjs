import { createHash } from 'node:crypto';
import { ownerGridInitialProperties } from './owner-grid-initial-evidence.mjs';

export const ownerGridInitialAttribution = 'reviewed-owner-grid-template-observation-stage';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Requires an observation from the independently validated original-source
// ledger. This scalar join is not a substitute for that complete tree replay.
export function classifyOwnerGridInitialInput(input, property, reference, candidate, observation) {
  const p = observation?.proof;
  if (!input || !p || !ownerGridInitialProperties.includes(property) || p.property !== property || p.element !== input.id ||
      observation.inputSha256 !== hash(input) || p.disposition !== 'captured-none-versus-local-omission' ||
      !Array.isArray(p.issues) || p.issues.length || reference !== 'none' || candidate !== undefined ||
      input.reference?.[property] !== reference || p.referenceComputed !== reference ||
      p.candidateLocalDeclaration !== '<omitted>' ||
      ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'].some(stage =>
        !input[stage] || Object.hasOwn(input[stage], property)) ||
      input.astylarResolvedStyleEvidenceVersion !== 2 || p.source !== 'core-style-inspection' ||
      !Number.isInteger(p.revision) || p.revision < 0 ||
      !['unique-id', 'unique-data-parity-id'].includes(p.mapping) ||
      input.referenceStructure?.type !== p.referenceType || input.astylarStructure?.type !== p.candidateType ||
      input.reference?.display !== p.referenceDisplay || input.astylar.display !== p.candidateLocalDisplay ||
      ['computedCandidateVerified', 'gridLayoutEquivalent', 'renderingEquivalent'].some(flag => p[flag] !== false)) return;
  return { classification: 'parity-harness-defect', attribution: ownerGridInitialAttribution,
    owner: 'Material input audit computed grid-template values versus local declaration stages',
    reviewEvidence: { case: observation.case, family: observation.family, profile: observation.profile,
      viewport: observation.viewport, state: observation.state, inputSha256: observation.inputSha256,
      ...p, wholeElementInputEquivalent: false },
    justification: 'Original scalar/tree joins retain browser-computed none while the mapped owner has no relevant captured grid-template/reset/motion request and all candidate local declaration stages omit the property. This explains the observation-stage difference only. It does not synthesize a candidate computed value, accept different display/structure, prove implicit-track sizing, or waive the confirmed active-grid none defect. Preserve layout, plugin ownership, other input properties and final rendering as separate obligations.' };
}
