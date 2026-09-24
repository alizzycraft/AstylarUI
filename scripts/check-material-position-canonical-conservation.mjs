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
import { applyDialogScalarTypography, applyBottomSheetScalarTypography, applyDialogActionBox, applyDialogPanelConstraints, applyBottomSheetPanelConstraints, applyBottomSheetPanelFlow, applyBottomSheetPanelPaint, applyBottomSheetActionLayout, applyBottomSheetContrastCorners, applyDialogTextFlow, applyTabControlStage } from '../tests/material-parity/modal-position-inspection.mjs';
import { collectFullTreeInventory, collectControlTypographyEvidence, collectRetainedTypographyEvidence } from '../tests/material-parity/input-equivalence-audit.mjs';
import { bindPreciseAuditNormalization } from '../tests/material-parity/audit-normalization-contracts.mjs';
import { inspectOwnerInitialStyle } from '../tests/material-parity/owner-initial-style-survey.mjs';
import { classifyOwnerInitialStyleInput, ownerInitialStyleAttribution } from '../tests/material-parity/owner-initial-style-attribution.mjs';
import { originStageTrees } from '../tests/material-parity/origin-stage-inventory-evidence.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const same = (a, b, message) => assert.ok(isDeepStrictEqual(a, b), message);
const receipt = row => row?.reviewEvidence?.observation?.normalizationReconciliation;

