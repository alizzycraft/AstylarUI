import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { comparePositionCanonical, compareAppearanceCanonical, compareBorderDefaultCanonical, refreshScalarControlReceipts } from '../../scripts/check-material-position-canonical-conservation.mjs';
import { restorePositionProducer, restoreAppearancePrecedence, restoreOriginMotionProducer, restoreNormalLineBoxScalarProducer, restoreRetainedFontScalarProducer, restoreToggleSideColorProducer, restoreMappedButtonResetProducer } from './position-composition-producer-transition.mjs';
import { positionCompositionAttribution } from './position-composition-review.mjs';
import { positionFollowupAttribution } from './position-followup-review.mjs';
import { restoreInteractiveWeightProducer, restoreModalPositionProducer, restoreControlPositionProducer } from './position-composition-producer-transition.mjs';
import { ownerInitialStyleAttribution } from './owner-initial-style-attribution.mjs';
import { retainedFontScalarAttribution } from './retained-font-scalar.mjs';
const currentSource = readFileSync('tests/material-parity/input-equivalence-audit.mjs');

for (const mode of ['defaults', 'dialog/card', 'weight', 'modal-position', 'control-position']) test(`scalar conservation (${mode}) rejects changed raw data, unrelated metadata and control values even with forged expected rows`, () => {
  const controlPosition = mode === 'control-position';
  const dialogCard = mode === 'dialog/card', weight = mode === 'weight', modalPosition = mode === 'modal-position';
  const transition = controlPosition ? restoreControlPositionProducer(currentSource) : modalPosition ? restoreModalPositionProducer(currentSource) : weight ? restoreInteractiveWeightProducer(currentSource) : dialogCard ? restoreMappedButtonResetProducer(currentSource) : restoreToggleSideColorProducer(currentSource), rows = [], expected = [];
  const compare = (p, c, e, s) => compareBorderDefaultCanonical(p, c, e, s, { dialogCard, weight, modalPosition, controlPosition });
  for (const [attribution, groups, observations] of controlPosition ? [
    ['reviewed-chip-position-request-omission', 2, 152], ['reviewed-chip-computed-offset-stage', 8, 608],
    ['reviewed-button-computed-offset-stage', 36, 2400],
  ] : modalPosition ? [
    ['reviewed-dialog-position-request-omission', 5, 160], ['reviewed-dialog-computed-offset-stage', 20, 640],
    ['reviewed-bottom-sheet-position-request-omission', 1, 25], ['reviewed-bottom-sheet-computed-offset-stage', 12, 300],
  ] : weight ? [
    [ownerInitialStyleAttribution, 20, 1142], [retainedFontScalarAttribution, 2, 136], ['reviewed-stage-mismatch', 4, 224],
  ] : dialogCard ? [
    ['reviewed-material-card-border-token-omission', 8, 416],
    ['reviewed-mapped-border-initial-color-divergence', 7, 224],
    ['reviewed-mapped-material-button-border-reset-omission', 8, 256],
  ] : [
    ['reviewed-border-initial-color-divergence', 12, 336],
    ['reviewed-slider-native-border-default-policy', 16, 624],
    ['reviewed-material-outline-token-substitution', 3, 204],
    ['reviewed-mapped-border-initial-color-divergence', 52, 1432],
  ]) for (let i = 0; i < groups; i++) {
    const before = { family: dialogCard ? (attribution.includes('card') ? 'card' : 'dialog') : 'test', element: `${attribution}-${i}`, property: 'borderTopColor',
      reference: 'black', astylar: 'transparent', occurrences: i ? 1 : observations - groups + 1,
      cases: ['original'], attribution: 'unresolved', classification: 'pending' };
    if (weight) {
      before.property = 'fontWeight'; before.reference = attribution === retainedFontScalarAttribution ? '500' : '400';
      delete before.astylar;
      before.family = attribution === retainedFontScalarAttribution ? 'button-toggle' : 'checkbox';
      if (attribution === retainedFontScalarAttribution) before.element = i ? 'button-toggle-two' : 'button-toggle-one';
    }
    if (modalPosition) {
      before.family = attribution.includes('bottom-sheet') ? 'bottom-sheet' : 'dialog';
      before.property = attribution.includes('request-omission') ? 'position' : ['top', 'right', 'bottom', 'left'][i % 4];
      before.reference = before.property === 'position' ? 'relative' : '0';
      before.occurrences = before.family === 'dialog' ? 32 : 25; delete before.astylar;
    }
    if (controlPosition) {
      const chips = attribution.includes('chip');
      const owners = [['button-primary', 60], ['button-secondary', 60], ['button-disabled', 60],
        ['card-open', 52], ['menu-primary', 94], ['bottom-sheet-primary', 63],
        ['dialog-primary', 78], ['snack-bar-primary', 71], ['tooltip-primary', 62]];
      before.family = chips ? 'chips' : owners[Math.floor(i / 4)][0].replace(/-(primary|secondary|disabled|open)$/, '');
      before.property = attribution.includes('request-omission') ? 'position' : ['top', 'right', 'bottom', 'left'][i % 4];
      before.element = chips ? `chip-${before.property === 'position' ? i : Math.floor(i / 4)}` : owners[Math.floor(i / 4)][0];
      before.occurrences = chips ? 76 : owners[Math.floor(i / 4)][1];
      before.reference = before.property === 'position' ? 'relative' : '0'; delete before.astylar;
    }
    rows.push(before); expected.push({ ...before, attribution,
      classification: modalPosition || controlPosition ? (before.property === 'position' ? 'application-plugin-authoring-defect' : 'parity-harness-defect') : weight ? (attribution === retainedFontScalarAttribution ? 'application-plugin-authoring-defect' : 'parity-harness-defect') : 'reviewed',
      ...(weight || modalPosition || controlPosition ? { reviewEvidence: { renderingEquivalent: false, inputEquivalent: false,
        currentPseudoStatePaintVerified: false, computedCandidateVerified: false } } : {}) });
  }
  const controls = Array.from({ length: 48 }, (_, i) => ({ case: `case-${i}`, element: 'button', property: 'lineHeight',
    attribution: 'reviewed-interactive-normal-line-box-stage-comparison', values: { painted: '19px' },
    reviewEvidence: { observation: { normalizationReconciliation: { currentModuleSha256: transition.previousModuleSha256 } } } }));
  const previous = { rows, control: { differences: controls } };
  const current = { rows: structuredClone(expected), control: structuredClone(previous.control) };
  for (const c of current.control.differences)
    c.reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = transition.currentModuleSha256;
  assert.equal(compare(previous, current, expected, currentSource).changedGroups, controlPosition ? 46 : modalPosition ? 38 : weight ? 26 : dialogCard ? 23 : 83);
  for (const mutate of [
    r => { r.reference = 'forged'; }, r => { r.cases = ['forged']; },
    r => { r.occurrences++; }, r => { r.property = 'fontSize'; },
    r => { r.attribution = 'unreviewed'; },
    ...(weight || modalPosition || controlPosition ? [r => { r.reviewEvidence.renderingEquivalent = true; }, r => { r.classification = 'equivalent'; }] : []),
  ]) {
    const changed = structuredClone(current), forged = structuredClone(expected);
    mutate(changed.rows[0]); mutate(forged[0]);
    assert.throws(() => compare(previous, changed, forged, currentSource));
  }
  for (const mutate of [
    c => { c.control.differences[0].values.painted = '20px'; },
    c => { c.control.differences.pop(); },
    c => { c.rows.reverse(); }, c => { c.rows.pop(); },
  ]) {
    const changed = structuredClone(current); mutate(changed);
    assert.throws(() => compare(previous, changed, expected, currentSource));
  }
  const changed = structuredClone(current); changed.rows[0].justification = 'unreplayed metadata';
  assert.throws(() => compare(previous, changed, expected, currentSource));
  assert.throws(() => compare(previous, current, expected, currentSource + '\n// changed'));
});

