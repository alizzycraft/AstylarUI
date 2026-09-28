import assert from 'node:assert/strict';
import { inspectSliderInputBox } from './slider-input-box-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { applyModalBoxReview } from './modal-position-inspection.mjs';

const relevant = key => /^(all|position|top|right|bottom|left)$|^inset/.test(key.replaceAll('-', '').toLowerCase());
export function proveSliderPositionRequests(entry, reference, candidate, element) {
  assert.equal(entry.family, 'slider');
  const inputs = entry.styleInputs.filter(i => i.id === element); assert.equal(inputs.length, 1);
  const input = inputs[0], visual = element === 'slider-visual';
  let identity;
  if (visual) {
    const native = reference.nodes.filter(n => n.attributes?.id === element || n.attributes?.['data-parity-id'] === element);
    const target = candidate.nodes.filter(n => n.authored?.id === element);
    assert.equal(native.length, 1); assert.equal(target.length, 1);
    assert.equal(native[0].type, 'mat-slider'); assert.equal(target[0].authored.type, 'showcase.material:range-visual');
    for (const [k, v] of Object.entries(input.reference)) assert.deepEqual(reference.styles[native[0].style][k], v);
    assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
    for (const [scalar, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'], ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']])
      assert.deepEqual(input[scalar], target[0][stage]);
    identity = { referenceNode: native[0].key, astylarNode: target[0].key, inputEquivalent: false };
  } else identity = inspectSliderInputBox(entry, input, reference, candidate);
  assert.ok(identity);
  const referenceNode = visual ? identity.referenceNode : identity.reference.node;
  const astylarNode = visual ? identity.astylarNode : identity.candidate.node;
  const r = reference.nodes.find(n => n.key === referenceNode), a = candidate.nodes.find(n => n.key === astylarNode);
  assert.equal(reference.ruleEvidenceComplete, true); assert.equal(candidate.ruleEvidenceComplete, true);
  const rules = r.rules.map(i => reference.rules[i]);
  const requested = Object.fromEntries(Object.entries(r.inline).filter(([k]) => relevant(k)));
  assert.deepEqual(requested, visual ? {} : element === 'slider-start'
    ? { left: { value: '-21px', important: false }, right: { value: 'auto', important: false } }
    : { left: { value: 'auto', important: false }, right: { value: '-21px', important: false } });
  for (const rule of rules.filter(r => r.active)) {
    assert.doesNotMatch(rule.cssText, /\\|(?:^|[;{])\s*(?:all|inset[\w-]*|bottom)\s*:/i);
    assert.ok(!Object.keys(rule.declarations).some(k => /^(all|bottom)$|^inset/.test(k)));
  }
  assert.equal(a.authored.style, undefined); assert.equal(a.authored.attributes?.style, undefined);
  const own = candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, a.authored));
  const requests = own.flatMap(({ selector, ...d }) => Object.entries(d).filter(([k]) => relevant(k)).map(([property, value]) => ({ selector, property, value })));
  assert.deepEqual(requests, visual ? [] : [
    { selector: '.range-layer', property: 'position', value: 'absolute' },
    { selector: '.range-layer', property: 'top', value: '0' },
    { selector: '.range-layer', property: 'left', value: '0' },
    { selector: '#' + element, property: 'top', value: '2px' },
    { selector: '#' + element, property: 'left', value: element === 'slider-start' ? '0' : '50%' },
  ]);
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    const values = Object.fromEntries(Object.entries(a[stage]).filter(([k]) => relevant(k)));
    assert.deepEqual(values, visual ? {} : { position: 'absolute', top: '2px', left: element === 'slider-start' ? '0' : '50%' });
  }
  const native = reference.styles[r.style];
  assert.equal(native.bottom, visual ? '0px' : '2px');
  if (!visual) {
    const declarations = rules.filter(r => r.active).flatMap(r => Object.entries(r.declarations).filter(([k]) => relevant(k)).map(([property, d]) => ({ selector: r.selector, property, ...d })));
    const expected = [['left', '2px'], ['position', 'absolute'], ['top', '2px']].map(([property, value]) => ({ selector: '.mdc-slider__input', property, value, important: false }));
    if (element === 'slider-primary') expected.push(...[['left', 'auto'], ['right', '0px']].map(([property, value]) => ({ selector: '.mdc-slider__input.mat-slider__right-input', property, value, important: false })));
    assert.deepEqual(declarations, expected);
  }
  if (visual) {
    assert.deepEqual(r.inline, {});
    const declarations = rules.filter(r => r.active).flatMap(r => Object.entries(r.declarations).filter(([k]) => relevant(k)).map(([property, d]) => ({ selector: r.selector, property, ...d })));
    assert.deepEqual(declarations, [{ selector: '.mat-mdc-slider', property: 'position', value: 'relative', important: false }]);
    for (const p of ['top', 'right', 'bottom', 'left']) assert.equal(native[p], '0px');
  }
  return { referenceNode, astylarNode, identity, referenceInline: r.inline, referenceRules: rules,
    referenceComputed: native, candidateRequests: requests, candidateStages: [a.resolvedStyle, a.normalResolvedStyle, a.interactionResolvedStyle],
    inputEquivalent: false, renderingEquivalent: false, dragCauseProven: false, candidateUsedOffsetsVerified: false };
}
export function applySliderPositionReviews(rows, cases, inventory, normalize) {
  for (const element of ['slider-primary', 'slider-start', 'slider-visual']) {
    const prove = (entry, r, a) => proveSliderPositionRequests(entry, r, a, element);
    rows = applyModalBoxReview(rows, cases, inventory, normalize, {
      family: 'slider', element, properties: element === 'slider-visual' ? ['position'] : [element === 'slider-start' ? 'left' : 'right'], prove,
      attribution: 'reviewed-slider-position-request-substitution', owner: 'range hit-region and visual-host authoring',
      justification: 'Original native range owners explicitly request edge offsets of -21px; the candidate fixes the start at zero and omits the end right offset while authoring fixed half-width layers. The native slider host requests relative positioning but the visual plugin omits it. These are unequal requests, not renderer projection evidence or proof of swapped dragging; do not copy sampled pixel geometry as a remedy.',
    });
    rows = applyModalBoxReview(rows, cases, inventory, normalize, {
      family: 'slider', element, properties: element === 'slider-visual' ? ['top', 'right', 'bottom', 'left'] : element === 'slider-start' ? ['bottom', 'right'] : ['bottom'], prove,
      classification: 'parity-harness-defect', attribution: 'reviewed-slider-computed-offset-boundary', owner: 'computed native offsets versus local candidate declarations',
      justification: 'Native computed pixel offsets are compared with omitted candidate local declarations. Native start right is explicitly auto, input bottom is not authored, and the relatively positioned native visual host has no authored insets. Preserve computed values without treating them as missing literal CSS requests. Other position/size substitutions and candidate used offsets remain separate; drag and rendering correctness are unproven.',
    });
  }
  return rows;
}
