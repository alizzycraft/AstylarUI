import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { auditReadFileSync as readFileSync } from './audit-evidence-session.mjs';
import { collectRadioPositionSubstitution } from './radio-position-substitution.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const one = nodes => { assert.equal(nodes.length, 1, 'unique descendant owner'); return nodes[0]; };
const has = (node, name) => String(node.attributes?.class ?? node.authored?.class ?? '').split(/\s+/).includes(name);
const within = (node, owner) => node.key === owner.key || node.key.startsWith(owner.key + '/');
const nativeRoles = {
  formField: 'mdc-form-field', control: 'mdc-radio', touch: 'mat-mdc-radio-touch-target',
  input: 'mdc-radio__native-control', background: 'mdc-radio__background',
  outerCircle: 'mdc-radio__outer-circle', innerCircle: 'mdc-radio__inner-circle',
  ripple: 'mat-radio-ripple', persistentRipple: 'mat-radio-persistent-ripple', label: 'mdc-label',
};
const properties = ['display', 'position', 'top', 'left', 'width', 'height', 'boxSizing',
  'marginLeft', 'paddingLeft', 'paddingRight', 'opacity', 'visibility', 'pointerEvents',
  'transform', 'borderTopWidth', 'borderTopStyle', 'borderTopColor', 'borderTopLeftRadius',
  'backgroundColor', 'fontSize', 'lineHeight', 'verticalAlign'];

// Identity/ownership is established before comparing requests. A mapped role is
// not an assertion of equal structure,used geometry,paint or browser semantics.
export function inspectRadioDescendants(reference, candidate, value) {
  assert.ok(['solo', 'team'].includes(value));
  assert.deepEqual(reference.errors, []); assert.deepEqual(candidate.errors, []);
  const group = one(reference.nodes.filter(n => n.attributes?.id === 'radio-primary'));
  const host = one(reference.nodes.filter(n => n.parent === group.key && n.type === 'mat-radio-button' && n.attributes?.value === value));
  const native = Object.fromEntries(Object.entries(nativeRoles).map(([role, cls]) =>
    [role, one(reference.nodes.filter(n => within(n, host) && has(n, cls)))]));
  const text = one(reference.nodes.filter(n => within(n, host) && n.attributes?.id === `radio-${value}-label`));
  for (const [child, parent] of [['formField', host], ['control', native.formField],
    ['touch', native.control], ['input', native.control], ['background', native.control],
    ['outerCircle', native.background], ['innerCircle', native.background], ['ripple', native.control],
    ['persistentRipple', native.ripple], ['label', native.formField]]) assert.equal(native[child].parent, parent.key);
  assert.equal(text.parent, native.label.key);
  assert.equal(native.input.type, 'input'); assert.equal(native.input.attributes.type, 'radio');
  assert.equal(native.label.type, 'label'); assert.equal(native.label.attributes.for, native.input.attributes.id);
  const candidateGroup = one(candidate.nodes.filter(n => n.authored?.id === 'radio-primary'));
  const option = one(candidate.nodes.filter(n => n.authored?.id === `radio-${value}`));
  assert.equal(option.parent, candidateGroup.key); assert.equal(option.authored.type, 'div');
  assert.equal(option.authored.role, 'radio');
  const state = one(candidate.nodes.filter(n => n.parent === option.key && has(n, 'radio-state-layer')));
  const ring = one(candidate.nodes.filter(n => n.parent === option.key && has(n, 'radio-ring')));
  const label = one(candidate.nodes.filter(n => n.parent === option.key && n.authored?.id === `radio-${value}-label`));
  assert.ok(has(label, 'radio-label'));
  assert.equal(text.ownText, value === 'solo' ? 'Solo' : 'Team');
  assert.equal(label.authored.textContent, text.ownText);
  assert.equal(typeof option.authored.ariaChecked, 'boolean');
  const dots = candidate.nodes.filter(n => n.parent === ring.key && has(n, 'radio-dot'));
  assert.equal(dots.length, option.authored.ariaChecked ? 1 : 0);
  const candidateNodes = [option, state, ring, label, ...dots];
  assert.deepEqual(candidate.nodes.filter(n => within(n, option)).map(n => n.key).sort(), candidateNodes.map(n => n.key).sort());
  const nativeNodes = [host, ...Object.values(native), text];
  const dynamicRipples = reference.nodes.filter(n => within(n, host) && !nativeNodes.includes(n));
  for (const node of dynamicRipples) {
    assert.ok(has(node, 'mat-ripple-element'), 'unreviewed native descendant');
    assert.equal(node.parent, native.ripple.key);
  }
  const nativeRecord = node => ({ key: node.key, parent: node.parent, type: node.type,
    attributes: node.attributes, ownText: node.ownText, styleKey: node.style,
    requests: Object.fromEntries(properties.filter(p => Object.hasOwn(reference.styles[node.style], p)).map(p => [p, reference.styles[node.style][p]])),
    pseudos: node.pseudoElements ?? [] });
  const candidateRecord = node => ({ key: node.key, parent: node.parent, authored: node.authored,
    normal: node.normalResolvedStyle, interaction: node.interactionResolvedStyle, effective: node.resolvedStyle });
  return {
    value, referenceGroup: group.key, candidateGroup: candidateGroup.key,
    native: Object.fromEntries([['host', host], ...Object.entries(native), ['labelText', text]].map(([role, node]) => [role, nativeRecord(node)])),
    dynamicRipples: dynamicRipples.map(nativeRecord),
    candidate: { option: candidateRecord(option), state: candidateRecord(state), ring: candidateRecord(ring),
      label: candidateRecord(label), dots: dots.map(candidateRecord) },
    representedNativeNodes: nativeNodes.length + dynamicRipples.length, representedCandidateNodes: candidateNodes.length,
    firstKnownDivergence: 'existing inline-to-absolute authored option flow substitution',
    unmatchedNativeInputs: ['native radio input and associated LABEL contract', 'separate touch-target descendant'],
    unprovenRepresentations: ['form-field/control wrappers collapsed into option',
      'background/outer circle represented by candidate ring', 'scaled inner circle represented by conditional dot',
      'ripple container/persistent ripple represented by state fill'],
    inputEquivalent: false, renderingEquivalent: false, currentRuntimeVerified: false,
  };
}

