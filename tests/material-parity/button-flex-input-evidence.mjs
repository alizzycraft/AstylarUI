import assert from 'node:assert/strict';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

export const buttonFlexReference = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
export const buttonFlexCandidate = { display: 'block', alignItems: 'stretch', justifyContent: 'flex-start' };
const relevant = d => Object.keys(d ?? {}).some(k => ['display', 'alignitems', 'justifycontent',
  'placeitems', 'placecontent', 'all'].includes(k.replaceAll('-', '').toLowerCase()));
const one = v => { assert.equal(v.length, 1); return v[0]; };
const classHas = (n, c) => String(n.attributes?.class ?? n.authored?.class ?? '').split(/\s+/).includes(c);

export function inspectButtonFlexInput(input, reference, candidate) {
  for (const t of [reference, candidate]) {
    assert.equal(t.schemaVersion, 1); assert.deepEqual(t.errors, []);
    assert.equal(new Set(t.nodes.map(n => n.key)).size, t.nodes.length);
  }
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.ok(Number.isInteger(candidate.resolvedStyleRevision) && candidate.resolvedStyleRevision >= 0);
  const r = one(reference.nodes.filter(n => n.attributes?.id === input.id));
  const a = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  assert.equal(r.type, 'button'); assert.equal(a.authored.type, 'button');
  assert.ok(classHas(r, 'mdc-button')); assert.ok(classHas(a, 'material-button'));
  for (const structure of [input.referenceStructure, input.astylarStructure]) {
    assert.equal(structure.schemaVersion, 2); assert.equal(structure.type, 'button');
  }
  const computed = reference.styles[r.style];
  assert.equal(Object.keys(input.reference).length, 89);
  assert.ok(Object.entries(input.reference).every(([k, v]) => computed[k] === v));
  for (const n of [r, a]) {
    assert.equal(relevant(n.inline ?? n.authored.style), false);
    assert.ok(!/(?:^|;)\s*(?:display|align-items|justify-content|place-items|place-content|all)\s*:/i
      .test(n.attributes?.style ?? n.authored?.attributes?.style ?? ''));
  }
  const rule = one(r.rules.map(i => reference.rules[i]).filter(r => r.active && relevant(r.declarations)));
  assert.equal(rule.selector, '.mdc-button'); assert.deepEqual(rule.conditions, []);
  const requests = Object.fromEntries(Object.entries(rule.declarations).filter(([k]) => relevant({ [k]: true })));
  assert.deepEqual(requests, { display: { value: 'inline-flex', important: false },
    'align-items': { value: 'center', important: false }, 'justify-content': { value: 'center', important: false } });
  const scalarRule = one(input.referenceAuthored.filter(r => relevant(r.declarations)));
  assert.equal(scalarRule.selector, rule.selector); assert.deepEqual(scalarRule.declarations, rule.declarations);
  assert.equal(candidate.rules.filter(r => rootInitialSelectorCanApply(r.selector, a.authored) && relevant(r)).length, 0);
  assert.equal(input.astylarAuthored.filter(r => relevant(r.declarations)).length, 0);
  for (const [treeStage, scalarStage] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
    assert.deepEqual(a[treeStage], input[scalarStage]);
    for (const [p, v] of Object.entries(buttonFlexCandidate)) assert.equal(a[treeStage][p], v);
  }
  for (const [p, v] of Object.entries(buttonFlexReference)) assert.equal(computed[p], v);
  const label = one(reference.nodes.filter(n => n.parent === r.key && classHas(n, 'mdc-button__label')));
  assert.equal(label.type, 'span'); assert.equal(label.ownText, a.authored.value);
  assert.equal(input.referenceStructure.text, label.ownText); assert.equal(input.astylarStructure.text, a.authored.value);
  assert.deepEqual(candidate.nodes.filter(n => n.parent === a.key), []);
  return { element: input.id, referenceNode: r.key, candidateNode: a.key,
    referenceLabel: { key: label.key, type: label.type, ownText: label.ownText }, candidateValue: a.authored.value,
    source: candidate.resolvedStyleSource, revision: candidate.resolvedStyleRevision,
    referenceRule: { selector: rule.selector, requests }, candidateAuthoredFormatting: '<omitted>',
    properties: Object.entries(buttonFlexReference).map(([property, value]) => ({ property,
      reference: value, candidateLocal: buttonFlexCandidate[property] })),
    classification: 'application-plugin-authoring-defect', firstDivergence: 'explicit Material flex formatting omitted from button translation',
    owner: 'Material showcase shared button authoring', inputEquivalent: false,
    candidateUsedLayoutVerified: false, originalRasterCauseProven: false, renderingEquivalent: false };
}
