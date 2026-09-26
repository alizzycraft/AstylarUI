import assert from 'node:assert/strict';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { applyModalBoxReview } from './modal-position-inspection.mjs';

const one = nodes => { assert.equal(nodes.length, 1); return nodes[0]; };
const affects = key => /^(overflow.*|all)$/.test(key.replaceAll('-', '').toLowerCase());

export function proveOverlayOverflowRequests(entry, r, a, element) {
  const tooltip = entry.family === 'tooltip';
  assert.ok(tooltip ? element === 'tooltip-popup' && ['hover', 'held'].includes(entry.state) :
    entry.family === 'dialog' && element === 'dialog-panel');
  for (const tree of [r, a]) {
    assert.equal(tree.ruleEvidenceComplete, true); assert.deepEqual(tree.errors, []);
    assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
  }
  const input = one(entry.styleInputs.filter(i => i.id === element));
  const mapping = resolveOriginAliasPair(entry, r, a, input);
  assert.ok(['mapped', 'mapped-with-scalar-rule-gap'].includes(mapping.status));
  const reference = one(r.nodes.filter(n => n.key === mapping.referenceNode));
  const candidate = one(a.nodes.filter(n => n.key === mapping.candidateNode));
  assert.deepEqual(reference.inline, {}); assert.ok(!reference.attributes.style);
  assert.equal(candidate.authored.style, undefined); assert.equal(candidate.authored.attributes?.style, undefined);
  const requests = reference.rules.map(i => r.rules[i]).filter(rule => rule.active).flatMap(rule => {
    assert.ok(!rule.cssText.includes('\\')); assert.deepEqual(rule.conditions, []);
    return Object.entries(rule.declarations).filter(([key]) => affects(key))
      .map(([key, value]) => ({ selector: rule.selector, key, ...value }));
  });
  const selector = tooltip ? '.mat-mdc-tooltip-surface' : '.mat-mdc-dialog-surface';
  assert.deepEqual(requests, (tooltip ? [['overflow-wrap', 'anywhere'], ['overflow-x', 'hidden'], ['overflow-y', 'hidden']]
    : [['overflow-y', 'auto']]).map(([key, value]) => ({ selector, key, value, important: false })));
  const computed = tooltip ? 'hidden' : 'auto';
  for (const key of ['overflowX', 'overflowY']) assert.equal(r.styles[reference.style][key], computed);
  assert.deepEqual(a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, candidate.authored))
    .flatMap(rule => Object.keys(rule).filter(affects)), []);
  for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle'])
    assert.deepEqual(Object.keys(candidate[stage]).filter(affects), []);
  return { element, referenceNode: reference.key, astylarNode: candidate.key, mapping,
    referenceRequests: requests, referenceComputedOverflow: { overflowX: computed, overflowY: computed },
    candidateRequests: [], explicitAxes: tooltip ? ['overflowX', 'overflowY'] : ['overflowY'],
    computedOnlyAxes: tooltip ? [] : ['overflowX'],
    inputEquivalent: false, candidateComputedOverflowVerified: false, clippingVerified: false,
    scrollingVerified: false, renderingEquivalent: false, originalRasterCauseProven: false };
}

export function applyOverlayOverflowRequests(rows, cases, inventory, canonicalStyle) {
  let values = rows;
  for (const [family, element, properties, computedOnly] of [
    ['tooltip', 'tooltip-popup', ['overflowX', 'overflowY'], false],
    ['dialog', 'dialog-panel', ['overflowY'], false], ['dialog', 'dialog-panel', ['overflowX'], true],
  ]) values = applyModalBoxReview(values, cases, inventory, canonicalStyle, {
    family, element, properties, prove: (entry, r, a) => proveOverlayOverflowRequests(entry, r, a, element),
    classification: computedOnly ? 'parity-harness-defect' : 'application-plugin-authoring-defect',
    attribution: computedOnly ? 'reviewed-dialog-overflow-computed-axis' : 'reviewed-overlay-overflow-request-omission',
    owner: computedOnly ? 'input audit computed overflow-axis observation' : 'showcase overlay overflow authoring',
    justification: computedOnly
      ? 'The native dialog surface explicitly requests only overflow-y:auto; CSSOM reports auto on both axes. Candidate local stages omit overflow. The horizontal scalar is a computed observation, not an authored auto request to copy. The vertical authoring omission remains a separate finding. No equivalent candidate computation, clipping or functioning scrollbar is proved.'
      : 'Original native surface rules explicitly request hidden X/Y overflow for tooltip and automatic Y overflow for dialog; candidate owners omit overflow in authoring and all three local stages. This is an input omission before rendering. Complete owner mapping preserves tooltip wrapping requests and dialog computed-only horizontal auto separately; actual clipping, scrolling, placement and the original raster cause remain unproved.',
  });
  return values;
}

export function validateOverlayOverflowRequests(rows, originalRows, cases, inventory, canonicalStyle) {
  try {
    const select = values => values.filter(row => ['reviewed-dialog-overflow-computed-axis',
      'reviewed-overlay-overflow-request-omission'].includes(row.attribution));
    assert.deepEqual(select(rows), select(applyOverlayOverflowRequests(originalRows, cases, inventory, canonicalStyle)));
    return [];
  } catch (error) { return [`overlay overflow review does not replay from original owners: ${error.message}`]; }
}
