import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fingerprintDirectory } from '../tests/material-parity/run-checkpoint.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const file = 'artifacts/material-parity/divider-remount-peer-20261015/latest-report.json';
const bytes = readFileSync(file);
assert.equal(hash(bytes), '87c793252052bec4f67ef6a2abcb9ab57515ff9e2da33cfaffa72ebb07edf65d');
const report = JSON.parse(bytes), receipt = report.capture.checkpointManifest;
assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
const checkpoint = JSON.parse(readFileSync(receipt.file));
const assets = new Map(checkpoint.provenance.browserFiles.map(item => [item.file, item.sha256]));
for (const source of [...report.capture.sources, ...checkpoint.provenance.harness, report.sourceReceipt])
  assert.equal(hash(readFileSync(source.file)), source.sha256);
assert.deepEqual(fingerprintDirectory(path.resolve('examples/material-showcase/dist/material-showcase/browser')),
  checkpoint.provenance.browserFiles);

function verify(value) {
  assert.deepEqual(value.results.map(row => row.dpr), [1, 2]);
  for (const row of value.results) {
    const observed = row.observation, steps = observed.steps;
    assert.equal(observed.dpr, row.dpr); assert.equal(observed.profile, 'light');
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
]) { const forged = structuredClone(report); mutate(forged); assert.throws(() => verify(forged)); }
console.log(JSON.stringify({ phase: 'divider-remount-retained-verified', reportSha256: hash(bytes),
  browser: checkpoint.provenance.browser, cohorts: 2, remountsPerCohort: 3,
  stepsPerCohort: 14, assetsPerCohort: report.results.map(row => row.runtime.assets.length),
  negativeControlsRejected: 3, boundary: report.boundary }));
