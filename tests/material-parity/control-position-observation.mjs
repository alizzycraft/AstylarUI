import assert from 'node:assert/strict';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { applyModalBoxReview } from './modal-position-inspection.mjs';
import { proveChipPositionInspection } from './chip-position-inspection.mjs';

// Keep new inventory-based reviews outside historical collectors whose source
// receipts and persistent dependency graphs intentionally remain closed.
const one = ns => { assert.equal(ns.length, 1); return ns[0]; };

// Computed browser offsets are not authored offsets; local omissions do not
// establish used positioning.
export function proveChipPositionRequests(r, a, element) {
  assert.ok(['chip-0', 'chip-1'].includes(element));
  assert.equal(r.ruleEvidenceComplete, true); assert.equal(a.ruleEvidenceComplete, true);
  const composition = proveChipPositionInspection(r, a);
  const owner = one(composition.chips.filter(chip => chip.id === element));
  const reference = one(r.nodes.filter(n => n.key === owner.referenceOwner));
  const candidate = one(a.nodes.filter(n => n.key === owner.candidateOwner));
  assert.deepEqual(reference.inline, {});
  assert.equal(candidate.authored.style, undefined);
  assert.equal(candidate.authored.attributes?.style, undefined);
  const affects = key => /^(position|top|right|bottom|left|all)$|^inset/.test(key.replaceAll('-', '').toLowerCase());
  const requests = reference.rules.map(i => r.rules[i]).filter(rule => rule.active).flatMap(rule => {
    assert.ok(!rule.cssText.includes('\\'));
    assert.doesNotMatch(rule.cssText, /(?:^|[;{])\s*(?:inset[\w-]*|top|right|bottom|left|all)\s*:/i);
    return Object.entries(rule.declarations).filter(([key]) => affects(key))
      .map(([key, value]) => ({ selector: rule.selector, conditions: rule.conditions, key, ...value }));
  });
  assert.deepEqual(requests, ['.mdc-evolution-chip', '.mat-mdc-chip'].map(selector => ({
    selector, conditions: [], key: 'position', value: 'relative', important: false,
  })));
  assert.deepEqual(a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, candidate.authored))
    .flatMap(rule => Object.keys(rule).filter(affects)), []);
  for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle']) {
    assert.ok(!Object.keys(candidate[stage]).some(affects));
  }
  const offsets = ['top', 'right', 'bottom', 'left'];
  for (const property of offsets) assert.equal(r.styles[reference.style][property], '0px');
  return { element, referenceNode: reference.key, astylarNode: candidate.key,
    referencePositionRequests: requests, candidatePositionRequests: [],
    referenceComputedOffsets: Object.fromEntries(offsets.map(p => [p, '0px'])),
    positionClassification: 'application-plugin-authoring-defect', offsetClassification: 'parity-harness-defect',
    candidateComputedPositionVerified: false, candidateUsedOffsetsVerified: false,
    inputEquivalent: false, renderingEquivalent: false, rendererCauseProven: false };
}

export function applyChipPositionRequests(rows, cases, inventory, canonicalStyle) {
  return ['chip-0', 'chip-1'].reduce((values, element) => {
    const prove = (entry, r, a) => {
      assert.equal(entry.family, 'chips');
      return proveChipPositionRequests(r, a, element);
    };
    values = applyModalBoxReview(values, cases, inventory, canonicalStyle, {
      family: 'chips', element, properties: ['position'], prove,
      attribution: 'reviewed-chip-position-request-omission',
      owner: 'showcase chip owner positioning and flattened composition',
      justification: 'Two captured active Material rules explicitly request relative positioning on the chip owner; the candidate omits position in inline authoring, potentially applicable rules and all three local stages. This establishes unequal requests, not a core positioning defect or an implicit relative default. Flattened focus/button/graphic structure and historical label offsets remain separate findings.',
    });
    return applyModalBoxReview(values, cases, inventory, canonicalStyle, {
      family: 'chips', element, properties: ['top', 'right', 'bottom', 'left'], prove,
      classification: 'parity-harness-defect', attribution: 'reviewed-chip-computed-offset-stage',
      owner: 'input audit CSSOM resolved offsets versus local declarations',
      justification: 'Captured reference chip rules request relative positioning without physical/logical insets or resets; CSSOM reports zero offsets while candidate local styles omit them. These are different observation stages, not authored zeros to copy into the fixture. Unequal owner positioning and structure remain; candidate computed/used positioning and rendering equivalence are unproved.',
    });
  }, rows);
}

export function validateChipPositionRequests(rows, originalRows, cases, inventory, canonicalStyle) {
  try {
    const select = values => values.filter(row => ['reviewed-chip-position-request-omission',
      'reviewed-chip-computed-offset-stage'].includes(row.attribution));
    assert.deepEqual(select(rows), select(applyChipPositionRequests(originalRows, cases, inventory, canonicalStyle)));
    return [];
  } catch (error) { return [`chip position requests do not replay from original owners: ${error.message}`]; }
}

