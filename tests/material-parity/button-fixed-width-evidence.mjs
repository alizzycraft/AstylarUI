import assert from 'node:assert/strict';
import { inspectButtonFlexInput } from './button-flex-input-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

export const buttonFixedWidths = { 'core-primary': '212.234375px', 'button-primary': '141px',
  'button-secondary': '117px', 'button-disabled': '103px', 'menu-primary': '120px',
  'bottom-sheet-primary': '169px', 'dialog-primary': '124px', 'snack-bar-primary': '145px',
  'tooltip-primary': '138px' };
const relevant = d => Object.keys(d ?? {}).some(k => ['width', 'inlinesize', 'all']
  .includes(k.replaceAll('-', '').toLowerCase()));
const one = v => { assert.equal(v.length, 1); return v[0]; };

// Width input equivalence must be checked even when measured values normalize
// to the same scalar. No value tolerance can turn a fixed request into omission.
export function inspectButtonFixedWidth(input, reference, candidate) {
  const base = inspectButtonFlexInput(input, reference, candidate);
  const r = one(reference.nodes.filter(n => n.key === base.referenceNode));
  const a = one(candidate.nodes.filter(n => n.key === base.candidateNode));
  assert.ok(Object.hasOwn(buttonFixedWidths, input.id));
  for (const n of [r, a]) {
    assert.equal(relevant(n.inline ?? n.authored.style), false);
    assert.ok(!/(?:^|;)\s*(?:width|inline-size|all)\s*:/i
      .test(n.attributes?.style ?? n.authored?.attributes?.style ?? ''));
  }
  assert.equal(r.rules.map(i => reference.rules[i]).filter(rule => rule.active && relevant(rule.declarations)).length, 0);
  assert.equal(input.referenceAuthored.filter(s => relevant(s.declarations)).length, 0);
  const rules = candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, a.authored) && relevant(rule));
  const expectedSelectors = input.id === 'button-primary' ? ['.material-button'] : ['.material-button', '#' + input.id];
  assert.deepEqual(rules.map(rule => rule.selector), expectedSelectors);
  const scalars = input.astylarAuthored.filter(s => relevant(s.declarations));
  assert.equal(scalars.length, rules.length);
  for (const rule of rules) {
    const { selector, ...declarations } = rule;
    const scalar = one(scalars.filter(s => s.selector === selector));
    assert.deepEqual(scalar.declarations, declarations);
    assert.deepEqual(Object.fromEntries(Object.entries(declarations).filter(([k]) => relevant({ [k]: true }))),
      { width: selector === '.material-button' ? '141px' : buttonFixedWidths[input.id] });
  }
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    assert.equal(a[stage].width, buttonFixedWidths[input.id]);
    assert.ok(Object.hasOwn(a[stage], 'width'));
  }
  assert.match(input.reference.width, /^\d+(?:\.\d+)?px$/);
  assert.ok(parseFloat(input.reference.width) > 0);
  return { element: input.id, referenceNode: r.key, candidateNode: a.key,
    source: base.source, revision: base.revision,
    referenceLabel: base.referenceLabel, candidateValue: base.candidateValue,
    referenceAuthoredWidth: '<omitted>', referenceComputedWidth: input.reference.width,
    candidateAuthoredWidth: buttonFixedWidths[input.id], candidateLocalWidth: input.astylar.width,
    candidateRules: rules,
    classification: 'application-plugin-authoring-defect', owner: 'Material showcase shared and ID-specific button width authoring',
    firstDivergence: 'omitted reference width request replaced with explicit fixed-pixel candidate width',
    inputEquivalent: false, candidateUsedLayoutVerified: false, originalRasterCauseProven: false,
    structuralEquivalenceVerified: false, renderingEquivalent: false };
}
