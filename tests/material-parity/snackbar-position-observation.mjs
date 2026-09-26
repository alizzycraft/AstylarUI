import assert from 'node:assert/strict';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { applyModalBoxReview } from './modal-position-inspection.mjs';

// Deliberately separate from the closed, historical overlay collectors. A
// wrapper's resolved zero inset is not a missing authored zero declaration.
export function proveSnackbarPositionRequests(entry, reference, candidate) {
  assert.equal(entry.family, 'snack-bar');
  for (const tree of [reference, candidate]) {
    assert.equal(tree.ruleEvidenceComplete, true);
    assert.deepEqual(tree.errors, []);
  }
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2);
  const inputs = entry.styleInputs.filter(i => i.id === 'snack-bar-overlay');
  assert.equal(inputs.length, 1);
  const mapping = resolveOriginAliasPair(entry, reference, candidate, inputs[0]);
  assert.equal(mapping.status, 'mapped-with-scalar-rule-gap');
  assert.deepEqual(mapping.extraRules, []);
  assert.deepEqual(mapping.missingRules, [{ selector: '.cdk-global-overlay-wrapper',
    declarations: { 'z-index': { value: '1000', important: false } } }]);
  assert.equal(mapping.referencePath.length, 2);
  const ref = reference.nodes.find(n => n.key === mapping.referenceNode);
  const container = reference.nodes.find(n => n.key === mapping.referencePath[1]);
  const ast = candidate.nodes.find(n => n.key === mapping.candidateNode);
  assert.equal(container.attributes.class, 'cdk-overlay-container');
  assert.equal(container.parent, null);
  assert.equal(container.attributes.style, undefined);
  assert.equal(ref.attributes.style, 'justify-content: center; align-items: flex-end;');
  assert.equal(candidate.nodes.find(n => n.key === ast.parent).authored.id, 'snack-bar-root');
  assert.deepEqual(ref.inline, { 'justify-content': { value: 'center', important: false },
    'align-items': { value: 'flex-end', important: false } });
  assert.deepEqual(container.inline, {});
  assert.equal(ast.authored.style, undefined);
  assert.equal(ast.authored.attributes?.style, undefined);
  const relevant = key => /^(position|top|right|bottom|left|all)$|^inset/.test(key.replaceAll('-', '').toLowerCase());
  const requests = node => node.rules.map(i => reference.rules[i]).filter(r => r.active).flatMap(rule => {
    assert.ok(!rule.cssText.includes('\\'));
    assert.doesNotMatch(rule.cssText, /(?:^|[;{])\s*(?:inset[\w-]*|right|bottom|all)\s*:/i);
    return Object.entries(rule.declarations).filter(([key]) => relevant(key))
      .map(([key, value]) => ({ selector: rule.selector, conditions: rule.conditions, key, ...value }));
  });
  const shared = ['top', 'left'].map(key => ({ selector: '.cdk-overlay-container, .cdk-global-overlay-wrapper',
    conditions: [], key, value: '0px', important: false }));
  for (const node of [ref, container]) {
    const sizeRules = node.rules.map(i => reference.rules[i]).filter(r => r.active &&
      r.selector === '.cdk-overlay-container, .cdk-global-overlay-wrapper');
    assert.equal(sizeRules.length, 1);
    for (const key of ['width', 'height']) assert.deepEqual(sizeRules[0].declarations[key],
      { value: '100%', important: false });
  }
  assert.deepEqual(requests(ref), [...shared, { selector: '.cdk-global-overlay-wrapper',
    conditions: [], key: 'position', value: 'absolute', important: false }]);
  assert.deepEqual(requests(container), [...shared, { selector: '.cdk-overlay-container',
    conditions: [], key: 'position', value: 'fixed', important: false }]);
  const candidateRequests = candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, ast.authored))
    .flatMap(rule => Object.keys(rule).filter(relevant).map(key => ({ selector: rule.selector, key, value: rule[key] })));
  assert.deepEqual(candidateRequests, Object.entries({ position: 'fixed', top: '0', left: '0' })
    .map(([key, value]) => ({ selector: '.snack-overlay', key, value })));
  for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle']) {
    assert.deepEqual(Object.fromEntries(Object.entries(ast[stage]).filter(([key]) => relevant(key))),
      { position: 'fixed', top: '0', left: '0' });
  }
  assert.equal(reference.styles[ref.style].position, 'absolute');
  assert.equal(reference.styles[container.style].position, 'fixed');
  for (const property of ['right', 'bottom']) assert.equal(reference.styles[ref.style][property], '0px');
  return { element: 'snack-bar-overlay', referenceNode: ref.key, astylarNode: ast.key,
    mapping, referenceWrapperRequests: requests(ref), referenceContainerRequests: requests(container),
    candidateRequests, referenceComputedOffsets: { right: '0px', bottom: '0px' },
    inputEquivalent: false, structuralEquivalenceVerified: false, candidateUsedOffsetsVerified: false,
    renderingEquivalent: false, originalMissingSnackbarCauseProven: false };
}

export function applySnackbarPositionRequests(rows, cases, inventory, normalize) {
  const common = { family: 'snack-bar', element: 'snack-bar-overlay', prove: proveSnackbarPositionRequests };
  const positions = applyModalBoxReview(rows, cases, inventory, normalize, { ...common, properties: ['position'],
    attribution: 'reviewed-snackbar-overlay-position-substitution',
    owner: 'showcase snackbar overlay composition',
    justification: 'The native measured wrapper explicitly requests absolute positioning inside a fixed CDK container; the candidate explicitly requests fixed positioning inside the showcase section. This is a differing authored composition, not proof of incorrect core fixed positioning. Mapping retains the scalar z-index rule gap. Existing retained rasters show the snackbar; no cause of the earlier missing-snackbar report or shared tooltip cause is inferred.',
  });
  return applyModalBoxReview(positions, cases, inventory, normalize, { ...common, properties: ['right', 'bottom'],
    classification: 'parity-harness-defect', attribution: 'reviewed-snackbar-computed-offset-stage',
    owner: 'input audit CSSOM offsets versus local declarations',
    justification: 'Neither the native wrapper nor its fixed container requests right/bottom or logical insets; CSSOM reports zero after top/left zero and full-size layout. Candidate authoring and three local stages omit right/bottom. These are different observation stages, not authored zeros to copy. The separate overlay composition mismatch, scalar z-index rule gap, used-layout uncertainty and older manual symptom remain explicit.',
  });
}

export function validateSnackbarPositionRequests(rows, originalRows, cases, inventory, normalize) {
  try {
    const select = values => values.filter(row => ['reviewed-snackbar-overlay-position-substitution',
      'reviewed-snackbar-computed-offset-stage'].includes(row.attribution));
    assert.deepEqual(select(rows), select(applySnackbarPositionRequests(originalRows, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`snackbar position review does not replay from original owners: ${error.message}`]; }
}