test('embedded scalar control receipts follow only exact producer transitions', () => {
  const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const transition = { previousModuleSha256: 'old', currentModuleSha256: 'new' };
  const before = { case: 'case', element: 'button', property: 'lineHeight',
    attribution: 'reviewed-interactive-normal-line-box-stage-comparison', values: { painted: '19px' },
    reviewEvidence: { observation: { normalizationReconciliation: { currentModuleSha256: 'old' } } } };
  const after = structuredClone(before);
  after.reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = 'new';
  const rows = [{ element: 'button', attribution: 'reviewed-button-host-normal-line-box-stage',
    reviewEvidence: { proofs: [{ case: 'case', controlProofSha256: hash(before) }] } }];
  const refreshed = refreshScalarControlReceipts(rows, { differences: [before] }, { differences: [after] }, transition);
  assert.equal(refreshed[0].reviewEvidence.proofs[0].controlProofSha256, hash(after));
  assert.equal(rows[0].reviewEvidence.proofs[0].controlProofSha256, hash(before));
  for (const mutate of [
    d => { d.values.painted = '20px'; },
    d => { d.reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = 'forged'; },
  ]) {
    const changed = structuredClone(after); mutate(changed);
    assert.throws(() => refreshScalarControlReceipts(rows, { differences: [before] }, { differences: [changed] }, transition));
  }
  const forged = structuredClone(rows); forged[0].reviewEvidence.proofs[0].controlProofSha256 = 'forged';
  assert.deepEqual(refreshScalarControlReceipts(forged, { differences: [before] }, { differences: [after] }, transition), forged);
  const wrongOwner = structuredClone(rows); wrongOwner[0].element = 'other';
  assert.throws(() => refreshScalarControlReceipts(wrongOwner, { differences: [before] }, { differences: [after] }, transition));
});

