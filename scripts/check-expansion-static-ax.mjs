import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const root = 'artifacts/material-parity/expansion-static-ax-20261021';
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
const one = rows => { assert.equal(rows.length, 1); return rows[0]; };
function inspect(o) {
  assert.equal(o.family, 'expansion'); assert.deepEqual(o.runtimeErrors, []);
  const reference = o.mode === 'reference'; assert.ok(reference || o.mode === 'astylar');
  const dom = one(o.dom.filter(d => reference ? d.nodeName === 'MAT-EXPANSION-PANEL-HEADER'
    : attr(d, 'data-astylar-id') === 'expansion-primary'));
  assert.equal(attr(dom, 'aria-expanded'), 'false');
  const header = one(o.nodes.filter(n => n.backendDOMNodeId === dom.backendNodeId));
  assert.equal(header.ignored, false); assert.equal(header.role.value, 'button');
  assert.equal(header.name.value, 'Advanced settings');
  assert.equal(one(header.properties.filter(p => p.name === 'expanded')).value.value, false);
  const controls = header.properties.filter(p => p.name === 'controls');
  const text = o.nodes.filter(n => !n.ignored && n.role.value === 'StaticText' && n.name?.value === 'Additional options.');
  assert.equal(text.length, reference ? 0 : 1);
  assert.equal(controls.length, reference ? 0 : 1);
  let target = null;
  if (!reference) {
    const related = one(controls[0].value.relatedNodes);
    const targetDom = one(o.dom.filter(d => d.backendNodeId === related.backendDOMNodeId));
    assert.equal(targetDom.nodeName, 'P'); assert.equal(attr(targetDom, 'data-astylar-id'), 'expansion-content');
    assert.equal(attr(targetDom, 'id'), related.idref); assert.equal(attr(targetDom, 'aria-labelledby'), null);
    const targetAx = one(o.nodes.filter(n => n.backendDOMNodeId === related.backendDOMNodeId));
    assert.equal(targetAx.ignored, false); assert.equal(targetAx.role.value, 'paragraph');
    target = { tag: targetDom.nodeName, role: targetAx.role.value, name: targetAx.name.value,
      labelledby: attr(targetDom, 'aria-labelledby'), backendDOMNodeId: related.backendDOMNodeId };
  }
  return { expanded: false, name: header.name.value, controlsCount: controls.length,
    exposedContentText: text.length, target };
}
const observations = [], pairs = new Map(); let rejected = 0;
for (const record of report.observations) {
  const file = `${root}/${record.file}`, bytes = fs.readFileSync(file);
  assert.equal(hash(bytes), record.sha256); const o = JSON.parse(bytes);
  assert.equal(o.mode, record.mode); assert.equal(o.profile, record.profile); assert.deepEqual(o.viewport, record.viewport);
  const result = inspect(o), key = JSON.stringify([o.profile, o.viewport]);
  const pair = pairs.get(key) ?? {}; assert.equal(pair[o.mode], undefined); pair[o.mode] = result; pairs.set(key, pair);
  for (const change of [v => v.runtimeErrors.push('injected'), v => {
    const header = one(v.nodes.filter(n => n.role?.value === 'button' && n.name?.value === 'Advanced settings'));
    one(header.properties.filter(p => p.name === 'expanded')).value.value = true;
  }]) { const forged = structuredClone(o); change(forged); assert.throws(() => inspect(forged)); rejected++; }
  observations.push({ file, sha256: record.sha256, profile: o.profile, viewport: o.viewport, mode: o.mode, result });
}
assert.equal(observations.length, 24); assert.equal(pairs.size, 12); assert.equal(rejected, 48);
for (const pair of pairs.values()) assert.deepEqual(Object.keys(pair).sort(), ['astylar', 'reference']);
console.log(JSON.stringify({ producer: { file: 'scripts/check-expansion-static-ax.mjs',
  sha256: hash(fs.readFileSync('scripts/check-expansion-static-ax.mjs')) },
  report: { file: reportFile, sha256: hash(reportBytes) }, bindings: { file: bindingFile, sha256: hash(bindingBytes) },
  pairs: pairs.size, observations, negativeControlsRejected: rejected,
  conclusion: 'All12 collapsed candidate headers expose a controls relation to an unlabelled paragraph and Additional options StaticText;native collapsed headers omit the hidden-target controls relation and content text. The retained native region versus candidate paragraph authoring difference is separate from the unexpected collapsed-content AX exposure.',
  boundary: 'Pinned collapsed static AX only. Hidden-style applicability,first core divergence,open-state relationships,public minimal reproduction and AT behavior remain unproven. No renderer defect classification or complete case/rendering acceptance follows.',
  renderingAccepted: false, inspectionComplete: false }));
