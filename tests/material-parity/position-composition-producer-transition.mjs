import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const hash = text => createHash('sha256').update(text).digest('hex');
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
export function restorePositionProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current;
  const replaceOnce = (from, to = '') => {
    assert.equal(restored.split(from).length, 2, 'missing or repeated position integration fragment');
    restored = restored.replace(from, to);
  };
  replaceOnce("import { collectPositionAuditInputs, applyPositionAuditRows, validatePositionAuditInputs,\n  validatePositionAuditClassifications, positionCompositionAttribution } from './position-composition-audit-source-binding.mjs';\n");
  replaceOnce('  const visibilityReviewedDiscrepancies = applyVisibilityAuditRows(unreviewedDiscrepancies, visibilityAuditInputs);\n  const positionAuditInputs = collectPositionAuditInputs(parityReport, { root, parityPath: options.parityPath });\n  const discrepancies = applyPositionAuditRows(visibilityReviewedDiscrepancies, positionAuditInputs);',
    '  const discrepancies = applyVisibilityAuditRows(unreviewedDiscrepancies, visibilityAuditInputs);');
  replaceOnce('    positionAuditInputs,\n');
  replaceOnce("    ['positionAuditInputs', [positionCompositionAttribution], validatePositionAuditInputs, validatePositionAuditClassifications],\n");
  for (const file of positionProducerFiles) replaceOnce(`    '${file}',\n`);
  assert.equal(hash(restored), '4ac2017e9b2d546de80dfb7cc209cee27b623a1f30f7cb73a024839b096b6213',
    'producer changed beyond exact position integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored),
    currentModuleSha256: hash(current), wholeModuleConserved: true };
}