test('font and sidenav batch conserves values, membership and unrelated records', () => {
  const make = () => {
    const transition = restoreRetainedFontScalarProducer(currentSource);
    const rows = Array.from({ length: 14 }, (_, i) => {
      const font = i < 10, occurrences = font ? (i === 0 ? 65 : 61) : (i < 12 ? 16 : 15);
      return { family: font ? 'fixture' : 'sidenav', element: font ? `owner-${i}` : 'sidenav-primary',
        property: font ? 'fontFamily' : 'backgroundColor', reference: font ? 'roboto' : 'rgba(254,248,252,1)',
        ...(font ? {} : { astylar: `candidate-${i}` }), attribution: 'unresolved', occurrences,
        cases: Array.from({ length: 12 }, (_, j) => `case-${j}`) };
    });
    rows.push({ attribution: 'unresolved', property: 'width', occurrences: 1 });
    const previous = { rows, control: { differences: Array.from({ length: 48 }, (_, i) => ({ case: `control-${i}`,
      attribution: 'reviewed-interactive-normal-line-box-stage-comparison',
      reviewEvidence: { observation: { normalizationReconciliation: { currentModuleSha256: transition.previousModuleSha256 } } } })), gaps: [] } };
    const current = structuredClone(previous);
    for (const row of current.control.differences) row.reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = transition.currentModuleSha256;
    current.rows = current.rows.map((r, i) => i === 14 ? r : ({ ...r, classification: 'application-plugin-authoring-defect',
      attribution: i < 10 ? 'reviewed-scalar-component-font-omission' : 'reviewed-sidenav-background-token-input',
      reviewEvidence: { inputEquivalent: false, renderingEquivalent: false,
        proofs: Array.from({ length: r.occurrences }, (_, j) => ({ case: `case-${j}` })) } }));
    const proofHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
    const scalar = { attribution: 'reviewed-button-host-normal-line-box-stage', property: 'lineHeight',
      reviewEvidence: { proofs: [{ case: 'control-0', controlProofSha256: proofHash(previous.control.differences[0]) }] } };
    previous.rows.push(scalar);
    const refreshed = structuredClone(scalar);
    refreshed.reviewEvidence.proofs[0].controlProofSha256 = proofHash(current.control.differences[0]);
    current.rows.push(refreshed);
    const expected = structuredClone(current.rows);
    expected[15] = structuredClone(scalar);
    return [previous, current, expected, currentSource, { fontSidenav: true }];
  };
  const result = compareAppearanceCanonical(...make());
  assert.equal(result.changedGroups, 14); assert.equal(result.changedOccurrences, 676);
  assert.equal(result.unchangedCompleteRows, 1);
  assert.equal(result.scalarReceiptRows, 1);
  for (const mutate of [
    a => { a[1].rows[0].reference = a[2][0].reference = 'arial'; },
    a => { a[1].rows[10].astylar = a[2][10].astylar = 'changed'; },
    a => { a[1].rows[0].reviewEvidence.inputEquivalent = a[2][0].reviewEvidence.inputEquivalent = true; },
    a => { a[1].rows[0].reviewEvidence.proofs.pop(); a[2] = structuredClone(a[1].rows); },
    a => { a[1].rows[10].family = a[2][10].family = 'dialog'; },
    a => { a[1].rows[14].occurrences = a[2][14].occurrences = 2; },
    a => { a[1].control.gaps.push('changed'); },
    a => { a[1].control.differences.pop(); },
    a => { a[1].rows[15].reviewEvidence.proofs[0].controlProofSha256 = 'forged'; },
    a => { a[1].rows[15].reference = a[2][15].reference = 'forged'; },
  ]) { const args = make(); mutate(args); assert.throws(() => compareAppearanceCanonical(...args)); }
});
test('appearance batch conserves raw inputs, exclusions and controls independently of expected metadata', () => {
  const make = (colorMotion = false, originMotion = false, lineBox = false) => {
    const count = lineBox ? 12 : originMotion ? 36 : colorMotion ? 51 : 34;
    const rows = Array.from({ length: count }, (_, i) => {
      const occurrences = lineBox ? (i === 0 ? 56 : 60) : originMotion ? (i === 0 ? 39 : 19) : colorMotion ? (i < 46 ? 26 : i === 50 ? 48 : 46) : i === 0 ? 83 : 64;
      return { family: 'fixture', element: `owner-${i}`, property: lineBox ? 'lineHeight' : originMotion ? 'transformOrigin' : colorMotion && i < 46 ? 'color' : 'appearance',
        reference: lineBox ? 'normal' : originMotion ? '10px 10px' : colorMotion && i < 46 ? 'rgba(29,27,32,1)' : 'none',
        occurrences, cases: Array.from({ length: 12 }, (_, j) => `case-${j}`), attribution: 'unresolved' };
    });
    rows.push({ family: 'slider', element: 'range', property: 'appearance', reference: 'auto', occurrences: 156, attribution: 'unresolved' });
    const transition = lineBox ? restoreNormalLineBoxScalarProducer(currentSource) : originMotion ? restoreOriginMotionProducer(currentSource) : restoreAppearancePrecedence(currentSource);
    if (colorMotion) transition.previousModuleSha256 = 'cc05565c29174a385ee16c14a507d351b06d14730da88f0ba4e454af68c2746e';
    const previous = { rows, control: { differences: Array.from({ length: 48 }, (_, i) => ({
      case: `case-${i}`, attribution: 'reviewed-interactive-normal-line-box-stage-comparison',
      reviewEvidence: { observation: { normalizationReconciliation: {
        currentModuleSha256: transition.previousModuleSha256, value: 19 } } },
    })), gaps: [] } };
    const current = structuredClone(previous);
    for (const row of current.control.differences)
      row.reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = transition.currentModuleSha256;
    current.rows = current.rows.map((r, i) => i === count ? r : { ...r,
      attribution: lineBox ? 'reviewed-button-host-normal-line-box-stage' : originMotion ? 'reviewed-origin-declaration-stage' : 'reviewed-owner-initial-style-observation-stage', classification: 'parity-harness-defect',
      reviewEvidence: lineBox ? {inputEquivalent:false,finalRasterVerified:false,proofs:Array.from({length:r.occurrences},(_,j)=>({case:`case-${j}`}))} : originMotion ? { candidateComputedOriginVerified: false, finalRasterVerified: false,
        motionReview: { disposition: 'captured-origin-motion-targets-disjoint' } } : { computedCandidateVerified: false, renderingEquivalent: false },
      reviewedCases: Array.from({ length: r.occurrences }, (_, j) => `case-${j}`) });
    return [previous, current, structuredClone(current.rows), currentSource, {colorMotion, originMotion, lineBox}];
  };
  const args = make();
  const lineBox = compareAppearanceCanonical(...make(false,false,true));
  assert.equal(lineBox.changedGroups,12);assert.equal(lineBox.changedOccurrences,716);
  for(const mutate of [
    a=>{a[1].rows[0].reference=a[2][0].reference='18px';},
    a=>{a[1].rows[0].reviewEvidence.inputEquivalent=a[2][0].reviewEvidence.inputEquivalent=true;},
    a=>{a[1].rows[0].reviewEvidence.proofs.pop();a[2][0].reviewEvidence.proofs.pop();},
    a=>{a[1].rows[0].reviewEvidence.proofs[1].case=a[2][0].reviewEvidence.proofs[1].case='case-0';},
    a=>{a[1].control.gaps.push('unrelated');},
    a=>{a[1].control.differences[0].reviewEvidence.observation.normalizationReconciliation.value++;},
    a=>{a[4].originMotion=true;},
  ]){const altered=make(false,false,true);mutate(altered);assert.throws(()=>compareAppearanceCanonical(...altered));}
  assert.equal(compareAppearanceCanonical(...args).changedGroups, 34);
  for (const mutate of [
    a => { a[1].rows[0].reference = a[2][0].reference = 'jointly forged'; },
    a => { a[1].rows[0].astylar = a[2][0].astylar = 'none'; },
    a => { a[1].rows.pop(); a[2].pop(); },
    a => { a[1].rows[34].attribution = a[2][34].attribution = 'reviewed-owner-initial-style-observation-stage'; },
    a => { a[1].rows[0].reviewedCases.pop(); a[2][0].reviewedCases.pop(); },
    a => { a[1].control.gaps.push('unrelated'); },
    a => { a[1].control.differences[0].reviewEvidence.observation.normalizationReconciliation.value++; },
    a => { a[1].control.differences[0].reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = 'forged'; },
    a => { a[1].control.differences.pop(); },
    a => { a[3] = Buffer.from(a[3] + '\nconst unrelated = true;'); },
    a => { a[1].rows[0].reviewEvidence.renderingEquivalent = a[2][0].reviewEvidence.renderingEquivalent = true; },
  ]) { const changed = make(); mutate(changed); assert.throws(() => compareAppearanceCanonical(...changed)); }
  const batch = compareAppearanceCanonical(...make(true));
  assert.equal(batch.changedGroups, 51); assert.equal(batch.changedOccurrences, 1428);
  for (const mutate of [
    a => {a[1].rows[0].reference = a[2][0].reference = 'red';},
    a => {a[1].rows[0].property = a[2][0].property = 'background';},
    a => {a[1].rows[51].attribution = a[2][51].attribution = 'reviewed-owner-initial-style-observation-stage';},
    a => {a[1].control.differences[0].reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = 'forged';},
    a => {a[1].rows[0].reviewedCases.pop(); a[2][0].reviewedCases.pop();},
    a => {a[1].rows[0].reviewEvidence.renderingEquivalent = a[2][0].reviewEvidence.renderingEquivalent = true;},
  ]) {const changed = make(true); mutate(changed); assert.throws(() => compareAppearanceCanonical(...changed));}
  const origin = compareAppearanceCanonical(...make(false, true));
  assert.equal(origin.changedGroups, 36); assert.equal(origin.changedOccurrences, 704);
  for (const mutate of [
    a => { a[1].rows[0].reference = a[2][0].reference = 'jointly forged'; },
    a => { a[1].rows[0].astylar = a[2][0].astylar = '50% 50%'; },
    a => { a[1].rows[0].reviewEvidence.finalRasterVerified = a[2][0].reviewEvidence.finalRasterVerified = true; },
    a => { a[1].rows[0].reviewEvidence.motionReview.disposition = a[2][0].reviewEvidence.motionReview.disposition = 'invented'; },
    a => { a[1].rows[0].reviewedCases.pop(); a[2][0].reviewedCases.pop(); },
    a => { a[1].control.gaps.push('unrelated'); },
    a => { a[1].control.differences[0].reviewEvidence.observation.normalizationReconciliation.value++; },
    a => { a[4].colorMotion = true; },
  ]) { const changed = make(false, true); mutate(changed); assert.throws(() => compareAppearanceCanonical(...changed)); }
});
function sample(followupOnly = false) {
  const proof = restorePositionProducer(currentSource, { followupOnly });
  const previous = { rows: Array.from({ length: followupOnly ? 14 : 6 }, (_, i) => ({ family: 'fixture', element: `owner-${i}`,
    occurrences: followupOnly ? (i === 0 ? 53 : 55) : (i === 0 ? 56 : 52), attribution: 'unresolved', reference: 'static' })),
    control: { comparisons: [{ text: 'retained' }], gaps: [], differences: Array.from({ length: 48 }, (_, i) => ({
      case: `case-${i}`, attribution: 'reviewed-interactive-normal-line-box-stage-comparison',
      reviewEvidence: { observation: { normalizationReconciliation: { currentModuleSha256: proof.previousModuleSha256, value: 19 } } },
    })) } };
  const current = structuredClone(previous);
  for (const row of current.rows) row.attribution = followupOnly ? positionFollowupAttribution : positionCompositionAttribution;
  for (const row of current.control.differences) row.reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = proof.currentModuleSha256;
  return [previous, current, structuredClone(current.rows), currentSource, { followupOnly }];
}

