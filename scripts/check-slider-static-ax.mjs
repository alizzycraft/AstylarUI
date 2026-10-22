import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { sourceAuditDefinitions } from '../tests/material-parity/input-equivalence-policy.mjs';

// Inspect retained initial-state slider semantics, not pointer travel or paint.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(fs.readFileSync(file)) });
const root = 'artifacts/material-parity/remaining-static-ax-resume-20261022';
const reportFile = root + '/latest-report.json', report = JSON.parse(fs.readFileSync(reportFile));
assert.equal(report.observations.length, 678);
assert.equal(report.provenance.checkpoint.sha256, '9d0f1220ea6c2ca95cbfb143d94f7f5680a0d8cb11e074db879768f9763fd5b0');
for (const r of Object.values(report.provenance).filter(r => r?.file && r?.sha256))
  assert.equal(hash(fs.readFileSync(r.file)), r.sha256);
const finding = 'fixture-slider-fixed-half-domains';
assert.equal(sourceAuditDefinitions.filter(row => row.id === finding).length, 1);
const one = rows => { assert.equal(rows.length, 1); return rows[0]; };
function inspect(o) {
  assert.equal(o.family, 'slider'); assert.equal(o.browser, '155.0.8059.80'); assert.deepEqual(o.runtimeErrors, []);
  assert.ok(['reference', 'astylar'].includes(o.mode)); const native = o.mode === 'reference';
  const nodes = o.nodes.filter(n => !n.ignored && n.role.value === 'slider'); assert.equal(nodes.length, 2);
  return nodes.map((n, i) => {
    const id = i === 0 ? 'slider-start' : 'slider-primary', name = i === 0 ? 'Minimum' : 'Maximum';
    assert.equal(n.name.value, name); assert.equal(n.value.value, i === 0 ? 30 : 65);
    const d = one(o.dom.filter(d => d.backendNodeId === n.backendDOMNodeId)); assert.equal(d.nodeName, 'INPUT');
    assert.equal(d.attributes.length % 2, 0);
    const attrs = Object.fromEntries(Array.from({ length: d.attributes.length / 2 }, (_, i) => d.attributes.slice(i * 2, i * 2 + 2)));
    assert.equal(attrs[native ? 'id' : 'data-astylar-id'], id); assert.equal(attrs.type, 'range'); assert.equal(attrs['aria-label'], name);
    const min = i === 0 ? 0 : native ? 30 : 50, max = i === 1 ? 100 : native ? 65 : 50;
    assert.equal(attrs.min, String(min)); assert.equal(attrs.max, String(max)); assert.equal(attrs.step, native ? '5' : '1');
    assert.equal(attrs['aria-valuetext'], String(n.value.value));
    const properties = {};
    for (const p of n.properties) {
      assert.ok(!Object.hasOwn(properties, p.name)); assert.ok(Object.hasOwn(p.value, 'value'));
      properties[p.name] = p.value.value;
    }
    assert.deepEqual(properties, { invalid: 'false', focusable: true, settable: true, orientation: 'horizontal',
      valuemin: min, valuemax: max, valuetext: String(n.value.value) });
    return { id, backend: n.backendDOMNodeId, role: n.role.value, name: n.name, value: n.value, properties, attributes: attrs };
  });
}
const rows = report.observations.filter(row => row.family === 'slider'); assert.equal(rows.length, 24);
const pairs = new Map(); let controls = 0;
const observations = rows.map(row => {
  const file = root + '/' + row.file, bytes = fs.readFileSync(file); assert.equal(hash(bytes), row.sha256);
  const o = JSON.parse(bytes); assert.equal(o.profile, row.profile); assert.equal(o.mode, row.mode); assert.deepEqual(o.viewport, row.viewport);
  const result = inspect(o), key = `static:slider@${row.profile}/${row.viewport.id}`, pair = pairs.get(key) ?? {};
  assert.equal(pair[row.mode], undefined); pair[row.mode] = { o, result }; pairs.set(key, pair);
  const first = v => v.nodes.find(n => !n.ignored && n.role.value === 'slider');
  for (const mutate of [v => { first(v).name.value += 'forged'; }, v => { first(v).value.value++; },
    v => { first(v).properties.find(p => p.name === 'valuemax').value.value++; },
    v => { const d = one(v.dom.filter(d => d.backendNodeId === first(v).backendDOMNodeId)); d.attributes[d.attributes.indexOf('step') + 1] = '7'; },
    v => { const d = one(v.dom.filter(d => d.backendNodeId === first(v).backendDOMNodeId)); d.attributes[d.attributes.indexOf(v.mode === 'reference' ? 'id' : 'data-astylar-id') + 1] = 'forged'; }]) {
    const forged = structuredClone(o); mutate(forged); assert.throws(() => inspect(forged)); controls++;
  }
  return { case: key, file, sha256: row.sha256, family: row.family, profile: row.profile, viewport: row.viewport, mode: row.mode, result };
});
assert.equal(pairs.size, 12); assert.equal(controls, 120);
for (const pair of pairs.values()) {
  assert.deepEqual(Object.keys(pair).sort(), ['astylar', 'reference']); assert.deepEqual(pair.reference.o.viewport, pair.astylar.o.viewport);
  for (let i = 0; i < 2; i++) {
    const common = row => { const { valuemin, valuemax, ...properties } = row.properties; return { id: row.id, role: row.role, name: row.name.value, value: row.value.value, properties }; };
    assert.deepEqual(common(pair.reference.result[i]), common(pair.astylar.result[i]));
  }
}
// Existing whole-source and captured-bundle binding; do not recapture or rewrite receipts.
const bindingFile = 'artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log';
assert.deepEqual(execFileSync(process.execPath, ['scripts/check-material-semantic-visibility-binding.mjs'], { maxBuffer: 4000000 }), fs.readFileSync(bindingFile));
const sourceFile = 'artifacts/material-parity/list-static-ax-review-20261021.log', source = JSON.parse(fs.readFileSync(sourceFile));
for (const binding of source.bindings) for (const r of [binding.current, binding.sourceMap]) assert.equal(hash(fs.readFileSync(r.file)), r.sha256);
console.log(JSON.stringify({ producer: receipt('scripts/check-slider-static-ax.mjs'), report: receipt(reportFile),
  projectionBindingReuse: receipt(bindingFile), sourceBindingReuse: receipt(sourceFile), finding, pairs: 12, observations,
  negativeControlsRejected: controls, conclusion: 'Both backend-bound thumb names,values and remaining scalar AX properties agree. Native bounds follow the other thumb (0..65 and30..100),candidate bounds are fixed halves (0..50 and50..100);DOM steps5 versus1. First divergence is the already classified unequal authored range input,not semantic projection. No new finding.',
  boundary: 'All12 retained initial-state pairs only. Full attributes,keyboard/event transitions,drag/paint,anonymous nodes,current whole rendering and case closure remain open.',
  inspectionComplete: false, renderingAccepted: false, canonicalPublication: false }));
