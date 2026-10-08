import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync as readOriginalSource } from 'node:fs';
import { restoreScalarReviewExtraction, readRetainedSortFocusSource } from './position-composition-producer-transition.mjs';
import { execFileSync } from 'node:child_process';
import { restorePositionProducer, restoreOriginMotionProducer, restoreNormalLineBoxScalarProducer, restoreRetainedFontScalarProducer, restoreSidenavBackgroundScalarProducer, restoreToggleSideColorProducer, restoreMappedBorderInitialProducer } from './position-composition-producer-transition.mjs';
import { restoreMappedButtonResetProducer, restoreInteractiveWeightProducer, restoreModalPositionProducer } from './position-composition-producer-transition.mjs';
import { restoreControlPositionProducer } from './position-composition-producer-transition.mjs';
import { restoreWidthOverflowProducer } from './position-composition-producer-transition.mjs';
import { restoreSnackbarOverflowProducer } from './position-composition-producer-transition.mjs';
import { restoreAuthoredTypographyProducer } from './position-composition-producer-transition.mjs';
import { restoreWrappingProducer } from './position-composition-producer-transition.mjs';
import { restoreTypographyReviewProducer } from './position-composition-producer-transition.mjs';
import { restoreBoxSizingReviewProducer } from './position-composition-producer-transition.mjs';
import { restoreGridHeightReviewProducer } from './position-composition-producer-transition.mjs';
import { restorePaintReviewProducer } from './position-composition-producer-transition.mjs';
import { restoreComponentColorProducer } from './position-composition-producer-transition.mjs';
import { restoreComponentInteractionProducer } from './position-composition-producer-transition.mjs';
import { restoreCaretPositionProducer } from './position-composition-producer-transition.mjs';
import { restoreOwnerBoundaryProducer } from './position-composition-producer-transition.mjs';
import { restorePreparedInputProducer } from './position-composition-producer-transition.mjs';
import { restorePreparedInputFollowupProducer, restoreStackingProducer } from './position-composition-producer-transition.mjs';

test('retained sorter paint additions conserve original statements and reject source drift', () => {
  const current = readOriginalSource('tests/material-parity/sort-focus-structure.spec.mjs');
  const original = execFileSync('git', ['show', '72b28c0e:tests/material-parity/sort-focus-structure.spec.mjs'], { maxBuffer: 4_000_000 });
  assert.deepEqual(readRetainedSortFocusSource(current), original);
  for (const replacement of [
    current.toString().replace('assert.ok(thumb.after.firstY > thumb.before.firstY);', ''),
    current.toString().replace('retained five-family caret edges use equal integer crop origins', 'unreviewed acceptance'),
    current.toString() + '\nconst unrelatedChange = true;\n',
  ]) assert.throws(() => readRetainedSortFocusSource(Buffer.from(replacement)));
});

// These original transition assertions operate on the pre-extraction producer.
// Authenticate the complete original source first; no test body or historical
// receipt is changed, and extraction drift is rejected rather than ignored.
const readFileSync = (file, encoding) => {
  const original = readOriginalSource(file, encoding);
  if (file !== 'tests/material-parity/input-equivalence-audit.mjs') return original;
  const source = restoreScalarReviewExtraction(original);
  const registration = "    'scripts/diagnose-material-root-initial-receipt.mjs',\n" +
    "    'tests/material-parity/case-index-assertion-migration.mjs',\n";
  assert.equal(source.split(registration).length, 2);
  return source.replace(registration, '');
};

test('standalone coverage registration preserves original extraction hash and rejects proof drift', () => {
  const current = readOriginalSource('tests/material-parity/input-equivalence-audit.mjs', 'utf8');
  const restored = restoreScalarReviewExtraction(current);
  assert.ok(!restored.includes('retained standalone visibility disabled and selection cohorts'));
  for (const phrase of ['retained standalone visibility disabled and selection cohorts',
    'Authenticates all 73 dependency/screenshot receipts', 'both original picker geometry failures remain asserted']) {
    assert.equal(current.split(phrase).length, 2);
    assert.throws(() => restoreScalarReviewExtraction(current.replace(phrase, 'unreviewed proof drift')));
  }
  const start = current.indexOf("    proof(root, 'tests/material-parity/input-equivalence-audit.spec.mjs', /test\\('retained standalone visibility");
  const end = current.indexOf("    proof(root, 'tests/material-parity/input-equivalence-audit.spec.mjs', /test\\('retained progress paint", start);
  assert.ok(start >= 0 && end > start);
  const block = current.slice(start, end);
  assert.throws(() => restoreScalarReviewExtraction(current.replace(block, block.repeat(2))));
  assert.throws(() => restoreScalarReviewExtraction(current + '\n// unrelated source drift'));
});

