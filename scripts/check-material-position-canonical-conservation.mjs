import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { readAudit } from './check-material-disabled-ink-canonical-conservation.mjs';
import { collectPositionCompositionReview, applyPositionCompositionReview,
  validatePositionCompositionRows, positionCompositionAttribution } from '../tests/material-parity/position-composition-review.mjs';
import { restorePositionProducer } from '../tests/material-parity/position-composition-producer-transition.mjs';
import { collectPositionFollowupReview, applyPositionFollowupReview,
  validatePositionFollowupRows, positionFollowupAttribution } from '../tests/material-parity/position-followup-review.mjs';
import { collectChipPaintProposal, applyChipPaintRows } from '../tests/material-parity/chip-position-inspection.mjs';
import { collectOverlaySurfaceReview, applyOverlaySurfaceRows } from '../tests/material-parity/overlay-surface-review.mjs';
import { applyDialogScalarTypography, applyBottomSheetScalarTypography } from '../tests/material-parity/modal-position-inspection.mjs';
import { collectFullTreeInventory, collectControlTypographyEvidence, collectRetainedTypographyEvidence } from '../tests/material-parity/input-equivalence-audit.mjs';
import { bindPreciseAuditNormalization } from '../tests/material-parity/audit-normalization-contracts.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const same = (a, b, message) => assert.ok(isDeepStrictEqual(a, b), message);
const receipt = row => row?.reviewEvidence?.observation?.normalizationReconciliation;

