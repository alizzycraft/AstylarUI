import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { planButtonPaintAttribution } from '../../scripts/audit-material-shared-button-paint-attribution.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const overlayTriggerPaintAttribution = 'reviewed-overlay-trigger-mixed-state-paint';

// The caller must authenticate/replay the existing complete source census. Keep
// its active-only classifier unchanged; this joins only its separately reviewed
// mixed-state overlay triggers, not arbitrary inactive or disabled controls.
export function applyOverlayTriggerPaintReview(rows, source, normalize) {
  const retained = planButtonPaintAttribution(source, rows, normalize).retained;
  const selected = retained.filter(g => g.reason === 'inactive-owner-needs-separate-review' &&
    ['dialog', 'bottom-sheet'].includes(g.family) && g.element === `${g.family}-primary`);
  const findings = new Map(source.findings.map(f => [JSON.stringify([f.case, f.element]), f]));
  const replacements = new Map();
  for (const group of selected) {
    const original = rows.filter(r => digest(r) === group.canonicalMatches[0].canonicalRowSha256);
    assert.equal(original.length, 1);
    const before = original[0];
    const observations = group.observations.map(observation => {
      const finding = findings.get(JSON.stringify([observation.case, group.element]));
      assert.ok(finding);
      const { proof, sha256 } = source.patterns[finding.pattern];
      assert.equal(sha256, observation.proofSha256);
      const hover = proof.candidate.sharedStateRules.filter(r => r.selector === '.material-button:hover');
      assert.equal(hover.length, 1);
      const effective = normalize(proof.candidate.effective).backgroundColor;
      const normal = normalize(proof.candidate.normal).backgroundColor;
      assert.equal(effective, normalize(hover[0]).backgroundColor);
      assert.equal(effective, normalize(proof.candidate.interaction).backgroundColor);
      assert.notEqual(normal, effective);
      assert.equal(normal, normalize({ backgroundColor: proof.reference.hostBackground }).backgroundColor);
      assert.equal(proof.candidate.descendantCount, 0);
      assert.ok(['0', '0.08', '0.12'].includes(proof.reference.pseudo.opacity));
      return { ...observation, nativeLayerOpacity: proof.reference.pseudo.opacity,
        candidateNormalBackground: normal, candidateEffectiveBackground: effective,
        candidateHoverRule: hover[0], nativeLayerKey: proof.reference.layerKey,
        inactiveNativeLayerWithCandidateHoverFill: proof.reference.pseudo.opacity === '0',
        originalCaseLifecycleCauseProven: false, renderingEquivalent: false };
    });
    replacements.set(before, { ...before, attribution: overlayTriggerPaintAttribution,
      classification: 'application-plugin-authoring-defect',
      recommendedOwner: 'comparison state-layer authoring; separate core covered-hover revalidation investigation',
      justification: 'The reference retains a separate translucent state layer with captured opacity 0, .08 or .12; the candidate leaf replaces its normal host background with the authored opaque hover fill. These are unequal paint-composition inputs. Zero-layer observations also retain a candidate hover fill, but the original-case lifecycle cause is not established by this join. Do not infer state from its label or claim equal pixels.',
      reviewedCases: observations.map(o => o.case),
      reviewEvidence: { originalRowSha256: digest(before), sourceKind: source.kind,
        sourceCapture: source.capture, observations, inputEquivalent: false, renderingEquivalent: false,
        rendererCauseProven: false } });
  }
  return rows.map(row => replacements.get(row) ?? row);
}
