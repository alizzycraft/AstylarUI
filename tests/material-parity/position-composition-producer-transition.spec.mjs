import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { restorePositionProducer, restoreOriginMotionProducer, restoreNormalLineBoxScalarProducer, restoreRetainedFontScalarProducer, restoreSidenavBackgroundScalarProducer, restoreToggleSideColorProducer, restoreMappedBorderInitialProducer } from './position-composition-producer-transition.mjs';
import { restoreMappedButtonResetProducer, restoreInteractiveWeightProducer, restoreModalPositionProducer } from './position-composition-producer-transition.mjs';
import { restoreControlPositionProducer } from './position-composition-producer-transition.mjs';

test('control position helpers leave historical collector sources byte-identical', () => {
  for (const name of ['chip-position-inspection', 'static-position-observation']) {
    const file = `tests/material-parity/${name}.mjs`;
    const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
    const accepted = execFileSync('git', ['show', 'd963dd2:' + file], { encoding: 'utf8' }).replaceAll('\r\n', '\n');
    assert.equal(current, accepted, name);
  }
});

test('control position integration restores the complete accepted modal producer', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', 'd963dd2:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restoreControlPositionProducer(current).restoredSource, previous);
  for (const fragment of ["const discrepancies = ownerInitialStyleBinding.status === 'bound'",
    'applyChipPositionRequests(beforeControlPositionRequests, cases',
    'validateButtonOffsetObservations(report.discrepancies, replayedRows, cases,',
    "errors.push('control position attribution lacks bound original cases');"])
    assert.throws(() => restoreControlPositionProducer(current.replace(fragment, '')));
  assert.throws(() => restoreControlPositionProducer(current + '\n// unrelated'));
});

test('modal position integration restores the full weight producer and rejects missing provenance or precedence', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', 'bc898de:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restoreModalPositionProducer(current).restoredSource, previous);
  for (const [from, to] of [
    ["const discrepancies = ownerInitialStyleBinding.status === 'bound'", 'const discrepancies = true'],
    ['applyDialogPositionRequests(beforeModalPositionRequests, cases', 'applyDialogPositionRequests(beforeCardBorderTokens, cases'],
    ['applyBottomSheetActionLayout(replayedRows, cases, report.elementInventory, canonicalStyle), cases,', 'replayedRows, cases,'],
    ['validateDialogPositionRequests(report.discrepancies, replayedRows, cases,', 'validateDialogPositionRequests(report.discrepancies, report.discrepancies, cases,'],
    ["errors.push('modal position attribution lacks bound original cases');", ''],
  ]) {
    assert.ok(current.includes(from)); assert.throws(() => restoreModalPositionProducer(current.replace(from, to)));
  }
  assert.throws(() => restoreModalPositionProducer(current + '\n// unrelated'));
});

test('interactive weight comparison restores the entire prior producer and rejects altered guards', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', 'a1fa7b2:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restoreInteractiveWeightProducer(current).restoredSource, previous);
  for (const fragment of ["property === 'fontWeight'", "reference === '400'",
    'evidence.state === benchmarkCase.state', 'evidence.currentPseudoStatePaintVerified === false',
    '...(interactiveWeight ? { currentPseudoStatePaintVerified: false, inputEquivalent: false, renderingEquivalent: false } : {})'])
    assert.throws(() => restoreInteractiveWeightProducer(current.replace(fragment, 'false')));
  assert.throws(() => restoreInteractiveWeightProducer(current + '\n// unrelated'));
  for (const prefix of ['if (!', 'if (']) {
    const from = prefix + "['appearance', 'color', 'fontWeight'].includes(property)";
    assert.ok(current.includes(from));
    assert.throws(() => restoreInteractiveWeightProducer(current.replace(from,
      prefix + "['appearance', 'color'].includes(property)")), 'reject partial precedence routing');
  }
});

test('mapped reset integration restores the full accepted producer and rejects incomplete wiring', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', 'e25512f:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restoreMappedButtonResetProducer(current).restoredSource, previous);
  for (const fragment of ['applyMappedButtonBorderReset(beforeMappedButtonResets, cases, elementInventory, canonicalStyle)',
    'validateMappedButtonBorderReset(report.discrepancies, replayedRows, cases,',
    "    errors.push('mapped button reset attribution lacks bound original cases');\n"])
    assert.throws(() => restoreMappedButtonResetProducer(current.replace(fragment, '')));
  assert.throws(() => restoreMappedButtonResetProducer(current + '\n// unrelated'));
});

test('mapped border integration preserves its predecessor and requires source replay', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', '9879cbb:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restoreMappedBorderInitialProducer(current).restoredSource, previous);
  for (const fragment of ['applyMappedBorderInitial(beforeMappedBorderInitials, cases, elementInventory, canonicalStyle)',
    'validateMappedBorderInitial(report.discrepancies, replayedRows, cases,',
    "    errors.push('mapped border initial attribution lacks bound original cases');\n"])
    assert.throws(() => restoreMappedBorderInitialProducer(current.replace(fragment, '')));
  assert.throws(() => restoreMappedBorderInitialProducer(current + '\nconst unrelated = true;'));
});

