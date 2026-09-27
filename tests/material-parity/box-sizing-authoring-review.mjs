import assert from 'node:assert/strict';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

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
