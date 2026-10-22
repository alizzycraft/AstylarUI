import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const root = 'artifacts/material-parity/stepper-static-ax-20261022';
const reportFile = `${root}/latest-report.json`, reportBytes = fs.readFileSync(reportFile), report = JSON.parse(reportBytes);
for (const r of Object.values(report.provenance).filter(x => x?.file && x?.sha256)) assert.equal(hash(fs.readFileSync(r.file)), r.sha256);
assert.equal(hash(report.provenance.helperSource), report.provenance.helperSha256);
assert.equal(report.provenance.checkpoint.sha256, '9d0f1220ea6c2ca95cbfb143d94f7f5680a0d8cb11e074db879768f9763fd5b0');
const bindingFile = 'artifacts/material-parity/list-static-ax-review-20261021.log', bindingBytes = fs.readFileSync(bindingFile), binding = JSON.parse(bindingBytes);
for (const b of binding.bindings) for (const r of [b.current, b.sourceMap]) assert.equal(hash(fs.readFileSync(r.file)), r.sha256);
const attr = (node, key) => { const i = node.attributes.indexOf(key); return i < 0 ? null : node.attributes[i + 1]; };
const one = rows => { assert.equal(rows.length, 1); return rows[0]; };
const property = (node, name) => node.properties.filter(p => p.name === name);
function inspect(o) {
  assert.equal(o.family, 'stepper'); assert.deepEqual(o.runtimeErrors, []);
  const reference = o.mode === 'reference'; assert.ok(reference || o.mode === 'astylar');
  const exposed = role => o.nodes.filter(n => !n.ignored && n.role.value === role);
  const list = one(exposed('tablist')), tabs = exposed('tab'), panel = one(exposed('tabpanel'));
  assert.equal(list.name.value, 'Project setup'); assert.equal(tabs.length, 2);
  assert.deepEqual(tabs.map(n => n.name.value), reference ? ['Details', 'Review'] : ['1Details', '2Review']);
  assert.deepEqual(tabs.map(n => one(property(n, 'selected')).value.value), [true, false]);
  const panelDom = one(o.dom.filter(d => d.backendNodeId === panel.backendDOMNodeId));
  const tabDom = tabs.map(n => one(o.dom.filter(d => d.backendNodeId === n.backendDOMNodeId)));
  if (reference) {
    assert.equal(panel.name.value, 'Details');
    assert.equal(attr(panelDom, 'aria-labelledby'), attr(tabDom[0], 'id'));
    assert.equal(attr(tabDom[0], 'aria-controls'), attr(panelDom, 'id'));
    assert.ok(attr(tabDom[1], 'aria-controls'));
    const controls = one(property(tabs[0], 'controls'));
    assert.equal(one(controls.value.relatedNodes).backendDOMNodeId, panel.backendDOMNodeId);
    const labels = one(property(panel, 'labelledby'));
    assert.equal(one(labels.value.relatedNodes).backendDOMNodeId, tabs[0].backendDOMNodeId);
  } else {
    assert.equal(panel.name.value, ''); assert.equal(attr(panelDom, 'aria-labelledby'), null);
    for (const d of tabDom) assert.equal(attr(d, 'aria-controls'), null);
    assert.deepEqual(property(panel, 'labelledby'), []);
    for (const tab of tabs) assert.deepEqual(property(tab, 'controls'), []);
  }
  return { list: { role: list.role.value, name: list.name.value },
    tabs: tabs.map((n, i) => ({ backendNodeId: n.backendDOMNodeId, name: n.name.value,
      properties: n.properties, attributes: tabDom[i].attributes })),
    panel: { backendNodeId: panel.backendDOMNodeId, name: panel.name.value, properties: panel.properties, attributes: panelDom.attributes } };
}
const observations = [], pairs = new Map(); let controls = 0;
for (const row of report.observations) {
  const file = `${root}/${row.file}`, bytes = fs.readFileSync(file); assert.equal(hash(bytes), row.sha256);
  const o = JSON.parse(bytes); assert.equal(o.mode, row.mode); assert.equal(o.profile, row.profile); assert.deepEqual(o.viewport, row.viewport);
  const result = inspect(o), key = JSON.stringify([o.profile, o.viewport]), pair = pairs.get(key) ?? {};
  assert.equal(pair[o.mode], undefined); pair[o.mode] = result; pairs.set(key, pair);
  for (const mutate of [v => v.runtimeErrors.push('injected'), v => { v.nodes.find(n => !n.ignored && n.role.value === 'tab').name.value = 'forged'; },
    v => { v.nodes.find(n => !n.ignored && n.role.value === 'tabpanel').name.value = 'forged'; }]) {
    const forged = structuredClone(o); mutate(forged); assert.throws(() => inspect(forged)); controls++;
  }
  observations.push({ file, sha256: row.sha256, profile: o.profile, viewport: o.viewport, mode: o.mode, result });
}
assert.equal(observations.length, 24); assert.equal(pairs.size, 12); assert.equal(controls, 72);
for (const pair of pairs.values()) assert.deepEqual(Object.keys(pair).sort(), ['astylar', 'reference']);
console.log(JSON.stringify({ producer: { file: 'scripts/check-stepper-static-ax.mjs', sha256: hash(fs.readFileSync('scripts/check-stepper-static-ax.mjs')) },
  report: { file: reportFile, sha256: hash(reportBytes) }, sourceBindingReuse: { file: bindingFile, sha256: hash(bindingBytes) },
  pairs: 12, observations, negativeControlsRejected: controls,
  conclusion: 'All12 static pairs preserve tablist name and selected states. Native active tab/panel expose reciprocal controls/labelledby relationships;candidate DOM omits both attributes and panel name is empty. Native tab names Details/Review differ from candidate1Details/2Review. Distinguish authored omissions and numeric accessibility inputs before attributing any residual core defect.',
  boundary: 'Actual AX and backend DOM for pinned static build only. Native inactive target may be omitted from exposed AX despite authored aria-controls. Not interaction relationships,AT traversal,core capability proof,current full renderer equivalence,paint or case closure.',
  renderingAccepted: false, inspectionComplete: false }));
