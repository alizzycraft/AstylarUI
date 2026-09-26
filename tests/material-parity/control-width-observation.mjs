import assert from 'node:assert/strict';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

// Scope the claim to owner requests, not to equivalent control composition or
// used intrinsic size. Keep this review independent of historical collectors.
export const controlWidthOwners = Object.freeze({
  checkbox: { 'checkbox-primary': ['mat-checkbox', 'div', ['149.5625px', '137.5625px', '141.5625px']] },
  badge: { 'badge-primary': ['span', 'span', ['90.953125px', '81.859375px', '104.65625px']] },
  radio: { 'radio-primary': ['mat-radio-group', 'div', ['153px', '129px', '137px']] },
  'slide-toggle': { 'slide-toggle-primary': ['mat-slide-toggle', 'div', ['179px']] },
  'button-toggle': {
    'button-toggle-primary': ['mat-button-toggle-group', 'div', ['130px']],
    'button-toggle-two': ['mat-button-toggle', 'div', ['81px']],
  },
  chips: {
    'chip-0': ['mat-chip-option', 'div', ['97px', '68px']],
    'chip-1': ['mat-chip-option', 'div', ['93px', '64px']],
  },
});
const one = nodes => { assert.equal(nodes.length, 1); return nodes[0]; };
const affects = key => /^(width|inlinesize|blocksize|all)$/.test(key.replaceAll('-', '').toLowerCase());

export function proveControlWidthRequest(entry, r, a, element) {
  const contract = controlWidthOwners[entry.family]?.[element]; assert.ok(contract);
  for (const tree of [r, a]) {
    assert.deepEqual(tree.errors, []); assert.equal(tree.ruleEvidenceComplete, true);
    assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
  }
  assert.equal(a.resolvedStyleEvidenceVersion, 2);
  assert.equal(a.resolvedStyleSource, 'core-style-inspection');
  const reference = one(r.nodes.filter(n => n.attributes?.id === element));
  const candidate = one(a.nodes.filter(n => n.authored?.id === element));
  assert.equal(reference.type, contract[0]); assert.equal(candidate.authored.type, contract[1]);
  assert.deepEqual(reference.inline, {});
  assert.ok(!reference.attributes.style);
  assert.equal(candidate.authored.style, undefined);
  assert.equal(candidate.authored.attributes?.style, undefined);
  for (const rule of reference.rules.map(i => r.rules[i]).filter(rule => rule.active)) {
    assert.ok(!rule.cssText.includes('\\'));
    assert.doesNotMatch(rule.cssText, /(?:^|[;{])\s*(?:width|inline-size|block-size|all)\s*:/i);
    assert.deepEqual(Object.keys(rule.declarations).filter(affects), []);
  }
  const rules = a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, candidate.authored) &&
    Object.keys(rule).some(affects));
  assert.deepEqual(rules.map(rule => rule.selector), element === 'badge-primary' ?
    ['.badge-anchor', '#' + element] : ['#' + element]);
  const width = rules.at(-1).width; assert.ok(contract[2].includes(width));
  for (const rule of rules) {
    // Conditional/important/ambiguous declarations require a separate review.
    assert.deepEqual(Object.keys(rule).filter(k => affects(k) || /^media|important|condition/i.test(k)), ['width']);
    assert.equal(rule.width, rule.selector === '.badge-anchor' ? '120px' : width);
  }
  for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle']) {
    assert.deepEqual(Object.keys(candidate[stage]).filter(affects), ['width']);
    assert.equal(candidate[stage].width, width);
  }
  assert.equal(r.styles[reference.style].writingMode, 'horizontal-tb');
  const computedWidth = r.styles[reference.style].width;
  // Inline badge/radio owners retain CSSOM `auto`; never invent pixel widths
  // from a rectangle or conflate that observation with the absent declaration.
  if (['badge-primary', 'radio-primary'].includes(element)) assert.equal(computedWidth, 'auto');
  else assert.match(computedWidth, /^\d+(?:\.\d+)?px$/);
  const input = one(entry.styleInputs.filter(input => input.id === element));
  assert.equal(input.reference.width, computedWidth); assert.equal(input.astylar.width, width);
  return { element, referenceNode: reference.key, astylarNode: candidate.key,
    referenceAuthoredWidth: '<omitted>', referenceComputedWidth: r.styles[reference.style].width,
    candidateAuthoredWidth: width, candidateRules: rules,
    classification: 'application-plugin-authoring-defect',
    firstDivergence: 'reference owner omits width request; candidate owner requests fixed pixels',
    inputEquivalent: false, structuralEquivalenceVerified: false, candidateUsedLayoutVerified: false,
    renderingEquivalent: false, originalRasterCauseProven: false };
}
