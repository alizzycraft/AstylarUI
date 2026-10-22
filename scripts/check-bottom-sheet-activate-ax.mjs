import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const root = 'artifacts/material-parity/bottom-sheet-activate-ax-20261022';
const reportFile = `${root}/latest-report.json`, reportBytes = fs.readFileSync(reportFile), report = JSON.parse(reportBytes);
for (const r of Object.values(report.provenance).filter(r => r?.file && r?.sha256)) assert.equal(hash(fs.readFileSync(r.file)), r.sha256);
assert.equal(hash(report.provenance.helperSource), report.provenance.helperSha256);
assert.equal(report.provenance.checkpoint.sha256, '9d0f1220ea6c2ca95cbfb143d94f7f5680a0d8cb11e074db879768f9763fd5b0');
const action = report.provenance.actionSource, ast = ts.createSourceFile(action.file, fs.readFileSync(action.file, 'utf8'), 99, true);
assert.equal(hash(action.names.map(name => {
  const nodes = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.equal(nodes.length, 1); return nodes[0].getText(ast);
}).join('\n')), action.methodsSha256);
const bindingFile = 'artifacts/material-parity/list-static-ax-review-20261021.log', bindingBytes = fs.readFileSync(bindingFile), binding = JSON.parse(bindingBytes);
for (const b of binding.bindings) for (const r of [b.current, b.sourceMap]) assert.equal(hash(fs.readFileSync(r.file)), r.sha256);
const one = rows => { assert.equal(rows.length, 1); return rows[0]; };
const attr = (node, name) => { const i = node.attributes.indexOf(name); return i < 0 ? null : node.attributes[i + 1]; };
const exposed = (o, role) => o.nodes.filter(n => !n.ignored && n.role.value === role);
const focused = node => node.properties.some(p => p.name === 'focused' && p.value.value === true);
function inspect(o) {
  assert.equal(o.family, 'bottom-sheet'); assert.equal(o.state, 'activate');
  assert.equal(o.boundary, 'after-configured-activate-and-settlement');
  assert.equal(o.browser, '155.0.8059.80'); assert.deepEqual(o.runtimeErrors, []);
  const reference = o.mode === 'reference'; assert.ok(reference || o.mode === 'astylar');
  assert.equal(new Set(o.nodes.map(n => n.nodeId)).size, o.nodes.length);
  assert.equal(new Set(o.dom.map(n => n.backendNodeId)).size, o.dom.length);
  const dialog = one(exposed(o, 'dialog')), byId = new Map(o.nodes.map(n => [n.nodeId, n]));
  assert.equal(dialog.name.value, reference ? 'Sharing options' : 'Open bottom sheet');
  const dialogDom = one(o.dom.filter(d => d.backendNodeId === dialog.backendDOMNodeId));
  assert.equal(attr(dialogDom, 'role'), 'dialog'); assert.equal(attr(dialogDom, 'aria-label'), dialog.name.value);
  const navigation = exposed(o, 'navigation'); assert.equal(navigation.length, reference ? 1 : 0);
  const actions = exposed(o, reference ? 'link' : 'button').filter(n => ['Share', 'Copy link'].includes(n.name.value));
  assert.deepEqual(actions.map(n => n.name.value), ['Share', 'Copy link']);
  assert.equal(exposed(o, reference ? 'button' : 'link').filter(n => ['Share', 'Copy link'].includes(n.name.value)).length, 0);
  for (const node of actions) {
    const ancestors = new Set(); let n = node;
    while (n.parentId) { assert.ok(!ancestors.has(n.parentId)); ancestors.add(n.parentId); n = byId.get(n.parentId); assert.ok(n); }
    assert.ok(ancestors.has(dialog.nodeId));
    if (reference) assert.ok(ancestors.has(navigation[0].nodeId));
    const dom = one(o.dom.filter(d => d.backendNodeId === node.backendDOMNodeId));
    assert.equal(dom.nodeName, reference ? 'A' : 'BUTTON');
    if (reference) assert.equal(attr(dom, 'href'), '#');
  }
  const focus = one(o.nodes.filter(n => !n.ignored && n.role.value !== 'RootWebArea' && focused(n)));
  assert.equal(focus.name.value, reference ? 'Share' : 'Open bottom sheet');
  assert.equal(focus.role.value, reference ? 'link' : 'button');
  return { dialog: { backend: dialog.backendDOMNodeId, name: dialog.name.value, attributes: dialogDom.attributes },
    navigation: navigation.map(n => ({ backend: n.backendDOMNodeId, role: n.role.value, name: n.name.value })),
    actions: actions.map(n => ({ backend: n.backendDOMNodeId, role: n.role.value, name: n.name.value, properties: n.properties })),
    focused: { backend: focus.backendDOMNodeId, role: focus.role.value, name: focus.name.value } };
}
assert.equal(report.observations.length, 18);
let controls = 0; const pairs = new Map(), observations = [];
for (const row of report.observations) {
  const file = `${root}/${row.file}`, bytes = fs.readFileSync(file); assert.equal(hash(bytes), row.sha256);
  const o = JSON.parse(bytes), result = inspect(o), key = `${o.profile}/${o.viewport.id}`;
  const pair = pairs.get(key) ?? {}; assert.equal(pair[o.mode], undefined); pair[o.mode] = o; pairs.set(key, pair);
  for (const mutate of [
    v => v.runtimeErrors.push('forged'),
    v => { one(exposed(v, 'dialog')).name.value += ' '; },
    v => { const d = one(exposed(v, 'dialog')), dom = one(v.dom.filter(n => n.backendNodeId === d.backendDOMNodeId)); dom.attributes[dom.attributes.indexOf('aria-label') + 1] = 'forged'; },
    v => { one(exposed(v, v.mode === 'reference' ? 'link' : 'button').filter(n => n.name.value === 'Copy link')).role.value = 'generic'; },
    v => { one(exposed(v, v.mode === 'reference' ? 'link' : 'button').filter(n => n.name.value === 'Share')).parentId = one(exposed(v, 'RootWebArea')).nodeId; },
    v => { one(v.nodes.filter(n => !n.ignored && n.role.value !== 'RootWebArea' && focused(n))).properties = []; },
  ]) { const forged = structuredClone(o); mutate(forged); assert.throws(() => inspect(forged)); controls++; }
  observations.push({ file, sha256: row.sha256, profile: o.profile, viewport: o.viewport, mode: o.mode, result });
}
assert.equal(pairs.size, 9); assert.equal(controls, 108);
for (const pair of pairs.values()) { assert.deepEqual(Object.keys(pair).sort(), ['astylar', 'reference']); assert.deepEqual(pair.reference.viewport, pair.astylar.viewport); }
console.log(JSON.stringify({ producer: { file: 'scripts/check-bottom-sheet-activate-ax.mjs', sha256: hash(fs.readFileSync('scripts/check-bottom-sheet-activate-ax.mjs')) },
  report: { file: reportFile, sha256: hash(reportBytes) }, sourceBindingReuse: { file: bindingFile, sha256: hash(bindingBytes) },
  actionSource: action, pairs: 9, observations, negativeControlsRejected: controls,
  conclusion: 'All9 configured activate pairs expose differently named dialogs and native navigation/links versus candidate buttons. Native focus is Share;candidate focus remains Open bottom sheet. Names/roles match recorded unequal authoring;focus first-divergence and source history require investigation,not a core diagnosis from AX alone.',
  boundary: 'Pinned build,exact maintained action endpoint and backend-bound actual AX/DOM only. Not complete event ordering,focus trapping,AT traversal,paint,visibility,current full renderer equivalence or case closure. No frozen-export sources changed.',
  inspectionComplete: false, renderingAccepted: false }));
