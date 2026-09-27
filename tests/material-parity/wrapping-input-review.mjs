import assert from 'node:assert/strict';
import { applyModalBoxReview } from './modal-position-inspection.mjs';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';

export const explicitNowrapTargets = Object.freeze({
  'card-title': ['card', '.card-title', 52],
  'card-copy': ['card', '.card-copy', 52],
  'paginator-range': ['paginator', '#paginator-size, #paginator-page-size, #paginator-range', 52],
  'paginator-size': ['paginator', '#paginator-size, #paginator-page-size, #paginator-range', 52],
  'checkbox-label': ['checkbox', '.checkbox-label', 68],
  'slide-toggle-label': ['slide-toggle', '.switch-label', 68],
});
export const explicitNowrapAttribution = 'reviewed-explicit-nowrap-input-substitution';
const one = xs => { assert.equal(xs.length, 1); return xs[0]; };
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;

// Authored mismatch only. Keep owner types and every local stage; do not infer
// a used width, raster wrapping failure, or deliberate compensation intent.
export function proveExplicitNowrap(entry, input, reference, candidate) {
  const [family, selector] = explicitNowrapTargets[input.id];
  assert.equal(entry.family, family);
  const ast = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  let native;
  if (family === 'paginator') {
    const identity = resolveOriginAliasPair(entry, reference, candidate, input);
    assert.equal(identity.status, 'mapped');
    assert.deepEqual(identity.missingRules, []); assert.deepEqual(identity.extraRules, []);
    assert.equal(identity.candidateNode, ast.key);
    native = one(reference.nodes.filter(n => n.key === identity.referenceNode));
  } else native = one(reference.nodes.filter(n => n.attributes?.id === input.id));
  assert.equal(native.type, input.referenceStructure.type);
  assert.equal(ast.authored.type, input.astylarStructure.type);
  assert.equal(reference.styles[native.style].whiteSpace, 'normal');
  assert.equal(input.reference.whiteSpace, 'normal');
  for (const [stage, scalar] of [
    ['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle'],
  ]) {
    assert.deepEqual(ast[stage], input[scalar]);
    assert.equal(ast[stage].whiteSpace, 'nowrap');
  }
  assert.ok(candidate.rules.some(r => r.selector === selector && r.whiteSpace === 'nowrap'));
  return { case: keyOf(entry), element: input.id, referenceNode: native.key,
    astylarNode: ast.key, referenceType: native.type, candidateType: ast.authored.type,
    selector, reference: 'normal', candidate: 'nowrap',
    classification: 'application-plugin-authoring-defect',
    inputEquivalent: false, rendererCauseProven: false, renderingEquivalent: false };
}

export function applyExplicitNowrap(rows, cases, inventory, normalize) {
  return Object.entries(explicitNowrapTargets).reduce((values, [element, [family]]) =>
    applyModalBoxReview(values, cases, inventory, normalize, {
      family, element, properties: ['whiteSpace'], attribution: explicitNowrapAttribution,
      owner: 'showcase Material fixture text-wrapping input authoring',
      justification: 'The complete original owner/state population retains native normal wrapping versus an explicit candidate nowrap rule at comparison, normal and effective stages. Preserve unequal owner structure separately. The declaration predates later layout fixes; historical persistence does not prove that it deliberately concealed a renderer defect. This establishes unequal wrapping inputs, not responsive output or a renderer cause.',
      prove: (entry, reference, candidate) => proveExplicitNowrap(entry,
        one(entry.styleInputs.filter(i => i.id === element)), reference, candidate),
    }), rows);
}

export function validateExplicitNowrap(rows, originalRows, cases, inventory, normalize) {
  try {
    const selected = values => values.filter(r => r.attribution === explicitNowrapAttribution);
    assert.deepEqual(selected(rows), selected(applyExplicitNowrap(originalRows, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`explicit nowrap inputs do not replay from original owners: ${error.message}`]; }
}
