import assert from 'node:assert/strict';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { applyModalBoxReview, applyBottomSheetActionLayout, applyBottomSheetPanelConstraints,
  applyDialogPanelConstraints, applyTabControlStage } from './modal-position-inspection.mjs';

export const boxSizingReviewAttributions = Object.freeze([
  'reviewed-explicit-box-sizing-input-substitution',
  'reviewed-native-box-sizing-request-local-omission',
  'reviewed-box-sizing-computed-local-observation-stage',
]);

export function applyBoxSizingReviews(rows, cases, inventory, normalize) {
  return rows.map(row => {
    if (row.property !== 'boxSizing' || row.attribution !== 'unresolved') return row;
    const explicit = Object.hasOwn(explicitBoxSizingTargets, row.element);
    const native = Object.hasOwn(nativeBoxSizingTargets, row.element);
    const referenceRequest = Object.hasOwn(referenceBoxSizingTargets, row.element);
    const prove = explicit ? proveExplicitBoxSizing : native || referenceRequest ? proveNativeBoxSizingRequest : proveBoxSizingOmission;
    return applyModalBoxReview([row], cases.filter(e => row.states.includes(e.state ?? 'static')), inventory, normalize, {
      family: row.family, element: row.element, properties: ['boxSizing'],
      attribution: boxSizingReviewAttributions[explicit ? 0 : native || referenceRequest ? 1 : 2],
      classification: explicit || referenceRequest ? 'application-plugin-authoring-defect' : 'parity-harness-defect',
      owner: explicit || referenceRequest ? 'showcase authored box-sizing inputs' : 'computed browser versus local candidate box-sizing measurement',
      justification: explicit
        ? 'Original corresponding owners retain native content-box and one explicit candidate border-box request, verified against all three captured stages. Preserve differing owner structure and overlay mapping gaps. This establishes unequal authored inputs, not deliberate compensation intent, a used-box defect or a renderer cause.'
        : native || referenceRequest
          ? 'Original native owners carry explicit border-box requests while corresponding candidate owners omit boxSizing in matching rules and all local stages. Preserve generated and private-plugin owners. Computed browser values and local candidate declarations are different measurement stages; no candidate computed default or used-size equivalence is inferred.'
          : 'Original native computed boxSizing is compared with absent candidate local declarations, with no captured own box-sizing/all request on either owner. Preserve native table border-box separately from content-box observations and retain generated/private owner identity. Neither candidate computed defaults, historical user-agent rules nor used geometry are established by this observation-stage difference.',
      prove: (entry, r, a) => {
        const proof = prove(entry, one(entry.styleInputs.filter(i => i.id === row.element)), r, a);
        return { ...proof, astylarNode: proof.candidateNode };
      },
    })[0];
  });
}

// Rebuild from the validated predecessor, never from submitted classifications
// or receipts. Compare all rows so additions, removals and unrelated edits fail.
// Persistence may omit undefined keys; it must not manufacture CSS defaults.
export function validateBoxSizingReviews(rows, originalRows, cases, inventory, normalize) {
  try {
    const persisted = value => JSON.parse(JSON.stringify(value));
    const expected = applyBoxSizingReviews(originalRows, cases, inventory, normalize);
    assert.deepEqual(persisted(rows), persisted(expected));
    return [];
  } catch (error) {
    return [`box-sizing review evidence does not replay: ${error.message}`];
  }
}

// The production validator starts before these established scalar joins.
// Reproduce their precedence from evidence, not the submitted attribution.
export function replayBoxSizingPredecessors(rows, cases, inventory, normalize) {
  return [applyBottomSheetActionLayout, applyBottomSheetPanelConstraints,
    applyDialogPanelConstraints, applyTabControlStage].reduce(
    (values, apply) => apply(values, cases, inventory, normalize),
    rows.filter(row => row.property === 'boxSizing'));
}

export const explicitBoxSizingTargets = Object.freeze({
  'bottom-sheet-overlay': ['bottom-sheet', '.modal-overlay', 25],
  'button-toggle-one': ['button-toggle', '.button-toggle-option', 68],
  'button-toggle-two': ['button-toggle', '.button-toggle-option', 68],
  'button-toggle-primary': ['button-toggle', '#button-toggle-primary', 68],
  'checkbox-primary': ['checkbox', '#checkbox-primary', 68],
  'chip-0': ['chips', '.chip', 76],
  'chip-1': ['chips', '.chip', 76],
  'snack-bar-overlay': ['snack-bar', '.snack-overlay', 34],
  'stepper-primary': ['stepper', '.stepper', 68],
  'tab-panel': ['tabs', '.tab-panel', 70],
});
const one = xs => { assert.equal(xs.length, 1); return xs[0]; };
const relevant = d => Object.keys(d ?? {}).some(k => ['boxsizing', 'all'].includes(k.replaceAll('-', '').toLowerCase()));

