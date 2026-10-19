import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { materialStaticCases, materialInteractionCases } from '../tests/material-parity/benchmark.config.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const file = 'artifacts/material-parity/divider-angular-cohorts-observed-20261019/latest-report.json', bytes = readFileSync(file);
assert.equal(hash(bytes), 'c4085cff905e8aed82ded6a30e2e96b92ddaabbfd9103d57d62f75d7a7888790');
const report = JSON.parse(bytes), receipt = report.capture.checkpointManifest, manifestBytes = readFileSync(receipt.file);
assert.equal(hash(manifestBytes), receipt.sha256);
const provenance = JSON.parse(manifestBytes).provenance;
for (const receipt of [...report.capture.sources, ...provenance.harness, provenance.baseProducer])
  assert.equal(hash(readFileSync(receipt.file)), receipt.sha256, receipt.file);
const assets = new Map(provenance.browserFiles.map(row => [row.file, row.sha256]));
const physical = new Map();
for (const [kind, rows] of [['static', materialStaticCases], ['interaction', materialInteractionCases]])
  for (const row of rows.filter(row => row.family === 'divider')) {
    const key = `${row.profile}/${row.viewport.width}/${row.viewport.height}/${row.viewport.deviceScaleFactor}`;
    if (!physical.has(key)) physical.set(key, { profile: row.profile, viewport: row.viewport, cases: [] });
    physical.get(key).cases.push(`${kind}:divider@${row.profile}/${row.viewport.id}${kind === 'interaction' ? `/${row.state}` : ''}`);
  }
assert.equal(physical.size, 20);
const themes = {};
new Function('exports', ts.transpileModule(readFileSync('examples/material-showcase/src/app/theme.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(themes);
const zero = { meshes: 0, materials: 0, textures: 0 };
function cleared(value) {
  assert.equal(value.disposed, true); assert.equal(value.sceneDisposed, true);
  assert.deepEqual(value.live, zero); assert.deepEqual(value.tracked, zero);
  assert.equal(value.interaction.disposed, true);
  for (const key of ['pointerObservers', 'wheelHandlers', 'keyboardListeners']) assert.equal(value.interaction[key], 0);
  // Explicit configured-callback count, not an active browser registration.
  assert.equal(value.configuredCallbacks, 1); assert.equal(value.interaction.handlers, 1);
  assert.equal(value.scrolling.disposed, true); assert.deepEqual(value.scrolling.containers, {});
  for (const key of ['nodes', 'eventRegistrations', 'observerRegistrations']) assert.equal(value.semantics[key], 0);
  assert.deepEqual(value.pluginResources, { owners: 0, resources: 0, cleanups: 0, pending: 0 });
  assert.deepEqual(value.sceneObservers, { pointer: 0, keyboard: 0, beforeRender: 0 });
}
function verify(row, expected) {
  const observed = row.observation;
  assert.equal(observed.error, undefined); assert.deepEqual(row.viewport, expected.viewport);
  assert.deepEqual(row.cases, expected.cases); assert.equal(row.profile, expected.profile);
  assert.equal(observed.dpr, expected.viewport.deviceScaleFactor);
  const bounds = { width: expected.viewport.width, height: expected.viewport.height };
  for (const key of ['viewport', 'canvasBounds', 'peerBounds']) assert.deepEqual(observed[key], bounds);
  assert.deepEqual(observed.theme, themes.MATERIAL_THEME_PROFILES[expected.profile]);
  assert.equal(observed.activated, 3); assert.equal(observed.deactivated, 4);
  assert.equal(observed.destroyWitnesses.length, 3);
  for (const witness of observed.destroyWitnesses) { assert.equal(witness.surfaceDestroyed, true); assert.equal(witness.routedDestroyed, true); }
  assert.deepEqual(row.runtime.errors, []);
  const peer = observed.steps[0].peer;
  let remounts = 0, destroyedSamples = 0;
  for (const step of observed.steps) {
    for (const owner of [step.current, step.peer, ...(step.retired ?? [])]) assert.deepEqual(owner.invalidBindings, []);
    if (step.label.includes('destroyed') || step.label === 'all-disposed') { cleared(step.current); destroyedSamples++; }
    for (const owner of step.retired ?? []) cleared(owner);
    if (step.label.startsWith('angular-destroyed-')) {
      for (const key of ['outletActive', 'surfaceHostConnected', 'canvasConnected', 'benchmarkPresent']) assert.equal(step[key], false);
      assert.equal(step.detachedCanvasEvents.before, step.detachedCanvasEvents.after);
    }
    if (step.label !== 'all-disposed') {
      assert.equal(step.peer.disposed, false); assert.deepEqual(step.peer.live, peer.live);
      assert.deepEqual(step.peer.tracked, peer.tracked); assert.deepEqual(step.peer.pluginResources, peer.pluginResources);
      for (const key of ['pointerObservers', 'wheelHandlers', 'keyboardListeners', 'handlers']) assert.equal(step.peer.interaction[key], peer.interaction[key]);
      for (const key of ['nodes', 'eventRegistrations', 'observerRegistrations']) assert.equal(step.peer.semantics[key], peer.semantics[key]);
    } else cleared(step.peer);
    if (step.label.startsWith('angular-remounted-')) {
      remounts++;
      for (const key of ['distinctSurface', 'distinctComponent', 'distinctCanvas', 'distinctRoutedComponent']) assert.equal(step[key], true);
      assert.equal(step.current.disposed, false); assert.deepEqual(step.current.live, { meshes: 17, materials: 17, textures: 4 });
    }
  }
  assert.equal(remounts, 3); assert.equal(destroyedSamples, 5);
}
assert.equal(report.results.length, 20);
let controls = 0;
for (const [index, expected] of [...physical.values()].entries()) {
  const row = report.results[index];
  for (const asset of row.runtime.assets) assert.equal(assets.get(asset.file), asset.sha256);
  verify(row, expected);
  for (const mutate of [
    row => row.observation.viewport.width++,
    row => { const theme = row.observation.theme; theme.primary = theme.primary === '#000000' ? '#ffffff' : '#000000'; },
    row => row.observation.destroyWitnesses[0].surfaceDestroyed = false,
    row => row.observation.steps[1].current.disposed = false,
    row => row.observation.steps[1].current.tracked.meshes = 1,
    row => row.observation.steps[1].current.interaction.pointerObservers = 1,
    row => row.observation.steps[1].current.semantics.nodes = 1,
    row => row.observation.steps[1].current.pluginResources.pending = 1,
    row => row.observation.steps[1].peer.disposed = true,
    row => row.observation.steps[1].detachedCanvasEvents.after++,
    row => row.observation.steps[2].distinctComponent = false,
    row => row.runtime.errors.push('unexpected'),
  ]) {
    const changed = structuredClone(row); mutate(changed); assert.throws(() => verify(changed, expected)); controls++;
  }
}
assert.equal(controls, 240);
console.log(JSON.stringify({ producerSha256: hash(readFileSync(import.meta.filename)), capture: { file, sha256: hash(bytes) },
  browser: provenance.browser, physicalCohorts: 20, configuredCaseMembership: new Set(report.results.flatMap(row => row.cases)).size,
  angularRemounts: 60, angularDeactivations: 80, detachedCanvasEventProbes: 360, negativeControls: controls,
  boundary: 'Observed viewport/canvas/theme/DPR,real Angular component destruction and tracked resource/registration cleanup at20 physical cohorts. Configured callback count is separately preserved. Not trusted navigation,late font/media cancellation,interactive peer callbacks,paint/current rendering or whole-case acceptance.' }));
