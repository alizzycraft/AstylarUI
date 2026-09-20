import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { collectRootBackgroundInputs } from '../../scripts/audit-material-root-background-inputs.mjs';
import { bindPreciseAuditNormalization, preciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { bindOwnerCaretCaptureSubset } from './owner-caret-audit-source-binding.mjs';
import { reviewedInputClassificationContexts, classifyReviewedInput } from './reviewed-input-audit-source-binding.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const digest = value => hash(JSON.stringify(value));
export const rootBackgroundAttribution = 'reviewed-root-background-prequantized-theme-input';
export const rootBackgroundClassificationContexts = reviewedInputClassificationContexts;
export const classifyRootBackgroundInput = classifyReviewedInput;

// Preparation only: no canonical report is read, written, or reclassified here.
// Re-run the source proof before projecting its exact captured observations.
export function prepareRootBackgroundClassifications(supplied) {
  const proof = collectRootBackgroundInputs();
  const bytes = readFileSync(proof.capture.file);
  assert.equal(hash(bytes), proof.capture.sha256);
  const original = JSON.parse(bytes);
  const subset = bindOwnerCaretCaptureSubset(supplied, original);
  assert.equal(subset.coverage.complete, true, 'complete original capture required');
  const normalize = bindPreciseAuditNormalization();
  const observations = [], groups = [], seen = new Set();
  for (const finding of proof.findings) {
    const reference = normalize({ backgroundColor: finding.reference }).backgroundColor;
    const astylar = normalize({ background: finding.candidate }).backgroundColor;
    assert.notEqual(reference, astylar, 'unequal authored colors must stay unequal');
    const classification = {
      classification: finding.classification, attribution: rootBackgroundAttribution,
      justification: 'The reference requests a fractional CSS color mix; the showcase theme rounds its channels to integer hex before passing the background to AstylarUI.',
      recommendedOwner: finding.owner,
      reviewEvidence: { source: proof.source, sourceFindingSha256: digest(finding),
        referenceMix: finding.referenceMix, candidateChannelNumerators: finding.candidateChannelNumerators,
        inputEquivalent: false, rendererCauseProven: false, renderingEquivalent: false,
        rasterDifferenceProven: false },
    };
    const members = finding.observations.map(observation => {
      const key = JSON.stringify([observation.case, finding.element, finding.property]);
      assert.ok(!seen.has(key), 'duplicate root observation'); seen.add(key);
      const input = subset.inputs.get(JSON.stringify([observation.case, finding.element]));
      assert.ok(input, 'source-proven input missing');
      assert.equal(digest(input), observation.inputSha256);
      assert.equal(normalize(input.reference).backgroundColor, reference);
      assert.equal(normalize(input.astylar).backgroundColor, astylar);
      return { ...observation, family: finding.family, element: finding.element,
        property: finding.property, reference, astylar, classification };
    });
    assert.equal(members.length, finding.occurrences);
    observations.push(...members);
    groups.push({ ...classification, family: finding.family, element: finding.element,
      property: finding.property, reference, astylar, occurrences: members.length,
      reviewedCases: members.map(member => member.case) });
  }
  assert.equal(groups.length, 144); assert.equal(observations.length, 2311);
  return { schemaVersion: 1, binding: { status: 'bound', capture: proof.capture,
    sourceProofsReplayed: true, normalization: preciseAuditNormalization },
    observations, groups, canonicalIntegration: false, canonicalCoverageProven: false,
    inputEquivalent: false, renderingEquivalent: false };
}
