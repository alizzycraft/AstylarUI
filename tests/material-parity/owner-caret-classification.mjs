import { createHash } from 'node:crypto';
import { reviewCaretMotionRequests } from '../../scripts/audit-material-caret-motion-requests.mjs';

export const ownerCaretAttributions = {
  local: 'reviewed-owner-caret-observation-stage',
  motion: 'reviewed-motion-caret-observation-stage',
};
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const relevant = key => /^(caret.*|all|animation.*|transition.*)$/.test(key.replaceAll('-', '').toLowerCase());
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const flags = ['inputEquivalent', 'computedCandidateVerified', 'descendantCaretVerified',
  'renderingEquivalent', 'rendererCauseProven'];

// Use only after original scalar/tree replay and independent case-membership
// validation. This classifies an observation-stage defect, NOT equal caret input
// or paint. In particular, reference text color never fills candidate omission.
export function classifyOwnerCaretInput(input, property, reference, candidate, observation) {
  const p = observation?.proof;
  if (!input || !p || property !== 'caretColor' || p.property !== property || p.element !== input.id ||
      observation.inputSha256 !== hash(input) || observation.proofSha256 !== hash(p) ||
      !['case', 'family', 'profile', 'state'].every(key => typeof observation[key] === 'string' && observation[key].length) ||
      !object(observation.viewport) || typeof reference !== 'string' ||
      reference !== observation.reference || candidate !== undefined ||
      p.referenceComputedCaret !== input.reference?.caretColor ||
      p.referenceComputedColor !== input.reference?.color || p.candidateLocalCaret !== '<omitted>' ||
      typeof p.referenceComputedCaret !== 'string' || typeof p.referenceComputedColor !== 'string' ||
      input.astylarResolvedStyleEvidenceVersion !== 2 || p.source !== 'core-style-inspection' ||
      !Number.isInteger(p.revision) || p.revision < 0 || flags.some(flag => p[flag] !== false) ||
      !p.referenceNode || !p.astylarNode || !['unique-shared-id', 'unique-reference-data-parity-id',
        'existing-overlay-owner-and-exact-list-order', 'existing-paginator-text-owner-proof',
        'existing-generated-owner-proof'].includes(p.mapping) ||
      !Array.isArray(p.referencePath) || !p.referencePath.length ||
      !Array.isArray(p.candidatePath) || !p.candidatePath.length ||
      !Array.isArray(p.issues) || !Array.isArray(p.requests?.reference) ||
      !Array.isArray(p.requests?.astylar) || p.requests.astylar.length ||
      ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle']
        .some(stage => !object(input[stage]) || Object.keys(input[stage]).some(relevant))) return;
  const local = p.disposition === 'captured-caret-computed-versus-local-omission' &&
    !p.issues.length && !p.requests.reference.length;
  const motion = reviewCaretMotionRequests(p);
  if (!local && motion.disposition !== 'captured-motion-names-no-caret-or-color-target') return;
  return {
    classification: 'parity-harness-defect', attribution: ownerCaretAttributions[local ? 'local' : 'motion'],
    owner: 'Material browser-computed caret versus candidate local declaration observation boundary',
    reviewEvidence: { case: observation.case, family: observation.family, profile: observation.profile,
      viewport: observation.viewport, state: observation.state, inputSha256: observation.inputSha256,
      rawReference: input.reference.caretColor, rawReferenceColor: input.reference.color,
      rawCandidate: '<omitted>', proofSha256: hash(p), referenceNode: p.referenceNode,
      astylarNode: p.astylarNode, mapping: p.mapping,
      declarationReview: local ? { disposition: 'no-relevant-captured-request', reasons: [] } : motion,
      ...Object.fromEntries(flags.map(flag => [flag, false])), wholeElementInputEquivalent: false },
    justification: local
      ? 'Exact original scalar/tree joins retain browser-computed caret color while the mapped owner and reviewed frame/page ancestry have no relevant captured caret/reset/motion request and the candidate local stages omit it. This identifies unequal observation stages, not equal authored or computed caret values. Document-external inheritance, editable descendants, visible caret paint and renderer causality remain unproven. No candidate color is synthesized from reference text color.'
      : 'Complete original scalar/tree and ancestry review retains explicit motion declarations naming no direct caret or text-color target, while browser-computed caret color is compared with omitted candidate local declarations. This identifies unequal observation stages only. Motion may indirectly affect geometry or paint; its resolved cascade, external inheritance, candidate computed caret and visible caret behavior remain unproven. Broad, color-dependent, partial or unresolved motion requests are not covered.',
  };
}