test('registered standalone proof batch conserves the entire preceding producer and rejects changed proofs', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', '4aec685:' + file],
    { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  const start = "    proof(root, 'tests/material-parity/input-equivalence-audit.spec.mjs', /test\\('retained progress paint binds";
  const from = current.indexOf(start), to = current.indexOf('  ];\n}\n', from);
  assert.ok(from >= 0 && to > from);
  const block = current.slice(from, to);
  assert.equal(block.split('    proof(root,').length - 1, 8);
  assert.equal(current.slice(0, from) + current.slice(to), previous);
  assert.equal(restoreStackingProducer(current).restoredSource, restoreStackingProducer(previous).restoredSource);
  for (const phrase of ['retained progress paint binds', 'retained compact empty and filled inputs',
    'retained keyboard profiles replay', 'retained empty caret rasters preserve',
    'retained applied-theme popup focus', 'retained selection states preserve',
    'retained tooltip textures separate', 'retained Tab, popup-state and email-edit boundaries',
    'Not DPR1 cause resolution']) {
    assert.ok(block.includes(phrase));
    assert.throws(() => restoreStackingProducer(current.replace(phrase, 'unreviewed proof change')));
  }
  assert.throws(() => restoreStackingProducer(current.replace(block, block.repeat(2))));
  assert.throws(() => restoreStackingProducer(current.replace('function reviewedTemplateTextMappings(', 'function unreviewedMappings(')));
  assert.throws(() => restoreStackingProducer(current + '\n// unrelated'));
});

test('recent diagnostic integration preserves historical producer and rejects changed evidence guards', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', '449586c:' + file],
    { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restoreStackingProducer(current).restoredSource, restoreStackingProducer(previous).restoredSource);
  for (const [before, after] of [
    ['receipt.sha256', "'unverified'"],
    ['pointer-state remove/recreate leaves5/10/15', 'pointer-state remove/recreate leaves0/0/0'],
    ['not stable live-resource acceptance', 'stable live-resource acceptance'],
    ['finding.classification !== definition.classification', 'false'],
    ['not lifecycle acceptance, GPU retention evidence', 'lifecycle acceptance, GPU retention evidence'],
    ['tests/material-parity/sort-focus-structure.spec.mjs', 'tests/material-parity/unreviewed.spec.mjs'],
    ['const beforeStackingReviews =', 'const unreviewedStackingReviews ='],
  ]) {
    assert.ok(current.includes(before));
    assert.throws(() => restoreStackingProducer(current.replace(before, after)));
  }
  assert.throws(() => restoreStackingProducer(current + '\n// unrelated'));
});

test('shared font inventory registration preserves the full historical producer', () => {
  const current = readFileSync('tests/material-parity/input-equivalence-audit.mjs', 'utf8').replaceAll('\r\n', '\n');
  const registration = "    'scripts/material-container-font-targets.mjs',\n";
  assert.equal(current.split(registration).length, 2);
  assert.equal(restoreStackingProducer(current).restoredSource,
    restoreStackingProducer(current.replace(registration, '')).restoredSource);
  assert.throws(() => restoreStackingProducer(current.replace(registration, registration.repeat(2))));
  assert.throws(() => restoreStackingProducer(current.replace(registration,
    "    'scripts/invented-font-targets.mjs',\n")));
  assert.throws(() => restoreStackingProducer(current + '\n// unrelated change'));
});

test('checkpoint inventory registration preserves the exact pre-registration producer', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', 'e15fddd^:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  const registration = "    'tests/material-parity/run-checkpoint.mjs',\n    'tests/material-parity/run-checkpoint.spec.mjs',\n";
  assert.equal(current.split(registration).length, 2);
  const registered = execFileSync('git', ['show', 'e15fddd:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(registered.replace(registration, ''), previous);
  assert.equal(restoreStackingProducer(current).restoredSource, restoreStackingProducer(previous).restoredSource);
  for (const changed of [current.replace(registration, registration.repeat(2)),
    current.replace('tests/material-parity/run-checkpoint.spec.mjs', 'tests/material-parity/unreviewed.spec.mjs'),
    current.replace(registration, registration.split('\n').slice(0, 1).join('\n') + '\n'),
    current + '\n// unrelated change']) assert.throws(() => restoreStackingProducer(changed));
});

test('prepared input followup restores the complete accepted prepared-input predecessor', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', '4d30214:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restorePreparedInputFollowupProducer(current).restoredSource, previous);
  for (const fragment of ['applyPreparedInputFollowups(beforePreparedInputFollowups',
    'validatePreparedInputFollowups(report.discrepancies',
    "errors.push('prepared input followup attribution lacks bound original cases');",
    "    'tests/material-parity/display-request-review.mjs',\n"])
    assert.throws(() => restorePreparedInputFollowupProducer(current.replace(fragment, '')));
  assert.throws(() => restorePreparedInputFollowupProducer(current + '\n// unrelated'));
});

