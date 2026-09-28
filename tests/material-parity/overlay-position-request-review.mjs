import assert from 'node:assert/strict';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { applyModalBoxReview } from './modal-position-inspection.mjs';
import { applySliderPositionReviews } from './slider-position-request-review.mjs';
import { applyGridOffsetReviews } from './grid-position-request-review.mjs';
import { applyComponentCaretReviews, isComponentCaretReviewRow } from '../../scripts/audit-material-overlay-caret-context.mjs';
import { proveSnackbarPositionRequests } from './snackbar-position-observation.mjs';

export function proveOverlayFlowRequests(entry, reference, candidate) {
  const sheet = entry.family === 'bottom-sheet';
  assert.ok(sheet || entry.family === 'snack-bar');
  const element = entry.family + '-overlay';
  const position = sheet ? proveOverlayPositionRequests(entry, reference, candidate, element)
    : proveSnackbarPositionRequests(entry, reference, candidate);
  const r = reference.nodes.find(n => n.key === position.referenceNode), a = candidate.nodes.find(n => n.key === position.astylarNode);
  const input = entry.styleInputs.find(i => i.id === element);
  const relevant = key => /^(flexdirection|alignitems|justifycontent|padding.*|textalign|verticalalign|all)$/.test(key.replaceAll('-', '').toLowerCase());
  assert.deepEqual(r.inline, { 'justify-content': { value: 'center', important: false }, 'align-items': { value: 'flex-end', important: false } });
  const nativeRequests = r.rules.map(i => reference.rules[i]).filter(q => q.active)
    .flatMap(q => Object.entries(q.declarations).filter(([key]) => relevant(key)));
  assert.deepEqual(nativeRequests, []);
  const candidateRequests = candidate.rules.filter(q => rootInitialSelectorCanApply(q.selector, a.authored))
    .map(({ selector, ...style }) => ({ selector, style: Object.fromEntries(Object.entries(style).filter(([key]) => relevant(key))) }))
    .filter(q => Object.keys(q.style).length);
  assert.deepEqual(candidateRequests, sheet ? [
    { selector: '.modal-overlay', style: { padding: '32px', justifyContent: 'center', alignItems: 'center' } },
    { selector: '.bottom-sheet-overlay', style: { flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', padding: '0' } },
  ] : [{ selector: '.snack-overlay', style: { flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', padding: '0 0 8px' } }]);
  const native = reference.styles[r.style];
  for (const [key, value] of Object.entries({ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '0px', textAlign: 'start', verticalAlign: 'baseline' })) assert.equal(native[key], value);
  for (const [scalar, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'], ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']]) {
    assert.deepEqual(input[scalar], a[stage]);
    assert.deepEqual(Object.fromEntries(Object.entries(a[stage]).filter(([key]) => relevant(key))), {
      padding: sheet ? '0' : '0 0 8px', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center',
    });
  }
  const rc = reference.nodes.filter(n => n.parent === r.key), ac = candidate.nodes.filter(n => n.parent === a.key);
  assert.equal(rc.length, 1); assert.equal(ac.length, 1);
  assert.equal(rc[0].attributes.class, 'cdk-overlay-pane');
  assert.equal(ac[0].authored.id, sheet ? 'bottom-sheet-panel' : 'snack-bar-surface');
  assert.equal(reference.styles[rc[0].style].flexShrink, '1');
  assert.equal(ac[0].resolvedStyle.flexShrink, '1');
  return { referenceNode: r.key, astylarNode: a.key, position, candidateRequests,
    referenceInline: r.inline, referenceChild: rc[0].key, candidateChild: ac[0].key,
    firstDivergence: 'row wrapper and pane replaced by column wrapper and direct surface',
    inputEquivalent: false, renderingEquivalent: null, constrainedLayoutEquivalenceProven: false,
    inheritedTextAlignProven: false, computedCandidateAlignmentProven: false, popupVisibilityCauseProven: false };
}

export function applyOverlayFlowReviews(rows, cases, inventory, normalize) {
  for (const family of ['bottom-sheet', 'snack-bar']) {
    const common = { family, element: family + '-overlay', prove: proveOverlayFlowRequests };
    rows = applyModalBoxReview(rows, cases, inventory, normalize, { ...common,
      properties: ['flexDirection', 'alignItems', 'justifyContent', ...(family === 'snack-bar' ? ['paddingBottom'] : [])],
      attribution: 'reviewed-overlay-flow-composition-substitution', owner: 'showcase overlay structure and flex sizing authoring',
      justification: 'Native bottom alignment uses a row wrapper and a CDK pane; candidate uses a column wrapper and direct surface, plus 8px bottom padding for snackbar. Single-item placement may coincide, but changing the shrink axis, sizing owner and padding does not establish equivalent layout under constraint. Preserve the separate containing-block and depth/visibility evidence; these input substitutions alone do not explain missing or clipped overlays.',
    });
    rows = applyModalBoxReview(rows, cases, inventory, normalize, { ...common, properties: ['textAlign', 'verticalAlign'],
      classification: 'parity-harness-defect', attribution: 'reviewed-overlay-alignment-observation-stage', owner: 'audit computed versus local alignment observation',
      justification: 'Mapped native wrapper computes text-align:start and vertical-align:baseline without local requests; candidate local rules and all three declaration stages omit those properties. This compares different observation stages, not demonstrated candidate computed values. Inherited text alignment, used layout, full structure and visibility remain separate; do not add guessed start/baseline declarations or infer equivalent rendering.',
    });
  }
  return rows;
}

export function validateOverlayFlowReviews(rows, originalRows, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => ['reviewed-overlay-flow-composition-substitution', 'reviewed-overlay-alignment-observation-stage'].includes(r.attribution));
    assert.deepEqual(select(rows), select(applyOverlayFlowReviews(originalRows, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`overlay flow lacks original evidence: ${error.message}`]; }
}

const positionAttributions = new Set(['reviewed-slider-position-request-substitution',
  'reviewed-slider-computed-offset-boundary', 'reviewed-grid-inset-request-substitution',
  'reviewed-grid-computed-inset-boundary', 'reviewed-sheet-overlay-position-substitution',
  'reviewed-overlay-position-observation-boundary']);
export const isCaretPositionReviewRow = row => isComponentCaretReviewRow(row) ||
  ['position', 'top', 'right', 'bottom', 'left'].includes(row.property) && positionAttributions.has(row.attribution);
export function applyCaretPositionReviews(rows, cases, inventory, normalize) {
  return [applyComponentCaretReviews, applySliderPositionReviews, applyGridOffsetReviews, applyOverlayPositionReviews]
    .reduce((values, apply) => apply(values, cases, inventory, normalize), rows);
}
export function validateCaretPositionReviews(rows, originalRows, cases, inventory, normalize) {
  try {
    const expected = applyCaretPositionReviews(originalRows, cases, inventory, normalize).filter(isCaretPositionReviewRow);
    assert.equal(JSON.stringify(rows.filter(isCaretPositionReviewRow)), JSON.stringify(expected),
      'complete caret/position review differs');
    return [];
  } catch (error) { return [`caret/position review does not replay: ${error.message}`]; }
}

const selected = key => /^(all|position|top|right|bottom|left)$|^(inset|animation|transition)/.test(key.replaceAll('-', '').toLowerCase());
const pick = value => Object.fromEntries(Object.entries(value ?? {}).filter(([k]) => selected(k)));
export function proveOverlayPositionRequests(entry, reference, candidate, element) {
  assert.ok(({ 'bottom-sheet': ['bottom-sheet-overlay'], 'snack-bar': ['snack-bar-surface'], dialog: ['dialog-copy'] })[entry.family]?.includes(element));
  const inputs = entry.styleInputs.filter(i => i.id === element); assert.equal(inputs.length, 1);
  const identity = resolveOriginAliasPair(entry, reference, candidate, inputs[0]);
  const sheet = element === 'bottom-sheet-overlay';
  assert.equal(identity.status, sheet ? 'mapped-with-scalar-rule-gap' : 'mapped');
  assert.deepEqual(identity.extraRules, []);
  assert.deepEqual(identity.missingRules, sheet ? [{ selector: '.cdk-global-overlay-wrapper', declarations: { 'z-index': { value: '1000', important: false } } }] : []);
  const r = reference.nodes.find(n => n.key === identity.referenceNode), a = candidate.nodes.find(n => n.key === identity.candidateNode);
  assert.equal(reference.ruleEvidenceComplete, true); assert.equal(candidate.ruleEvidenceComplete, true);
  assert.deepEqual(pick(r.inline), {});
  const rules = r.rules.map(i => reference.rules[i]);
  const referenceRequests = rules.filter(rule => rule.active).map(rule => {
    assert.doesNotMatch(rule.cssText, /\\/);
    return { selector: rule.selector, declarations: pick(rule.declarations) };
  }).filter(rule => Object.keys(rule.declarations).length);
  assert.deepEqual(referenceRequests, sheet ? [
    { selector: '.cdk-overlay-container, .cdk-global-overlay-wrapper', declarations: { top: { value: '0px', important: false }, left: { value: '0px', important: false } } },
    { selector: '.cdk-global-overlay-wrapper', declarations: { position: { value: 'absolute', important: false } } },
  ] : []);
  assert.equal(a.authored.style, undefined); assert.equal(a.authored.attributes?.style, undefined);
  const candidateRequests = candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, a.authored))
    .map(({ selector, ...d }) => ({ selector, declarations: pick(d) })).filter(rule => Object.keys(rule.declarations).length);
  const expected = sheet ? { position: 'fixed', top: '0', left: '0' } : {};
  assert.deepEqual(candidateRequests, sheet ? [{ selector: '.modal-overlay', declarations: expected }] : []);
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) assert.deepEqual(pick(a[stage]), expected);
  assert.equal(reference.styles[r.style].position, sheet ? 'absolute' : 'static');
  if (sheet) for (const p of ['right', 'bottom']) assert.equal(reference.styles[r.style][p], '0px');
  return { referenceNode: r.key, astylarNode: a.key, identity, referenceRequests, candidateRequests,
    referenceInline: r.inline, referenceComputed: reference.styles[r.style],
    inputEquivalent: false, renderingEquivalent: false, candidateUsedPositionVerified: false,
    containingBlockEquivalenceProven: false, popupVisibilityCauseProven: false };
}

export function applyOverlayPositionReviews(rows, cases, inventory, normalize) {
  for (const [family, element] of [['bottom-sheet', 'bottom-sheet-overlay'], ['snack-bar', 'snack-bar-surface'], ['dialog', 'dialog-copy']]) {
    const sheet = family === 'bottom-sheet', prove = (entry, r, a) => proveOverlayPositionRequests(entry, r, a, element);
    if (sheet) rows = applyModalBoxReview(rows, cases, inventory, normalize, {
      family, element, properties: ['position'], prove,
      attribution: 'reviewed-sheet-overlay-position-substitution', owner: 'showcase modal overlay containing-block authoring',
      justification: 'The mapped native global wrapper explicitly requests absolute positioning; the candidate modal wrapper explicitly requests fixed positioning. Retain the complete mapping and scalar z-index rule gap. These are unequal requests; equal containing blocks, equal geometry and the cause of clipping or popup invisibility are not established.',
    });
    rows = applyModalBoxReview(rows, cases, inventory, normalize, {
      family, element, properties: sheet ? ['right', 'bottom'] : ['position'], prove,
      classification: 'parity-harness-defect', attribution: 'reviewed-overlay-position-observation-boundary',
      owner: 'native computed positioning versus candidate local declarations',
      justification: sheet
        ? 'Neither wrapper authors right or bottom; native CSSOM reports zero offsets while candidate local declarations omit them. Preserve those observations without treating computed zeros as missing literal styles. The absolute/fixed substitution and containing-block question remain separate.'
        : 'The mapped native owner computes static positioning without an owner position/reset/motion request; candidate authoring and all three local stages omit position. This is a computed/local observation boundary, not evidence that an explicit static request was omitted or that the popup is correctly placed or visible.',
    });
  }
  return rows;
}
