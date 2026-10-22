import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const root = 'artifacts/material-parity/tabs-static-ax-20261022';
const reportFile = `${root}/latest-report.json`, reportBytes = fs.readFileSync(reportFile), report = JSON.parse(reportBytes);
for (const r of Object.values(report.provenance).filter(x => x?.file && x?.sha256)) assert.equal(hash(fs.readFileSync(r.file)), r.sha256);
assert.equal(hash(report.provenance.helperSource), report.provenance.helperSha256);
assert.equal(report.provenance.checkpoint.sha256, '9d0f1220ea6c2ca95cbfb143d94f7f5680a0d8cb11e074db879768f9763fd5b0');
const bindingFile = 'artifacts/material-parity/list-static-ax-review-20261021.log', bindingBytes = fs.readFileSync(bindingFile), binding = JSON.parse(bindingBytes);
for (const b of binding.bindings) for (const r of [b.current, b.sourceMap]) assert.equal(hash(fs.readFileSync(r.file)), r.sha256);
const attr = (node, key) => { const i = node.attributes.indexOf(key); return i < 0 ? null : node.attributes[i + 1]; };
const one = rows => { assert.equal(rows.length, 1); return rows[0]; };
const property = (node, name) => node.properties.filter(p => p.name === name);
const exposed = (o, role) => o.nodes.filter(n => !n.ignored && n.role.value === role);
function inspect(o) {
  assert.equal(o.family, 'tabs'); assert.deepEqual(o.runtimeErrors, []); assert.equal(o.browser, '155.0.8059.80');
  const reference = o.mode === 'reference'; assert.ok(reference || o.mode === 'astylar');
  assert.equal(new Set(o.nodes.map(n => n.nodeId)).size, o.nodes.length);
  assert.equal(new Set(o.dom.map(n => n.backendNodeId)).size, o.dom.length);
  const list = one(exposed(o, 'tablist')), tabs = exposed(o, 'tab'), panel = one(exposed(o, 'tabpanel'));
  assert.equal(list.name.value, ''); assert.equal(tabs.length, 2);
  assert.deepEqual(tabs.map(n => n.name.value), ['Overview', 'Activity']);
  assert.deepEqual(tabs.map(n => one(property(n, 'selected')).value.value), [true, false]);
  const byId = new Map(o.nodes.map(n => [n.nodeId, n]));
  for (const tab of tabs) {
    const ancestors = new Set(); let n = tab;
    while (n.parentId) { assert.ok(!ancestors.has(n.parentId)); ancestors.add(n.parentId); n = byId.get(n.parentId); assert.ok(n); }
    assert.ok(ancestors.has(list.nodeId));
  }
  const panelDom = one(o.dom.filter(d => d.backendNodeId === panel.backendDOMNodeId));
  const tabDom = tabs.map(n => one(o.dom.filter(d => d.backendNodeId === n.backendDOMNodeId)));
  for (const d of tabDom) assert.equal(attr(d, 'role'), 'tab'); assert.equal(attr(panelDom, 'role'), 'tabpanel');
  const verifyControls = i => {
    assert.equal(attr(tabDom[i], 'aria-controls'), attr(panelDom, 'id'));
    const target = one(one(property(tabs[i], 'controls')).value.relatedNodes);
    assert.equal(target.backendDOMNodeId, panel.backendDOMNodeId); assert.equal(target.idref, attr(panelDom, 'id'));
  };
  verifyControls(0);
  if (reference) {
    assert.equal(panel.name.value, 'Overview'); assert.equal(attr(panelDom, 'aria-label'), null);
    assert.equal(attr(panelDom, 'aria-labelledby'), attr(tabDom[0], 'id'));
    const label = one(one(property(panel, 'labelledby')).value.relatedNodes);
    assert.equal(label.backendDOMNodeId, tabs[0].backendDOMNodeId); assert.equal(label.idref, attr(tabDom[0], 'id'));
    assert.ok(attr(tabDom[1], 'aria-controls')); assert.notEqual(attr(tabDom[1], 'aria-controls'), attr(panelDom, 'id'));
    assert.deepEqual(property(tabs[1], 'controls'), []);
  } else {
    assert.equal(panel.name.value, 'Overview content'); assert.equal(attr(panelDom, 'aria-label'), 'Overview content');
    assert.equal(attr(panelDom, 'aria-labelledby'), null); assert.deepEqual(property(panel, 'labelledby'), []);
    verifyControls(1);
  }
  return { list: { role: list.role.value, name: list.name.value },
    tabs: tabs.map((n, i) => ({ backendNodeId: n.backendDOMNodeId, name: n.name.value, properties: n.properties, attributes: tabDom[i].attributes })),
    panel: { backendNodeId: panel.backendDOMNodeId, name: panel.name.value, properties: panel.properties, attributes: panelDom.attributes } };
}
const observations = [], pairs = new Map(); let controls = 0;
for (const row of report.observations) {
  const file = `${root}/${row.file}`, bytes = fs.readFileSync(file); assert.equal(hash(bytes), row.sha256);
  const o = JSON.parse(bytes); assert.equal(o.mode, row.mode); assert.equal(o.profile, row.profile); assert.deepEqual(o.viewport, row.viewport);
  const result = inspect(o), key = JSON.stringify([o.profile, o.viewport]), pair = pairs.get(key) ?? {};
  assert.equal(pair[o.mode], undefined); pair[o.mode] = result; pairs.set(key, pair);
  for (const mutate of [v => v.runtimeErrors.push('injected'), v => { exposed(v, 'tab')[0].name.value = 'forged'; },
    v => { one(exposed(v, 'tabpanel')).name.value = 'forged'; },
    v => { one(one(property(exposed(v, 'tab')[0], 'controls')).value.relatedNodes).backendDOMNodeId += 999; },
    v => { const d = one(v.dom.filter(d => d.backendNodeId === one(exposed(v, 'tabpanel')).backendDOMNodeId)), i = d.attributes.indexOf('aria-labelledby');
      if (i < 0) d.attributes.push('aria-labelledby', 'forged'); else d.attributes[i + 1] = 'forged'; },
    v => { const p = one(exposed(v, 'tabpanel')); if (v.mode === 'reference') one(one(property(p, 'labelledby')).value.relatedNodes).backendDOMNodeId += 999;
      else p.properties.push({ name: 'labelledby', value: { relatedNodes: [{ backendDOMNodeId: -1 }] } }); },
  ]) { const forged = structuredClone(o); mutate(forged); assert.throws(() => inspect(forged)); controls++; }
  observations.push({ file, sha256: row.sha256, profile: o.profile, viewport: o.viewport, mode: o.mode, result });
}
assert.equal(observations.length, 24); assert.equal(pairs.size, 12); assert.equal(controls, 144);
for (const pair of pairs.values()) assert.deepEqual(Object.keys(pair).sort(), ['astylar', 'reference']);
console.log(JSON.stringify({ producer: { file: 'scripts/check-tabs-static-ax.mjs', sha256: hash(fs.readFileSync('scripts/check-tabs-static-ax.mjs')) },
  report: { file: reportFile, sha256: hash(reportBytes) }, sourceBindingReuse: { file: bindingFile, sha256: hash(bindingBytes) },
  pairs: 12, observations, negativeControlsRejected: controls,
  conclusion: 'All12 static pairs preserve tab names and selected states. Native active tab controls the Overview panel labelledby that tab;its inactive header authors a distinct hidden-panel ID. Both candidate tabs control one Overview content-labelled panel with no labelledby. Trace these authored naming/identity inputs before claiming residual core failure.',
  boundary: 'Actual AX/backend DOM for pinned static build;source-map/current component receipts reauthenticate. Native hidden inactive target is not exposed by AX despite its authored controls ID. Not interactions,AT traversal,current full renderer equivalence,paint or case closure.',
  renderingAccepted: false, inspectionComplete: false }));