export const nativeBoxSizingTargets = Object.freeze({
  'dialog-cancel': ['dialog', '.mdc-button', 32],
  'dialog-save': ['dialog', '.mdc-button', 32],
  'sidenav-primary': ['sidenav', '.mat-drawer-container', 62],
  'slider-visual': ['slider', '.mat-mdc-slider', 78],
  'snack-bar-surface': ['snack-bar', '.mat-mdc-snackbar-surface', 34],
  'toolbar-primary': ['toolbar', '.mat-toolbar-row, .mat-toolbar-single-row', 52],
});
export const referenceBoxSizingTargets = Object.freeze({
  'expansion-primary': ['expansion', '.mat-expansion-panel', 68],
});
// Material's expansion container explicitly retains content-box. Keep this
// separate from the native border-box controls: the evidence is still an
// authored reference request versus an omitted candidate-local request.
export const nativeBoxSizingExpected = Object.freeze({ 'expansion-primary': 'content-box' });

export function proveNativeBoxSizingRequest(entry, input, reference, candidate) {
  const target = nativeBoxSizingTargets[input.id] ?? referenceBoxSizingTargets[input.id]; assert.ok(target);
  const [family, selector] = target; assert.equal(entry.family, family);
  const ast = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  let native, identity;
  if (input.id === 'snack-bar-surface') {
    identity = resolveOriginAliasPair(entry, reference, candidate, input);
    assert.equal(identity.status, 'mapped'); assert.equal(identity.candidateNode, ast.key);
    native = one(reference.nodes.filter(n => n.key === identity.referenceNode));
  } else native = one(reference.nodes.filter(n => n.attributes?.id === input.id || n.attributes?.['data-parity-id'] === input.id));
  assert.equal(native.type, input.referenceStructure.type);
  assert.equal(ast.authored.type, input.astylarStructure.type);
  if (input.id === 'slider-visual') assert.equal(ast.authored.type, 'showcase.material:range-visual');
  for (const [key, value] of Object.entries(input.reference)) assert.equal(reference.styles[native.style][key], value);
  const expectedBoxSizing = nativeBoxSizingExpected[input.id] ?? 'border-box';
  assert.equal(input.reference.boxSizing, expectedBoxSizing);
  for (const n of [native, ast]) {
    assert.equal(relevant(n.inline ?? n.authored?.style), false);
    assert.ok(!/(?:^|;)\s*(?:box-sizing|all)\s*:/i.test(n.attributes?.style ?? n.authored?.attributes?.style ?? ''));
  }
  const requests = native.rules.map(i => reference.rules[i]).filter(r => r.active && relevant(r.declarations))
    .map(r => ({ selector: r.selector, conditions: r.conditions,
      declarations: Object.fromEntries(Object.entries(r.declarations).filter(([k]) => relevant({ [k]: true }))) }));
  assert.deepEqual(requests, [{ selector, conditions: [], declarations: { 'box-sizing': { value: expectedBoxSizing, important: false } } }]);
  assert.deepEqual(candidate.rules.filter(r => rootInitialSelectorCanApply(r.selector, ast.authored) && relevant(r)), []);
  for (const [stage, scalar] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
    assert.deepEqual(ast[stage], input[scalar]); assert.equal(Object.hasOwn(ast[stage], 'boxSizing'), false);
  }
  return { element: input.id, referenceNode: native.key, candidateNode: ast.key,
    referenceType: native.type, candidateType: ast.authored.type, requests,
    identity: identity ?? { status: 'direct-id' }, candidateBoxSizing: '<omitted>',
    classification: 'authored-request-versus-local-omission', inputEquivalent: false,
    candidateComputedVerified: false, usedGeometryVerified: false, rendererCauseProven: false, renderingEquivalent: false };
}

