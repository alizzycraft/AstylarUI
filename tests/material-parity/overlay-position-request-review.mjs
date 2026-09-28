import assert from 'node:assert/strict';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { applyModalBoxReview } from './modal-position-inspection.mjs';

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
