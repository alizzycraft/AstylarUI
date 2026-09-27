import assert from 'node:assert/strict';
import { applyModalBoxReview } from './modal-position-inspection.mjs';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

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

export const omittedNowrapTargets = Object.freeze({
  'tab-overview': ['tabs', 70], 'tab-activity': ['tabs', 70],
  'toolbar-action': ['toolbar', 52], 'toolbar-primary': ['toolbar', 52],
  'badge-count': ['badge', 52], 'button-toggle-one': ['button-toggle', 68],
  'button-toggle-two': ['button-toggle', 68], 'button-toggle-primary': ['button-toggle', 68],
});
export const omittedNowrapAttribution = 'reviewed-native-nowrap-request-omission';
const ancestry = (tree, node) => {
  const result = [], seen = new Set();
  while (node) {
    assert.ok(!seen.has(node.key)); seen.add(node.key); result.push(node);
    if (node.parent === null) return result;
    node = one(tree.nodes.filter(n => n.key === node.parent));
  }
  assert.fail('incomplete ancestry');
};
const wrappingRequest = key => ['whitespace', 'whitespacecollapse', 'textwrap',
  'textwrapmode', 'textwrapstyle', 'all'].includes(key.replaceAll('-', '').toLowerCase());

export function proveOmittedNowrap(entry, input, reference, candidate, inventory) {
  assert.equal(entry.family, omittedNowrapTargets[input.id][0]);
  const ast = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  let native;
  if (input.id === 'badge-count') {
    const identity = resolveOriginAliasPair(entry, reference, candidate, input);
    assert.equal(identity.status, 'mapped');
    assert.deepEqual(identity.missingRules, []); assert.deepEqual(identity.extraRules, []);
    assert.equal(identity.candidateNode, ast.key);
    native = one(reference.nodes.filter(n => n.key === identity.referenceNode));
  } else native = one(reference.nodes.filter(n => n.attributes?.id === input.id));
  assert.equal(native.type, input.referenceStructure.type);
  assert.equal(ast.authored.type, input.astylarStructure.type);
  assert.equal(input.reference.whiteSpace, 'nowrap');
  assert.equal(reference.styles[native.style].whiteSpace, 'nowrap');
  const rp = ancestry(reference, native), ap = ancestry(candidate, ast);
  const requests = rp.flatMap(n => n.rules.map(i => reference.rules[i])
    .filter(rule => rule.active && rule.declarations['white-space-collapse']?.value === 'collapse' &&
      rule.declarations['text-wrap-mode']?.value === 'nowrap')
    .map(rule => ({ node: n.key, selector: rule.selector,
      declarations: Object.fromEntries(Object.entries(rule.declarations).filter(([key]) => wrappingRequest(key))) })));
  assert.ok(requests.length);
  for (const [stage, scalar] of [
    ['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle'],
  ]) assert.deepEqual(ast[stage], input[scalar]);
  // Inspect only captured nodes, never assign a computed default to the
  // synthetic root. Reject a relevant request rather than assuming inheritance.
  const captured = ap.filter(n => n.key !== 'root');
  for (const n of captured) {
    for (const style of [n.authored.style ?? {}, n.resolvedStyle, n.normalResolvedStyle, n.interactionResolvedStyle]) {
      assert.ok(style); assert.ok(!Object.keys(style).some(wrappingRequest));
    }
    assert.ok(!/(?:^|;)\s*(?:white-space(?:-collapse)?|text-wrap(?:-mode|-style)?|all)\s*:/i.test(n.authored.attributes?.style ?? ''));
    for (const rule of candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, n.authored)))
      assert.ok(!Object.keys(rule).some(wrappingRequest));
  }
  let paint;
  if (['tab-overview', 'tab-activity', 'toolbar-action'].includes(input.id)) {
    assert.equal(ast.paintedControlText?.source, 'core-control-texture');
    assert.equal(ast.paintedControlText.text, ast.authored.value);
    const style = inventory.styles[ast.paintedControlText.style];
    assert.equal(style.side, 'astylar'); assert.equal(style.value.whiteSpace, 'normal');
    paint = { source: ast.paintedControlText.source, text: ast.paintedControlText.text, whiteSpace: 'normal' };
  } else assert.equal(ast.paintedControlText, undefined);
  return { case: keyOf(entry), element: input.id, referenceNode: native.key, astylarNode: ast.key,
    referenceType: native.type, candidateType: ast.authored.type, requests,
    referencePath: rp.map(n => n.key), candidateCapturedPath: captured.map(n => n.key),
    reference: 'nowrap', candidateLocalDeclaration: '<omitted>', ...(paint ? { paint } : {}),
    candidateComputedVerified: false, inputEquivalent: false, rendererCauseProven: false,
    renderingEquivalent: false, externalInheritanceVerified: false };
}

export function applyOmittedNowrap(rows, cases, inventory, normalize) {
  return Object.entries(omittedNowrapTargets).reduce((values, [element, [family]]) =>
    applyModalBoxReview(values, cases, inventory, normalize, {
      family, element, properties: ['whiteSpace'], attribution: omittedNowrapAttribution,
      owner: 'showcase Material native text-owner wrapping request translation',
      justification: 'Native owner ancestry explicitly supplies collapse/nowrap while candidate captured ancestry and applicable author rules omit the wrapping request. Local omission is not normalized to a computed value. Only tab and toolbar-action controls have separate captured normal paint values; wrapper and retained text observations do not inherit that conclusion. Preserve external inheritance, unequal structure, responsive wrapping and renderer correctness as separate obligations.',
      prove: (entry, reference, candidate) => proveOmittedNowrap(entry,
        one(entry.styleInputs.filter(i => i.id === element)), reference, candidate, inventory),
    }), rows);
}

export function validateOmittedNowrap(rows, originalRows, cases, inventory, normalize) {
  try {
    const selected = values => values.filter(r => r.attribution === omittedNowrapAttribution);
    assert.deepEqual(selected(rows), selected(applyOmittedNowrap(originalRows, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`omitted native nowrap requests do not replay from original owners: ${error.message}`]; }
}
