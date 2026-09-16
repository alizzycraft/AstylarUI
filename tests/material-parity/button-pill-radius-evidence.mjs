import assert from 'node:assert/strict';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

export const buttonRadiusProperties = ['borderTopLeftRadius', 'borderTopRightRadius',
  'borderBottomRightRadius', 'borderBottomLeftRadius'];
const relevant = d => Object.keys(d ?? {}).some(k => /radius|^all$/i.test(k));
const one = values => { assert.equal(values.length, 1); return values[0]; };
export const selectedButtonInputs = entry => (entry.styleInputs ?? [])
  .filter(i => i.astylarAuthored?.some(r => r.selector === '.material-button'));

// Original authored/resolved radius proof only. No used-paint value is inferred
// from the fixed height or from a renderer mesh helper.
export function inspectButtonPillRadius(entry, input, reference, candidate) {
  const id = input.id;
  for (const t of [reference, candidate]) {
    assert.equal(t.schemaVersion, 1); assert.deepEqual(t.errors, []);
    assert.equal(new Set(t.nodes.map(n => n.key)).size, t.nodes.length);
  }
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2);
  assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.ok(Number.isInteger(candidate.resolvedStyleRevision) && candidate.resolvedStyleRevision >= 0);
  const ref = one(reference.nodes.filter(n => n.attributes?.id === id));
  const ast = one(candidate.nodes.filter(n => n.authored?.id === id));
  assert.equal(ref.type, 'button'); assert.equal(ast.authored.type, 'button');
  for (const structure of [input.referenceStructure, input.astylarStructure]) {
    assert.equal(structure.schemaVersion, 2); assert.equal(structure.type, 'button');
  }
  assert.ok(ast.authored.class.split(/\s+/).includes('material-button'));
  assert.ok(ref.attributes.class.split(/\s+/).includes('mdc-button'));
  const computed = reference.styles[ref.style];
  assert.equal(Object.keys(input.reference).length, 89);
  assert.ok(Object.entries(input.reference).every(([k, v]) => computed[k] === v));
  for (const n of [ref, ast]) {
    assert.equal(relevant(n.inline ?? n.authored.style), false);
    assert.ok(!/(?:^|;)\s*(?:[^:;]*radius|all)\s*:/i.test(n.attributes?.style ?? n.authored?.attributes?.style ?? ''));
  }
  const rule = one(ref.rules.map(i => reference.rules[i]).filter(r => r.active && relevant(r.declarations)));
  assert.deepEqual(rule.conditions, []);
  const variant = ref.attributes.class.split(/\s+/).includes('mat-mdc-outlined-button') ? 'outlined' : 'filled';
  assert.deepEqual(rule.cssText.split(';').map(s => s.trim()).filter(s => /^(?:[^:]*radius|all)\s*:/.test(s)),
    [`border-radius: var(--mat-button-${variant}-container-shape, var(--mat-sys-corner-full))`]);
  assert.deepEqual(Object.keys(rule.declarations).filter(k => relevant({ [k]: true })).sort(), buttonRadiusProperties
    .map(p => p.replace(/[A-Z]/g, c => '-' + c.toLowerCase())).sort());
  // CSSOM longhands are empty for a var()-containing shorthand. Retain the
  // actual cssText; empty serialized longhands are not absent authoring.
  for (const [key, d] of Object.entries(rule.declarations).filter(([k]) => relevant({ [k]: true })))
    assert.deepEqual(d, { value: '', important: false }, key);
  const scalarRule = one(input.referenceAuthored.filter(r => relevant(r.declarations)));
  assert.equal(scalarRule.selector, rule.selector);
  assert.deepEqual(scalarRule.declarations, rule.declarations);
  const astRule = one(candidate.rules.filter(r => rootInitialSelectorCanApply(r.selector, ast.authored) && relevant(r)));
  assert.equal(astRule.selector, '.material-button');
  assert.deepEqual(Object.keys(astRule).filter(k => relevant({ [k]: true })), ['borderRadius']);
  const expected = { light: ['20px', '40px'], dark: ['20px', '40px'],
    contrast: ['15px', '24px'], custom: ['30px', '28px'] }[entry.profile];
  assert.ok(expected); assert.equal(astRule.borderRadius, expected[0]);
  const declared = one(input.astylarAuthored.filter(r => relevant(r.declarations)));
  const { selector, ...declarations } = astRule;
  assert.equal(declared.selector, selector); assert.deepEqual(declared.declarations, declarations);
  for (const [treeStage, scalarStage] of [['resolvedStyle', 'astylar'],
    ['normalResolvedStyle', 'astylarNormalResolvedStyle'], ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
    assert.deepEqual(ast[treeStage], input[scalarStage]);
    assert.equal(ast[treeStage].borderRadius, expected[0]);
    assert.equal(ast[treeStage].height, expected[1]);
  }
  assert.equal(computed.height, expected[1]);
  for (const p of buttonRadiusProperties) assert.equal(computed[p], '9999px');
  return { element: id, referenceNode: ref.key, candidateNode: ast.key,
    source: candidate.resolvedStyleSource, revision: candidate.resolvedStyleRevision,
    referenceRule: { selector: rule.selector, cssText: rule.cssText, declarations: rule.declarations },
    candidateRule: { selector, borderRadius: astRule.borderRadius },
    referenceHeight: computed.height, candidateHeightDeclaration: astRule.height,
    properties: buttonRadiusProperties.map(property => ({ property, reference: computed[property], candidate: astRule.borderRadius })),
    classification: 'application-plugin-authoring-defect', firstDivergence: 'full-pill token replaced by fixed theme-scaled radius',
    owner: 'Material showcase shared button authoring', authoredIntentEquivalent: false,
    currentBrowserShapeMayCoincide: true, candidateUsedPaintVerified: false,
    originalRasterCauseProven: false, renderingEquivalent: false };
}
