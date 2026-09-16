import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { buttonFixedWidths } from './button-fixed-width-evidence.mjs';

export const buttonBoxSizingAttribution = 'reviewed-button-box-sizing-observation-stage';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const gap = 'Original interaction entry does not retain border-box geometry.';

// This scalar join requires independently validated original-source evidence.
// It does not infer a computed default from an absent local declaration, nor
// turn one static measurement into proof about all states of the same owner.
export function classifyButtonBoxSizingInput(input, property, reference, candidate, observation) {
  const p = observation?.proof;
  if (!input || !p || property !== 'boxSizing' || !Object.hasOwn(buttonFixedWidths, input.id) ||
      p.element !== input.id || observation.inputSha256 !== hash(input) ||
      reference !== 'border-box' || candidate !== undefined || input.reference?.boxSizing !== reference ||
      p.referenceBoxSizing !== reference || p.candidateAuthoredBoxSizing !== '<omitted>' ||
      p.candidateOwnStageAbsent !== true || p.source !== 'core-style-inspection' ||
      !Number.isInteger(p.revision) || p.revision < 0 || input.astylarResolvedStyleEvidenceVersion !== 2 ||
      ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'].some(stage =>
        !input[stage] || Object.hasOwn(input[stage], 'boxSizing')) ||
      !isDeepStrictEqual(p.referenceRule, { selector: '.mdc-button',
        request: { 'box-sizing': { value: 'border-box', important: false } } }) ||
      p.referenceAuthoredWidth !== '<omitted>' || p.candidateAuthoredWidth !== buttonFixedWidths[input.id] ||
      p.candidateAuthoredWidth !== input.astylar.width ||
      !isDeepStrictEqual(p.candidateLocalSize, { width: Number.parseFloat(input.astylar.width),
        height: Number.parseFloat(input.astylar.height) }) ||
      p.candidateLocalPadding !== input.astylar.padding || p.candidateLocalBorderWidth !== input.astylar.borderWidth ||
      p.classification !== 'observation-stage-difference-with-bounded-native-button-sizing-evidence' ||
      p.owner !== 'Core declared-size consumption and audit observation-stage interpretation' ||
      ['widthAuthoringEquivalent', 'inputEquivalent', 'renderingEquivalent'].some(flag => p[flag] !== false)) return;
  const isStatic = observation.case?.startsWith('static:') && observation.state === 'static';
  const isInteraction = observation.case?.startsWith('interaction:') && observation.state !== 'static';
  if (isStatic) {
    if (!p.geometry || p.geometry.id !== input.id || p.geometry.missing !== false ||
        p.observedDeclaredBorderBox !== true || p.geometryGap !== null) return;
  } else if (!isInteraction || p.geometry !== null || p.observedDeclaredBorderBox !== false || p.geometryGap !== gap) return;
  return { classification: 'parity-harness-defect', attribution: buttonBoxSizingAttribution,
    owner: 'Material input audit computed box-sizing versus local declaration stages and core declared-size consumption',
    reviewEvidence: { case: observation.case, family: observation.family, profile: observation.profile,
      viewport: observation.viewport, state: observation.state, inputSha256: observation.inputSha256,
      ...p, geometryAppliesOnlyToThisCase: true, computedCandidateVerified: false,
      interactionGeometryVerified: false, fullLayoutVerified: false, wholeElementInputEquivalent: false },
    justification: 'Original source trees and scalar captures retain an explicit browser border-box rule and omitted candidate authored/local boxSizing at all three declaration stages. Measured static cases consume declared sizes as border boxes; original interaction cases have no retained geometry and remain measurement gaps in the source-bound ledger. This explains a bounded observation-stage difference, not a synthesized candidate computed value, general default equivalence or complete layout correctness. Preserve the independent fixed-candidate versus intrinsic-reference width authoring mismatch, interaction geometry gaps, composition, clipping, hit testing and raster evidence.' };
}
