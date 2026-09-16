import assert from 'node:assert/strict';
import { inspectButtonFlexInput } from './button-flex-input-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

export const buttonHostRequests = { position: 'relative', minWidth: '64px', verticalAlign: 'middle' };
const relevant = d => Object.keys(d ?? {}).some(k => ['position', 'minwidth', 'mininlinesize',
  'verticalalign', 'all'].includes(k.replaceAll('-', '').toLowerCase()));
const one = v => { assert.equal(v.length, 1); return v[0]; };
const project = d => Object.fromEntries(Object.entries(d ?? {}).filter(([k]) => relevant({ [k]: true })));

// This original-input proof reuses exact owner/scalar/stage joins, not the
// earlier flex classification. Host requests are not text-paint defaults.
export function inspectButtonHostRequests(input, reference, candidate) {
  const base = inspectButtonFlexInput(input, reference, candidate);
  const r = one(reference.nodes.filter(n => n.key === base.referenceNode));
  const a = one(candidate.nodes.filter(n => n.key === base.candidateNode));
  const coreAbsolute = input.id === 'core-primary';
  for (const n of [r, a]) {
    assert.equal(relevant(n.inline ?? n.authored.style), false);
    assert.ok(!/(?:^|;)\s*(?:position|min-width|min-inline-size|vertical-align|all)\s*:/i
      .test(n.attributes?.style ?? n.authored?.attributes?.style ?? ''));
  }
  const referenceRules = r.rules.map(i => reference.rules[i]).filter(rule => rule.active && relevant(rule.declarations));
  assert.deepEqual(referenceRules.map(rule => rule.selector).sort(), coreAbsolute ? ['.mat-ripple', '.mdc-button'] : ['.mdc-button']);
  for (const rule of referenceRules) {
    assert.deepEqual(rule.conditions, []);
    assert.deepEqual(project(rule.declarations), rule.selector === '.mdc-button'
      ? { position: { value: 'relative', important: false }, 'min-width': { value: '64px', important: false },
        'vertical-align': { value: 'middle', important: false } }
      : { position: { value: 'relative', important: false } });
    const scalar = one(input.referenceAuthored.filter(s => s.selector === rule.selector));
    assert.deepEqual(scalar.declarations, rule.declarations);
  }
  assert.equal(input.referenceAuthored.filter(s => relevant(s.declarations)).length, referenceRules.length);
  for (const [p, value] of Object.entries(buttonHostRequests)) assert.equal(input.reference[p], value);
  const candidateRules = candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, a.authored) && relevant(rule));
  assert.equal(candidateRules.length, coreAbsolute ? 1 : 0);
  const candidateScalars = input.astylarAuthored.filter(s => relevant(s.declarations));
  assert.equal(candidateScalars.length, candidateRules.length);
  if (coreAbsolute) {
    const { selector, ...declarations } = candidateRules[0];
    assert.equal(selector, '#core-primary');
    assert.deepEqual(project(declarations), { position: 'absolute' });
    assert.deepEqual(candidateScalars[0], { index: candidateScalars[0].index, selector, declarations });
  }
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    assert.equal(a[stage].position, coreAbsolute ? 'absolute' : undefined);
    for (const p of Object.keys(buttonHostRequests))
      assert.equal(Object.hasOwn(a[stage], p), coreAbsolute && p === 'position');
  }
  return { element: input.id, referenceNode: r.key, candidateNode: a.key,
    source: base.source, revision: base.revision,
    referenceLabel: base.referenceLabel, candidateValue: base.candidateValue,
    referenceRules: referenceRules.map(rule => ({ selector: rule.selector, requests: project(rule.declarations) })),
    candidateRules,
    properties: Object.entries(buttonHostRequests).map(([property, value]) => ({ property,
      reference: value, candidateLocal: input.astylar[property] ?? null,
      candidateOwnStageAbsent: !Object.hasOwn(input.astylar, property),
      firstDivergence: coreAbsolute && property === 'position' ? 'relative host replaced by explicit absolute positioning'
        : 'explicit reference host request omitted from candidate authoring' })),
    classification: 'application-plugin-authoring-defect', owner: 'Material showcase shared button and core demo authoring',
    inputEquivalent: false, candidateUsedLayoutVerified: false, originalRasterCauseProven: false,
    structuralEquivalenceVerified: false, renderingEquivalent: false };
}
