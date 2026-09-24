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
  // Reuse the existing original-case replay for the nine dialog owner joins.
  if (restored.includes("from './modal-position-inspection.mjs'")) {
    if (restored.includes('applyBottomSheetContrastCorners')) {
      replaceOnce("import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox, applyDialogPanelConstraints, validateDialogPanelConstraints, applyBottomSheetPanelConstraints, validateBottomSheetPanelConstraints, applyBottomSheetPanelFlow, validateBottomSheetPanelFlow, applyBottomSheetPanelPaint, validateBottomSheetPanelPaint, applyBottomSheetActionLayout, validateBottomSheetActionLayout, applyBottomSheetContrastCorners, validateBottomSheetContrastCorners } from './modal-position-inspection.mjs';", "import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox, applyDialogPanelConstraints, validateDialogPanelConstraints, applyBottomSheetPanelConstraints, validateBottomSheetPanelConstraints, applyBottomSheetPanelFlow, validateBottomSheetPanelFlow, applyBottomSheetPanelPaint, validateBottomSheetPanelPaint, applyBottomSheetActionLayout, validateBottomSheetActionLayout } from './modal-position-inspection.mjs';");
      replaceOnce('applyBottomSheetContrastCorners(overlaySurfaceDiscrepancies, cases, elementInventory, canonicalStyle)', 'overlaySurfaceDiscrepancies');
      replaceOnce('      errors.push(...validateBottomSheetContrastCorners(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n');
      replaceOnce("'reviewed-bottom-sheet-action-layout-substitution', 'reviewed-bottom-sheet-contrast-corner-substitution'", "'reviewed-bottom-sheet-action-layout-substitution'");
    }
    if (restored.includes('applyBottomSheetActionLayout')) {
      replaceOnce("import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox, applyDialogPanelConstraints, validateDialogPanelConstraints, applyBottomSheetPanelConstraints, validateBottomSheetPanelConstraints, applyBottomSheetPanelFlow, validateBottomSheetPanelFlow, applyBottomSheetPanelPaint, validateBottomSheetPanelPaint, applyBottomSheetActionLayout, validateBottomSheetActionLayout } from './modal-position-inspection.mjs';", "import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox, applyDialogPanelConstraints, validateDialogPanelConstraints, applyBottomSheetPanelConstraints, validateBottomSheetPanelConstraints, applyBottomSheetPanelFlow, validateBottomSheetPanelFlow, applyBottomSheetPanelPaint, validateBottomSheetPanelPaint } from './modal-position-inspection.mjs';");
      replaceOnce('applyBottomSheetActionLayout(overlaySurfaceDiscrepancies, cases, elementInventory, canonicalStyle)', 'overlaySurfaceDiscrepancies');
      replaceOnce('      errors.push(...validateBottomSheetActionLayout(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n');
      replaceOnce("'reviewed-bottom-sheet-panel-paint-inputs', 'reviewed-bottom-sheet-action-layout-substitution'", "'reviewed-bottom-sheet-panel-paint-inputs'");
    }
    if (restored.includes('applyBottomSheetPanelPaint')) {
      replaceOnce("import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox, applyDialogPanelConstraints, validateDialogPanelConstraints, applyBottomSheetPanelConstraints, validateBottomSheetPanelConstraints, applyBottomSheetPanelFlow, validateBottomSheetPanelFlow, applyBottomSheetPanelPaint, validateBottomSheetPanelPaint } from './modal-position-inspection.mjs';", "import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox, applyDialogPanelConstraints, validateDialogPanelConstraints, applyBottomSheetPanelConstraints, validateBottomSheetPanelConstraints, applyBottomSheetPanelFlow, validateBottomSheetPanelFlow } from './modal-position-inspection.mjs';");
      replaceOnce('applyBottomSheetPanelPaint(overlaySurfaceDiscrepancies, cases, elementInventory, canonicalStyle)', 'overlaySurfaceDiscrepancies');
      replaceOnce('      errors.push(...validateBottomSheetPanelPaint(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n');
      replaceOnce("'reviewed-bottom-sheet-panel-flow-substitution', 'reviewed-bottom-sheet-panel-paint-inputs'", "'reviewed-bottom-sheet-panel-flow-substitution'");
    }
    if (restored.includes('applyBottomSheetPanelFlow')) {
      replaceOnce("import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox, applyDialogPanelConstraints, validateDialogPanelConstraints, applyBottomSheetPanelConstraints, validateBottomSheetPanelConstraints, applyBottomSheetPanelFlow, validateBottomSheetPanelFlow } from './modal-position-inspection.mjs';",
        "import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox, applyDialogPanelConstraints, validateDialogPanelConstraints, applyBottomSheetPanelConstraints, validateBottomSheetPanelConstraints } from './modal-position-inspection.mjs';");
      replaceOnce('applyBottomSheetPanelFlow(overlaySurfaceDiscrepancies, cases, elementInventory, canonicalStyle)', 'overlaySurfaceDiscrepancies');
      replaceOnce('      errors.push(...validateBottomSheetPanelFlow(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n');
      replaceOnce("'reviewed-bottom-sheet-panel-constraint-omission', 'reviewed-bottom-sheet-panel-flow-substitution'", "'reviewed-bottom-sheet-panel-constraint-omission'");
    }
    if (restored.includes('applyBottomSheetPanelConstraints')) {
      replaceOnce("import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox, applyDialogPanelConstraints, validateDialogPanelConstraints, applyBottomSheetPanelConstraints, validateBottomSheetPanelConstraints } from './modal-position-inspection.mjs';",
        "import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox, applyDialogPanelConstraints, validateDialogPanelConstraints } from './modal-position-inspection.mjs';");
      replaceOnce('applyBottomSheetPanelConstraints(overlaySurfaceDiscrepancies, cases, elementInventory, canonicalStyle)', 'overlaySurfaceDiscrepancies');
      replaceOnce('      errors.push(...validateBottomSheetPanelConstraints(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n');
      replaceOnce("'reviewed-dialog-panel-constraint-omission', 'reviewed-bottom-sheet-panel-constraint-omission'", "'reviewed-dialog-panel-constraint-omission'");
    }
    if (restored.includes('applyDialogPanelConstraints')) {
      replaceOnce("import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox, applyDialogPanelConstraints, validateDialogPanelConstraints } from './modal-position-inspection.mjs';",
        "import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox } from './modal-position-inspection.mjs';");
      replaceOnce('applyDialogPanelConstraints(overlaySurfaceDiscrepancies, cases, elementInventory, canonicalStyle)', 'overlaySurfaceDiscrepancies');
      replaceOnce('      errors.push(...validateDialogPanelConstraints(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n');
      replaceOnce("'reviewed-dialog-action-box-substitution', 'reviewed-dialog-panel-constraint-omission'", "'reviewed-dialog-action-box-substitution'");
    }
    if (restored.includes('applyDialogActionBox')) {
      replaceOnce("import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox } from './modal-position-inspection.mjs';",
        "import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography } from './modal-position-inspection.mjs';");
      replaceOnce('applyDialogActionBox(overlaySurfaceDiscrepancies, cases, elementInventory, canonicalStyle)', 'overlaySurfaceDiscrepancies');
      replaceOnce('      errors.push(...validateDialogActionBox(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n');
      replaceOnce("'reviewed-bottom-sheet-scalar-typography-owner', 'reviewed-dialog-action-box-substitution'", "'reviewed-bottom-sheet-scalar-typography-owner'");
    }
    replaceOnce("import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography } from './modal-position-inspection.mjs';\n");
    replaceOnce("  const overlaySurfaceDiscrepancies = applyOverlaySurfaceAuditRows(chipPaintDiscrepancies, overlaySurfaceAuditInputs);\n  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyBottomSheetScalarTypography(applyDialogScalarTypography(overlaySurfaceDiscrepancies, cases, elementInventory, retainedTypography, controlTypography, canonicalStyle), cases, elementInventory, canonicalStyle)\n    : overlaySurfaceDiscrepancies;",
      '  const discrepancies = applyOverlaySurfaceAuditRows(chipPaintDiscrepancies, overlaySurfaceAuditInputs);');
    replaceOnce('      errors.push(...validateDialogScalarTypography(report.discrepancies, replayedRows, cases,\n        report.elementInventory, report.retainedTypography, report.controlTypography, canonicalStyle));\n      errors.push(...validateBottomSheetScalarTypography(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n');
    replaceOnce("      report.discrepancies?.some(d => [ownerInitialStyleAttribution, 'reviewed-dialog-scalar-typography-owner', 'reviewed-bottom-sheet-scalar-typography-owner'].includes(d.attribution))) {",
      '      report.discrepancies?.some(d => d.attribution === ownerInitialStyleAttribution)) {');
    for (const file of ['tests/material-parity/modal-position-inspection.mjs', 'tests/material-parity/modal-position-inspection.spec.mjs'])
      replaceOnce(`    '${file}',\n`);
  }
  // Admit only the exact thirteen-group overlay metadata integration.
  if (restored.includes("from './overlay-surface-audit-source-binding.mjs'")) {
    replaceOnce("import { collectOverlaySurfaceAuditInputs, applyOverlaySurfaceAuditRows, validateOverlaySurfaceAuditInputs,\n  validateOverlaySurfaceAuditClassifications, overlaySurfaceAttributions } from './overlay-surface-audit-source-binding.mjs';\n");
    replaceOnce('  const chipPaintDiscrepancies = applyChipPaintAuditRows(positionFollowupDiscrepancies, chipPaintAuditInputs);\n  const overlaySurfaceAuditInputs = collectOverlaySurfaceAuditInputs(parityReport, { root, parityPath: options.parityPath });\n  const discrepancies = applyOverlaySurfaceAuditRows(chipPaintDiscrepancies, overlaySurfaceAuditInputs);',
      '  const discrepancies = applyChipPaintAuditRows(positionFollowupDiscrepancies, chipPaintAuditInputs);');
    replaceOnce('    overlaySurfaceAuditInputs,\n');
    replaceOnce("    ['overlaySurfaceAuditInputs', overlaySurfaceAttributions, validateOverlaySurfaceAuditInputs, validateOverlaySurfaceAuditClassifications],\n");
    for (const file of ['tests/material-parity/overlay-surface-audit-source-binding.mjs',
      'tests/material-parity/overlay-surface-review.mjs', 'docs/material-overlay-surface-review.json']) replaceOnce(`    '${file}',\n`);
  }
  // Preserve the pinned pre-position producer while admitting only the exact
  // subsequent ten-row chip integration, not arbitrary producer edits.
  if (restored.includes("from './chip-paint-audit-source-binding.mjs'")) {
    replaceOnce("import { collectChipPaintAuditInputs, applyChipPaintAuditRows, validateChipPaintAuditInputs,\n  validateChipPaintAuditClassifications, chipPaintAttribution } from './chip-paint-audit-source-binding.mjs';\n");
    replaceOnce('  const positionFollowupDiscrepancies = applyPositionFollowupAuditRows(positionReviewedDiscrepancies, positionFollowupAuditInputs);\n  const chipPaintAuditInputs = collectChipPaintAuditInputs(parityReport, { root, parityPath: options.parityPath });\n  const discrepancies = applyChipPaintAuditRows(positionFollowupDiscrepancies, chipPaintAuditInputs);',
      '  const discrepancies = applyPositionFollowupAuditRows(positionReviewedDiscrepancies, positionFollowupAuditInputs);');
    replaceOnce('    chipPaintAuditInputs,\n');
    replaceOnce("    ['chipPaintAuditInputs', [chipPaintAttribution], validateChipPaintAuditInputs, validateChipPaintAuditClassifications],\n");
    for (const file of ['tests/material-parity/chip-paint-audit-source-binding.mjs', 'tests/material-parity/chip-position-inspection.mjs',
      'tests/material-parity/chip-position-inspection.spec.mjs', 'scripts/audit-findings-store.mjs', 'docs/material-chip-paint-review.json']) replaceOnce(`    '${file}',\n`);
  }
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
