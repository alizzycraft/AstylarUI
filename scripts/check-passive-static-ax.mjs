import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const root = 'artifacts/material-parity/passive-static-ax-20261021';
const reportFile = `${root}/latest-report.json`, report = JSON.parse(readFileSync(reportFile));
const historicalReplay = process.env.ASTYLAR_AUDIT_PASSIVE_HISTORICAL_REPLAY === '1';
const historicalTransitions = {
  'scripts/capture-passive-static-ax.mjs': {
    current: 'afa38baaaacb06b69fcbdfc66185ae2f44cd314bb278064af6f0b12bf512ea8a',
    load: () => readFileSync(`${root}/producer.mjs`),
  },
  'tests/material-parity/sort-focus-structure.spec.mjs': {
    current: '1e07ad431df8cc0c76bb8821a1f3d0c26841d57a353278bffa1d19a5000d3386',
    load: () => execFileSync('git', ['show', '35807a5a8dc51ccefa3e38026daae397a7af6dc7:tests/material-parity/sort-focus-structure.spec.mjs']),
  },
};
for (const value of Object.values(report.provenance).filter(v => v?.file && v?.sha256)) {
  let bytes = readFileSync(value.file);
  if (historicalReplay && hash(bytes) !== value.sha256 && historicalTransitions[value.file]) {
    const transition = historicalTransitions[value.file];
    assert.equal(hash(bytes.toString().replaceAll('\r\n', '\n')), transition.current, `Unrecognized live source: ${value.file}`);
    bytes = transition.load();
  }
  assert.equal(hash(bytes), value.sha256, value.file);
}
assert.equal(hash(readFileSync(`${root}/producer.mjs`)), report.provenance.producer.sha256);
assert.equal(hash(report.provenance.helperSource), report.provenance.helperSha256);
assert.equal(report.provenance.checkpoint.sha256, '9d0f1220ea6c2ca95cbfb143d94f7f5680a0d8cb11e074db879768f9763fd5b0');
const bindingFile = 'artifacts/material-parity/list-static-ax-review-20261021.log';
const binding = JSON.parse(readFileSync(bindingFile));
for (const b of binding.bindings) for (const r of [b.current, b.sourceMap]) assert.equal(hash(readFileSync(r.file)), r.sha256);
assert.match(readFileSync('examples/material-showcase/src/app/astylar.component.ts', 'utf8'), /type: 'main', id: 'sidenav-content'/);
assert.match(readFileSync('examples/material-showcase/src/app/reference.component.ts', 'utf8'), /<mat-sidenav-content id="sidenav-content">/);
const attr = (d, key) => { const i = d.attributes.indexOf(key); return i < 0 ? null : d.attributes[i + 1]; };
const one = nodes => { assert.equal(nodes.length, 1); return nodes[0]; };
const rows = [];
for (const record of report.observations) {
  const file = `${root}/${record.file}`, bytes = readFileSync(file);
  assert.equal(hash(bytes), record.sha256);
  const o = JSON.parse(bytes); assert.deepEqual(o.runtimeErrors, []);
  assert.equal(o.family, record.family); assert.equal(o.mode, record.mode);
  const map = new Map(o.nodes.map(n => [n.nodeId, n])); assert.equal(map.size, o.nodes.length);
  const targetDom = id => one(o.dom.filter(d => attr(d, o.mode === 'reference' ? 'id' : 'data-astylar-id') === id));
  const targetAx = dom => one(o.nodes.filter(n => n.backendDOMNodeId === dom.backendNodeId));
  const host = targetDom(`${o.family}-primary`), hostAx = targetAx(host);
  assert.equal(hostAx.ignored, false);
  const seen = new Set();
  function project(n) {
    assert.equal(seen.has(n.nodeId), false, 'Cycle or duplicate descendant'); seen.add(n.nodeId);
    const children = (n.childIds ?? []).flatMap(id => {
      const child = map.get(id); assert.ok(child); assert.equal(child.parentId, n.nodeId); return project(child);
    });
    // Focused semantic projection,NOT equality of ignored/generic/inline boxes.
    return n.ignored || ['generic', 'InlineTextBox'].includes(n.role?.value) ? children
      : [{ role: n.role?.value, name: n.name?.value, properties: n.properties ?? [], children }];
  }
  const projection = project(hostAx);
  const mains = o.nodes.filter(n => !n.ignored && n.role?.value === 'main');
  assert.equal(mains.length, o.mode === 'reference' ? 1 : o.family === 'sidenav' ? 3 : 2);
  const frameDom = one(o.dom.filter(d => d.nodeName === 'MAIN' && attr(d, 'class')?.split(' ').includes('frame')));
  const frameAx = targetAx(frameDom); assert.equal(frameAx.role.value, 'main'); assert.equal(frameAx.ignored, false);
  if (o.mode === 'astylar') {
    const page = targetAx(targetDom('page')); assert.equal(page.role.value, 'main');
    let parent = page;
    while (parent.nodeId !== frameAx.nodeId) { parent = map.get(parent.parentId); assert.ok(parent); }
  }
  let content = null;
  if (o.family === 'sidenav') {
    const dom = targetDom('sidenav-content'), ax = targetAx(dom);
    assert.equal(dom.nodeName, o.mode === 'reference' ? 'MAT-SIDENAV-CONTENT' : 'MAIN');
    assert.equal(ax.role.value, o.mode === 'reference' ? 'generic' : 'main');
    content = { nodeId: ax.nodeId, backendNodeId: dom.backendNodeId, tag: dom.nodeName, role: ax.role.value };
  }
  rows.push({ family: o.family, profile: o.profile, viewport: o.viewport, mode: o.mode,
    evidence: receipt(file), target: { nodeId: hostAx.nodeId, backendNodeId: host.backendNodeId },
    mainCount: mains.length, content, projection });
}
const key = row => JSON.stringify([row.family, row.profile, row.viewport, row.mode]);
const inventory = JSON.parse(readFileSync(report.provenance.report.file)).results
  .filter(r => ['sidenav', 'grid-list', 'table'].includes(r.family));