test('dialog/tab batch permits exactly nineteen reviews and rejects joint raw-input forgery', () => {
  const make = () => {
    const [previous, current] = sample();
    const previousSource = execFileSync('git', ['show', 'c53bd80:tests/material-parity/input-equivalence-audit.mjs'], { maxBuffer: 4 * 1024 * 1024 });
    previous.rows = Array.from({ length: 19 }, (_, i) => ({ family: i < 9 ? 'dialog' : 'tabs',
      element: `owner-${i}`, occurrences: i < 9 ? 32 : 42, attribution: 'unresolved', reference: 'original' }));
    current.rows = previous.rows.map((row, i) => ({ ...row, attribution: i < 9
      ? 'reviewed-dialog-text-flow-inputs' : 'reviewed-tab-control-stage' }));
    const oldHash = createHash('sha256').update(previousSource.toString('utf8').replaceAll('\r\n', '\n')).digest('hex');
    for (const row of previous.control.differences) row.reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = oldHash;
    return [previous, current, structuredClone(current.rows), currentSource, { dialogTabOnly: true, previousSource }];
  };
  const args = make(), before = structuredClone(args.slice(0, 3));
  const result = comparePositionCanonical(...args);
  assert.equal(result.changedGroups, 19); assert.equal(result.changedOccurrences, 708);
  assert.equal(result.controlReceiptTransition.records, 48);
  assert.deepEqual(args.slice(0, 3), before);
  for (const mutate of [
    ([, c]) => c.rows.pop(),
    a => { a[1].rows[0].reference = a[2][0].reference = 'jointly forged'; },
    a => { a[1].rows[0].astylar = a[2][0].astylar = 'invented default'; },
    ([, c]) => c.control.gaps.push({ reason: 'unrelated' }),
    ([, c]) => { c.control.differences[0].reviewEvidence.observation.normalizationReconciliation.value++; },
    a => { a[4].previousSource = currentSource; },
    a => { a[4].sheetActionOnly = true; },
  ]) { const changed = make(); mutate(changed); assert.throws(() => comparePositionCanonical(...changed)); }
});

