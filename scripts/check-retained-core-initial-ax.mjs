import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { sourceAuditDefinitions } from '../tests/material-parity/input-equivalence-policy.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(fs.readFileSync(file)) });
const root = 'artifacts/material-parity/remaining-static-ax-20261022';
const failureFile = `${root}/failure.json`, failure = JSON.parse(fs.readFileSync(failureFile));
const provenanceFile = `${root}/provenance.json`, provenance = JSON.parse(fs.readFileSync(provenanceFile));
assert.ok(failure.error.includes('TimeoutError')); assert.equal(failure.observations.length, 2);
assert.equal(provenance.checkpoint.sha256, '9d0f1220ea6c2ca95cbfb143d94f7f5680a0d8cb11e074db879768f9763fd5b0');
for (const r of Object.values(provenance).filter(r => r?.file && r?.sha256)) assert.equal(hash(fs.readFileSync(r.file)), r.sha256);
const bindingFile = 'artifacts/material-parity/list-static-ax-review-20261021.log', binding = JSON.parse(fs.readFileSync(bindingFile));
for (const b of binding.bindings) for (const r of [b.current, b.sourceMap]) assert.equal(hash(fs.readFileSync(r.file)), r.sha256);
const semanticLog = 'artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log';
assert.deepEqual(execFileSync(process.execPath, ['scripts/check-material-semantic-visibility-binding.mjs'], { maxBuffer: 4000000 }), fs.readFileSync(semanticLog));
const findings = ['core-semantic-text-transform-not-projected', 'fixture-showcase-outer-and-semantic-page-duplicate-main-landmarks'];
for (const id of findings) assert.ok(sourceAuditDefinitions.some(r => r.id === id));
const one = rows => { assert.equal(rows.length, 1); return rows[0]; };
function inspect(o) {
  assert.equal(o.family, 'core'); assert.equal(o.profile, 'light'); assert.equal(o.viewport.id, 'desktop');
  assert.deepEqual([o.viewport.width, o.viewport.height, o.viewport.deviceScaleFactor], [1440, 1000, 1]);
  assert.equal(o.browser, '155.0.8059.80'); assert.deepEqual(o.runtimeErrors, []);
  const reference = o.mode === 'reference'; assert.ok(reference || o.mode === 'astylar');
  assert.equal(new Set(o.nodes.map(n => n.nodeId)).size, o.nodes.length);
  const exposed = role => o.nodes.filter(n => !n.ignored && n.role.value === role);
  const button = one(exposed('button')), heading = one(exposed('heading')), region = one(exposed('region')), mains = exposed('main');
  assert.equal(button.name.value, 'Material ripple foundation'); assert.equal(region.name.value, 'core showcase');
  assert.equal(heading.name.value, reference ? 'Core' : 'core'); assert.equal(mains.length, reference ? 1 : 2);
  assert.equal(one(heading.properties.filter(p => p.name === 'level')).value.value, 1);
  assert.equal(one(button.properties.filter(p => p.name === 'focusable')).value.value, true);
  const byId = new Map(o.nodes.map(n => [n.nodeId, n])), ancestors = new Set(); let n = button;
  while (n.parentId) { assert.ok(!ancestors.has(n.parentId)); ancestors.add(n.parentId); n = byId.get(n.parentId); assert.ok(n); }
  assert.ok(ancestors.has(region.nodeId)); for (const main of mains) assert.ok(ancestors.has(main.nodeId));
  const dom = one(o.dom.filter(d => d.backendNodeId === button.backendDOMNodeId)); assert.equal(dom.nodeName, 'BUTTON');
  const key = reference ? 'id' : 'data-astylar-id', i = dom.attributes.indexOf(key); assert.ok(i >= 0); assert.equal(dom.attributes[i + 1], 'core-primary');
  return { button: { backend: button.backendDOMNodeId, name: button.name.value, properties: button.properties },
    heading: { backend: heading.backendDOMNodeId, name: heading.name.value, properties: heading.properties },
    region: { backend: region.backendDOMNodeId, name: region.name.value }, mainBackends: mains.map(n => n.backendDOMNodeId) };
}
let controls = 0; const observations = failure.observations.map(row => {
  const file = `${root}/${row.file}`, bytes = fs.readFileSync(file); assert.equal(hash(bytes), row.sha256);
  const o = JSON.parse(bytes), result = inspect(o);
  for (const mutate of [v => v.runtimeErrors.push('forged'), v => { one(v.nodes.filter(n => !n.ignored && n.role.value === 'button')).name.value += ' '; },
    v => { one(v.nodes.filter(n => !n.ignored && n.role.value === 'region')).nodeId = 'forged'; },
    v => { one(v.nodes.filter(n => !n.ignored && n.role.value === 'heading')).name.value += ' '; }]) {
    const forged = structuredClone(o); mutate(forged); assert.throws(() => inspect(forged)); controls++;
  }
  return { file, sha256: row.sha256, mode: o.mode, result };
});
assert.deepEqual(observations.map(r => r.mode).sort(), ['astylar', 'reference']); assert.equal(controls, 8);
console.log(JSON.stringify({ producer: receipt('scripts/check-retained-core-initial-ax.mjs'), failure: receipt(failureFile), provenance: receipt(provenanceFile),
  sourceBindingReuse: receipt(bindingFile), semanticBindingReuse: receipt(semanticLog), existingFindings: findings,
  pairs: 1, observations, negativeControlsRejected: controls,
  conclusion: 'The independently complete core/light/desktop pair retains matching region/button names and focusability,plus known heading-case and duplicate-main discrepancies. A later navigation failure does not erase these authenticated completed observations. No new cause or broad batch success inferred.',
  boundary: 'One pinned initial-state case and named-role/backend relationships only. Not all AX properties/anonymous roles,AT behavior,activation,focus delivery,paint,current whole renderer equivalence or case closure. Original failed batch stays failed;no recapture or frozen-source edit.',
  inspectionComplete: false, renderingAccepted: false }));