// Declaration provenance only. No inferred defaults, geometry, compensation
// intent or raster equivalence; generated-owner mapping gaps remain visible.
export function proveExplicitBoxSizing(entry, input, reference, candidate) {
  const target = explicitBoxSizingTargets[input.id]; assert.ok(target);
  const [family, selector] = target; assert.equal(entry.family, family);
  const ast = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  let native, identity;
  if (input.id.endsWith('-overlay')) {
    identity = resolveOriginAliasPair(entry, reference, candidate, input);
    assert.equal(identity.status, 'mapped-with-scalar-rule-gap');
    assert.equal(identity.candidateNode, ast.key);
    native = one(reference.nodes.filter(n => n.key === identity.referenceNode));
  } else {
    native = one(reference.nodes.filter(n => n.attributes?.id === input.id || n.attributes?.['data-parity-id'] === input.id));
  }
  assert.equal(native.type, input.referenceStructure.type);
  assert.equal(ast.authored.type, input.astylarStructure.type);
  for (const [property, value] of Object.entries(input.reference)) assert.equal(reference.styles[native.style][property], value);
  assert.equal(input.reference.boxSizing, 'content-box');
  for (const n of [native, ast]) {
    assert.equal(relevant(n.inline ?? n.authored?.style), false);
    assert.ok(!/(?:^|;)\s*(?:box-sizing|all)\s*:/i.test(n.attributes?.style ?? n.authored?.attributes?.style ?? ''));
  }
  const nativeRules = native.rules.map(i => reference.rules[i]).filter(r => r.active && relevant(r.declarations));
  assert.deepEqual(nativeRules, []);
  const requests = candidate.rules.filter(r => rootInitialSelectorCanApply(r.selector, ast.authored) && relevant(r))
    .map(r => ({ selector: r.selector, declarations: Object.fromEntries(Object.entries(r).filter(([k]) => relevant({ [k]: true }))) }));
  assert.deepEqual(requests, [{ selector, declarations: { boxSizing: 'border-box' } }]);
  for (const [stage, scalar] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
    assert.deepEqual(ast[stage], input[scalar]); assert.equal(ast[stage].boxSizing, 'border-box');
  }
  return { element: input.id, referenceNode: native.key, candidateNode: ast.key,
    referenceType: native.type, candidateType: ast.authored.type, requests,
    identity: identity ?? { status: 'direct-id' }, classification: 'application-plugin-authoring-defect',
    firstDivergence: 'candidate-authored-box-sizing-request', inputEquivalent: false,
    usedGeometryVerified: false, compensationIntentProven: false, rendererCauseProven: false, renderingEquivalent: false };
}

// No own request on either side is an observation boundary, not evidence that
// the renderer consumed the browser's computed default.
export function proveBoxSizingOmission(entry, input, reference, candidate) {
  const ast = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  const direct = reference.nodes.filter(n => n.attributes?.id === input.id || n.attributes?.['data-parity-id'] === input.id);
  let native, identity;
  if (direct.length === 1) native = direct[0];
  else {
    identity = resolveOriginAliasPair(entry, reference, candidate, input);
    assert.equal(identity.status, 'mapped'); assert.equal(identity.candidateNode, ast.key);
    native = one(reference.nodes.filter(n => n.key === identity.referenceNode));
  }
  assert.equal(native.type, input.referenceStructure.type);
  assert.equal(ast.authored.type, input.astylarStructure.type);
  const expected = input.id === 'table-primary' ? 'border-box' : 'content-box';
  if (input.id === 'table-primary') {
    assert.equal(entry.family, 'table'); assert.equal(native.type, 'table'); assert.equal(ast.authored.type, 'table');
  }
  for (const [key, value] of Object.entries(input.reference)) assert.equal(reference.styles[native.style][key], value);
  assert.equal(input.reference.boxSizing, expected);
  for (const n of [native, ast]) {
    assert.equal(relevant(n.inline ?? n.authored?.style), false);
    assert.ok(!/(?:^|;)\s*(?:box-sizing|all)\s*:/i.test(n.attributes?.style ?? n.authored?.attributes?.style ?? ''));
  }
  assert.deepEqual(native.rules.map(i => reference.rules[i]).filter(r => r.active && relevant(r.declarations)), []);
  assert.deepEqual(candidate.rules.filter(r => rootInitialSelectorCanApply(r.selector, ast.authored) && relevant(r)), []);
  for (const [stage, scalar] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
    assert.deepEqual(ast[stage], input[scalar]); assert.equal(Object.hasOwn(ast[stage], 'boxSizing'), false);
  }
  return { element: input.id, referenceNode: native.key, candidateNode: ast.key,
    referenceType: native.type, candidateType: ast.authored.type, identity: identity ?? { status: 'direct-id' },
    referenceComputed: expected, candidateBoxSizing: '<omitted>',
    classification: 'computed-browser-versus-local-omission', inputEquivalent: false,
    nativeUserAgentRuleCaptured: false, candidateComputedVerified: false, usedGeometryVerified: false,
    rendererCauseProven: false, renderingEquivalent: false };
}