function chipSample() {
  const args = sample(), [previous, current] = args;
  const previousSource = execFileSync('git', ['show', '2a35d34:tests/material-parity/input-equivalence-audit.mjs'], { maxBuffer: 4 * 1024 * 1024 });
  previous.rows = Array.from({ length: 10 }, (_, i) => ({ family: 'chips', element: `chip-${i}`,
    occurrences: i === 0 ? 5 : 3, attribution: 'unresolved', reference: 'rgba(0,0,0,0)' }));
  current.rows = previous.rows.map(row => ({ ...row, attribution: 'reviewed-chip-state-layer-substitution' }));
  const oldHash = createHash('sha256').update(previousSource.toString('utf8').replaceAll('\r\n', '\n')).digest('hex');
  for (const row of previous.control.differences) row.reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = oldHash;
  return [previous, current, structuredClone(current.rows), currentSource, { chipOnly: true, previousSource }];
}

function overlaySample() {
  const [previous, current] = sample();
  const previousSource = execFileSync('git', ['show', '72f849a:tests/material-parity/input-equivalence-audit.mjs'], { maxBuffer: 4 * 1024 * 1024 });
  previous.rows = Array.from({ length: 13 }, (_, i) => ({ family: i < 8 ? 'snack-bar' : 'tooltip', element: `surface-${i}`,
    occurrences: i < 8 ? 34 : [16, 2, 18, 18, 18][i - 8], attribution: 'unresolved', reference: 'original' }));
  current.rows = previous.rows.map((row, i) => ({ ...row, attribution: i < 8
    ? 'reviewed-snackbar-surface-input-substitution' : 'reviewed-tooltip-sizing-constraint-omission' }));
  const oldHash = createHash('sha256').update(previousSource.toString('utf8').replaceAll('\r\n', '\n')).digest('hex');
  for (const row of previous.control.differences) row.reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = oldHash;
  return [previous, current, structuredClone(current.rows), currentSource, { overlayOnly: true, previousSource }];
}

