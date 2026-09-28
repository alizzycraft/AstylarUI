import assert from 'node:assert/strict';
import { applyModalBoxReview } from './modal-position-inspection.mjs';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

const one = items => { assert.equal(items.length, 1); return items[0]; };
const relevant = key => ['cursor', 'all'].includes(key.replaceAll('-', '').toLowerCase());
const definitions = [
  { family: 'button', element: 'button-disabled', nativeType: 'button', candidateType: 'button', selector: '.material-button', nativeSelector: '.mdc-button:disabled' },
  { family: 'checkbox', element: 'checkbox-primary', nativeType: 'mat-checkbox', candidateType: 'div', selector: '#checkbox-primary', nativeSelector: '.mdc-checkbox--disabled' },
  { family: 'slider', element: 'slider-visual', nativeType: 'mat-slider', candidateType: 'showcase.material:range-visual', nativeSelector: '.mat-mdc-slider' },
];

// Explicit native requests distinguish these cases from omitted-UA-default
// questions. No current browser capture or actual hovered-canvas claim is used.
export function proveExplicitComponentCursor(entry, reference, candidate, element) {
  const definition = one(definitions.filter(d => d.family === entry.family && d.element === element));
  const input = one(entry.styleInputs.filter(i => i.id === element));
  let native = reference.nodes.find(n => n.attributes?.id === element), mapping;
  if (!native) {
    mapping = resolveOriginAliasPair(entry, reference, candidate, input);
    assert.ok(['mapped', 'mapped-with-scalar-rule-gap'].includes(mapping.status), mapping.reason);
    native = one(reference.nodes.filter(n => n.key === mapping.referenceNode));
  }
  const owner = one(candidate.nodes.filter(n => n.authored?.id === element));
  assert.equal(native.type, definition.nativeType); assert.equal(owner.authored.type, definition.candidateType);
  for (const [property, value] of Object.entries(input.reference)) assert.equal(reference.styles[native.style][property], value);
  const slider = entry.family === 'slider', expectedReference = slider ? 'pointer' : 'default';
  assert.equal(input.reference.cursor, expectedReference);
  assert.ok(!Object.keys(native.inline ?? {}).some(relevant));
  const nativeRequests = native.rules.map(i => reference.rules[i]).filter(r => r.active && Object.keys(r.declarations).some(relevant));
  assert.ok(nativeRequests.some(r => r.selector === definition.nativeSelector));
  for (const rule of nativeRequests) {
    assert.ok(!Object.hasOwn(rule.declarations, 'all'));
    assert.equal(rule.declarations.cursor?.value, expectedReference);
    assert.equal(rule.declarations.cursor?.important, false);
  }
  if (!slider) assert.match(native.attributes.class, /disabled/);
  const path = [], seen = new Set();
  for (let node = owner; node; node = node.parent === null ? null : one(candidate.nodes.filter(n => n.key === node.parent))) {
    assert.ok(!seen.has(node.key)); seen.add(node.key);
    assert.ok(!Object.keys(node.authored.style ?? {}).some(relevant));
    assert.equal(node.authored.attributes?.style, undefined);
    const requests = candidate.rules.filter(r => rootInitialSelectorCanApply(r.selector, node.authored) && Object.keys(r).some(relevant));
    if (node === owner && !slider) {
      assert.equal(requests.length, 1); assert.equal(requests[0].selector, definition.selector);
      assert.equal(requests[0].cursor, 'pointer'); assert.equal(requests[0].all, undefined);
    } else assert.deepEqual(requests, []);
    path.push({ node: node.key, authored: node.authored, requests });
  }
  for (const [stage, field] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'], ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
    assert.deepEqual(owner[stage], input[field]); assert.equal(owner[stage].cursor, slider ? 'default' : 'pointer');
  }
  return { referenceNode: native.key, astylarNode: owner.key, mapping,
    nativeRequests, candidatePath: path, nativeCursor: expectedReference,
    candidateCursor: owner.normalResolvedStyle.cursor,
    inputEquivalent: false, renderingEquivalent: false, actualHoverCursorVerified: false,
    limitation: 'Original authored request and owner-stage discrepancy only. Disabled hit suppression, inherited label behavior, plugin mesh cursor and actual canvas hover remain separate questions.' };
}

export function applyExplicitComponentCursors(rows, cases, inventory, normalize) {
  return definitions.reduce((result, d) => applyModalBoxReview(result, cases, inventory, normalize, {
    family: d.family, element: d.element, properties: ['cursor'],
    attribution: d.family === 'slider' ? 'reviewed-slider-host-cursor-omission' : 'reviewed-disabled-component-cursor-substitution',
    owner: 'Material comparison authored cursor requests and component-owner mapping',
    justification: d.family === 'slider'
      ? 'The native slider host explicitly requests pointer; the corresponding candidate visual owner and captured ancestry omit that request and resolve default in all three stages. This is unequal authoring, not proof of a core hit-test defect or the cursor emitted by plugin meshes.'
      : 'The native disabled component explicitly requests default; the candidate owner explicitly requests pointer and retains it in all three stages. This proves unequal disabled-state authoring, not actual hover behavior or disabled hit suppression.',
    prove: (entry, reference, candidate) => proveExplicitComponentCursor(entry, reference, candidate, d.element),
  }), rows);
}
