import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { restorePositionProducer } from './position-composition-producer-transition.mjs';

test('position producer integration preserves every prior byte outside the exact added boundary', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const prior = execFileSync('git', ['show', 'e62e846:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restorePositionProducer(current).restoredSource, prior);
  const beforeFollowup = execFileSync('git', ['show', 'e8c7d25:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restorePositionProducer(current, { followupOnly: true }).restoredSource, beforeFollowup);
  assert.throws(() => restorePositionProducer(beforeFollowup, { followupOnly: true }));
  for (const mutated of [
    current + '\n// unrelated change\n',
    current.replace('applyPositionAuditRows(visibilityReviewedDiscrepancies, positionAuditInputs)', 'visibilityReviewedDiscrepancies'),
    current.replace('    positionAuditInputs,', '    positionAuditInputs: {},'),
    current.replace('[positionCompositionAttribution], validatePositionAuditInputs', '[], validatePositionAuditInputs'),
    current.replace('function reviewedButtonPaintInput(', 'function differentPaintInput('),
    current.replace("    'docs/material-position-input-population.json',\n", ''),
    current.replace('applyPositionFollowupAuditRows(positionReviewedDiscrepancies, positionFollowupAuditInputs)', 'positionReviewedDiscrepancies'),
    current.replace('    positionFollowupAuditInputs,', '    positionFollowupAuditInputs: {},'),
    current.replace('[positionFollowupAttribution], validatePositionFollowupAuditInputs', '[], validatePositionFollowupAuditInputs'),
    current.replace("    'tests/material-parity/position-followup-review.mjs',\n", ''),
    current.replace('applyChipPaintAuditRows(positionFollowupDiscrepancies, chipPaintAuditInputs)', 'positionFollowupDiscrepancies'),
    current.replace('    chipPaintAuditInputs,', '    chipPaintAuditInputs: {},'),
    current.replace("    'docs/material-chip-paint-review.json',\n", ''),
    current.replace('applyOverlaySurfaceAuditRows(chipPaintDiscrepancies, overlaySurfaceAuditInputs)', 'chipPaintDiscrepancies'),
    current.replace('    overlaySurfaceAuditInputs,', '    overlaySurfaceAuditInputs: {},'),
    current.replace("    'docs/material-overlay-surface-review.json',\n", ''),
    current.replace("ownerInitialStyleBinding.status === 'bound'\n    ? applyBottomSheetScalarTypography", "true\n    ? applyBottomSheetScalarTypography"),
    current.replace('applyDialogScalarTypography(applyDialogActionBox(applyDialogPanelConstraints(applyBottomSheetPanelConstraints(applyBottomSheetPanelFlow(applyBottomSheetPanelPaint(applyBottomSheetActionLayout(applyBottomSheetContrastCorners(overlaySurfaceDiscrepancies, cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle), cases, elementInventory, retainedTypography, controlTypography, canonicalStyle)', 'overlaySurfaceDiscrepancies'),
    current.replace('applyDialogActionBox(applyDialogPanelConstraints(applyBottomSheetPanelConstraints(applyBottomSheetPanelFlow(applyBottomSheetPanelPaint(applyBottomSheetActionLayout(applyBottomSheetContrastCorners(overlaySurfaceDiscrepancies, cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle)', 'overlaySurfaceDiscrepancies'),
    current.replace('applyDialogPanelConstraints(applyBottomSheetPanelConstraints(applyBottomSheetPanelFlow(applyBottomSheetPanelPaint(applyBottomSheetActionLayout(applyBottomSheetContrastCorners(overlaySurfaceDiscrepancies, cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle)', 'overlaySurfaceDiscrepancies'),
    current.replace('applyBottomSheetPanelConstraints(applyBottomSheetPanelFlow(applyBottomSheetPanelPaint(applyBottomSheetActionLayout(applyBottomSheetContrastCorners(overlaySurfaceDiscrepancies, cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle)', 'overlaySurfaceDiscrepancies'),
    current.replace('applyBottomSheetPanelFlow(applyBottomSheetPanelPaint(applyBottomSheetActionLayout(applyBottomSheetContrastCorners(overlaySurfaceDiscrepancies, cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle)', 'overlaySurfaceDiscrepancies'),
    current.replace('validateBottomSheetPanelFlow(report.discrepancies, replayedRows, cases,', 'validateBottomSheetPanelFlow(report.discrepancies, report.discrepancies, cases,'),
    current.replace('applyBottomSheetPanelPaint(applyBottomSheetActionLayout(applyBottomSheetContrastCorners(overlaySurfaceDiscrepancies, cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle)', 'overlaySurfaceDiscrepancies'),
    current.replace('validateBottomSheetPanelPaint(report.discrepancies, replayedRows, cases,', 'validateBottomSheetPanelPaint(report.discrepancies, report.discrepancies, cases,'),
    current.replace('applyBottomSheetActionLayout(applyBottomSheetContrastCorners(overlaySurfaceDiscrepancies, cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle)', 'overlaySurfaceDiscrepancies'),
    current.replace('validateBottomSheetActionLayout(report.discrepancies, replayedRows, cases,', 'validateBottomSheetActionLayout(report.discrepancies, report.discrepancies, cases,'),
    current.replace('applyBottomSheetContrastCorners(overlaySurfaceDiscrepancies, cases, elementInventory, canonicalStyle)', 'overlaySurfaceDiscrepancies'),
    current.replace('validateBottomSheetContrastCorners(report.discrepancies, replayedRows, cases,', 'validateBottomSheetContrastCorners(report.discrepancies, report.discrepancies, cases,'),
    current.replace('validateBottomSheetPanelConstraints(report.discrepancies, replayedRows, cases,', 'validateBottomSheetPanelConstraints(report.discrepancies, report.discrepancies, cases,'),
    current.replace('validateDialogPanelConstraints(report.discrepancies, replayedRows, cases,', 'validateDialogPanelConstraints(report.discrepancies, report.discrepancies, cases,'),
    current.replace('validateDialogActionBox(report.discrepancies, replayedRows, cases,', 'validateDialogActionBox(report.discrepancies, report.discrepancies, cases,'),
    current.replace('validateDialogScalarTypography(report.discrepancies, replayedRows, cases,', 'validateDialogScalarTypography(report.discrepancies, report.discrepancies, cases,'),
    current.replace('validateBottomSheetScalarTypography(report.discrepancies, replayedRows, cases,', 'validateBottomSheetScalarTypography(report.discrepancies, report.discrepancies, cases,'),
    current.replace('applyBottomSheetScalarTypography(applyDialogScalarTypography', 'unreviewedSheetClassification(applyDialogScalarTypography'),
    current.replace("    'tests/material-parity/modal-position-inspection.mjs',\n", ''),
  ]) {
    assert.notEqual(mutated, current);
    assert.throws(() => restorePositionProducer(mutated));
  }
});