test('toggle other-side validation restores exactly the accepted producer', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', '11c01f9:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restoreToggleSideColorProducer(current).restoredSource, previous);
  assert.throws(() => restoreToggleSideColorProducer(current + '\n// unrelated'));
  assert.throws(() => restoreToggleSideColorProducer(current.replace('proof.referenceColors?.[entry.property]', 'proof.referenceColors?.wrong')));
});

test('sidenav background integration preserves its predecessor and requires complete original membership', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', '4c34566:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restoreSidenavBackgroundScalarProducer(current).restoredSource, previous);
  for (const fragment of [
    'applySidenavBackgroundScalar(beforeSidenavBackgroundScalars, cases, elementInventory, canonicalStyle)',
    'validateSidenavBackgroundScalar(report.discrepancies, replayedRows, cases,',
    "    errors.push('sidenav background scalar attribution lacks bound original cases');\n",
  ]) assert.throws(() => restoreSidenavBackgroundScalarProducer(current.replace(fragment, '')));
  assert.throws(() => restoreSidenavBackgroundScalarProducer(current + '\n// unrelated\n'));
});

test('retained font integration preserves its full predecessor and requires original-case validation', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', '8065221:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restoreRetainedFontScalarProducer(current).restoredSource, previous);
  for (const fragment of [
    'applyRetainedFontScalar(beforeRetainedFontScalars, cases, elementInventory, retainedTypography, canonicalStyle)',
    'validateRetainedFontScalar(report.discrepancies, replayedRows, cases,',
    "    'tests/material-parity/retained-font-scalar.spec.mjs',\n",
    "    errors.push('component font scalar attribution lacks bound original cases');\n",
  ]) assert.throws(() => restoreRetainedFontScalarProducer(current.replace(fragment, '')));
  assert.throws(() => restoreRetainedFontScalarProducer(current + '\n// unrelated\n'));
});

test('scalar line-box integration restores the complete accepted origin producer', () => {
  const file='tests/material-parity/input-equivalence-audit.mjs';
  const current=readFileSync(file,'utf8').replaceAll('\r\n','\n');
  const previous=execFileSync('git',['show','868f9de:'+file],{encoding:'utf8',maxBuffer:4000000}).replaceAll('\r\n','\n');
  assert.equal(restoreNormalLineBoxScalarProducer(current).restoredSource,previous);
  for(const fragment of ['applyNormalLineBoxScalar(beforeNormalLineBoxScalars, cases, elementInventory, controlTypography)',
    'validateNormalLineBoxScalar(report.discrepancies, replayedRows, cases,',
    "    'tests/material-parity/normal-line-box-scalar.spec.mjs',\n"])
    assert.throws(()=>restoreNormalLineBoxScalarProducer(current.replace(fragment,'')));
  assert.throws(()=>restoreNormalLineBoxScalarProducer(current+'\n// unrelated\n'));
});

test('origin motion producer transition preserves the exact accepted predecessor and rejects partial integration', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const prior = execFileSync('git', ['show', '498c5e2:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restoreOriginMotionProducer(current).restoredSource, prior);
  for (const fragment of [
    "collectOriginStageEvidence(originStageBinding.status === 'bound' ? cases : [], elementInventory, canonicalStyle, { reviewedDisjointMotion: true })",
    'validateOriginStageEvidence(report.originStageEvidence, report.elementInventory, report.discrepancies, canonicalStyle, { reviewedDisjointMotion: true })',
    'validateOriginStageSource(report.originStageBinding, report.originStageEvidence, { root, canonicalStyle, reviewedDisjointMotion: true })',
    "    'tests/material-parity/origin-motion-stage-review.spec.mjs',\n",
  ]) {
    assert.ok(current.includes(fragment));
    assert.throws(() => restoreOriginMotionProducer(current.replace(fragment, '')));
  }
  assert.throws(() => restoreOriginMotionProducer(current + '\n// unrelated change\n'));
});

test('position producer integration preserves every prior byte outside the exact added boundary', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const prior = execFileSync('git', ['show', 'e62e846:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restorePositionProducer(current).restoredSource, prior);
  const beforeFollowup = execFileSync('git', ['show', 'e8c7d25:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restorePositionProducer(current, { followupOnly: true }).restoredSource, beforeFollowup);
  assert.throws(() => restorePositionProducer(beforeFollowup, { followupOnly: true }));
  for (const mutated of [
    current.replace('applyTabControlStage(applyDialogTextFlow(modalDiscrepancies, cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle)', 'modalDiscrepancies'),
    current.replace('validateDialogTextFlow(report.discrepancies, replayedRows, cases,', 'validateDialogTextFlow(report.discrepancies, report.discrepancies, cases,'),
    current.replace('validateTabControlStage(report.discrepancies, replayedRows, cases,', 'validateTabControlStage(report.discrepancies, report.discrepancies, cases,'),
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
