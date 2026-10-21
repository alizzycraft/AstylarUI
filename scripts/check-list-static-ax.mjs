import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const root = 'artifacts/material-parity/list-static-ax-current-checkpoint-20261021';
const reportFile = `${root}/latest-report.json`, report = JSON.parse(readFileSync(reportFile));
for (const r of [report.provenance.producer, report.provenance.report, report.provenance.checkpoint,
  report.provenance.serverHelper, report.provenance.checkpointHelper]) assert.equal(hash(readFileSync(r.file)), r.sha256);
assert.equal(hash(report.provenance.helperSource), report.provenance.helperSha256);
assert.equal(hash(readFileSync(`${root}/producer.mjs`)), report.provenance.producer.sha256);
assert.equal(report.observations.length, 24);
const attribute = (node, name) => { const i = node.attributes.indexOf(name); return i < 0 ? null : node.attributes[i + 1]; };
const one = nodes => { assert.equal(nodes.length, 1); return nodes[0]; };
const rows = [];
for (const observation of report.observations) {
  const file = `${root}/${observation.file}`, bytes = readFileSync(file);
  assert.equal(hash(bytes), observation.sha256);
  const o = JSON.parse(bytes), byId = new Map(o.nodes.map(n => [n.nodeId, n]));
  assert.equal(byId.size, o.nodes.length);
  assert.deepEqual(o.runtimeErrors, []);
  const mains = o.nodes.filter(n => !n.ignored && n.role?.value === 'main');
  assert.equal(mains.length, o.mode === 'reference' ? 1 : 2);
  const frame = one(o.dom.filter(d => d.nodeName === 'MAIN' && attribute(d, 'class')?.split(' ').includes('frame')));
  const frameAx = one(mains.filter(n => n.backendDOMNodeId === frame.backendNodeId));
  let pageAx = null;
  if (o.mode === 'astylar') {
    const page = one(o.dom.filter(d => d.nodeName === 'MAIN' && attribute(d, 'data-astylar-id') === 'page'));
    pageAx = one(mains.filter(n => n.backendDOMNodeId === page.backendNodeId));
    let parent = pageAx;
    while (parent.nodeId !== frameAx.nodeId) { parent = byId.get(parent.parentId); assert.ok(parent); }
  }
  const target = one(o.dom.filter(d => attribute(d, o.mode === 'reference' ? 'id' : 'data-astylar-id') === 'list-primary'));
  const targetAx = one(o.nodes.filter(n => n.backendDOMNodeId === target.backendNodeId));
  assert.equal(targetAx.ignored, false); assert.equal(targetAx.role.value, 'generic');
  const descendants = [];
  function visit(n) { descendants.push(n); for (const id of n.childIds ?? []) { assert.ok(byId.has(id)); visit(byId.get(id)); } }
  visit(targetAx);
  const meaningful = descendants.filter(n => !n.ignored && !['generic', 'InlineTextBox'].includes(n.role?.value))
    .map(n => ({ role: n.role?.value, name: n.name?.value }));
  assert.deepEqual(meaningful, [{ role: 'StaticText', name: 'Inbox' }, { role: 'StaticText', name: 'Archive' }]);
  rows.push({ profile: o.profile, viewport: o.viewport, mode: o.mode, evidence: receipt(file),
    mainLandmarks: mains.map(n => ({ nodeId: n.nodeId, backendDOMNodeId: n.backendDOMNodeId })),
    frameBackend: frame.backendNodeId, pageBackend: pageAx?.backendDOMNodeId ?? null,
    listTarget: { nodeId: targetAx.nodeId, backendDOMNodeId: target.backendNodeId }, meaningful });
}
const bindings = [
  ['examples/material-showcase/src/app/astylar.component.ts', 'examples/material-showcase/dist/material-showcase/browser/chunk-PCHQTLJM.js.map'],
  ['examples/material-showcase/src/app/reference.component.ts', 'examples/material-showcase/dist/material-showcase/browser/chunk-7SL66K3U.js.map'],
].map(([file, sourceMap]) => {
  const map = JSON.parse(readFileSync(sourceMap));
  const indexes = map.sources.map((source, i) => source.endsWith('/' + file.split('/').at(-1)) ? i : -1).filter(i => i >= 0);
  assert.equal(indexes.length, 1);
  const embedded = map.sourcesContent[indexes[0]], current = readFileSync(file, 'utf8');
  assert.equal(embedded.replaceAll('\r\n', '\n'), current.replaceAll('\r\n', '\n'));
  assert.match(current, /<main class="frame"/);
  if (file.includes('astylar.component')) assert.match(current, /type: 'main', id: 'page'/);
  return { current: receipt(file), sourceMap: receipt(sourceMap), embeddedSha256: hash(embedded),
    sourcePath: map.sources[indexes[0]] };
});
assert.equal(new Set(rows.map(r => `${r.profile}/${r.viewport.id}`)).size, 12);
const inventory = JSON.parse(readFileSync(report.provenance.report.file)).results.filter(r => r.family === 'list');
const key = row => JSON.stringify([row.profile, row.viewport, row.mode]);
const expected = inventory.flatMap(row => ['reference', 'astylar'].map(mode => key({ ...row, mode }))).sort();
assert.deepEqual(rows.map(key).sort(), expected);
assert.equal(new Set(rows.map(key)).size, 24);
console.log(JSON.stringify({ kind: 'list-static-actual-ax-landmark-review', producer: receipt('scripts/check-list-static-ax.mjs'),
  report: receipt(reportFile), bindings, rows, counts: { pairedStaticCases: 12, captures: 24, extraCandidateMainLandmarks: 12 },
  conclusion: 'List component text/meaningful descendant roles agree in these actual AX subtrees. Candidate exposes both authored outer MAIN frame and inner SiteData MAIN page;reference exposes one. First divergence is application landmark nesting,not a core role invention. Not complete semantic/AT,interaction-state,paint or whole-case acceptance.' }));
