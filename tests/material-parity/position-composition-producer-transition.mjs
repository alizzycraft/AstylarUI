import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const hash = text => createHash('sha256').update(text).digest('hex');
export const positionFollowupProducerFiles = [
  'tests/material-parity/position-followup-audit-source-binding.mjs',
  'tests/material-parity/position-followup-audit-source-binding.spec.mjs',
  'tests/material-parity/position-followup-review.mjs',
  'tests/material-parity/position-followup-review.spec.mjs',
  'tests/material-parity/position-followup-review-integration.spec.mjs',
  'tests/material-parity/tooltip-position-composition.mjs',
  'scripts/audit-material-tab-position-substitution.mjs',
  'scripts/audit-material-stepper-position-substitution.mjs',
  'tests/material-parity/radio-position-substitution.mjs',
  'tests/material-parity/static-position-observation.mjs',
  'tests/material-parity/choice-label-stacking-substitution.mjs',
  'docs/material-tooltip-position-composition.json',
  'docs/material-tab-position-substitution.json',
  'docs/material-stepper-position-substitution.json',
  'docs/material-radio-position-substitution.json',
  'docs/material-static-position-observation.json',
  'docs/material-choice-label-stacking-substitution.json',
];
export const positionProducerFiles = [
  "tests/material-parity/position-composition-audit-source-binding.mjs",
  "tests/material-parity/position-composition-audit-source-binding.spec.mjs",
  "tests/material-parity/position-composition-review.mjs",
  "tests/material-parity/position-composition-review.spec.mjs",
  "tests/material-parity/position-composition-producer-transition.mjs",
  "tests/material-parity/position-composition-producer-transition.spec.mjs",
  "scripts/audit-material-grid-position-substitution.mjs",
  "scripts/audit-material-flow-position-substitutions.mjs",
  "scripts/audit-material-position-population.mjs",
  "tests/material-parity/grid-position-substitution.spec.mjs",
  "tests/material-parity/flow-position-substitutions.spec.mjs",
  "tests/material-parity/position-input-population.spec.mjs",
  "docs/material-grid-position-substitution.json",
  "docs/material-flow-position-substitutions.json",
  "docs/material-position-input-population.json"
];
export function restorePositionProducer(source, { followupOnly = false } = {}) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current;
  const replaceOnce = (from, to = '') => {
    assert.equal(restored.split(from).length, 2, 'missing or repeated position integration fragment');
    restored = restored.replace(from, to);
  };
  // The focused/integration split moved this test without changing its claim.
  const movedSliderProof = "    proof(root, 'tests/material-parity/slider-input-box-integration.spec.mjs',";
  if (restored.includes(movedSliderProof)) {
    replaceOnce(movedSliderProof, "    proof(root, 'tests/material-parity/slider-input-box-source-binding.spec.mjs',");
    replaceOnce("    'tests/material-parity/slider-input-box-integration.spec.mjs',\n");
  }
  // Also accept the subsequent, exact fourteen-group integration. The final
  // pinned predecessor still rejects any unrelated producer modification.
  const hasFollowup = restored.includes("from './position-followup-audit-source-binding.mjs'");
  assert.ok(!followupOnly || hasFollowup, 'followup transition requires its production integration');
  if (hasFollowup) {
    replaceOnce("import { collectPositionFollowupAuditInputs, applyPositionFollowupAuditRows, validatePositionFollowupAuditInputs,\n  validatePositionFollowupAuditClassifications, positionFollowupAttribution } from './position-followup-audit-source-binding.mjs';\n");
    replaceOnce('  const positionReviewedDiscrepancies = applyPositionAuditRows(visibilityReviewedDiscrepancies, positionAuditInputs);\n  const positionFollowupAuditInputs = collectPositionFollowupAuditInputs(parityReport, { root, parityPath: options.parityPath });\n  const discrepancies = applyPositionFollowupAuditRows(positionReviewedDiscrepancies, positionFollowupAuditInputs);',
      '  const discrepancies = applyPositionAuditRows(visibilityReviewedDiscrepancies, positionAuditInputs);');
    replaceOnce('    positionFollowupAuditInputs,\n');
    replaceOnce("    ['positionFollowupAuditInputs', [positionFollowupAttribution], validatePositionFollowupAuditInputs, validatePositionFollowupAuditClassifications],\n");
    for (const file of positionFollowupProducerFiles) replaceOnce(`    '${file}',\n`);
  }
  const beforeFollowup = restored;
  replaceOnce("import { collectPositionAuditInputs, applyPositionAuditRows, validatePositionAuditInputs,\n  validatePositionAuditClassifications, positionCompositionAttribution } from './position-composition-audit-source-binding.mjs';\n");
  replaceOnce('  const visibilityReviewedDiscrepancies = applyVisibilityAuditRows(unreviewedDiscrepancies, visibilityAuditInputs);\n  const positionAuditInputs = collectPositionAuditInputs(parityReport, { root, parityPath: options.parityPath });\n  const discrepancies = applyPositionAuditRows(visibilityReviewedDiscrepancies, positionAuditInputs);',
    '  const discrepancies = applyVisibilityAuditRows(unreviewedDiscrepancies, visibilityAuditInputs);');
  replaceOnce('    positionAuditInputs,\n');
  replaceOnce("    ['positionAuditInputs', [positionCompositionAttribution], validatePositionAuditInputs, validatePositionAuditClassifications],\n");
  for (const file of positionProducerFiles) replaceOnce(`    '${file}',\n`);
  assert.equal(hash(restored), '4ac2017e9b2d546de80dfb7cc209cee27b623a1f30f7cb73a024839b096b6213',
    'producer changed beyond exact position integration');
  if (followupOnly) restored = beforeFollowup;
  return { restoredSource: restored, previousModuleSha256: hash(restored),
    currentModuleSha256: hash(current), wholeModuleConserved: true };
}
