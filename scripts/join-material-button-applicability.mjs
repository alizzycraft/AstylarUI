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
  'snack-bar': ['snack-bar-primary'], tooltip: ['tooltip-primary'],
  select: ['select-control'], expansion: ['expansion-primary'], sort: ['sort-trigger'],
  paginator: ['paginator-previous', 'paginator-next'],
  chips: ['chip-0', 'chip-1'], tabs: ['tab-overview', 'tab-activity'],
  'button-toggle': ['button-toggle-one', 'button-toggle-two'], stepper: ['step-details', 'step-review'],
  tree: ['tree-item-0', 'tree-item-1', 'tree-item-2'] };
const editableFamilies = new Set(['form-field', 'input', 'autocomplete', 'datepicker', 'timepicker']);
const compositeFamilies = new Set(['checkbox', 'radio', 'slide-toggle']);
const triggerFamilies = new Set(['menu', 'bottom-sheet', 'dialog', 'snack-bar', 'tooltip']);
const roleFamilies = new Set(['select', 'expansion', 'sort']);
const labelledFamilies = {
  chips: { host: 'chips-primary', candidateHost: 'chips-primary', groupRole: 'listbox', role: 'option',
    nativeType: 'button', candidateType: 'div', labels: ['Angular', 'Astylar'] },
  tabs: { host: 'tabs-primary', candidateHost: 'tabs-list', groupRole: 'tablist', role: 'tab',
    nativeType: 'div', candidateType: 'button', labels: ['Overview', 'Activity'] },
  'button-toggle': { host: 'button-toggle-primary', candidateHost: 'button-toggle-primary', groupRole: 'radiogroup', role: 'radio',
    nativeType: 'button', candidateType: 'div', labels: ['List', 'Grid'] },
  stepper: { host: 'stepper-primary', candidateHost: 'stepper-primary', groupRole: 'tablist', role: 'tab',
    nativeType: 'mat-step-header', candidateType: 'div', labels: ['Details', 'Review'] },
  tree: { host: 'tree-primary', candidateHost: 'tree-primary', groupRole: 'tree', role: 'treeitem',
    nativeType: 'mat-tree-node', candidateType: 'div', labels: ['Documents', 'Projects', 'Archive'] },
};
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
function inspectNamedRole(reference, astylar, family) {
  const id = targets[family][0], nativeHostId = `${family}-primary`;
  const candidateHostId = family === 'expansion' ? 'expansion-root' : nativeHostId;
  const leftHost = reference.nodes.filter(node => node.attributes?.id === nativeHostId);
  const rightHost = astylar.nodes.filter(node => node.authored?.id === candidateHostId);
  assert.equal(leftHost.length, 1); assert.equal(rightHost.length, 1);
  const role = family === 'select' ? 'combobox' : 'button';
  const left = reference.nodes.filter(node => node.attributes?.role === role && descendant(reference, node, leftHost[0])
    && (family !== 'select' || node.attributes.id === id));
  const right = astylar.nodes.filter(node => node.authored?.id === id);
  assert.equal(left.length, 1); assert.equal(right.length, 1);
  assert.equal(left[0].type, { select: 'mat-select', expansion: 'mat-expansion-panel-header', sort: 'div' }[family]);
  assert.equal(right[0].authored.role, role);
  assert.equal(right[0].authored.type, family === 'select' ? 'input' : 'div');
  assert.ok(descendant(astylar, right[0], rightHost[0]));
  return [{ ...describeOwner(id, left[0], right[0]), nativeHost: { key: leftHost[0].key, id: nativeHostId, type: leftHost[0].type },
    candidateHost: { key: rightHost[0].key, id: candidateHostId, type: rightHost[0].authored.type },
    mapping: 'unique-explicit-role-target-under-authored-host',
    boundary: 'Actual role/action owner is distinct from wrapper used for style measurement. Select INPUT authoring does not make free-text editing applicable;no focus/keyboard/activation equivalence follows.' }];
}
function inspectPaginator(reference, astylar) {
  const host = reference.nodes.filter(node => node.attributes?.id === 'paginator-primary');
  const candidateHost = astylar.nodes.filter(node => node.authored?.id === 'paginator-primary');
  assert.equal(host.length, 1); assert.equal(candidateHost.length, 1);
  const controls = reference.nodes.filter(node => node.type === 'button' && descendant(reference, node, host[0]));
  assert.deepEqual(controls.map(node => node.attributes['aria-label']).sort(), ['Next page', 'Previous page']);
  return [['paginator-previous', 'Previous page'], ['paginator-next', 'Next page']].map(([id, label]) => {
    const left = controls.filter(node => node.attributes['aria-label'] === label);
    const right = astylar.nodes.filter(node => node.authored?.id === id);
    assert.equal(left.length, 1); assert.equal(right.length, 1);
    assert.equal(right[0].authored.type, 'button'); assert.equal(right[0].authored.ariaLabel, label);
    assert.ok(descendant(astylar, right[0], candidateHost[0]));
    return { ...describeOwner(id, left[0], right[0]), nativeLabel: label,
      mapping: 'unique-native-navigation-label-under-paginator-host',
      boundary: 'Navigation applicability only,including disabled-endpoint expectations. No page-size popup,other controls,focus delivery or pagination outcome is inferred.' };
  });
}
function labelWitnesses(tree, owner, label, candidate = false) {
  return tree.nodes.filter(node => (candidate ? node.authored?.textContent ?? node.authored?.value : node.ownText) === label
    && (node.key === owner.key || descendant(tree, node, owner)));
}
function inspectLabelled(reference, astylar, family) {
  const definition = labelledFamilies[family]; assert.ok(definition);
  const nativeHost = reference.nodes.filter(node => node.attributes?.id === definition.host);
  const candidateHost = astylar.nodes.filter(node => node.authored?.id === definition.candidateHost);
  assert.equal(nativeHost.length, 1); assert.equal(candidateHost.length, 1);
  assert.equal(candidateHost[0].authored.role, definition.groupRole);
  const native = reference.nodes.filter(node => node.attributes?.role === definition.role && descendant(reference, node, nativeHost[0]));
  assert.equal(native.length, definition.labels.length);
  const used = new Set();
  return targets[family].map((id, index) => {
    const label = definition.labels[index];
    const left = native.filter(node => labelWitnesses(reference, node, label).length === 1);
    const right = astylar.nodes.filter(node => node.authored?.id === id);
    assert.equal(left.length, 1); assert.ok(!used.has(left[0].key)); used.add(left[0].key);
    assert.equal(right.length, 1); assert.equal(left[0].type, definition.nativeType);
    assert.equal(right[0].authored.type, definition.candidateType); assert.equal(right[0].authored.role, definition.role);
    assert.ok(descendant(astylar, right[0], candidateHost[0]));
    const leftText = labelWitnesses(reference, left[0], label), rightText = labelWitnesses(astylar, right[0], label, true);
    assert.equal(leftText.length, 1); assert.equal(rightText.length, 1);
    return { ...describeOwner(id, left[0], right[0]), label,
      nativeHost: { key: nativeHost[0].key, id: definition.host, role: nativeHost[0].attributes.role ?? null },
      candidateHost: { key: candidateHost[0].key, id: definition.candidateHost, role: candidateHost[0].authored.role },
      textWitnesses: { reference: leftText[0].key, astylar: rightText[0].key },
      mapping: 'unique-exact-authored-text-and-role-under-explicit-host',
      boundary: 'Captured source text is an identity witness,not a computed accessible name or paint observation. Generated IDs,positions,order and selection state are not identity substitutes. No native/role-only behavior equivalence.' };
  });
}
const selected = review.groups.filter(row => Object.hasOwn(targets, row.family));
assert.equal(selected.length, 1957);
const previous = [], observations = [];
let changedFields = 0, negativeControls = 0, fieldNegativeControls = 0;
const compositeControls = new Set(); let compositeNegativeControls = 0;
let triggerNegativeControls = 0;
const roleControls = new Set(); let roleNegativeControls = 0;
const labelledControls = new Set(); let labelNegativeControls = 0;
for (const row of selected) {
  const pair = row.evidence.pairedTrees;
  const reference = readTree(pair.reference), astylar = readTree(pair.astylar);
  const editable = editableFamilies.has(row.family), composite = compositeFamilies.has(row.family);
  const trigger = triggerFamilies.has(row.family);
  const namedRole = roleFamilies.has(row.family), paginator = row.family === 'paginator';
  const labelled = Object.hasOwn(labelledFamilies, row.family);
  const type = editable || row.family === 'slider' ? 'input' : 'button';
  const owners = labelled ? inspectLabelled(reference, astylar, row.family)
    : namedRole ? inspectNamedRole(reference, astylar, row.family) : paginator ? inspectPaginator(reference, astylar)
    : trigger ? inspectTrigger(reference, astylar, row.family) : composite ? inspectComposite(reference, astylar, row.family)
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
  if ((namedRole || paginator) && !roleControls.has(row.family)) {
    roleControls.add(row.family);
    const wrong = structuredClone(reference), native = wrong.nodes.find(node => node.key === owners[0].reference.key);
    if (paginator) {
      native.attributes['aria-label'] = 'unreviewed-action';
      assert.throws(() => inspectPaginator(wrong, astylar));
    } else {
      native.attributes.role = 'presentation';
      assert.throws(() => inspectNamedRole(wrong, astylar, row.family));
    }
    roleNegativeControls++;
  }
  if (labelled && !labelledControls.has(row.family)) {
    labelledControls.add(row.family);
    const wrong = structuredClone(reference); wrong.nodes.find(node => node.key === owners[0].textWitnesses.reference).ownText = 'unreviewed-label';
    assert.throws(() => inspectLabelled(wrong, astylar, row.family)); labelNegativeControls++;
    if (labelNegativeControls === 1) {
      const outside = structuredClone(astylar); outside.nodes.find(node => node.authored?.id === owners[0].id).parent = 'root';
      assert.throws(() => inspectLabelled(reference, outside, row.family)); labelNegativeControls++;
    }
  }
  observations.push({ case: row.case, owners });
  for (const key of editable || row.family === 'tree' ? ['programmaticFocus'] : ['authoredActivation', 'programmaticFocus']) {
    const obligation = row.obligations[key];
    if (obligation.applicability !== 'unverified') {
      assert.equal(obligation.applicability, 'applicable'); continue;
    }
    previous.push({ row, key, obligation });
    row.obligations[key] = { ...obligation, applicability: 'applicable', recordedControlApplicability: {
      disposition: 'inspected-applicability-only', owners,
      conclusion: row.family === 'tree'
        ? 'Captured leaf treeitem roles,exact labels and group ancestry establish programmatic-focus applicability only. No activation,selection or expansion contract is inferred.'
        : editable
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
assert.equal(changedFields, 3083); assert.equal(new Set(previous.map(item => item.row.case)).size, 1797);
assert.equal(observations.reduce((count, row) => count + row.owners.length, 0), 2661);
assert.equal(fieldNegativeControls, 2);
assert.equal(compositeNegativeControls, 4);
assert.equal(triggerNegativeControls, 2);
assert.equal(roleNegativeControls, 4);
assert.equal(labelNegativeControls, 6);
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
  applicabilityCases: selected.length, simpleButtons: 336, editableInputs: 483, rangeInputs: 156,
  nativeCompositeControls: 272, triggerButtons: 368, namedRoleControls: 222, paginatorButtons: 104, labelledControls: 720, authenticatedTrees: 3914,
  changedCases: 1797, changedApplicabilityFields: changedFields, negativeControls, fieldNegativeControls, compositeNegativeControls, triggerNegativeControls, roleNegativeControls, labelNegativeControls,
  cases: loaded.cases.length, dependencies: loaded.evidenceFingerprints.length,
  unrelatedReviewConserved: true, currentRenderingAccepted: false, inspectionComplete: false,
  observations, boundary: 'Applicability only;all action/focus outcomes and original remaining obligations are preserved. Not selected by the live export.' }));