// The CLI independently derives expectedRows from authenticated predecessor
// records and fresh source review. This comparator cannot create that premise.
export function comparePositionCanonical(previous, current, expectedRows, currentSource, { followupOnly = false, chipOnly = false, overlayOnly = false, modalOnly = false, modalBoxOnly = false, sheetPanelOnly = false, sheetActionOnly = false, dialogTabOnly = false, previousSource } = {}) {
  assert.ok([followupOnly, chipOnly, overlayOnly, modalOnly, modalBoxOnly, sheetPanelOnly, sheetActionOnly, dialogTabOnly].filter(Boolean).length <= 1);
  let transition = restorePositionProducer(currentSource, { followupOnly });
  if (chipOnly || overlayOnly || modalOnly || modalBoxOnly || sheetPanelOnly || sheetActionOnly || dialogTabOnly) {
    const normalize = source => source.toString('utf8').replaceAll('\r\n', '\n');
    const old = normalize(previousSource), now = normalize(currentSource);
    const added = dialogTabOnly ? 'applyDialogTextFlow' : sheetActionOnly ? 'applyBottomSheetActionLayout' : sheetPanelOnly ? 'applyBottomSheetPanelConstraints' : modalBoxOnly ? 'applyDialogActionBox' : modalOnly ? "from './modal-position-inspection.mjs'" : overlayOnly ? "from './overlay-surface-audit-source-binding.mjs'" : "from './chip-paint-audit-source-binding.mjs'";
    assert.ok(!old.includes(added)); assert.ok(now.includes(added));
    assert.ok(old.includes("from './position-followup-audit-source-binding.mjs'"));
    // Both complete modules must reduce to the same authenticated predecessor
    // through the existing exact-fragment transition, not a broad AST exclusion.
    const before = restorePositionProducer(old);
    same(transition.restoredSource, before.restoredSource, 'producer changed unrelated source');
    const hash = text => createHash('sha256').update(text).digest('hex');
    transition = { ...transition, previousModuleSha256: hash(old), currentModuleSha256: hash(now) };
  }
  const attributions = dialogTabOnly ? ['reviewed-dialog-text-flow-inputs', 'reviewed-tab-control-stage'] : sheetActionOnly ? ['reviewed-bottom-sheet-action-layout-substitution', 'reviewed-bottom-sheet-contrast-corner-substitution']
    : sheetPanelOnly ? ['reviewed-bottom-sheet-panel-constraint-omission', 'reviewed-bottom-sheet-panel-flow-substitution', 'reviewed-bottom-sheet-panel-paint-inputs']
    : modalBoxOnly ? ['reviewed-dialog-action-box-substitution', 'reviewed-dialog-panel-constraint-omission']
    : modalOnly ? ['reviewed-dialog-scalar-typography-owner', 'reviewed-bottom-sheet-scalar-typography-owner']
    : overlayOnly ? ['reviewed-snackbar-surface-input-substitution', 'reviewed-tooltip-sizing-constraint-omission']
    : [chipOnly ? 'reviewed-chip-state-layer-substitution' : followupOnly ? positionFollowupAttribution : positionCompositionAttribution];
  const expectedGroups = dialogTabOnly ? 19 : sheetActionOnly ? 18 : sheetPanelOnly ? 17 : modalBoxOnly ? 12 : modalOnly ? 24 : overlayOnly ? 13 : chipOnly ? 10 : followupOnly ? 14 : 6;
  const expectedOccurrences = dialogTabOnly ? 708 : sheetActionOnly ? 298 : sheetPanelOnly ? 279 : modalBoxOnly ? 384 : modalOnly ? 588 : overlayOnly ? 344 : chipOnly ? 32 : followupOnly ? 768 : 316;
  // Modal owner proofs have optional undefined fields in memory. Compare their
  // persisted JSON representation with the decoded canonical file, as the
  // production replay validator does. Omission stays omission, never a default.
  // Original scalar preservation below still compares predecessor/current raw
  // records directly, independently of this expected-proof serialization.
  if (modalOnly || modalBoxOnly || sheetPanelOnly || sheetActionOnly || dialogTabOnly) expectedRows = JSON.parse(JSON.stringify(expectedRows));
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
    if (modalOnly || modalBoxOnly || sheetPanelOnly || sheetActionOnly || dialogTabOnly) {
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

// Reuse the canonical reader/comparison boundary for the appearance batch.
// This producer is unchanged; unlike earlier position batches no control receipt
// transition is allowed. Expected rows must come from independent source replay.
export function compareAppearanceCanonical(previous, current, expectedRows, currentSource) {
  assert.equal(createHash('sha256').update(currentSource.toString('utf8').replaceAll('\r\n', '\n')).digest('hex'),
    '1a88cf50442a5833624978871bcce34e475f150acb9bad5fa134cd8356b4db91', 'appearance batch changed the audit producer');
  same(current.rows, JSON.parse(JSON.stringify(expectedRows)), 'appearance rows differ from source replay');
  assert.equal(current.rows.length, previous.rows.length);
  same(current.control, previous.control, 'appearance batch changed unrelated control evidence');
  const metadata = new Set(['classification', 'attribution', 'recommendedOwner', 'justification', 'reviewEvidence', 'reviewedCases']);
  const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !metadata.has(key)));
  const changes = [];
  for (let i = 0; i < previous.rows.length; i++) {
    const before = previous.rows[i], after = current.rows[i];
    if (isDeepStrictEqual(before, after)) continue;
    assert.equal(before.attribution, 'unresolved');
    assert.equal(before.property, 'appearance'); assert.equal(before.reference, 'none');
    assert.equal(before.astylar, undefined);
    assert.equal(after.attribution, ownerInitialStyleAttribution);
    assert.equal(after.classification, 'parity-harness-defect');
    assert.equal(after.reviewEvidence.computedCandidateVerified, false);
    assert.equal(after.reviewEvidence.renderingEquivalent, false);
    same(raw(before), raw(after), 'appearance classification changed raw input');
    assert.equal(after.reviewedCases.length, before.occurrences);
    assert.equal(new Set(after.reviewedCases).size, before.occurrences);
    same(after.reviewedCases.slice(0, 12), before.cases, 'appearance case samples changed');
    changes.push({ family: after.family, element: after.element, occurrences: after.occurrences,
      previousRowSha256: digest(before), currentRowSha256: digest(after) });
  }
  assert.equal(changes.length, 34);
  assert.equal(changes.reduce((n, row) => n + row.occurrences, 0), 2195);
  return { previous: previous.manifest, current: current.manifest, changedGroups: changes.length,
    changedOccurrences: 2195, unchangedCompleteRows: current.rows.length - changes.length, changes,
    previousUnresolved: previous.rows.filter(r => r.attribution === 'unresolved').length,
    currentUnresolved: current.rows.filter(r => r.attribution === 'unresolved').length,
    allRawInputsConserved: true, allControlEvidenceConserved: true,
    orderedCurrentRowsSha256: digest(current.rows), inputEquivalent: false, renderingEquivalent: false };
}