test('overlay batch conserves thirteen groups and rejects unrelated row or producer changes', () => {
  const args = overlaySample(), before = structuredClone(args.slice(0, 3));
  const result = comparePositionCanonical(...args);
  assert.equal(result.changedGroups, 13); assert.equal(result.changedOccurrences, 344);
  assert.equal(result.controlReceiptTransition.records, 48);
  assert.deepEqual(args.slice(0, 3), before);
  for (const mutate of [
    ([, c]) => c.rows.pop(), ([, c]) => { c.rows[0].reference = 'changed'; },
    ([, c]) => c.control.gaps.push({ reason: 'unrelated' }),
    ([, c]) => { c.control.differences[0].reviewEvidence.observation.normalizationReconciliation.value++; },
    a => { a[4].previousSource = Buffer.from(a[4].previousSource + '\nconst unrelated = true;'); },
    a => { a[4].previousSource = currentSource; }, a => { a[4].chipOnly = true; },
  ]) { const changed = overlaySample(); mutate(changed); assert.throws(() => comparePositionCanonical(...changed)); }
});

test('modal batch conserves twenty-four groups and independent predecessor receipts', () => {
  const make = () => {
    const [previous, current] = sample();
    const previousSource = execFileSync('git', ['show', '771e0a8:tests/material-parity/input-equivalence-audit.mjs'], { maxBuffer: 4 * 1024 * 1024 });
    previous.rows = Array.from({ length: 24 }, (_, i) => ({ family: i < 9 ? 'dialog' : 'bottom-sheet',
      element: `owner-${i}`, occurrences: i < 9 ? 32 : 20, attribution: 'unresolved', reference: 'original' }));
    current.rows = previous.rows.map((row, i) => ({ ...row, attribution: i < 9
      ? 'reviewed-dialog-scalar-typography-owner' : 'reviewed-bottom-sheet-scalar-typography-owner' }));
    const oldHash = createHash('sha256').update(previousSource.toString('utf8').replaceAll('\r\n', '\n')).digest('hex');
    for (const row of previous.control.differences) row.reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = oldHash;
    return [previous, current, structuredClone(current.rows), currentSource, { modalOnly: true, previousSource }];
  };
  const args = make(), before = structuredClone(args.slice(0, 3));
  const result = comparePositionCanonical(...args);
  assert.equal(result.changedGroups, 24); assert.equal(result.changedOccurrences, 588);
  assert.equal(result.controlReceiptTransition.records, 48);
  assert.deepEqual(args.slice(0, 3), before);
  const omitted = make();
  omitted[1].rows[0].reviewEvidence = { observations: [{ reference: 'original' }] };
  omitted[2][0].reviewEvidence = { observations: [{ reference: 'original', astylar: undefined }] };
  assert.equal(comparePositionCanonical(...omitted).changedGroups, 24);
  assert.ok(Object.hasOwn(omitted[2][0].reviewEvidence.observations[0], 'astylar'));
  for (const value of [null, 0, '', 'default']) {
    omitted[2][0].reviewEvidence.observations[0].astylar = value;
    assert.throws(() => comparePositionCanonical(...omitted));
  }
  for (const mutate of [
    ([, c]) => c.rows.pop(), ([, c]) => { c.rows[0].reference = 'changed'; },
    ([, c]) => c.control.gaps.push({ reason: 'unrelated' }),
    ([, c]) => { c.control.differences[0].reviewEvidence.observation.normalizationReconciliation.value++; },
    a => { a[4].previousSource = Buffer.from(a[4].previousSource + '\nconst unrelated = true;'); },
    a => { a[4].previousSource = currentSource; }, a => { a[4].overlayOnly = true; },
    a => { a[2][0].reference = 'forged expected input'; },
    a => { a[1].rows[0].reference = a[2][0].reference = 'jointly forged input'; },
  ]) { const changed = make(); mutate(changed); assert.throws(() => comparePositionCanonical(...changed)); }
});

