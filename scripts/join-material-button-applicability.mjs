import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';

// Close only the demonstrated authored-applicability gap. Existing required-state
// scope already includes button activation/focus and editable-input focus;
// this does not inspect actions,editing,picker opening or focus delivery.
const script = 'scripts/join-material-button-applicability.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const predecessor = '87b7452d81b98c0c7923103042132c1fcf70e96a3bb2803c298deed7a017719e';
const review = JSON.parse(readFileSync(`artifacts/material-parity/working-audit/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const targets = { core: ['core-primary'], toolbar: ['toolbar-action'], card: ['card-open'],
  button: ['button-primary', 'button-secondary', 'button-disabled'],
  'form-field': ['form-field-control'], input: ['input-control'], autocomplete: ['autocomplete-control'],
  datepicker: ['datepicker-control'], timepicker: ['timepicker-control'],
  checkbox: ['checkbox-primary'], radio: ['radio-solo', 'radio-team'],
  slider: ['slider-start', 'slider-primary'], 'slide-toggle': ['slide-toggle-primary'],
  menu: ['menu-primary'], 'bottom-sheet': ['bottom-sheet-primary'], dialog: ['dialog-primary'],
  'snack-bar': ['snack-bar-primary'], tooltip: ['tooltip-primary'] };
const editableFamilies = new Set(['form-field', 'input', 'autocomplete', 'datepicker', 'timepicker']);
const compositeFamilies = new Set(['checkbox', 'radio', 'slide-toggle']);
const triggerFamilies = new Set(['menu', 'bottom-sheet', 'dialog', 'snack-bar', 'tooltip']);
const readTree = (item, bytes = readFileSync(item.file)) => {
  assert.equal(hash(bytes), item.sha256, item.file);
  const tree = JSON.parse(bytes); assert.deepEqual(tree.errors, []); return tree;
};
function describeOwner(id, left, right) {
  return { id, reference: { key: left.key, type: left.type, id: left.attributes.id ?? null,
    role: left.attributes.role ?? null, tabindex: left.attributes.tabindex ?? null,
    disabledAttribute: Object.hasOwn(left.attributes, 'disabled'), ariaDisabled: left.attributes['aria-disabled'] ?? null,
    inputType: left.attributes.type ?? null, readonlyAttribute: Object.hasOwn(left.attributes, 'readonly') },
  astylar: { key: right.key, type: right.authored.type, role: right.authored.role ?? null,
    tabindex: right.authored.tabindex ?? null, disabled: right.authored.disabled ?? null,
    ariaDisabled: right.authored.ariaDisabled ?? null, inputType: right.authored.inputType ?? null,
    readonly: right.authored.readonly ?? null } };
}
function inspectPair(reference, astylar, expected, type = 'button') {
  const native = reference.nodes.filter(node => node.type === type);
  assert.deepEqual(native.map(node => node.attributes.id).sort(), expected.slice().sort());
  return expected.map(id => {
    const left = native.filter(node => node.attributes.id === id);
    const right = astylar.nodes.filter(node => node.authored?.id === id);
    assert.equal(left.length, 1); assert.equal(right.length, 1);
    assert.equal(right[0].authored.type, type);
    return describeOwner(id, left[0], right[0]);
  });
}
function descendant(tree, node, host) {
  const nodes = new Map(tree.nodes.map(value => [value.key, value]));
  assert.equal(nodes.size, tree.nodes.length);
  const seen = new Set();
  while (node.parent) {
    assert.ok(!seen.has(node.key)); seen.add(node.key);
    if (node.parent === host.key) return true;
    node = nodes.get(node.parent); assert.ok(node);
  }
  return false;
}
function inspectComposite(reference, astylar, family) {
  const hostId = `${family}-primary`;
  const hosts = reference.nodes.filter(node => node.attributes?.id === hostId);
  assert.equal(hosts.length, 1);
  const role = family === 'slide-toggle' ? 'switch' : family;
  assert.equal(hosts[0].type, family === 'radio' ? 'mat-radio-group' : `mat-${family}`);
  const native = reference.nodes.filter(node => family === 'slide-toggle'
    ? node.type === 'button' : node.type === 'input' && node.attributes.type === family);
  assert.equal(native.length, targets[family].length);
  if (family === 'radio') assert.deepEqual(native.map(node => node.attributes.value).sort(), ['solo', 'team']);
  return targets[family].map(id => {
    const left = family === 'radio' ? native.find(node => node.attributes.value === id.slice('radio-'.length)) : native[0];
    assert.ok(left); assert.ok(descendant(reference, left, hosts[0]));
    if (family === 'slide-toggle') assert.equal(left.attributes.role, 'switch');
    const right = astylar.nodes.filter(node => node.authored?.id === id);
    assert.equal(right.length, 1); assert.equal(right[0].authored.role, role); assert.equal(right[0].authored.type, 'div');
    if (family === 'radio') {
      const group = astylar.nodes.filter(node => node.authored?.id === hostId);
      assert.equal(group.length, 1); assert.equal(group[0].authored.role, 'radiogroup');
      assert.ok(descendant(astylar, right[0], group[0]));
    }
    return { ...describeOwner(id, left, right[0]), nativeHost: { key: hosts[0].key, id: hostId, type: hosts[0].type },
      mapping: family === 'radio' ? 'unique-native-value-under-authored-radiogroup' : 'unique-native-control-under-authored-host',
      boundary: 'Native input/button versus candidate role-only DIV is recorded,not asserted equivalent.' };
  });
}
function inspectTrigger(reference, astylar, family) {
  const id = targets[family][0], hostId = `${family}-root`;
  const left = reference.nodes.filter(node => node.attributes?.id === id);
  const right = astylar.nodes.filter(node => node.authored?.id === id);
  const leftHost = reference.nodes.filter(node => node.attributes?.id === hostId);
  const rightHost = astylar.nodes.filter(node => node.authored?.id === hostId);
  assert.equal(left.length, 1); assert.equal(right.length, 1);
  assert.equal(leftHost.length, 1); assert.equal(rightHost.length, 1);
  assert.equal(left[0].type, 'button'); assert.equal(right[0].authored.type, 'button');
  assert.ok(descendant(reference, left[0], leftHost[0]));
  assert.ok(descendant(astylar, right[0], rightHost[0]));
  return [{ ...describeOwner(id, left[0], right[0]), mapping: 'named-opener-under-authored-component-root',
    otherNativeButtons: reference.nodes.filter(node => node.type === 'button' && node.key !== left[0].key)
      .map(node => ({ key: node.key, id: node.attributes.id ?? null, role: node.attributes.role ?? null })),
    otherAuthoredButtons: astylar.nodes.filter(node => node.authored?.type === 'button' && node.key !== right[0].key)
      .map(node => ({ key: node.key, id: node.authored.id ?? null })),
    boundary: 'Opener applicability witness only;other popup controls are recorded,not inspected. Modal inertness,trapping,restoration and tooltip opening contracts remain separate.' }];
}
const selected = review.groups.filter(row => Object.hasOwn(targets, row.family));
assert.equal(selected.length, 1349);
const previous = [], observations = [];
let changedFields = 0, negativeControls = 0, fieldNegativeControls = 0;
const compositeControls = new Set(); let compositeNegativeControls = 0;
let triggerNegativeControls = 0;
for (const row of selected) {
  const pair = row.evidence.pairedTrees;
  const reference = readTree(pair.reference), astylar = readTree(pair.astylar);
  const editable = editableFamilies.has(row.family), composite = compositeFamilies.has(row.family);
  const trigger = triggerFamilies.has(row.family);
  const type = editable || row.family === 'slider' ? 'input' : 'button';
  const owners = trigger ? inspectTrigger(reference, astylar, row.family) : composite ? inspectComposite(reference, astylar, row.family)
    : inspectPair(reference, astylar, targets[row.family], type);
  if (!observations.length) {
    const changed = structuredClone(reference); changed.nodes.find(node => node.type === 'button').type = 'div';
    assert.throws(() => inspectPair(changed, astylar, targets[row.family])); negativeControls++;
    const missing = structuredClone(astylar); missing.nodes = missing.nodes.filter(node => node.authored?.id !== owners[0].id);
    assert.throws(() => inspectPair(reference, missing, targets[row.family])); negativeControls++;
    const extra = structuredClone(reference); extra.nodes.push({ type: 'button', attributes: { id: 'unreviewed-button' } });
    assert.throws(() => inspectPair(extra, astylar, targets[row.family])); negativeControls++;
    assert.throws(() => readTree(pair.reference, Buffer.concat([readFileSync(pair.reference.file), Buffer.from(' ')])));
    negativeControls++;
  }
  if (editable && !fieldNegativeControls) {
    const wrongOwner = structuredClone(reference); wrongOwner.nodes.find(node => node.type === 'input').attributes.id = 'wrong-input';
    assert.throws(() => inspectPair(wrongOwner, astylar, targets[row.family], type)); fieldNegativeControls++;
    const wrongType = structuredClone(astylar); wrongType.nodes.find(node => node.authored?.id === owners[0].id).authored.type = 'div';
    assert.throws(() => inspectPair(reference, wrongType, targets[row.family], type)); fieldNegativeControls++;
  }
  if (composite && !compositeControls.has(row.family)) {
    compositeControls.add(row.family);
    const wrong = structuredClone(reference), native = wrong.nodes.find(node => node.key === owners[0].reference.key);
    if (row.family === 'checkbox') native.parent = 'frame';
    else if (row.family === 'radio') native.attributes.value = 'unreviewed-value';
    else native.attributes.role = 'button';
    assert.throws(() => inspectComposite(wrong, astylar, row.family)); compositeNegativeControls++;
    if (row.family === 'checkbox') {
      const wrongRole = structuredClone(astylar); wrongRole.nodes.find(node => node.authored?.id === 'checkbox-primary').authored.role = 'button';
      assert.throws(() => inspectComposite(reference, wrongRole, row.family)); compositeNegativeControls++;
    }
  }
  if (trigger && !triggerNegativeControls) {
    const outside = structuredClone(reference); outside.nodes.find(node => node.key === owners[0].reference.key).parent = 'frame';
    assert.throws(() => inspectTrigger(outside, astylar, row.family)); triggerNegativeControls++;
    const duplicate = structuredClone(astylar); duplicate.nodes.push(structuredClone(duplicate.nodes.find(node => node.authored?.id === owners[0].id)));
    assert.throws(() => inspectTrigger(reference, duplicate, row.family)); triggerNegativeControls++;
  }
  observations.push({ case: row.case, owners });
  for (const key of editable ? ['programmaticFocus'] : ['authoredActivation', 'programmaticFocus']) {
    const obligation = row.obligations[key];
    if (obligation.applicability !== 'unverified') {
      assert.equal(obligation.applicability, 'applicable'); continue;
    }
    previous.push({ row, key, obligation });
    row.obligations[key] = { ...obligation, applicability: 'applicable', recordedControlApplicability: {
      disposition: 'inspected-applicability-only', owners,
      conclusion: editable
        ? 'Captured native input and exact candidate input identity establish a programmatic-focus inspection obligation,including disabled negative expectations. No activation,editing or popup-opening disposition follows.'
        : 'Captured native controls and explicit counterpart mapping establish activation/control-interaction and focus inspection obligations,including disabled negative expectations. Range drag/keys and composite role behavior are not replaced by button rules;no successful behavior or input equivalence follows.',
      evidence: { report: { file: row.evidence.report, sha256: row.evidence.reportSha256 },
        pairedTrees: pair, join: receipt(script) },
      boundary: 'Historical authenticated authored trees only. Not actual events,keyboard equivalence,focus delivery,disabled suppression,paint,current runtime or full-case closure.' } };
    assert.equal(row.obligations[key].disposition, obligation.disposition);
    changedFields++;
  }
  assert.equal(row.inspection, 'partial'); assert.equal(row.currentRendering, 'unverified');
}
assert.equal(changedFields, 2039); assert.equal(new Set(previous.map(item => item.row.case)).size, 1245);
assert.equal(observations.reduce((count, row) => count + row.owners.length, 0), 1615);
assert.equal(fieldNegativeControls, 2);
assert.equal(compositeNegativeControls, 4);
assert.equal(triggerNegativeControls, 2);
const pointer = JSON.parse(readFileSync('artifacts/material-parity/working-audit/current.json'));
const indexBytes = readFileSync(`artifacts/material-parity/working-audit/${pointer.generation}/index.json`);
assert.equal(hash(indexBytes), pointer.indexSha256);
const coverage = JSON.parse(indexBytes).metadata.coverage;
const proposal = saveReviewProposal('artifacts/material-parity/working-audit', review);
const loaded = loadCaseObligationReview(proposal.file, proposal.sha256,
  [...coverage.caseInventory.static, ...coverage.caseInventory.interaction]);
assert.equal(loaded.cases.length, 2311); assert.equal(loaded.inspectionComplete, false);
assert.equal(loaded.currentRenderingAccepted, false);
for (const { row, key, obligation } of previous) row.obligations[key] = obligation;
assert.equal(hash(JSON.stringify(review)), predecessor, 'Unrelated case evidence changed');
console.log(JSON.stringify({ phase: 'recorded-native-control-authored-applicability', predecessor, proposal,
  inspectedCases: selected.length, simpleButtons: 336, editableInputs: 483, rangeInputs: 156,
  nativeCompositeControls: 272, triggerButtons: 368, authenticatedTrees: 2698,
  changedCases: 1245, changedApplicabilityFields: changedFields, negativeControls, fieldNegativeControls, compositeNegativeControls, triggerNegativeControls,
  cases: loaded.cases.length, dependencies: loaded.evidenceFingerprints.length,
  unrelatedReviewConserved: true, currentRenderingAccepted: false, inspectionComplete: false,
  observations, boundary: 'Applicability only;all action/focus outcomes and original remaining obligations are preserved. Not selected by the live export.' }));