// The CLI independently derives expectedRows from authenticated predecessor
// records and fresh source review. This comparator cannot create that premise.
export function comparePositionCanonical(previous, current, expectedRows, currentSource, { followupOnly = false, chipOnly = false, overlayOnly = false, modalOnly = false, previousSource } = {}) {
  assert.ok([followupOnly, chipOnly, overlayOnly, modalOnly].filter(Boolean).length <= 1);
  let transition = restorePositionProducer(currentSource, { followupOnly });
  if (chipOnly || overlayOnly || modalOnly) {
    const normalize = source => source.toString('utf8').replaceAll('\r\n', '\n');
    const old = normalize(previousSource), now = normalize(currentSource);
    const added = modalOnly ? "from './modal-position-inspection.mjs'" : overlayOnly ? "from './overlay-surface-audit-source-binding.mjs'" : "from './chip-paint-audit-source-binding.mjs'";
    assert.ok(!old.includes(added)); assert.ok(now.includes(added));
    assert.ok(old.includes("from './position-followup-audit-source-binding.mjs'"));
    // Both complete modules must reduce to the same authenticated predecessor
    // through the existing exact-fragment transition, not a broad AST exclusion.
    const before = restorePositionProducer(old);
    same(transition.restoredSource, before.restoredSource, 'producer changed unrelated source');
    const hash = text => createHash('sha256').update(text).digest('hex');
    transition = { ...transition, previousModuleSha256: hash(old), currentModuleSha256: hash(now) };
  }
  const attributions = modalOnly ? ['reviewed-dialog-scalar-typography-owner', 'reviewed-bottom-sheet-scalar-typography-owner']
    : overlayOnly ? ['reviewed-snackbar-surface-input-substitution', 'reviewed-tooltip-sizing-constraint-omission']
    : [chipOnly ? 'reviewed-chip-state-layer-substitution' : followupOnly ? positionFollowupAttribution : positionCompositionAttribution];
  const expectedGroups = modalOnly ? 24 : overlayOnly ? 13 : chipOnly ? 10 : followupOnly ? 14 : 6;
  const expectedOccurrences = modalOnly ? 588 : overlayOnly ? 344 : chipOnly ? 32 : followupOnly ? 768 : 316;
  // Modal owner proofs have optional undefined fields in memory. Compare their
  // persisted JSON representation with the decoded canonical file, as the
  // production replay validator does. Omission stays omission, never a default.
  // Original scalar preservation below still compares predecessor/current raw
  // records directly, independently of this expected-proof serialization.
  if (modalOnly) expectedRows = JSON.parse(JSON.stringify(expectedRows));
  if (!isDeepStrictEqual(current.rows, expectedRows)) {
    const index = current.rows.findIndex((row, i) => !isDeepStrictEqual(row, expectedRows[i]));
    const actual = current.rows[index], expected = expectedRows[index];
    const fields = [...new Set([...Object.keys(actual ?? {}), ...Object.keys(expected ?? {})])]
      .filter(key => !isDeepStrictEqual(actual?.[key], expected?.[key]));
    assert.fail(`canonical rows differ from independently replayed positioning review: ${JSON.stringify({
      index, family: actual?.family, element: actual?.element, property: actual?.property,
      fields, serializedEqual: JSON.stringify(actual) === JSON.stringify(expected),
      actual: Object.fromEntries(fields.map(key => [key, actual?.[key]])),
      expected: Object.fromEntries(fields.map(key => [key, expected?.[key]])) })}`);
  }
  assert.equal(previous.rows.length, current.rows.length);
  const changed = [];
  for (let i = 0; i < previous.rows.length; i++) {
    const before = previous.rows[i], after = current.rows[i];
    if (isDeepStrictEqual(before, after)) continue;
    assert.equal(before.attribution, 'unresolved');
    assert.ok(attributions.includes(after.attribution));
    if (modalOnly) {
      const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
      const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !metadata.has(key)));
      same(raw(before), raw(after), 'modal classification changed original scalar evidence');
    }
    changed.push({ family: after.family, element: after.element, occurrences: after.occurrences,
      previousRowSha256: digest(before), currentRowSha256: digest(after) });
  }
  assert.equal(changed.length, expectedGroups);
  assert.equal(changed.reduce((n, row) => n + row.occurrences, 0), expectedOccurrences);
  const control = structuredClone(current.control), cases = [];
  assert.equal(control.differences.length, previous.control.differences.length);
  for (let i = 0; i < previous.control.differences.length; i++) {
    const before = previous.control.differences[i], after = control.differences[i];
    if (before.attribution !== 'reviewed-interactive-normal-line-box-stage-comparison' ||
        receipt(before)?.currentModuleSha256 !== transition.previousModuleSha256) continue;
    assert.equal(receipt(after)?.currentModuleSha256, transition.currentModuleSha256);
    receipt(after).currentModuleSha256 = transition.previousModuleSha256;
    same(after, before, 'control record changed beyond producer receipt');
    cases.push(before.case);
  }
  assert.equal(cases.length, 48); assert.equal(new Set(cases).size, 48);
  same(control, previous.control, 'unrelated control evidence changed');
  const { restoredSource, ...sourceProof } = transition;
  return { previous: previous.manifest, current: current.manifest,
    rows: current.rows.length, changedGroups: changed.length, changedOccurrences: expectedOccurrences,
    unchangedCompleteRows: current.rows.length - changed.length, changes: changed,
    previousUnresolved: previous.rows.filter(r => r.attribution === 'unresolved').length,
    currentUnresolved: current.rows.filter(r => r.attribution === 'unresolved').length,
    controlReceiptTransition: { ...sourceProof, records: cases.length, cases },
    allOtherControlEvidenceConserved: true, orderedCurrentRowsSha256: digest(current.rows),
    inputEquivalent: false, renderingEquivalent: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const followupOnly = process.argv[2] === '--followup';
  const chipOnly = process.argv[2] === '--chip';
  const overlayOnly = process.argv[2] === '--overlay';
  const modalOnly = process.argv[2] === '--modal';
  assert.equal(process.argv.length, followupOnly || chipOnly || overlayOnly || modalOnly ? 3 : 2);
  const previous = await readAudit(modalOnly ? 'artifacts/material-parity/working-audit/4601de6aeedf0595894e22de28052ee989a163320af4464337a69302c3a04aa2'
    : overlayOnly ? 'artifacts/material-parity/working-audit/d70aa37e4e14a9bfdc6183e0c2a7c383638d83050fc76b2d556a26b510691fa4'
    : chipOnly ? 'artifacts/material-parity/pre-chip-paint-2a35d34' : followupOnly
    ? 'artifacts/material-parity/pre-position-followup-509dbf4' : 'artifacts/material-parity/pre-position-e62e846');
  assert.equal(previous.manifest.uncompressedSha256, modalOnly ? '4ad34a695e2268a96a505d86af93bd396d897a5d996dd6dbf28b67a3199fb291'
    : overlayOnly ? '276bcd838575bcce26f06ab922eeacd880152c3585dee929f4635c778338767e'
    : chipOnly ? '0f8935c3a5a7b2b54195cb3402bb70cd357c33245aa5c9719e33a134ea64b1de' : followupOnly
    ? 'dd44f6b5597014617876fa21d8d144adf7451a3a17a4438c6f95384da6005d00'
    : '287ebb396d68ab064dca40a0c372879e8a0c3fd2c7f56498110577615bd430a2');
  const current = await readAudit('docs');
  let expected;
  if (modalOnly) {
    const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
    const captured = JSON.parse(bytes);
    const cases = captured.interactions.filter(c => ['dialog', 'bottom-sheet'].includes(c.family) &&
      c.styleInputs.some(i => i.id === (c.family === 'dialog' ? 'dialog-copy' : 'bottom-sheet-panel')))
      .map(c => ({ ...c, kind: 'interaction' }));
    assert.equal(cases.filter(c => c.family === 'dialog').length, 32);
    assert.equal(cases.filter(c => c.family === 'bottom-sheet').length, 25);
    const inventory = collectFullTreeInventory(cases);
    const control = collectControlTypographyEvidence(cases, inventory);
    const retained = collectRetainedTypographyEvidence(cases, inventory, control);
    const normalize = bindPreciseAuditNormalization();
    expected = applyBottomSheetScalarTypography(applyDialogScalarTypography(previous.rows, cases, inventory, retained, control, normalize), cases, inventory, normalize);
  } else {
    const review = overlayOnly ? await collectOverlaySurfaceReview() : chipOnly ? await collectChipPaintProposal() : followupOnly ? collectPositionFollowupReview() : collectPositionCompositionReview();
    expected = (overlayOnly ? applyOverlaySurfaceRows : chipOnly ? applyChipPaintRows : followupOnly ? applyPositionFollowupReview : applyPositionCompositionReview)(previous.rows, review);
    if (!chipOnly && !overlayOnly) (followupOnly ? validatePositionFollowupRows : validatePositionCompositionRows)(current.rows, review);
  }
  const previousSource = chipOnly || overlayOnly || modalOnly ? execFileSync('git', ['show', `${modalOnly ? '771e0a8' : overlayOnly ? '72f849a' : '2a35d34'}:tests/material-parity/input-equivalence-audit.mjs`], { maxBuffer: 4 * 1024 * 1024 }) : undefined;
  console.log(JSON.stringify(comparePositionCanonical(previous, current, expected,
    readFileSync('tests/material-parity/input-equivalence-audit.mjs'), { followupOnly, chipOnly, overlayOnly, modalOnly, previousSource }), null, 2));
}