export function collectRadioDescendantInputs() {
  const population = collectRadioPositionSubstitution();
  const cache = new Map();
  const tree = receipt => {
    if (!cache.has(receipt.file)) {
      const bytes = readFileSync(receipt.file); assert.equal(hash(bytes), receipt.sha256);
      cache.set(receipt.file, { receipt, tree: JSON.parse(bytes) });
    }
    assert.deepEqual(cache.get(receipt.file).receipt, receipt); return cache.get(receipt.file).tree;
  };
  const cases = population.observations.map(row => {
    const reference = tree(row.inputTrees.reference), candidate = tree(row.inputTrees.astylar);
    return { case: row.case, inputTrees: row.inputTrees, existingFlowProof: row.proof,
      owners: ['solo', 'team'].map(value => inspectRadioDescendants(reference, candidate, value)) };
  });
  assert.equal(cases.length, 68); assert.equal(new Set(cases.map(c => c.case)).size, 68);
  const file = 'tests/material-parity/radio-descendant-inputs.mjs';
  return { schemaVersion: 1, kind: 'retained-radio-descendant-input-mapping',
    producer: { file, sha256: hash(readFileSync(file)) }, population: population.population,
    sourceFingerprints: ['tests/material-parity/radio-position-substitution.mjs',
      'tests/material-parity/radio-descendant-inputs.spec.mjs'].map(file => ({ file, sha256: hash(readFileSync(file)) })),
    cases, caseCount: 68, ownerCount: 136,
    boundary: 'Exact retained owner/descendant mapping and requested inputs. Reuses existing flow proof;does not certify wrapper equivalence,AX associations,hit activation,pseudo/ripple pixels,animation timing,current source applicability or whole-case closure.' };
}
