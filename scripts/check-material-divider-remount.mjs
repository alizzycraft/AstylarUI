import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fingerprintDirectory } from '../tests/material-parity/run-checkpoint.mjs';
import { materialStaticCases, materialInteractionCases } from '../tests/material-parity/benchmark.config.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const remaining = process.argv[2] === '--remaining';
assert.ok(process.argv[2] === undefined || remaining);
const file = `artifacts/material-parity/divider-remount-peer${remaining ? '-remaining' : ''}-20261015/latest-report.json`;
const bytes = readFileSync(file);
assert.equal(hash(bytes), remaining ? 'bf8d56513ee044141f8918a421313217b517603310a293516fd30559ae67967b'
  : '87c793252052bec4f67ef6a2abcb9ab57515ff9e2da33cfaffa72ebb07edf65d');
const report = JSON.parse(bytes), receipt = report.capture.checkpointManifest;
assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
const checkpoint = JSON.parse(readFileSync(receipt.file));
const assets = new Map(checkpoint.provenance.browserFiles.map(item => [item.file, item.sha256]));
for (const source of [...report.capture.sources, ...checkpoint.provenance.harness, report.sourceReceipt]) {
  // Exact captured initial driver bytes are retained,not relabeled as current.
  const capturedInitial = source.file === 'scripts/audit-material-divider-remount.mjs' &&
    source.sha256 === 'e0eb35a1bac97a1aba08b171b571ab4274730fd3b9a1219c82b7ff8376e125eb';
  assert.equal(hash(readFileSync(capturedInitial ? 'docs/evidence/material-divider-remount-initial.mjs.txt' : source.file)), source.sha256);
}
assert.deepEqual(fingerprintDirectory(path.resolve('examples/material-showcase/dist/material-showcase/browser')),
  checkpoint.provenance.browserFiles);
const physical = new Map();
for (const [kind, rows] of [['static', materialStaticCases], ['interaction', materialInteractionCases]])
  for (const row of rows.filter(value => value.family === 'divider')) {
    const key = `${row.profile}/${row.viewport.width}/${row.viewport.height}/${row.viewport.deviceScaleFactor}`;
    if (!physical.has(key)) physical.set(key, { profile: row.profile, viewport: row.viewport, cases: [] });
    physical.get(key).cases.push(`${kind}:divider@${row.profile}/${row.viewport.id}${kind === 'interaction' ? `/${row.state}` : ''}`);
  }
assert.equal(physical.size, 20);
const expected = [...physical.values()].filter(row => remaining
  ? !(row.profile === 'light' && row.viewport.width === 1440) : row.profile === 'light' && row.viewport.width === 1440);
const themes = {};
if (remaining) {
  const source = checkpoint.provenance.themeSource;
  assert.equal(hash(readFileSync(source.file)), source.sha256);
  new Function('exports', ts.transpileModule(readFileSync(source.file, 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(themes);
}

function verify(value) {
  assert.equal(value.results.length, remaining ? 18 : 2);
  for (const [index, row] of value.results.entries()) {
    const observed = row.observation, steps = observed.steps;
    const cohort = expected[index];
    assert.equal(observed.dpr, row.dpr); assert.equal(row.dpr, cohort.viewport.deviceScaleFactor);
    assert.deepEqual(observed.bounds, { width: cohort.viewport.width, height: cohort.viewport.height });
    if (remaining) {
      assert.equal(row.profile, cohort.profile); assert.deepEqual(row.viewport, cohort.viewport); assert.deepEqual(row.cases, cohort.cases);
      assert.deepEqual(observed.theme, themes.MATERIAL_THEME_PROFILES[cohort.profile]);
      assert.equal(observed.profile, observed.theme.mode);
    } else assert.equal(observed.profile, 'light');
    assert.deepEqual(observed.peerBounds, observed.bounds);
    assert.deepEqual(row.runtime.errors, []);
    for (const type of ['document', 'script', 'stylesheet', 'font'])
      assert.ok(row.runtime.assets.some(asset => asset.type === type));
    for (const asset of row.runtime.assets) assert.equal(asset.sha256, assets.get(asset.file));
    assert.deepEqual(steps.map(step => step.label), ['original', 'peer-mounted',
      ...[0, 1, 2].flatMap(cycle => [`disposed-${cycle}`, `remounted-${cycle}`, `updated-${cycle}`]),
      'final-current-disposed', 'peer-updated', 'all-disposed']);
    const baseline = steps[1].peer, plateau = steps.find(step => step.label === 'remounted-0').current;
    const retired = new Map();
    for (const step of steps) {
      for (const owner of [step.current, step.peer, ...step.retired].filter(Boolean)) {
        assert.deepEqual(owner.invalidMeshBindings, []); assert.deepEqual(owner.messages, []);
        assert.deepEqual(owner.tracked, owner.live);
        if (owner.disposed) {
          assert.equal(owner.sceneDisposed, true); assert.equal(owner.status, 'disposed');
          assert.deepEqual(owner.live, { meshes: 0, materials: 0, textures: 0 });
          assert.deepEqual(owner.plugins, { owners: 0, resources: 0, cleanups: 0, pending: 0 });
        } else { assert.equal(owner.sceneDisposed, false); assert.equal(owner.status, 'idle'); }
      }
      step.retired.forEach((owner, index) => {
        if (retired.has(index)) assert.deepEqual(owner, retired.get(index)); else retired.set(index, owner);
      });
      if (step.peer && !['peer-updated', 'all-disposed'].includes(step.label)) assert.deepEqual(step.peer, baseline);
      if (step.peer && !step.current.disposed) assert.equal(step.distinctScenes, true);
      if (/^(remounted|updated)-/.test(step.label)) {
        assert.deepEqual(step.current.live, plateau.live); assert.deepEqual(step.current.plugins, plateau.plugins);
      }
    }
    assert.equal(retired.size, 4); assert.equal(steps.at(-1).peer.disposed, true);
    const updated = steps.find(step => step.label === 'peer-updated').peer;
    assert.equal(updated.revision, baseline.revision + 1);
    assert.deepEqual(updated.live, baseline.live); assert.deepEqual(updated.materialIds, baseline.materialIds);
    assert.deepEqual(updated.textureIds, baseline.textureIds);
  }
}
verify(report);
for (const mutate of [
  value => value.results.pop(),
  value => { value.results[0].observation.steps.find(step => step.label === 'disposed-0').peer.materialIds[0] = -1; },
  value => { value.results[0].observation.steps.at(-1).retired[0].live.textures = 1; },
  value => { value.results[1] = structuredClone(value.results[0]); },
]) { const forged = structuredClone(report); mutate(forged); assert.throws(() => verify(forged)); }
console.log(JSON.stringify({ phase: 'divider-remount-retained-verified', reportSha256: hash(bytes),
  browser: checkpoint.provenance.browser, cohorts: report.results.length, remountsPerCohort: 3,
  stepsPerCohort: 14, assetsPerCohort: report.results.map(row => row.runtime.assets.length),
  negativeControlsRejected: 4, boundary: report.boundary }));
