import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

assert.equal(process.argv.length, 4, 'Supply first and repeated sample report paths.');
const hash = b => createHash('sha256').update(b).digest('hex');
const cache = new Map();
const read = file => { if (!cache.has(file)) cache.set(file, readFileSync(file)); return cache.get(file); };
const hashed = item => { const bytes = read(item.file); assert.equal(hash(bytes), item.sha256, item.file); return bytes; };
const reports = process.argv.slice(2).map(file => ({ file, sha256: hash(read(file)), report: JSON.parse(read(file)) }));
assert.notEqual(reports[0].file, reports[1].file);
const requestFile = 'docs/material-origin-request-contexts.json', request = JSON.parse(read(requestFile));
assert.equal(hash(read(requestFile)), '8cd9950f3dc692509f1b8fd897fe60b9239281acfeac482c07e48e62a4d55696');
const expected = request.contexts.map((_, context) => request.observations.find(o => o.context === context));
const originalReport = JSON.parse(hashed(request.capture)), originalCases = new Map();
for (const [kind, list] of [['static', originalReport.results], ['interaction', originalReport.interactions]]) for (const e of list)
  originalCases.set(`${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`, e);
const canonicalRule = r => ({ selector: r.selector, cssText: r.cssText, declarations: r.declarations, active: r.active, conditions: r.conditions });

function verify(report) {
  assert.equal(report.kind, 'reference-origin-motion-context-samples');
  assert.equal(report.schemaVersion, 1);
  assert.deepEqual(report.originalCapture, request.capture); hashed(report.originalCapture);
  assert.equal(report.requestInventory.file, requestFile); hashed(report.requestInventory);
  const manifest = JSON.parse(hashed(report.capture.checkpointManifest));
  assert.equal(report.browser, manifest.provenance.browser);
  assert.deepEqual(report.capture.sources.map(s => s.file), ['scripts/audit-material-origin-motion-samples.mjs',
    'tests/material-parity/supplemental-capture-evidence.mjs', 'tests/material-parity/input-tree-evidence.mjs']);
  for (const source of report.capture.sources) hashed(source);
  const assets = new Map(manifest.provenance.browserFiles.map(f => [f.file, f.sha256]));
  const observations = report.results.flatMap(r => r.observations.map(o => ({ case: r.case, ...o })));
  assert.deepEqual(observations.map(o => [o.case, o.context, o.element, o.referenceNode, o.originalInputTrees]),
    expected.map(o => [o.case, o.context, o.element, o.referenceNode, o.inputTrees]));
  assert.equal(report.results.length, 10);
  assert.equal(new Set(report.results.map(r => r.case)).size, 10);
  let pathNodes = 0;
  for (const result of report.results) {
    const originalCase = originalCases.get(result.case); assert.ok(originalCase);
    assert.deepEqual(result.viewport, originalCase.viewport);
    assert.deepEqual(result.runtime.errors, []);
    for (const type of ['document', 'script', 'stylesheet', 'font']) assert.ok(result.runtime.assets.some(a => a.type === type));
    for (const asset of result.runtime.assets) { assert.ok(assets.has(asset.file)); assert.equal(asset.sha256, assets.get(asset.file)); }
    const fresh = JSON.parse(hashed(result.inputTree)); assert.deepEqual(fresh.errors, []);
    for (const o of result.observations) {
      assert.equal(o.status, 'captured-context-reproduced'); assert.deepEqual(o.mismatches, []);
      const original = JSON.parse(hashed(o.originalInputTrees.reference)); hashed(o.originalInputTrees.astylar);
      const path = [], seen = new Set(); let node = original.nodes.find(n => n.key === o.referenceNode);
      assert.ok(node);
      while (node) {
        assert.ok(!seen.has(node.key)); seen.add(node.key); path.unshift(node);
        if (node.parent === null) break;
        const parents = original.nodes.filter(n => n.key === node.parent); assert.equal(parents.length, 1); node = parents[0];
      }
      assert.deepEqual(o.motion.map(m => m.key), path.map(n => n.key));
      for (const [i, before] of path.entries()) {
        const after = fresh.nodes.filter(n => n.key === before.key); assert.equal(after.length, 1);
        for (const key of ['type', 'parent', 'attributes', 'ownText', 'inline']) assert.deepEqual(after[0][key], before[key]);
        for (const [key, value] of Object.entries(original.styles[before.style])) assert.equal(fresh.styles[after[0].style][key], value);
        assert.deepEqual(after[0].rules.map(j => canonicalRule(fresh.rules[j])), before.rules.map(j => canonicalRule(original.rules[j])));
        const motion = o.motion[i]; assert.equal(motion.type, before.type);
        for (const key of ['transform', 'transformOrigin']) assert.equal(motion.computed[key], original.styles[before.style][key]);
        assert.equal(motion.computed.animationName, 'none'); assert.deepEqual(motion.animations, []);
        for (const key of ['transformBox', 'transitionProperty', 'transitionDuration', 'transitionDelay', 'animationDuration',
          'animationDelay', 'animationPlayState', 'animationFillMode']) assert.equal(typeof motion.computed[key], 'string');
        pathNodes++;
      }
    }
  }
  return { cases: report.results.length, contexts: observations.length, pathNodes, observations: observations.map(o => ({
    case: o.case, context: o.context, element: o.element, motion: o.motion,
  })) };
}