assert.equal(inventory.length, 36); assert.equal(rows.length, 72); assert.equal(new Set(rows.map(key)).size, 72);
assert.deepEqual(rows.map(key).sort(), inventory.flatMap(r => ['reference', 'astylar'].map(mode => key({ ...r, mode }))).sort());
const pairs = inventory.map(r => {
  const a = one(rows.filter(x => key(x) === key({ ...r, mode: 'reference' })));
  const b = one(rows.filter(x => key(x) === key({ ...r, mode: 'astylar' })));
  if (r.family !== 'sidenav') assert.deepEqual(a.projection, b.projection);
  else {
    const text = name => ({ role: 'StaticText', name, properties: [], children: [] });
    assert.deepEqual(a.projection, [text('Navigation'), text('Main content')]);
    assert.deepEqual(b.projection, [text('Navigation'), { role: 'main', name: '', properties: [], children: [text('Main content')] }]);
  }
  return { family: r.family, profile: r.profile, viewport: r.viewport,
    focusedSemanticProjectionMatches: r.family !== 'sidenav', referenceMainCount: a.mainCount, candidateMainCount: b.mainCount };
});
console.log(JSON.stringify({ kind: 'passive-static-actual-ax-review', producer: receipt('scripts/check-passive-static-ax.mjs'),
  report: receipt(reportFile), sourceBindingReuse: receipt(bindingFile), rows, pairs,
  provenanceMode: historicalReplay ? 'historical-replay-only' : 'current-files',
  counts: { pairedStaticCases: 36, captures: 72, matchingTableGridProjections: 24,
    additionalSharedPageMains: 36, additionalSidenavContentMains: 12 },
  boundary: 'Actual AX role/name/property/child topology after explicitly omitting ignored,generic and InlineTextBox wrappers only. All raw trees preserved. No full generic equivalence,AT/header associations,interaction-state,paint or complete case acceptance.' }));
