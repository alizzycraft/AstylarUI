import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { sourceAuditDefinitions } from '../tests/material-parity/input-equivalence-policy.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const receipt = file => ({ file, sha256: hash(fs.readFileSync(file)) });
const root = 'artifacts/material-parity/remaining-static-ax-resume-20261022', reportFile = root + '/latest-report.json', report = JSON.parse(fs.readFileSync(reportFile));
assert.equal(report.observations.length, 678); assert.equal(report.provenance.checkpoint.sha256, '9d0f1220ea6c2ca95cbfb143d94f7f5680a0d8cb11e074db879768f9763fd5b0');
for (const r of Object.values(report.provenance).filter(r => r?.file && r?.sha256)) assert.equal(hash(fs.readFileSync(r.file)), r.sha256);
const knownFinding = 'fixture-progress-host-focusability-input-omitted'; assert.ok(sourceAuditDefinitions.some(r => r.id === knownFinding));
const specifications = {
  input: [['textbox', 'Email', 'input-control']], autocomplete: [['combobox', 'City', 'autocomplete-control']],
  tree: [['tree', '', 'tree-primary'], ...['Documents', 'Projects', 'Archive'].map((name, i) => ['treeitem', name, `tree-item-${i}`])],
  menu: [['button', 'Open menu', 'menu-primary']], dialog: [['button', 'Open dialog', 'dialog-primary']],
  'bottom-sheet': [['button', 'Open bottom sheet', 'bottom-sheet-primary']], 'snack-bar': [['button', 'Show snackbar', 'snack-bar-primary']],
  'progress-bar': [['progressbar', '', 'progress-bar-primary']], 'progress-spinner': [['progressbar', '', 'progress-spinner-primary']]
};
const widgetRoles = new Set(['button', 'link', 'combobox', 'textbox', 'checkbox', 'radio', 'switch', 'slider', 'spinbutton', 'tree', 'treeitem', 'listbox', 'option', 'progressbar', 'dialog', 'navigation', 'tablist', 'tab', 'tabpanel', 'menu', 'menuitem', 'radiogroup', 'list', 'listitem', 'group', 'status']);
const one = rows => { assert.equal(rows.length, 1); return rows[0]; };
function inspect(o) {
  assert.ok(Object.hasOwn(specifications, o.family)); assert.equal(o.browser, '155.0.8059.80'); assert.deepEqual(o.runtimeErrors, []);
  const native = o.mode === 'reference'; assert.ok(native || o.mode === 'astylar'); const progress = o.family.startsWith('progress-');
  const nodes = o.nodes.filter(n => !n.ignored && widgetRoles.has(n.role.value)); assert.equal(nodes.length, specifications[o.family].length);
  const projections = [], owners = [];
  nodes.forEach((n, i) => {
    const [role, name, id] = specifications[o.family][i]; assert.equal(n.role.value, role); assert.equal(n.name.value, name);
    const d = one(o.dom.filter(d => d.backendNodeId === n.backendDOMNodeId));
    const attrs = Object.fromEntries(Array.from({ length: d.attributes.length / 2 }, (_, i) => d.attributes.slice(i * 2, i * 2 + 2)));
    assert.equal(attrs[native ? 'id' : 'data-astylar-id'], id);
    const properties = {};
    for (const p of n.properties) {
      assert.ok(!Object.hasOwn(properties, p.name)); assert.ok(Object.hasOwn(p.value, 'value'), `Non-scalar association not covered:${p.name}`);
      assert.ok(['string', 'number', 'boolean'].includes(typeof p.value.value)); properties[p.name] = p.value.value;
    }
    if (progress) {
      assert.equal(n.value.value, 64); assert.equal(properties.valuemin, 0); assert.equal(properties.valuemax, 100); assert.equal(properties.valuetext, '');
      assert.equal(properties.focusable, native ? true : undefined); assert.equal(attrs.tabindex, native ? '-1' : undefined);
    } else if (role === 'tree') {
      assert.equal(properties.orientation, 'vertical'); assert.equal(properties.multiselectable, false); assert.equal(properties.required, false);
    } else if (role === 'treeitem') {
      assert.equal(properties.level, 1); assert.equal(properties.selected, false); assert.equal(properties.focusable, true);
      assert.equal(attrs.tabindex, i === 1 ? '0' : '-1'); assert.equal(attrs['aria-level'], '1'); assert.equal(attrs['aria-posinset'], String(i)); assert.equal(attrs['aria-setsize'], '3');
      const byId = new Map(o.nodes.map(n => [n.nodeId, n])); let cursor = n, seen = new Set();
      while (cursor.parentId && cursor.parentId !== nodes[0].nodeId) { assert.ok(!seen.has(cursor.parentId)); seen.add(cursor.parentId); cursor = byId.get(cursor.parentId); assert.ok(cursor); }
      assert.equal(cursor.parentId, nodes[0].nodeId);
    } else {
      assert.equal(properties.focusable, true); assert.equal(properties.invalid, 'false');
      if (o.family === 'input') { assert.equal(n.value.value, 'team@example.com'); assert.equal(properties.readonly, false); assert.equal(properties.editable, 'plaintext'); }
      if (o.family === 'autocomplete') { assert.equal(properties.expanded, false); assert.equal(properties.hasPopup, 'listbox'); assert.equal(properties.autocomplete, 'list'); }
      if (o.family === 'menu') { assert.equal(properties.expanded, false); assert.equal(properties.hasPopup, 'menu'); }
    }
    owners.push({ backend: n.backendDOMNodeId, role, name: n.name, description: n.description, value: n.value,
      properties: n.properties, nodeName: d.nodeName, attributes: attrs });
    const commonProperties = { ...properties }; if (progress) delete commonProperties.focusable;
    projections.push({ role, name, ...(n.description ? { description: n.description.value } : {}), ...(n.value ? { value: n.value.value } : {}), properties: commonProperties });
  });
  return { projections, owners, ...(progress ? { classifiedDifference: { finding: knownFinding,
    focusable: nodes[0].properties.filter(p => p.name === 'focusable'), tabindex: owners[0].attributes.tabindex } } : {}) };
}
const rows = report.observations.filter(r => Object.hasOwn(specifications, r.family)); assert.equal(rows.length, 216);
const paired = new Map(); let controls = 0;
const observations = rows.map(row => {
  const file = root + '/' + row.file, bytes = fs.readFileSync(file); assert.equal(hash(bytes), row.sha256); const o = JSON.parse(bytes), result = inspect(o);
  const key = `static:${row.family}@${row.profile}/${row.viewport.id}`, pair = paired.get(key) ?? {};
  assert.equal(pair[row.mode], undefined); pair[row.mode] = { o, result }; paired.set(key, pair);
  for (const mutate of [v => { v.nodes.find(n => !n.ignored && widgetRoles.has(n.role.value)).name.value += 'forged'; },
    v => { const node = v.nodes.find(n => !n.ignored && widgetRoles.has(n.role.value)); one(v.dom.filter(d => d.backendNodeId === node.backendDOMNodeId)).attributes.push(v.mode === 'reference' ? 'id' : 'data-astylar-id', 'forged'); }]) {
    const forged = structuredClone(o); mutate(forged); assert.throws(() => inspect(forged)); controls++;
  }
  return { case: key, file, sha256: row.sha256, family: row.family, profile: row.profile, viewport: row.viewport, mode: row.mode, ...result };
});
assert.equal(paired.size, 108);
for (const pair of paired.values()) {
  assert.deepEqual(Object.keys(pair).sort(), ['astylar', 'reference']); assert.deepEqual(pair.reference.o.viewport, pair.astylar.o.viewport);
  assert.deepEqual(pair.reference.result.projections, pair.astylar.result.projections);
  const forged = structuredClone(pair.astylar.o), node = forged.nodes.find(n => !n.ignored && widgetRoles.has(n.role.value));
  node.properties.find(p => p.name !== 'focusable').value.value = 'forged';
  assert.throws(() => assert.deepEqual(inspect(forged).projections, pair.reference.result.projections)); controls++;
}
assert.equal(controls, 540);
const bindingFile = 'artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log';
assert.deepEqual(execFileSync(process.execPath, ['scripts/check-material-semantic-visibility-binding.mjs'], { maxBuffer: 4000000 }), fs.readFileSync(bindingFile));
const sourceFile = 'artifacts/material-parity/list-static-ax-review-20261021.log', source = JSON.parse(fs.readFileSync(sourceFile));
for (const b of source.bindings) for (const r of [b.current, b.sourceMap]) assert.equal(hash(fs.readFileSync(r.file)), r.sha256);
console.log(JSON.stringify({ producer: receipt('scripts/check-static-widget-state-ax.mjs'), report: receipt(reportFile),
  sourceBindingReuse: receipt(sourceFile), projectionBindingReuse: receipt(bindingFile),
  families: Object.keys(specifications), pairs: 108, observations, negativeControlsRejected: controls, existingFinding: knownFinding,
  boundary: 'Exact exposed widget role/name/description/value/all scalar-property comparison for nine initial-state families. Only progress focusability is removed from common comparison,and preserved/asserted explicitly under its existing finding. Backend identities and tree roving metadata/ancestry verify. Raw attributes/name sources remain recorded,not asserted fully equivalent. Full AX relationships,other landmarks/anonymous nodes,events/AT,paint,current whole rendering and case closure remain open.',
  inspectionComplete: false, renderingAccepted: false, canonicalPublication: false }));
