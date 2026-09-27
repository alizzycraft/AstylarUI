import assert from 'node:assert/strict';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { proveControlWidthRequest } from './control-width-observation.mjs';
import { proveTabPanelWrapping } from './wrapping-input-review.mjs';

export const fixedHeightOwners = Object.freeze({
  'divider-primary': ['divider', ['1px']], 'badge-primary': ['badge', ['21px']],
  'sort-primary': ['sort', ['19px', '22px']], 'checkbox-primary': ['checkbox', ['32px']],
  'radio-primary': ['radio', ['18px', '19px', '22px']],
  'button-toggle-primary': ['button-toggle', ['26px', '42px']],
  'tab-panel': ['tabs', ['20px', '22px']], 'progress-bar-primary': ['progress-bar', ['8px']],
});
const one = values => { assert.equal(values.length, 1); return values[0]; };
const affects = key => /^(height|blocksize|inlinesize|all)$/.test(key.replaceAll('-', '').toLowerCase());
const select = declarations => Object.fromEntries(Object.entries(declarations ?? {}).filter(([key]) => affects(key)));

export function proveFixedHeightRequest(entry, input, reference, candidate) {
  const target = fixedHeightOwners[input.id]; assert.ok(target); assert.equal(entry.family, target[0]);
  assert.ok(target[1].includes(input.astylar.height));
  let boundary;
  if (['badge', 'checkbox', 'radio', 'button-toggle'].includes(entry.family))
    boundary = proveControlWidthRequest(entry, reference, candidate, input.id);
  if (input.id === 'tab-panel') boundary = proveTabPanelWrapping(entry, input, reference, candidate);
  const r = one(reference.nodes.filter(n => boundary ? n.key === boundary.referenceNode : n.attributes?.id === input.id));
  const a = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  assert.equal(r.type, input.referenceStructure.type); assert.equal(a.authored.type, input.astylarStructure.type);
  assert.equal(Object.keys(input.reference).length, 89);
  for (const [key, value] of Object.entries(input.reference)) assert.equal(reference.styles[r.style][key], value);
  assert.deepEqual(select(r.inline), {}); assert.deepEqual(select(a.authored.style), {});
  for (const inline of [r.attributes?.style, a.authored.attributes?.style]) {
    if (inline === undefined) continue;
    assert.equal(typeof inline, 'string'); assert.ok(!/[\\/]/.test(inline));
    for (const part of inline.split(';')) { const at = part.indexOf(':'); if (at >= 0) assert.equal(affects(part.slice(0, at).trim()), false); }
  }
  const nativeRequests = r.rules.map(i => reference.rules[i]).filter(rule => rule.active && Object.keys(select(rule.declarations)).length)
    .map(rule => ({ selector: rule.selector, conditions: rule.conditions, declarations: select(rule.declarations) }));
  if (entry.family === 'progress-bar') {
    assert.equal(nativeRequests.length, 1);
    assert.deepEqual(nativeRequests[0].declarations, { height: {
      value: 'max(var(--mat-progress-bar-track-height, 4px),var(--mat-progress-bar-active-indicator-height, 4px))', important: false } });
    assert.equal(input.reference.height, '4px');
  } else assert.deepEqual(nativeRequests, []);
  const candidateRequests = candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, a.authored) && Object.keys(select(rule)).length);
  assert.ok(candidateRequests.length);
  for (const rule of candidateRequests) {
    assert.deepEqual(Object.keys(select(rule)), ['height']); assert.ok(target[1].includes(rule.height));
  }
  for (const [stage, scalar] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
    assert.deepEqual(a[stage], input[scalar]); assert.equal(a[stage].height, input.astylar.height);
    assert.deepEqual(Object.keys(select(a[stage])), ['height']);
  }
  return { element: input.id, referenceNode: r.key, astylarNode: a.key, boundary,
    nativeRequests, candidateRequests, referenceComputed: input.reference.height,
    candidateDeclared: input.astylar.height, firstDivergence: 'authored height request',
    candidateUsedLayoutVerified: false, rendererCauseProven: false, compensationIntentProven: false,
    inputEquivalent: false, renderingEquivalent: false };
}