const verified = reports.map(r => verify(r.report));
assert.deepEqual(verified[0], verified[1], 'Repeated computed motion and owner paths differ.');
const mutations = [
  ['missing-case', r => r.results.pop()],
  ['duplicate-case', r => r.results.push(r.results[0])],
  ['missing-context', r => r.results[0].observations.pop()],
  ['wrong-owner', r => { r.results[0].observations[0].referenceNode = 'frame'; }],
  ['wrong-viewport', r => { r.results[0].viewport.width += 1; }],
  ['missing-ancestor', r => r.results[0].observations[0].motion.shift()],
  ['changed-origin', r => { r.results[0].observations[0].motion[0].computed.transformOrigin = '999px 0px'; }],
  ['changed-transform', r => { r.results[0].observations[0].motion[0].computed.transform = 'scale(2)'; }],
  ['named-animation', r => { r.results[0].observations[0].motion[0].computed.animationName = 'unproved'; }],
  ['live-animation', r => r.results[0].observations[0].motion[0].animations.push({ playState: 'running' })],
  ['missing-motion-value', r => { delete r.results[0].observations[0].motion[0].computed.transitionDuration; }],
  ['runtime-error', r => r.results[0].runtime.errors.push('synthetic error')],
  ['missing-font-evidence', r => { r.results[0].runtime.assets = r.results[0].runtime.assets.filter(a => a.type !== 'font'); }],
  ['changed-asset', r => { r.results[0].runtime.assets[0].sha256 = '0'.repeat(64); }],
  ['changed-tree', r => { r.results[0].inputTree.sha256 = '0'.repeat(64); }],
  ['changed-source', r => { r.capture.sources[0].sha256 = '0'.repeat(64); }],
  ['changed-browser', r => { r.browser = 'unverified'; }],
];
for (const [name, mutate] of mutations) {
  const altered = structuredClone(reports[0].report); mutate(altered); assert.throws(() => verify(altered), undefined, name);
}
console.log(JSON.stringify({ reports: reports.map(({ file, sha256 }) => ({ file, sha256 })), browser: reports[0].report.browser,
  repeated: true, casesPerRun: verified[0].cases, contextsPerRun: verified[0].contexts, pathNodesPerRun: verified[0].pathNodes,
  allSampledAnimationNamesNone: true, allSampledOwnerAnimationListsEmpty: true, mutationControlsRejected: mutations.map(([name]) => name),
  observations: verified[0].observations, limitations: ['Only 15 context samples, not all 1368 observations.',
    'Captured transform-origin matches do not prove a candidate computed origin or equivalent inputs.',
    'Motion state is observed at these settled samples; transitions may be declared even with no running animation.'] }));
