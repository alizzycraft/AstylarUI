import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const root = 'artifacts/material-parity/card-static-ax-20261021';
const reportFile = `${root}/latest-report.json`, reportBytes = fs.readFileSync(reportFile);
const report = JSON.parse(reportBytes);
for (const receipt of Object.values(report.provenance).filter(x => x?.file && x?.sha256))
  assert.equal(hash(fs.readFileSync(receipt.file)), receipt.sha256);
assert.equal(hash(report.provenance.helperSource), report.provenance.helperSha256);
assert.equal(report.provenance.checkpoint.sha256, '9d0f1220ea6c2ca95cbfb143d94f7f5680a0d8cb11e074db879768f9763fd5b0');
const bindingFile = 'artifacts/material-parity/list-static-ax-review-20261021.log';
const bindingBytes = fs.readFileSync(bindingFile), binding = JSON.parse(bindingBytes);
for (const b of binding.bindings) for (const receipt of [b.current, b.sourceMap])
  assert.equal(hash(fs.readFileSync(receipt.file)), receipt.sha256);
const attr = (node, key) => { const i = node.attributes.indexOf(key); return i < 0 ? null : node.attributes[i + 1]; };
function inspect(o) {
  assert.equal(o.family, 'card'); assert.deepEqual(o.runtimeErrors, []);
  const reference = o.mode === 'reference'; assert.ok(reference || o.mode === 'astylar');
  const dom = o.dom.filter(d => attr(d, reference ? 'id' : 'data-astylar-id') === 'card-title');
  assert.equal(dom.length, 1); assert.equal(dom[0].nodeName, reference ? 'MAT-CARD-TITLE' : 'H2');
  const ax = o.nodes.filter(n => n.backendDOMNodeId === dom[0].backendNodeId);
  assert.equal(ax.length, 1); const title = ax[0]; assert.equal(title.ignored, false);
  assert.equal(title.role.value, reference ? 'generic' : 'heading');
  assert.equal(title.name.value, reference ? '' : 'Project Atlas');
  const levels = title.properties.filter(p => p.name === 'level');
  assert.deepEqual(levels.map(p => p.value.value), reference ? [] : [2]);
  const children = title.childIds.map(id => {
    const nodes = o.nodes.filter(n => n.nodeId === id); assert.equal(nodes.length, 1);
    assert.equal(nodes[0].parentId, title.nodeId); return nodes[0];
  });
  assert.deepEqual(children.map(n => [n.role.value, n.name.value]), [['StaticText', 'Project Atlas']]);
  return { tag: dom[0].nodeName, role: title.role.value, name: title.name.value,
    levels: levels.map(p => p.value.value), text: children[0].name.value };
}
const observations = [], pairs = new Map(); let controls = 0;
for (const record of report.observations) {
  const file = `${root}/${record.file}`, bytes = fs.readFileSync(file);
  assert.equal(hash(bytes), record.sha256); const o = JSON.parse(bytes);
  assert.equal(o.mode, record.mode); assert.equal(o.profile, record.profile);
  assert.deepEqual(o.viewport, record.viewport);
  const title = inspect(o), key = JSON.stringify([o.profile, o.viewport]);
  const pair = pairs.get(key) ?? {}; assert.equal(pair[o.mode], undefined);
  pair[o.mode] = title; pairs.set(key, pair);
  for (const change of [v => { v.runtimeErrors.push('injected'); }, v => {
    const d = v.dom.find(d => attr(d, v.mode === 'reference' ? 'id' : 'data-astylar-id') === 'card-title');
    v.nodes.find(n => n.backendDOMNodeId === d.backendNodeId).role.value = 'button';
  }]) { const forged = structuredClone(o); change(forged); assert.throws(() => inspect(forged)); controls++; }
  observations.push({ file, sha256: record.sha256, mode: o.mode, title });
}
assert.equal(observations.length, 24); assert.equal(pairs.size, 12); assert.equal(controls, 48);
for (const pair of pairs.values()) assert.deepEqual(Object.keys(pair).sort(), ['astylar', 'reference']);
console.log(JSON.stringify({ producer: { file: 'scripts/check-card-static-ax.mjs',
  sha256: hash(fs.readFileSync('scripts/check-card-static-ax.mjs')) },
  report: { file: reportFile, sha256: hash(reportBytes) },
  bindings: { file: bindingFile, sha256: hash(bindingBytes) }, pairs: 12, observations,
  negativeControlsRejected: controls, classification: 'application-plugin-authoring-defect',
  conclusion: 'Authored H2 exposes heading level2 named Project Atlas;native MAT-CARD-TITLE exposes a generic container with the same StaticText. This is a title semantic input substitution,not a renderer-invented heading.',
  boundary: 'Pinned static actual AX only;not interaction semantics,AT traversal,all relationships,current paint or complete case inspection.',
  renderingAccepted: false, inspectionComplete: false }));