test('modal box batch conserves twelve groups and rejects raw or unrelated mutations', () => {
  const make = () => {
    const [previous, current] = sample();
    const previousSource = execFileSync('git', ['show', 'ed35a9c:tests/material-parity/input-equivalence-audit.mjs'], { maxBuffer: 4 * 1024 * 1024 });
    previous.rows = Array.from({ length: 12 }, (_, i) => ({ family: 'dialog', element: i < 6 ? 'dialog-actions' : 'dialog-panel',
      property: `property-${i}`, reference: 'original', occurrences: 32, attribution: 'unresolved' }));
    current.rows = previous.rows.map((row, i) => ({ ...row, attribution: i < 6
      ? 'reviewed-dialog-action-box-substitution' : 'reviewed-dialog-panel-constraint-omission' }));
    const oldHash = createHash('sha256').update(previousSource.toString('utf8').replaceAll('\r\n', '\n')).digest('hex');
    for (const row of previous.control.differences) row.reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = oldHash;
    return [previous, current, structuredClone(current.rows), currentSource, { modalBoxOnly: true, previousSource }];
  };
  const args = make(), before = structuredClone(args.slice(0, 3));
  const result = comparePositionCanonical(...args);
  assert.equal(result.changedGroups, 12); assert.equal(result.changedOccurrences, 384);
  assert.equal(result.controlReceiptTransition.records, 48); assert.deepEqual(args.slice(0, 3), before);
  for (const mutate of [
    ([, c]) => c.rows.pop(), ([, c]) => { c.rows[0].reference = 'changed'; },
    a => { a[1].rows[0].reference = a[2][0].reference = 'jointly forged'; },
    ([, c]) => c.control.gaps.push({ reason: 'unrelated' }),
    a => { a[4].modalOnly = true; }, a => { a[4].previousSource = currentSource; },
  ]) { const altered = make(); mutate(altered); assert.throws(() => comparePositionCanonical(...altered)); }
});

test('sheet action batch conserves eighteen groups and leaves normalized-radius questions unresolved', () => {
  const make = () => {
    const [previous, current] = sample();
    const previousSource = execFileSync('git', ['show', '1cd2b7e:tests/material-parity/input-equivalence-audit.mjs'], { maxBuffer: 4 * 1024 * 1024 });
    previous.rows = Array.from({ length: 19 }, (_, i) => ({ family: 'bottom-sheet', element: 'bottom-sheet-copy',
      property: `property-${i}`, reference: 'original', occurrences: i < 10 ? 25 : 6, attribution: 'unresolved' }));
    current.rows = previous.rows.map((row, i) => i === 18 ? structuredClone(row) : { ...row, attribution: i < 10
      ? 'reviewed-bottom-sheet-action-layout-substitution' : 'reviewed-bottom-sheet-contrast-corner-substitution' });
    const oldHash = createHash('sha256').update(previousSource.toString('utf8').replaceAll('\r\n', '\n')).digest('hex');
    for (const row of previous.control.differences) row.reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = oldHash;
    return [previous, current, structuredClone(current.rows), currentSource, { sheetActionOnly: true, previousSource }];
  };
  const args = make(), before = structuredClone(args.slice(0, 3));
  const result = comparePositionCanonical(...args);
  assert.equal(result.changedGroups, 18); assert.equal(result.changedOccurrences, 298);
  assert.equal(result.unchangedCompleteRows, 1); assert.equal(result.currentUnresolved, 1);
  assert.equal(result.controlReceiptTransition.records, 48); assert.deepEqual(args.slice(0, 3), before);
  for (const mutate of [
    ([, c]) => c.rows.pop(), ([, c]) => { c.rows[0].reference = 'changed'; },
    a => { a[1].rows[0].reference = a[2][0].reference = 'jointly forged'; },
    a => { a[1].rows[0].astylar = a[2][0].astylar = 'invented default'; },
    a => { a[1].rows[18].attribution = a[2][18].attribution = 'reviewed-bottom-sheet-contrast-corner-substitution'; },
    ([, c]) => c.control.gaps.push({ reason: 'unrelated' }),
    ([, c]) => { c.control.differences[0].reviewEvidence.observation.normalizationReconciliation.value++; },
    a => { a[4].sheetPanelOnly = true; }, a => { a[4].previousSource = currentSource; },
    a => { a[4].previousSource = Buffer.from(a[4].previousSource + '\nconst unrelated = true;'); },
  ]) { const altered = make(); mutate(altered); assert.throws(() => comparePositionCanonical(...altered)); }
});

