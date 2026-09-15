import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

export const rootShadowReferenceComputed = 'rgba(0, 0, 0, 0.133) 0px 2px 8px 0px';
export const rootShadowReferenceRequest = 'rgba(0, 0, 0, 0.133) 0px 2px 8px';
export const rootShadowCandidateRequest = '0 2px 8px rgba(0,0,0,0.14)';
const relevant = d => Object.keys(d ?? {}).some(k => ['boxshadow', 'all'].includes(k.replaceAll('-', '').toLowerCase()));
const one = values => { assert.equal(values.length, 1); return values[0]; };

// A narrow original-input proof, not a general shadow parser or paint oracle.
// The root's two authored requests differ before any geometry/projection work.
export function inspectRootShadowInput(entry, reference, candidate) {
  const id = `${entry.family}-root`, input = one(entry.styleInputs.filter(i => i.id === id));
  for (const tree of [reference, candidate]) {
    assert.equal(tree.schemaVersion, 1); assert.deepEqual(tree.errors, []);
    assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
  }
  const ref = one(reference.nodes.filter(n => n.attributes?.id === id));
  const ast = one(candidate.nodes.filter(n => n.authored?.id === id));
  assert.equal(ref.type, 'section'); assert.equal(ast.authored.type, 'section');
  assert.equal(input.referenceStructure.type, 'section'); assert.equal(input.astylarStructure.type, 'section');
  assert.equal(input.referenceStructure.schemaVersion, 2); assert.equal(input.astylarStructure.schemaVersion, 2);
  assert.equal(ref.ownText, ''); assert.equal(ast.authored.textContent, undefined);
  assert.ok(ref.attributes.class.split(/\s+/).includes('demo'));
  const frame = one(reference.nodes.filter(n => n.key === ref.parent));
  const page = one(candidate.nodes.filter(n => n.key === ast.parent));
  assert.equal(frame.type, 'main'); assert.equal(frame.parent, null);
  assert.ok(frame.attributes.class.split(/\s+/).includes('frame'));
  assert.equal(page.authored.type, 'main'); assert.equal(page.authored.id, 'page');
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.ok(Number.isInteger(candidate.resolvedStyleRevision) && candidate.resolvedStyleRevision >= 0);
  const computed = reference.styles[ref.style];
  assert.ok(Object.keys(input.reference).length === 89 && Object.entries(input.reference).every(([k, v]) => computed[k] === v),
    'all captured reference scalars must agree with the exact root');
  assert.equal(computed.boxShadow, rootShadowReferenceComputed);
  assert.equal(relevant(ref.inline), false);
  assert.ok(!/(?:^|;)\s*(?:box-shadow|all)\s*:/i.test(ref.attributes.style ?? ''));
  const refRules = ref.rules.map(i => reference.rules[i]).filter(r => r.active && relevant(r.declarations));
  const refRule = one(refRules);
  assert.match(refRule.selector, /^\.demo(?:\[_ngcontent-[\w-]+\])?$/);
  assert.deepEqual(refRule.declarations['box-shadow'], { value: rootShadowReferenceRequest, important: false });
  assert.ok(!Object.hasOwn(refRule.declarations, 'all'));
  assert.equal(relevant(ast.authored.style), false);
  assert.ok(!/(?:^|;)\s*(?:box-shadow|all)\s*:/i.test(ast.authored.attributes?.style ?? ''));
  const astRule = one(candidate.rules.filter(r => rootInitialSelectorCanApply(r.selector, ast.authored) && relevant(r)));
  assert.equal(astRule.selector, '#' + id); assert.equal(astRule.boxShadow, rootShadowCandidateRequest);
  assert.deepEqual(Object.keys(astRule).filter(k => relevant({ [k]: true })), ['boxShadow']);
  const declared = one(input.astylarAuthored.filter(r => relevant(r.declarations)));
  const { selector, ...declarations } = astRule;
  assert.equal(declared.selector, selector); assert.ok(isDeepStrictEqual(declared.declarations, declarations));
  for (const [treeStage, scalarStage] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
    assert.ok(isDeepStrictEqual(ast[treeStage], input[scalarStage]), `exact ${treeStage} scalar/root join`);
    assert.equal(ast[treeStage].boxShadow, rootShadowCandidateRequest);
  }
  return { element: id, property: 'boxShadow', reference: computed.boxShadow, candidate: input.astylar.boxShadow,
    referenceNode: ref.key, candidateNode: ast.key, source: candidate.resolvedStyleSource, revision: candidate.resolvedStyleRevision,
    referenceRule: { selector: refRule.selector, active: refRule.active, conditions: refRule.conditions,
      request: refRule.declarations['box-shadow'] }, candidateRule: { selector, request: astRule.boxShadow },
    classification: 'application-plugin-authoring-defect', firstDivergence: 'authored shadow color alpha',
    owner: 'Material showcase shared container authoring', inputEquivalent: false,
    originalRasterCauseProven: false, candidateUsedPaintVerified: false, renderingEquivalent: false };
}