function replayAppearanceRows(rows, captured) {
  const entries = [...captured.results.map(e => ({ ...e, kind: 'static' })),
    ...captured.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
  const inventory = collectFullTreeInventory(entries), trees = new Map();
  return rows.map(row => {
    if (row.attribution !== 'unresolved' || row.property !== 'appearance' || row.reference !== 'none' || row.astylar !== undefined) return row;
    const members = [];
    for (const entry of entries.filter(e => e.family === row.family)) {
      const inputs = entry.styleInputs.filter(i => i.id === row.element && i.reference?.appearance === 'none' && i.astylar?.appearance === undefined);
      assert.ok(inputs.length <= 1); if (!inputs.length) continue;
      const key = keyOf(entry), input = inputs[0];
      if (!trees.has(key)) trees.set(key, originStageTrees(inventory, key));
      const pair = trees.get(key); assert.ok(pair);
      const proof = { case: key, family: entry.family, element: input.id, property: 'appearance', referenceValue: 'none',
        ...inspectOwnerInitialStyle(input, 'appearance', pair.reference, pair.candidate,
          { family: entry.family, reviewedGeneratedOwners: true, reviewedAppearance: true }) };
      members.push({ case: key, state: entry.state ?? 'static',
        result: classifyOwnerInitialStyleInput(input, 'appearance', 'none', undefined, proof) });
    }
    assert.equal(members.length, row.occurrences);
    same(members.slice(0, 12).map(m => m.case), row.cases, 'original appearance case sample changed');
    same([...new Set(members.map(m => m.state))], row.states, 'original appearance states changed');
    assert.equal(new Set(members.map(m => !!m.result)).size, 1, 'appearance group has mixed eligibility');
    if (!members[0].result) return row;
    const { classification, attribution, owner, justification, reviewEvidence } = members[0].result;
    return { ...row, classification, attribution, recommendedOwner: owner, justification, reviewEvidence,
      reviewedCases: members.map(m => m.case) };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href && process.argv[2] === '--appearance') {
  assert.equal(process.argv.length, 3);
  const previous = await readAudit('artifacts/material-parity/working-audit/0a6c0f6defafd4e27f0b93f3d4e732621a8f8a7d4807fc516f09c21270091296');
  assert.equal(previous.manifest.uncompressedSha256, '185cecca3e2dbd07000dcb8a952639fe4df39811b4e0833f9330ec91355ea18c');
  const current = await readAudit('docs');
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  console.log(JSON.stringify(compareAppearanceCanonical(previous, current, replayAppearanceRows(previous.rows, JSON.parse(bytes)),
    readFileSync('tests/material-parity/input-equivalence-audit.mjs')), null, 2));
} else if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const followupOnly = process.argv[2] === '--followup';
  const chipOnly = process.argv[2] === '--chip';
  const overlayOnly = process.argv[2] === '--overlay';
  const modalOnly = process.argv[2] === '--modal';
  const modalBoxOnly = process.argv[2] === '--modal-box';
  const sheetPanelOnly = process.argv[2] === '--sheet-panel';
  const sheetActionOnly = process.argv[2] === '--sheet-action';
  const dialogTabOnly = process.argv[2] === '--dialog-tab';
  assert.equal(process.argv.length, followupOnly || chipOnly || overlayOnly || modalOnly || modalBoxOnly || sheetPanelOnly || sheetActionOnly || dialogTabOnly ? 3 : 2);
  const previous = await readAudit(dialogTabOnly ? 'artifacts/material-parity/working-audit/ed33d97cd19daa01bdfa984abfaac85e5a5f1dafc6e31fa739400e58b14835e7'
    : sheetActionOnly ? 'artifacts/material-parity/working-audit/b05e2adcec67d05f5371246d6aa527df4f4528cfb75a2fcc5ed027da86ab9b9d'
    : sheetPanelOnly ? 'artifacts/material-parity/working-audit/78ed94a2e6c8ff322a344cfdd583f3aa65a94cf94d3c2f944b1de0c0a6807161'
    : modalBoxOnly ? 'artifacts/material-parity/working-audit/064777d79c6b85219285c85b97fb38edac27d069c8ddec67e0ae2da5b61099e5'
    : modalOnly ? 'artifacts/material-parity/working-audit/4601de6aeedf0595894e22de28052ee989a163320af4464337a69302c3a04aa2'
    : overlayOnly ? 'artifacts/material-parity/working-audit/d70aa37e4e14a9bfdc6183e0c2a7c383638d83050fc76b2d556a26b510691fa4'
    : chipOnly ? 'artifacts/material-parity/pre-chip-paint-2a35d34' : followupOnly
    ? 'artifacts/material-parity/pre-position-followup-509dbf4' : 'artifacts/material-parity/pre-position-e62e846');
  assert.equal(previous.manifest.uncompressedSha256, dialogTabOnly ? '185b07a93db39edb341e39af31476333e5facb3b0fba3a00df393f645352ef9c'
    : sheetActionOnly ? 'b1a7073b5c52fe2453580704afa678c1994c9201e01334031474148836c94ccc'
    : sheetPanelOnly ? '70918584660365c90dc8de69532c56304423283090175e3849b55c5224a19e4a'
    : modalBoxOnly ? '11bfe85672fb9a1a87db562d68b4eb1a2d6adb4349a55dc5ecb92675f230980a'
    : modalOnly ? '4ad34a695e2268a96a505d86af93bd396d897a5d996dd6dbf28b67a3199fb291'
    : overlayOnly ? '276bcd838575bcce26f06ab922eeacd880152c3585dee929f4635c778338767e'
    : chipOnly ? '0f8935c3a5a7b2b54195cb3402bb70cd357c33245aa5c9719e33a134ea64b1de' : followupOnly
    ? 'dd44f6b5597014617876fa21d8d144adf7451a3a17a4438c6f95384da6005d00'
    : '287ebb396d68ab064dca40a0c372879e8a0c3fd2c7f56498110577615bd430a2');
  const current = await readAudit('docs');
  let expected;
  if (modalOnly || modalBoxOnly || sheetPanelOnly || sheetActionOnly || dialogTabOnly) {
    const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
    const captured = JSON.parse(bytes);
    const cases = captured.interactions.filter(c => ['dialog', 'bottom-sheet'].includes(c.family) &&
      c.styleInputs.some(i => i.id === (c.family === 'dialog' ? 'dialog-copy' : 'bottom-sheet-panel')))
      .map(c => ({ ...c, kind: 'interaction' }));
    assert.equal(cases.filter(c => c.family === 'dialog').length, 32);
    assert.equal(cases.filter(c => c.family === 'bottom-sheet').length, 25);
    // Proofs retain indexed node/style/rule receipts. Preserve the production
    // inventory's original ordering even when replaying only modal semantics;
    // constructing a modal-only inventory renumbers otherwise identical proof
    // nodes and changes proofRowsSha256. Supplemental cases are appended after
    // this original population and cannot renumber its existing entries.
    const inventory = collectFullTreeInventory([
      ...captured.results.map(c => ({ ...c, kind: 'static' })),
      ...captured.interactions.map(c => ({ ...c, kind: 'interaction' })),
    ]);
    const normalize = bindPreciseAuditNormalization();
    if (dialogTabOnly) {
      const allCases = [...captured.results.map(c => ({ ...c, kind: 'static' })),
        ...captured.interactions.map(c => ({ ...c, kind: 'interaction' }))];
      expected = applyTabControlStage(applyDialogTextFlow(previous.rows, allCases, inventory, normalize), allCases, inventory, normalize);
    }
    else if (sheetActionOnly) expected = applyBottomSheetActionLayout(applyBottomSheetContrastCorners(previous.rows, cases, inventory, normalize), cases, inventory, normalize);
    else if (sheetPanelOnly) expected = applyBottomSheetPanelConstraints(applyBottomSheetPanelFlow(applyBottomSheetPanelPaint(previous.rows, cases, inventory, normalize), cases, inventory, normalize), cases, inventory, normalize);
    else if (modalBoxOnly) expected = applyDialogActionBox(applyDialogPanelConstraints(previous.rows, cases, inventory, normalize), cases, inventory, normalize);
    else {
      const control = collectControlTypographyEvidence(cases, inventory);
      const retained = collectRetainedTypographyEvidence(cases, inventory, control);
      expected = applyBottomSheetScalarTypography(applyDialogScalarTypography(previous.rows, cases, inventory, retained, control, normalize), cases, inventory, normalize);
    }
  } else {
    const review = overlayOnly ? await collectOverlaySurfaceReview() : chipOnly ? await collectChipPaintProposal() : followupOnly ? collectPositionFollowupReview() : collectPositionCompositionReview();
    expected = (overlayOnly ? applyOverlaySurfaceRows : chipOnly ? applyChipPaintRows : followupOnly ? applyPositionFollowupReview : applyPositionCompositionReview)(previous.rows, review);
    if (!chipOnly && !overlayOnly) (followupOnly ? validatePositionFollowupRows : validatePositionCompositionRows)(current.rows, review);
  }
  const previousSource = chipOnly || overlayOnly || modalOnly || modalBoxOnly || sheetPanelOnly || sheetActionOnly || dialogTabOnly ? execFileSync('git', ['show', `${dialogTabOnly ? 'c53bd80' : sheetActionOnly ? '1cd2b7e' : sheetPanelOnly ? '9b0ec36' : modalBoxOnly ? 'ed35a9c' : modalOnly ? '771e0a8' : overlayOnly ? '72f849a' : '2a35d34'}:tests/material-parity/input-equivalence-audit.mjs`], { maxBuffer: 4 * 1024 * 1024 }) : undefined;
  console.log(JSON.stringify(comparePositionCanonical(previous, current, expected,
    readFileSync('tests/material-parity/input-equivalence-audit.mjs'), { followupOnly, chipOnly, overlayOnly, modalOnly, modalBoxOnly, sheetPanelOnly, sheetActionOnly, dialogTabOnly, previousSource }), null, 2));
}