test('prepared input integration restores the complete accepted owner-boundary predecessor', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', 'c8a5fc1:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restorePreparedInputProducer(current).restoredSource, previous);
  for (const fragment of ['applyPreparedInputReviews(beforePreparedInputReviews',
    'validatePreparedInputReviews(report.discrepancies',
    "errors.push('prepared input review attribution lacks bound original cases');",
    "    'tests/material-parity/authored-anchor-review.mjs',\n"])
    assert.throws(() => restorePreparedInputProducer(current.replace(fragment, '')));
  assert.throws(() => restorePreparedInputProducer(current + '\n// unrelated'));
});

test('owner boundary integration restores the complete accepted caret predecessor', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', 'a9a2f55:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restoreOwnerBoundaryProducer(current).restoredSource, previous);
  for (const fragment of ['applyOwnerBoundaryReviews(beforeOwnerBoundaryReviews',
    'validateOwnerBoundaryReviews(report.discrepancies',
    "errors.push('owner boundary review attribution lacks bound original cases');",
    "    'tests/material-parity/custom-owner-border-review.mjs',\n"])
    assert.throws(() => restoreOwnerBoundaryProducer(current.replace(fragment, '')));
  assert.throws(() => restoreOwnerBoundaryProducer(current + '\n// unrelated'));
});

test('caret/position integration restores the complete accepted interaction predecessor', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', '348860a:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restoreCaretPositionProducer(current).restoredSource, previous);
  for (const fragment of ['applyCaretPositionReviews(beforeCaretPositionReviews',
    'validateCaretPositionReviews(report.discrepancies',
    "errors.push('caret/position review attribution lacks bound original cases');",
    "    'scripts/audit-material-range-caret-inputs.mjs',\n"])
    assert.throws(() => restoreCaretPositionProducer(current.replace(fragment, '')));
  assert.throws(() => restoreCaretPositionProducer(current + '\n// unrelated'));
});

test('cursor/pointer integration restores the complete accepted color predecessor', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', 'f79c9f8:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restoreComponentInteractionProducer(current).restoredSource, previous);
  for (const fragment of ['applyExplicitComponentCursors(beforeComponentInteractionReviews',
    'applyComponentPointerReviews(applyExplicitComponentCursors',
    'validateComponentCursorReviews(report.discrepancies', 'validateComponentPointerReviews(report.discrepancies',
    "errors.push('component cursor review attribution lacks bound original cases');",
    "errors.push('component pointer review attribution lacks bound original cases');",
    "    'tests/material-parity/component-pointer-events-review.mjs',\n"])
    assert.throws(() => restoreComponentInteractionProducer(current.replace(fragment, '')));
  assert.throws(() => restoreComponentInteractionProducer(current + '\n// unrelated'));
});

test('component color integration restores the complete accepted paint predecessor', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', '7121d16:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restoreComponentColorProducer(current).restoredSource, previous);
  for (const fragment of ['applyComponentColorReviews(beforeComponentColorReviews, cases',
    'validateComponentColorReviews(report.discrepancies, replayedRows',
    "errors.push('component color review attribution lacks bound original cases');",
    "    'tests/material-parity/component-color-request-review.mjs',\n"])
    assert.throws(() => restoreComponentColorProducer(current.replace(fragment, '')));
  assert.throws(() => restoreComponentColorProducer(current + '\n// unrelated'));
});

test('paint integration restores the complete accepted grid/height predecessor', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', 'e7093a8:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restorePaintReviewProducer(current).restoredSource, previous);
  for (const fragment of ['applyPaintReviews(beforePaintReviews, cases',
    'validatePaintReviews(report.discrepancies, replayedRows',
    "errors.push('paint review attribution lacks bound original cases');",
    "    'tests/material-parity/control-state-paint-review.mjs',\n"])
    assert.throws(() => restorePaintReviewProducer(current.replace(fragment, '')));
  assert.throws(() => restorePaintReviewProducer(current + '\n// unrelated'));
});

test('grid/height integration restores the complete accepted box-sizing predecessor', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', 'c74c018:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restoreGridHeightReviewProducer(current).restoredSource, previous);
  for (const fragment of ['applyGridHeightReviews(beforeGridHeightReviews, cases',
    'replayGridHeightPredecessors(replayedRows, cases',
    "errors.push('grid/height review attribution lacks bound original cases');",
    "    'tests/material-parity/mapped-grid-template-review.mjs',\n"])
    assert.throws(() => restoreGridHeightReviewProducer(current.replace(fragment, '')));
  assert.throws(() => restoreGridHeightReviewProducer(current + '\n// unrelated'));
});

