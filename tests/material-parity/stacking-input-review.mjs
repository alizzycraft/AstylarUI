import assert from 'node:assert/strict';
import { applyModalBoxReview } from './modal-position-inspection.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { proveTooltipStackingComposition } from './tooltip-position-composition.mjs';
import { proveChoiceLabelStacking } from './choice-label-stacking-substitution.mjs';

const attributions = new Set(['reviewed-stacking-owner-request-omission', 'reviewed-stacking-owner-request-addition', 'reviewed-tooltip-stacking-owner-substitution']);
export const isStackingReviewRow = row => attributions.has(row.attribution);

export const stackingOwners = [
  ['card', 'card-open', '.text-button', 'auto', '2', 52],
  ['card', 'card-primary', '.material-card', 'auto', '2', 52],
  ['checkbox', 'checkbox-label', '.checkbox-label', 'auto', '2', 68],
  ['radio', 'radio-solo-label', '.radio-label', 'auto', '2', 68],
  ['radio', 'radio-team-label', '.radio-label', 'auto', '2', 68],
  ['slide-toggle', 'slide-toggle-label', '.switch-label', 'auto', '2', 68],
  ['chips', 'chip-0', '.mat-mdc-chip', '0', undefined, 76],
  ['chips', 'chip-1', '.mat-mdc-chip', '0', undefined, 76],
  ['sidenav', 'sidenav-primary', '.mat-drawer-container', '1', undefined, 62],
];
const one = values => { assert.equal(values.length, 1); return values[0]; };
const relevant = key => ['zindex', 'all'].includes(key.replaceAll('-', '').toLowerCase());
const serializedRequest = text => /(?:^|;)\s*(?:z-index|all)\s*:/i.test(text ?? '');

export function proveStackingOwner(entry, reference, candidate, element) {
  const [family, , selector, nativeZ, candidateZ] = one(stackingOwners.filter(row => row[1] === element));
  assert.equal(entry.family, family);
  for (const tree of [reference, candidate]) {
    assert.equal(tree.ruleEvidenceComplete, true); assert.deepEqual(tree.errors, []);
  }
  const input = one(entry.styleInputs.filter(i => i.id === element));
  const r = one(reference.nodes.filter(n => n.attributes?.id === element));
  const a = one(candidate.nodes.filter(n => n.authored?.id === element));
  assert.equal(r.type, input.referenceStructure.type); assert.equal(a.authored.type, input.astylarStructure.type);
  assert.equal(reference.styles[r.style].zIndex, nativeZ); assert.equal(input.reference.zIndex, nativeZ);
  assert.ok(!Object.keys(r.inline ?? {}).some(relevant));
  assert.ok(!serializedRequest(r.attributes?.style));
  const nativeRequests = r.rules.map(i => reference.rules[i]).filter(rule => rule.active && !rule.selector.includes('::'))
    .flatMap(rule => Object.entries(rule.declarations).filter(([key]) => relevant(key)).map(([property, value]) => ({ selector: rule.selector, property, ...value })));
  const candidateRequests = candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, a.authored))
    .flatMap(rule => Object.entries(rule).filter(([key]) => relevant(key)).map(([property, value]) => ({ selector: rule.selector, property, value })));
  assert.ok(!Object.keys(a.authored.style ?? {}).some(relevant));
  assert.ok(!serializedRequest(a.authored.attributes?.style));
  for (const [stage, scalar] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'], ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
    assert.deepEqual(a[stage], input[scalar]); assert.equal(a[stage].zIndex, candidateZ);
  }
  if (candidateZ === undefined) {
    assert.deepEqual(nativeRequests, [{ selector, property: 'z-index', value: nativeZ, important: false }]);
    assert.deepEqual(candidateRequests, []);
  } else {
    assert.deepEqual(nativeRequests, []);
    assert.deepEqual(candidateRequests, [{ selector, property: 'zIndex', value: candidateZ }]);
  }
  return { element, referenceNode: r.key, astylarNode: a.key,
    ...(['checkbox-label', 'radio-solo-label', 'radio-team-label'].includes(element)
      ? { existingChoiceOwnerProof: proveChoiceLabelStacking(reference, candidate, element) } : {}),
    referenceType: r.type, candidateType: a.authored.type, nativeRequests, candidateRequests,
    reference: nativeZ, candidate: candidateZ ?? '<omitted>',
    classification: 'application-plugin-authoring-defect',
    firstDivergence: candidateZ === undefined ? 'native stacking request omitted in candidate owner' : 'candidate adds an explicit stacking request to owner',
    ancestorStackingEquivalent: false, candidateComputedVerified: false,
    rendererCauseProven: false, renderingEquivalent: false, compensationIntentProven: false };
}

export function applyStackingOwnerReviews(rows, cases, inventory, normalize) {
  return stackingOwners.reduce((values, [family, element, , , z]) => applyModalBoxReview(values, cases, inventory, normalize, {
    family, element, properties: ['zIndex'],
    attribution: z === undefined ? 'reviewed-stacking-owner-request-omission' : 'reviewed-stacking-owner-request-addition',
    owner: 'Material comparison authored stacking owners',
    justification: 'Authenticated original rules and all local style stages establish unequal owner-level stacking requests. This is not proof that the authored owners or their ancestor stacking contexts are interchangeable, that omitted z-index computes to zero, or that the difference caused missing paint. The separate camera-depth reproduction owns that core diagnosis. Do not copy isolated scalar values or remove layers without restoring equal structure and requests.',
    prove: (entry, r, a) => proveStackingOwner(entry, r, a, element),
  }), rows);
}

export function applyStackingReviews(rows, cases, inventory, normalize) {
  const owners = applyStackingOwnerReviews(rows, cases, inventory, normalize);
  return applyModalBoxReview(owners, cases, inventory, normalize, {
    family: 'tooltip', element: 'tooltip-popup', properties: ['zIndex'],
    attribution: 'reviewed-tooltip-stacking-owner-substitution',
    owner: 'Material comparison overlay ancestry and stacking ownership',
    justification: 'The reference leaf computes auto inside three explicit z-index 1000 overlay ancestors; the candidate requests 1000 directly on its relative popup inside local trigger flow. Equal numeric overlay levels do not establish equal stacking ownership. Preserve this authored composition mismatch separately from the independently demonstrated camera-depth defect.',
    prove: (entry, r, a) => {
      const proof = proveTooltipStackingComposition(r, a);
      return { ...proof,
        referenceNode: one(r.nodes.filter(n => String(n.attributes?.class ?? '').split(/\s+/).includes('mat-mdc-tooltip-surface'))).key,
        astylarNode: one(a.nodes.filter(n => n.authored?.id === 'tooltip-popup')).key };
    },
  });
}

export function validateStackingReviews(rows, originalRows, cases, inventory, normalize) {
  try {
    const expected = applyStackingReviews(originalRows, cases, inventory, normalize).filter(isStackingReviewRow);
    assert.equal(JSON.stringify(rows.filter(isStackingReviewRow)), JSON.stringify(expected));
    return [];
  } catch (error) { return [`stacking owner review does not replay: ${error.message}`]; }
}