test('sheet panel batch conserves seventeen groups and rejects raw, unrelated and receipt mutations', () => {
  const make = () => {
    const [previous, current] = sample();
    const previousSource = execFileSync('git', ['show', '9b0ec36:tests/material-parity/input-equivalence-audit.mjs'], { maxBuffer: 4 * 1024 * 1024 });
    const occurrences = [25, 24, 1, 24, 24, 1, 25, 25, 25, 25, 25, 25, 6, 6, 6, 6, 6];
    previous.rows = occurrences.map((count, i) => ({ family: 'bottom-sheet', element: 'bottom-sheet-panel',
      property: `property-${i}`, reference: 'original', occurrences: count, attribution: 'unresolved' }));
    current.rows = previous.rows.map((row, i) => ({ ...row, attribution: i < 8
      ? 'reviewed-bottom-sheet-panel-constraint-omission' : i < 12
        ? 'reviewed-bottom-sheet-panel-flow-substitution' : 'reviewed-bottom-sheet-panel-paint-inputs' }));
    const oldHash = createHash('sha256').update(previousSource.toString('utf8').replaceAll('\r\n', '\n')).digest('hex');
    for (const row of previous.control.differences) row.reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = oldHash;
    return [previous, current, structuredClone(current.rows), currentSource, { sheetPanelOnly: true, previousSource }];
  };
  const args = make(), before = structuredClone(args.slice(0, 3));
  const result = comparePositionCanonical(...args);
  assert.equal(result.changedGroups, 17); assert.equal(result.changedOccurrences, 279);
  assert.equal(result.controlReceiptTransition.records, 48); assert.deepEqual(args.slice(0, 3), before);
  for (const mutate of [
    ([, c]) => c.rows.pop(), ([, c]) => { c.rows[0].reference = 'changed'; },
    a => { a[1].rows[0].reference = a[2][0].reference = 'jointly forged'; },
    a => { a[1].rows[0].astylar = a[2][0].astylar = 'invented default'; },
    ([, c]) => c.control.gaps.push({ reason: 'unrelated' }),
    ([, c]) => { c.control.differences[0].reviewEvidence.observation.normalizationReconciliation.value++; },
    a => { a[4].modalBoxOnly = true; }, a => { a[4].previousSource = currentSource; },
    a => { a[4].previousSource = Buffer.from(a[4].previousSource + '\nconst unrelated = true;'); },
  ]) { const altered = make(); mutate(altered); assert.throws(() => comparePositionCanonical(...altered)); }
});

test('chip comparison reuses strict row and 48 control-receipt conservation', () => {
  const args = chipSample(), original = structuredClone(args.slice(0, 3));
  const result = comparePositionCanonical(...args);
  assert.equal(result.changedGroups, 10); assert.equal(result.changedOccurrences, 32);
  assert.equal(result.controlReceiptTransition.records, 48);
  assert.deepEqual(args.slice(0, 3), original);
  for (const mutate of [
    ([, c]) => c.rows.pop(),
    ([, c]) => { c.rows[0].reference = 'changed'; },
    ([, c]) => c.control.gaps.push({ reason: 'unrelated' }),
    ([, c]) => { c.control.differences[0].reviewEvidence.observation.normalizationReconciliation.value++; },
    a => { a[4].previousSource = Buffer.from(a[4].previousSource + '\nconst unreviewed = true;'); },
    a => { a[4].previousSource = currentSource; },
    a => { a[4].followupOnly = true; },
  ]) { const changed = chipSample(); mutate(changed); assert.throws(() => comparePositionCanonical(...changed)); }
});

test('followup comparison isolates fourteen classifications against the six-group predecessor', () => {
  const args = sample(true), before = structuredClone(args.slice(0, 3));
  const result = comparePositionCanonical(...args);
  assert.equal(result.changedGroups, 14); assert.equal(result.changedOccurrences, 768);
  assert.equal(result.controlReceiptTransition.records, 48);
  assert.deepEqual(args.slice(0, 3), before);
  assert.throws(() => comparePositionCanonical(...args.slice(0, 4)));
});
test('position comparison isolates six classifications and producer-receipt updates without mutation', () => {
  const args = sample(), before = structuredClone(args.slice(0, 3));
  const result = comparePositionCanonical(...args);
  assert.equal(result.changedGroups, 6); assert.equal(result.changedOccurrences, 316);
  assert.equal(result.controlReceiptTransition.records, 48);
  assert.deepEqual(args.slice(0, 3), before);
});
test('position comparison rejects lost or changed evidence and forged source receipts', () => {
  for (const mutate of [
    ([, c]) => c.rows.pop(), ([, c]) => c.rows.reverse(),
    ([, c]) => { c.rows[0].reference = 'absolute'; },
    ([, c]) => c.control.gaps.push({ reason: 'new' }),
    ([, c]) => { c.control.comparisons[0].text = 'changed'; },
    ([, c]) => c.control.differences.pop(), ([, c]) => c.control.differences.reverse(),
    ([, c]) => { c.control.differences[0].reviewEvidence.observation.normalizationReconciliation.value = 20; },
    ([, c]) => { c.control.differences[0].reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = 'forged'; },
    ([, c]) => { c.control.differences[1].case = 'case-0'; },
  ]) for (const followupOnly of [false, true]) {
    const args = sample(followupOnly); mutate(args); assert.throws(() => comparePositionCanonical(...args));
  }
});