test('box-sizing integration restores the complete accepted typography predecessor', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', 'fd99454:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restoreBoxSizingReviewProducer(current).restoredSource, previous);
  for (const fragment of ['applyBoxSizingReviews(beforeBoxSizingReviews, cases',
    'replayBoxSizingPredecessors(replayedRows, cases',
    "errors.push('box-sizing review attribution lacks bound original cases');",
    "    'tests/material-parity/box-sizing-authoring-review.mjs',\n"])
    assert.throws(() => restoreBoxSizingReviewProducer(current.replace(fragment, '')));
  assert.throws(() => restoreBoxSizingReviewProducer(current + '\n// unrelated'));
});

test('typography review restores the full predecessor including precedence and binding guards', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', '2281c37:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restoreTypographyReviewProducer(current).restoredSource, previous);
  for (const fragment of ['applyTypographyReviews(beforeTypographyReviews, cases',
    'replayTypographyPredecessors(replayedRows, cases',
    "errors.push('typography review attribution lacks bound original cases');",
    "    'tests/material-parity/tracking-input-review.mjs',\n"])
    assert.throws(() => restoreTypographyReviewProducer(current.replace(fragment, '')));
  assert.throws(() => restoreTypographyReviewProducer(current + '\n// unrelated'));
});

test('wrapping integration restores the complete accepted typography producer', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', 'b99f957:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restoreWrappingProducer(current).restoredSource, previous);
  for (const fragment of ['applyWrappingReviews(beforeNormalLineBoxScalars, cases',
    'validateWrappingReviews(report.discrepancies, replayedRows, cases,',
    "errors.push('wrapping attribution lacks bound original cases');",
    "    'tests/material-parity/wrapping-input-review.mjs',\n"])
    assert.throws(() => restoreWrappingProducer(current.replace(fragment, '')));
  assert.throws(() => restoreWrappingProducer(current + '\n// unrelated'));
});

test('authored typography integration restores the complete accepted snackbar producer', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', '9e90a85:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restoreAuthoredTypographyProducer(current).restoredSource, previous);
  for (const fragment of ['applyButtonAuthoredTypography(applyTabScalarTypography(modalDiscrepancies, cases',
    'validateTabScalarTypography(report.discrepancies, replayedRows, cases,',
    'validateButtonAuthoredTypography(report.discrepancies, replayedRows, cases,',
    "errors.push('authored typography scalar attribution lacks bound original cases');",
    "    'tests/material-parity/tab-scalar-typography.mjs',\n"])
    assert.throws(() => restoreAuthoredTypographyProducer(current.replace(fragment, '')));
  assert.throws(() => restoreAuthoredTypographyProducer(current + '\n// unrelated'));
});

test('snackbar and overflow integration restores the entire accepted width producer', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', '8978a4b:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restoreSnackbarOverflowProducer(current).restoredSource, previous);
  for (const fragment of ['applySnackbarPositionRequests(beforeSnackbarOverflowRequests, cases',
    'validateControlClippingRequests(report.discrepancies, replayedRows, cases,',
    'validateMappedVisibleOverflow(report.discrepancies, replayedRows, cases,',
    "errors.push('snackbar and overflow attribution lacks bound original cases');",
    "    'tests/material-parity/control-overflow-observation.mjs',\n"])
    assert.throws(() => restoreSnackbarOverflowProducer(current.replace(fragment, '')));
  assert.throws(() => restoreSnackbarOverflowProducer(current + '\n// unrelated'));
});

test('width and overflow integration restores the complete accepted position producer', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', 'd7843b4:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restoreWidthOverflowProducer(current).restoredSource, previous);
  for (const fragment of ['applyControlWidthRequests(beforeWidthOverflowRequests, cases',
    'validateOmittedWidthObservations(report.discrepancies, replayedRows, cases,',
    'validateOverlayOverflowRequests(report.discrepancies, replayedRows, cases,',
    "errors.push('width and overflow attribution lacks bound original cases');",
    "    'tests/material-parity/overlay-overflow-observation.mjs',\n"])
    assert.throws(() => restoreWidthOverflowProducer(current.replace(fragment, '')));
  assert.throws(() => restoreWidthOverflowProducer(current + '\n// unrelated'));
});

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
  for(const fragment of ['applyNormalLineBoxScalar(wrappingDiscrepancies, cases, elementInventory, controlTypography)',
    'validateNormalLineBoxScalar(report.discrepancies, replayedRows, cases,',
    "    'tests/material-parity/normal-line-box-scalar.spec.mjs',\n"])
    {
      assert.ok(current.includes(fragment), 'negative control must mutate current production source');
      assert.throws(()=>restoreNormalLineBoxScalarProducer(current.replace(fragment,'')));
    }
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
    current.replace('applyTabControlStage(applyDialogTextFlow(authoredTypographyDiscrepancies, cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle)', 'authoredTypographyDiscrepancies'),
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
    assert.ok(mutated !== current, 'negative control must change the current producer');
    assert.throws(() => restorePositionProducer(mutated));
  }
});
