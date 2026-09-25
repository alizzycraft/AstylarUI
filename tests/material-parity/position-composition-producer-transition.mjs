import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const hash = text => createHash('sha256').update(text).digest('hex');
export const borderEvidenceBaseline = '2cec29224f374d8d2e379d4f8486f3a8a8e078aa';
// These complete snapshots contain the reviewed heading, toggle-side and mapped
// border additions. This is not permission to ignore arbitrary module changes.
// Gap/caret/alignment consumers use the unchanged standalone selector helper.
export function verifyBorderEvidenceSourceTransition(previous, current) {
  const before = previous.toString().replaceAll('\r\n', '\n');
  const after = current.toString().replaceAll('\r\n', '\n');
  assert.equal(hash(before), '3dbcf33ff70244a8179f438962a2549fb7e354948f084d35d433bcf82e76f9f4');
  let reviewed = after;
  if (hash(after) === 'd227f234f19e19e4f2ee3705d5fe6d239738fe5a33c49bdf44dae3822033f099') {
    const addition = /\/\/ The reset is explicit reference authoring, never an omitted initial value\.[\s\S]*?export function inspectMappedButtonBorderReset\([\s\S]*?\n\}\n\n/g;
    assert.equal([...after.matchAll(addition)].length, 1);
    reviewed = after.replace(addition, '');
  }
  // The second complete snapshot adds the tested mapped-reset membership path;
  // it does not alter the shared selector consumed by historical readers.
  assert.ok(['1acfdc0cccbf85ef396fac52a5a0fcf751eb1444a7676b53c1b861ff6af764cd',
    '0a999d524abedb0ed3c6a8665630905e3b9ed3650244a84960103e0cd4ee1f41'].includes(hash(reviewed)),
    'border evidence changed beyond the reviewed complete source snapshot');
  const selector = source => {
    const matches = [...source.matchAll(/export function selectorCanApply\(selector, authored\) \{[\s\S]*?\n\}/g)];
    assert.equal(matches.length, 1); return matches[0][0];
  };
  assert.equal(selector(before), selector(after), 'shared selector implementation changed');
  return { historicalSha256: hash(before), currentSha256: hash(after),
    completeSnapshotsAuthenticated: true, selectorSourceConserved: true };
}
export function restoreMappedBorderInitialProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current;
  for (const [from, to] of [
    ['  applyMappedBorderInitial, validateMappedBorderInitial, mappedBorderInitialAttribution,\n', ''],
    ["  const beforeMappedBorderInitials = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
    ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyMappedBorderInitial(beforeMappedBorderInitials, cases, elementInventory, canonicalStyle)\n    : beforeMappedBorderInitials;\n", ''],
    ['      errors.push(...validateMappedBorderInitial(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n', ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(d => d.attribution === mappedBorderInitialAttribution))\n    errors.push('mapped border initial attribution lacks bound original cases');\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated mapped border integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), 'f2ef21859fbacba4894bdb5efdd45438f41ff05860a6206df73d9bfd325197cb',
    'producer changed beyond reviewed mapped border integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}
export function restoreToggleSideColorProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes('  const beforeMappedBorderInitials =') ? restoreMappedBorderInitialProducer(current).restoredSource : current;
  for (const [from, to] of [
    ['entry.reference !== (proof.referenceColors?.[entry.property] ?? proof.referenceColor)', 'entry.reference !== proof.referenceColor'],
    ['(item.referenceColors?.[entry.property] ?? item.referenceColor) === entry.reference', 'item.referenceColor === entry.reference'],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated toggle side-color validation fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), 'a9f8e8861c582687024475d8b63a0cd5fc30a69ec4667a97cdb6b3baae25ab20',
    'producer changed beyond reviewed toggle side-color validation');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}
export function restoreSidenavBackgroundScalarProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes('proof.referenceColors?.[entry.property]') ? restoreToggleSideColorProducer(current).restoredSource : current;
  for (const [from, to] of [
    ["  classifyRootBackgroundInput, validateRootBackgroundClassifications, rootBackgroundAttribution,\n  applySidenavBackgroundScalar, validateSidenavBackgroundScalar, sidenavBackgroundAttribution } from './root-background-classification-preparation.mjs';",
      "  classifyRootBackgroundInput, validateRootBackgroundClassifications, rootBackgroundAttribution } from './root-background-classification-preparation.mjs';"],
    ["  const beforeSidenavBackgroundScalars = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
    ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applySidenavBackgroundScalar(beforeSidenavBackgroundScalars, cases, elementInventory, canonicalStyle)\n    : beforeSidenavBackgroundScalars;\n", ''],
    ['      errors.push(...validateSidenavBackgroundScalar(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n', ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(d => d.attribution === sidenavBackgroundAttribution))\n    errors.push('sidenav background scalar attribution lacks bound original cases');\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated sidenav background integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), '52b9416a468d4bfb601ab682e598c289ae0c4e97a4b483090b9fe867985c61ff',
    'producer changed beyond reviewed sidenav background integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}
export function restoreRetainedFontScalarProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes('  const beforeSidenavBackgroundScalars =') ? restoreSidenavBackgroundScalarProducer(current).restoredSource : current;
  for (const [from, to] of [
    ["import { applyRetainedFontScalar, validateRetainedFontScalar, retainedFontScalarAttribution } from './retained-font-scalar.mjs';\n", ''],
    ["  const beforeRetainedFontScalars = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
    ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyRetainedFontScalar(beforeRetainedFontScalars, cases, elementInventory, retainedTypography, canonicalStyle)\n    : beforeRetainedFontScalars;\n", ''],
    ['      errors.push(...validateRetainedFontScalar(report.discrepancies, replayedRows, cases,\n        report.elementInventory, report.retainedTypography, canonicalStyle));\n', ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(d => d.attribution === retainedFontScalarAttribution))\n    errors.push('component font scalar attribution lacks bound original cases');\n", ''],
    ["    'tests/material-parity/retained-font-scalar.mjs',\n    'tests/material-parity/retained-font-scalar.spec.mjs',\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated retained-font scalar integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), '14095dd051f70abbf93b83571d62d781d5c5f33e173c809e498ced4e93ac716b',
    'producer changed beyond reviewed retained-font scalar integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}
export function restoreNormalLineBoxScalarProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes("from './retained-font-scalar.mjs'") ? restoreRetainedFontScalarProducer(current).restoredSource : current;
  for (const [from, to] of [
    ["import { applyNormalLineBoxScalar, validateNormalLineBoxScalar, normalLineBoxScalarAttribution } from './normal-line-box-scalar.mjs';\n", ''],
    ["  const beforeNormalLineBoxScalars = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
    ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyNormalLineBoxScalar(beforeNormalLineBoxScalars, cases, elementInventory, controlTypography)\n    : beforeNormalLineBoxScalars;\n", ''],
    ['      errors.push(...validateNormalLineBoxScalar(report.discrepancies, replayedRows, cases,\n        report.elementInventory, report.controlTypography));\n', ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(d => d.attribution === normalLineBoxScalarAttribution))\n    errors.push('button-host line-height attribution lacks bound original cases');\n", ''],
    ["    'tests/material-parity/normal-line-box-scalar.mjs',\n    'tests/material-parity/normal-line-box-scalar.spec.mjs',\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated normal-line-box scalar integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), '383e243a07218768ffddc7f1801da7c001f66e802c693ebd59effce4d1999f6c',
    'producer changed beyond reviewed scalar line-box integration');
  return {restoredSource:restored,previousModuleSha256:hash(restored),currentModuleSha256:hash(current)};
}
// Authenticate the complete predecessor, not just the lines we expect to change.
export function restoreOriginMotionProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes("from './normal-line-box-scalar.mjs'") ? restoreNormalLineBoxScalarProducer(current).restoredSource : current;
  for (const [from, to] of [
    ["collectOriginStageEvidence(originStageBinding.status === 'bound' ? cases : [], elementInventory, canonicalStyle, { reviewedDisjointMotion: true })", "collectOriginStageEvidence(originStageBinding.status === 'bound' ? cases : [], elementInventory, canonicalStyle)"],
    ['validateOriginStageEvidence(report.originStageEvidence, report.elementInventory, report.discrepancies, canonicalStyle, { reviewedDisjointMotion: true })', 'validateOriginStageEvidence(report.originStageEvidence, report.elementInventory, report.discrepancies, canonicalStyle)'],
    ['validateOriginStageSource(report.originStageBinding, report.originStageEvidence, { root, canonicalStyle, reviewedDisjointMotion: true })', 'validateOriginStageSource(report.originStageBinding, report.originStageEvidence, { root, canonicalStyle })'],
    ['Explicit disjoint motion targets receive guarded stage review; other motion/explicit-origin cases remain unresolved. No candidate used origin', 'Motion/explicit-origin cases remain unresolved; no candidate used origin'],
    ["    'tests/material-parity/origin-motion-stage-review.spec.mjs',\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated origin motion integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), '16de9bd146280fbbc29d81fdb4c88bf0376672aae9121667e138339b21fe0a8a',
    'producer changed beyond reviewed origin motion integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}
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
// Remove only the reviewed appearance fallback relocation. The complete
// predecessor hash rejects any accompanying unreviewed producer change.
export function restoreAppearancePrecedence(source) {
  const actual = source.toString().replaceAll('\r\n', '\n');
  let current = actual.includes('reviewedDisjointMotion: true') ? restoreOriginMotionProducer(actual).restoredSource : actual;
  if (current.includes("!['appearance', 'color'].includes(property)")) {
    for (const [from, to] of [
      ["!['appearance', 'color'].includes(property)", "property !== 'appearance'"],
      ["['appearance', 'color'].includes(property)", "property === 'appearance'"],
      ["    'tests/material-parity/root-color-descendant-evidence.mjs',\n    'tests/material-parity/root-color-descendant-evidence.spec.mjs',\n", ''],
    ]) {
      assert.equal(current.split(from).length, 2, 'missing or repeated descendant color integration fragment');
      current = current.replace(from, to);
    }
    assert.equal(hash(current), 'cc05565c29174a385ee16c14a507d351b06d14730da88f0ba4e454af68c2746e',
      'producer changed beyond descendant color fallback and source inventory');
  }
  const early = "        if (property !== 'appearance' && classification.attribution === 'unresolved') classification = classifyOwnerInitialStyleInput(";
  const late = "        // Appearance is newly admitted generic observation-stage evidence.\n        // Preserve specific source-reviewed findings (including mismatched\n        // measurement owners) before considering that fallback. Keep the\n        // historical eight-property precedence unchanged.\n        if (property === 'appearance' && classification.attribution === 'unresolved') classification = classifyOwnerInitialStyleInput(\n          input, property, referenceValue, astylarValue,\n          ownerInitialByCaseIdProperty.get(JSON.stringify([key, input.id, property]))) ?? classification;\n";
  assert.equal(current.split(early).length, 2);
  assert.equal(current.split(late).length, 2);
  const restored = current.replace(early, "        if (classification.attribution === 'unresolved') classification = classifyOwnerInitialStyleInput(").replace(late, '');
  assert.equal(hash(restored), '1a88cf50442a5833624978871bcce34e475f150acb9bad5fa134cd8356b4db91',
    'producer changed beyond appearance fallback precedence');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(actual) };
}

export function restorePositionProducer(source, { followupOnly = false } = {}) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = (current.includes("if (property !== 'appearance' && classification.attribution === 'unresolved')") ||
    current.includes("!['appearance', 'color'].includes(property)"))
    ? restoreAppearancePrecedence(current).restoredSource : current;
  const replaceOnce = (from, to = '') => {
    assert.equal(restored.split(from).length, 2, 'missing or repeated position integration fragment');
    restored = restored.replace(from, to);
  };
  // Reuse the existing original-case replay for the nine dialog owner joins.
  if (restored.includes('applyDialogTextFlow')) {
    replaceOnce('validateBottomSheetContrastCorners, applyDialogTextFlow, validateDialogTextFlow, applyTabControlStage, validateTabControlStage }', 'validateBottomSheetContrastCorners }');
    replaceOnce("  const modalDiscrepancies = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'");
    replaceOnce("  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyTabControlStage(applyDialogTextFlow(modalDiscrepancies, cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle)\n    : modalDiscrepancies;\n");
    replaceOnce('      errors.push(...validateDialogTextFlow(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n      errors.push(...validateTabControlStage(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n');
    replaceOnce("'reviewed-bottom-sheet-contrast-corner-substitution', 'reviewed-dialog-text-flow-inputs', 'reviewed-tab-control-stage'", "'reviewed-bottom-sheet-contrast-corner-substitution'");
  }
  if (restored.includes("from './modal-position-inspection.mjs'")) {
    if (restored.includes("    'src/parity/rounded-radius.audit.spec.ts',")) {
      replaceOnce("    'src/parity/rounded-radius.audit.spec.ts',\n    'scripts/audit-overlay-layout-stage.mjs',\n");
      replaceOnce("    proof(root, 'src/parity/rounded-radius.audit.spec.ts', /describe\\('public rounded radius audit'/,\n      'public equal-input oversized corner radius rendering', 'Current installed-package div and button surfaces preserve 9999px radius inputs but render four-vertex rectangles; native capsules and 24px/36px candidate controls distinguish the shape defect at DPR1/2. Source-extracted kernel proof traces sampling density to the unnormalized radius. Retained failures are diagnostic evidence, not historical-bundle attribution or complete antialiasing parity.'),\n");
    }
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
