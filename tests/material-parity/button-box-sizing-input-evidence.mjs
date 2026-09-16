import assert from 'node:assert/strict';
import { inspectButtonFixedWidth } from './button-fixed-width-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

const relevant = d => Object.keys(d ?? {}).some(k => ['boxsizing', 'all'].includes(k.replaceAll('-', '').toLowerCase()));
const one = rows => { assert.equal(rows.length, 1); return rows[0]; };
const px = value => { assert.match(value, /^\d+(?:\.\d+)?px$/); return Number.parseFloat(value); };

export function inspectButtonBoxSizingInput(input, reference, candidate, entry) {
  // Reuse exact full-tree/scalar/three-stage joins and preserve the independent
  // intrinsic-versus-fixed width finding. A box-model result cannot erase it.
  const base = inspectButtonFixedWidth(input, reference, candidate);
  const r = one(reference.nodes.filter(n => n.key === base.referenceNode));
  const a = one(candidate.nodes.filter(n => n.key === base.candidateNode));
  for (const n of [r, a]) {
    assert.equal(relevant(n.inline ?? n.authored.style), false);
    assert.ok(!/(?:^|;)\s*(?:box-sizing|all)\s*:/i.test(n.attributes?.style ?? n.authored?.attributes?.style ?? ''));
  }
  const rule = one(r.rules.map(i => reference.rules[i]).filter(rule => rule.active && relevant(rule.declarations)));
  assert.equal(rule.selector, '.mdc-button'); assert.deepEqual(rule.conditions, []);
  assert.deepEqual(Object.fromEntries(Object.entries(rule.declarations).filter(([k]) => relevant({ [k]: true }))),
    { 'box-sizing': { value: 'border-box', important: false } });
  const scalarRule = one(input.referenceAuthored.filter(rule => relevant(rule.declarations)));
  assert.deepEqual(scalarRule.declarations, rule.declarations); assert.equal(scalarRule.selector, rule.selector);
  assert.equal(input.reference.boxSizing, 'border-box');
  assert.equal(candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, a.authored) && relevant(rule)).length, 0);
  assert.equal(input.astylarAuthored.filter(rule => relevant(rule.declarations)).length, 0);
  const localSize = { width: px(input.astylar.width), height: px(input.astylar.height) };
  assert.ok([24, 28, 40].includes(localSize.height));
  assert.equal(input.astylar.padding, '0 24px');
  assert.equal(input.astylar.borderWidth, input.id === 'button-secondary' ? '1px' : '0');
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    for (const key of ['boxSizing', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight'])
      assert.equal(Object.hasOwn(a[stage], key), false, `unexpected own-stage ${key}`);
    for (const key of ['width', 'height', 'padding', 'borderWidth']) assert.equal(a[stage][key], input.astylar[key]);
  }
  let geometry = null;
  if (entry.kind === 'static') {
    const measured = one(entry.geometry?.elements?.filter(g => g.id === input.id) ?? []);
    assert.equal(measured.missing, false);
    for (const side of ['expected', 'actual']) {
      const box = measured[side];
      for (const key of ['left', 'top', 'right', 'bottom', 'width', 'height']) assert.ok(Number.isFinite(box[key]));
      assert.ok(Math.abs(box.width - (box.right - box.left)) < .01);
      assert.ok(Math.abs(box.height - (box.bottom - box.top)) < .01);
    }
    for (const key of ['width', 'height']) {
      assert.ok(Math.abs(measured.expected[key] - px(input.reference[key])) < .01, `reference measured ${key}`);
      assert.ok(Math.abs(measured.actual[key] - localSize[key]) < .01, `candidate declared ${key}`);
    }
    geometry = measured;
  } else {
    assert.equal(entry.kind, 'interaction');
    assert.equal(Object.hasOwn(entry, 'geometry'), false, 'new interaction geometry requires explicit review');
  }
  return { element: input.id, referenceNode: r.key, candidateNode: a.key,
    source: base.source, revision: base.revision,
    referenceBoxSizing: 'border-box', candidateAuthoredBoxSizing: '<omitted>', candidateOwnStageAbsent: true,
    referenceRule: { selector: '.mdc-button', request: { 'box-sizing': { value: 'border-box', important: false } } },
    candidateLocalSize: localSize, candidateLocalPadding: input.astylar.padding, candidateLocalBorderWidth: input.astylar.borderWidth,
    referenceAuthoredWidth: base.referenceAuthoredWidth, candidateAuthoredWidth: base.candidateAuthoredWidth,
    widthAuthoringEquivalent: false, geometry,
    observedDeclaredBorderBox: geometry !== null,
    geometryGap: geometry ? null : 'Original interaction entry does not retain border-box geometry.',
    classification: 'observation-stage-difference-with-bounded-native-button-sizing-evidence',
    owner: 'Core declared-size consumption and audit observation-stage interpretation',
    publicProof: 'docs/material-button-box-sizing-public-proof.json',
    inputEquivalent: false, renderingEquivalent: false,
    limitation: 'Static captured dimensions consume declared sizes as border boxes despite local boxSizing omission. Interaction sizes, intrinsic/auto sizing, full layout, label composition, clipping, hit testing and raster equivalence are not established.' };
}