export const buttonOffsetOwners = Object.freeze({
  button: ['button-primary', 'button-secondary', 'button-disabled'], card: ['card-open'],
  menu: ['menu-primary'], 'bottom-sheet': ['bottom-sheet-primary'], dialog: ['dialog-primary'],
  'snack-bar': ['snack-bar-primary'], tooltip: ['tooltip-primary'],
});

export function proveButtonOffsetObservation(entry, r, a, element) {
  assert.ok(buttonOffsetOwners[entry.family]?.includes(element));
  for (const tree of [r, a]) {
    assert.deepEqual(tree.errors, []); assert.equal(tree.ruleEvidenceComplete, true);
    assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
  }
  assert.equal(a.resolvedStyleEvidenceVersion, 2);
  assert.equal(a.resolvedStyleSource, 'core-style-inspection');
  const reference = one(r.nodes.filter(n => n.attributes?.id === element));
  const candidate = one(a.nodes.filter(n => n.authored?.id === element));
  assert.equal(reference.type, 'button'); assert.equal(candidate.authored.type, 'button');
  assert.deepEqual(reference.inline, {}); assert.equal(candidate.authored.style, undefined);
  assert.equal(candidate.authored.attributes?.style, undefined);
  const affects = key => /^(position|top|right|bottom|left|all)$|^inset/.test(key.replaceAll('-', '').toLowerCase());
  const requests = reference.rules.map(i => r.rules[i]).filter(rule => rule.active).flatMap(rule => {
    assert.ok(!rule.cssText.includes('\\'));
    assert.doesNotMatch(rule.cssText, /(?:^|[;{])\s*(?:inset[\w-]*|top|right|bottom|left|all)\s*:/i);
    return Object.entries(rule.declarations).filter(([key]) => affects(key))
      .map(([key, value]) => ({ selector: rule.selector, conditions: rule.conditions, key, ...value }));
  });
  assert.deepEqual(requests, [{ selector: '.mdc-button', conditions: [], key: 'position', value: 'relative', important: false }]);
  const candidateRequests = a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, candidate.authored))
    .flatMap(rule => Object.keys(rule).filter(affects).map(key => ({ selector: rule.selector, key, value: rule[key] })));
  assert.deepEqual(candidateRequests, element === 'card-open'
    ? [{ selector: '.text-button', key: 'position', value: 'relative' }] : []);
  for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle']) {
    assert.ok(candidate[stage]);
    assert.ok(!Object.keys(candidate[stage]).some(key => key !== 'position' && affects(key)));
    assert.equal(candidate[stage].position, element === 'card-open' ? 'relative' : undefined);
  }
  assert.equal(r.styles[reference.style].position, 'relative');
  const offsets = ['top', 'right', 'bottom', 'left'];
  for (const key of offsets) assert.equal(r.styles[reference.style][key], '0px');
  return { element, referenceNode: reference.key, astylarNode: candidate.key,
    referencePositionRequests: requests, candidatePositionRequests: candidateRequests,
    referenceComputedOffsets: Object.fromEntries(offsets.map(key => [key, '0px'])),
    attributableProperties: offsets, candidateComputedPositionVerified: false, candidateUsedOffsetsVerified: false,
    inputEquivalent: false, renderingEquivalent: false, rendererCauseProven: false };
}

export function applyButtonOffsetObservations(rows, cases, inventory, canonicalStyle) {
  return Object.entries(buttonOffsetOwners).reduce((values, [family, elements]) => elements.reduce((current, element) =>
    applyModalBoxReview(current, cases, inventory, canonicalStyle, {
      family, element, properties: ['top', 'right', 'bottom', 'left'],
      prove: (entry, r, a) => proveButtonOffsetObservation(entry, r, a, element),
      classification: 'parity-harness-defect', attribution: 'reviewed-button-computed-offset-stage',
      owner: 'input audit CSSOM resolved offsets versus local declarations',
      justification: 'Directly mapped Material buttons explicitly request relative positioning without physical/logical insets or resets, while CSSOM reports zero offsets. Candidate local offsets are omitted. Only card-open explicitly requests relative positioning; other owner position omissions remain independently reviewed. This diagnoses mixed observation stages, not authored zeros to copy, containing-block equivalence, or a renderer cause.',
    }), values), rows);
}

export function validateButtonOffsetObservations(rows, originalRows, cases, inventory, canonicalStyle) {
  try {
    const select = values => values.filter(row => row.attribution === 'reviewed-button-computed-offset-stage');
    assert.deepEqual(select(rows), select(applyButtonOffsetObservations(originalRows, cases, inventory, canonicalStyle)));
    return [];
  } catch (error) { return [`button offsets do not replay from original owners: ${error.message}`]; }
}
