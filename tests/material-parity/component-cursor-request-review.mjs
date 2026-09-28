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
  ...[
    ['core', 'core-primary', '.material-button'], ['toolbar', 'toolbar-action', '.toolbar-action'],
    ['card', 'card-open', '.text-button'], ['button', 'button-primary', '.material-button'],
    ['button', 'button-secondary', '.material-button'], ['menu', 'menu-primary', '.material-button'],
    ['bottom-sheet', 'bottom-sheet-primary', '.material-button'], ['dialog', 'dialog-primary', '.material-button'],
    ['snack-bar', 'snack-bar-primary', '.material-button'], ['tooltip', 'tooltip-primary', '.material-button'],
  ].map(([family, element, selector]) => ({ family, element, selector, nativeType: 'button', candidateType: 'button' })),
];

// Bind explicit request differences; omitted native button authoring is kept
// distinct from explicit disabled requests. Neither proves a hovered cursor.
export function proveExplicitComponentCursor(entry, reference, candidate, element) {
  const definition = one(definitions.filter(d => d.family === entry.family && d.element === element));
  const input = one(entry.styleInputs.filter(i => i.id === element));
  const direct = reference.nodes.filter(n => n.attributes?.id === element);
  assert.ok(direct.length <= 1);
  let native = direct[0], mapping;
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
  if (definition.nativeSelector) assert.ok(nativeRequests.some(r => r.selector === definition.nativeSelector));
  else assert.deepEqual(nativeRequests, []);
  for (const rule of nativeRequests) {
    assert.ok(!Object.hasOwn(rule.declarations, 'all'));
    assert.equal(rule.declarations.cursor?.value, expectedReference);
    assert.equal(rule.declarations.cursor?.important, false);
  }
  if (!slider && definition.nativeSelector) assert.match(native.attributes.class, /disabled/);
  const nativePath = [], nativeSeen = new Set();
  for (let node = native; node; node = node.parent === null ? null : one(reference.nodes.filter(n => n.key === node.parent))) {
    assert.ok(!nativeSeen.has(node.key)); nativeSeen.add(node.key);
    const requests = node.rules.map(i => reference.rules[i]).filter(r => r.active && Object.keys(r.declarations).some(relevant));
    if (!definition.nativeSelector) {
      assert.ok(!Object.keys(node.inline ?? {}).some(relevant)); assert.deepEqual(requests, []);
      assert.equal(reference.styles[node.style].cursor, node === native ? 'default' : 'auto');
    }
    nativePath.push({ node: node.key, type: node.type, cursor: reference.styles[node.style].cursor, requests });
  }
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
    nativeRequests, nativePath, nativeAuthorCursorOmitted: !definition.nativeSelector,
    candidatePath: path, nativeCursor: expectedReference,
    candidateCursor: owner.normalResolvedStyle.cursor,
    inputEquivalent: false, renderingEquivalent: false, actualHoverCursorVerified: false,
    limitation: 'Original authored request and owner-stage discrepancy only. Disabled hit suppression, inherited label behavior, plugin mesh cursor and actual canvas hover remain separate questions.' };
}

export function applyExplicitComponentCursors(rows, cases, inventory, normalize) {
  return definitions.reduce((result, d) => applyModalBoxReview(result, cases, inventory, normalize, {
    family: d.family, element: d.element, properties: ['cursor'],
    attribution: d.family === 'slider' ? 'reviewed-slider-host-cursor-omission' : d.nativeSelector
      ? 'reviewed-disabled-component-cursor-substitution' : 'reviewed-button-cursor-request-substitution',
    owner: 'Material comparison authored cursor requests and component-owner mapping',
    justification: d.family === 'slider'
      ? 'The native slider host explicitly requests pointer; the corresponding candidate visual owner and captured ancestry omit that request and resolve default in all three stages. This is unequal authoring, not proof of a core hit-test defect or the cursor emitted by plugin meshes.'
      : d.nativeSelector
        ? 'The native disabled component explicitly requests default; the candidate owner explicitly requests pointer and retains it in all three stages. This proves unequal disabled-state authoring, not actual hover behavior or disabled hit suppression.'
        : 'The native button and captured ancestry omit author cursor requests and the native button computes default. The candidate button explicitly requests pointer, retained in all three stages. These are unequal inputs before a core comparison; this does not claim that removing the candidate request would restore browser defaults or prove the actual hovered canvas cursor.',
    prove: (entry, reference, candidate) => proveExplicitComponentCursor(entry, reference, candidate, d.element),
  }), rows);
}
