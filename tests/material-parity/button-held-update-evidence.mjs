import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { heldUpdateScenarios, inspectHeldUpdateCase } from '../../scripts/audit-button-held-update.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const heldUpdateArtifactRoot = 'artifacts/material-parity/button-held-update-audit';
const count = (events, type) => events.filter(e => e.type === type).length;
const failureNames = ['held-after-update:pressed', 'held-after-update:release-count',
  'held-after-update:click-count', 'held-after-update:active-style'];

function sourceFrame(stack, name, bundleLines, expectedLine) {
  const frames = [...stack.matchAll(/at ([^\n]+?) \(http:\/\/127\.0\.0\.1:\d+\/audit\.js:(\d+):(\d+)\)/g)];
  const matches = frames.filter(f => f[1] === name); assert.equal(matches.length, 1, `one ${name} stack frame`);
  const frame = matches[0], line = Number(frame[2]);
  assert.ok(line > 0 && line <= bundleLines.length);
  assert.match(bundleLines[line - 1], expectedLine, `${name} points to matching captured bundle instruction`);
  return { name, line, column: Number(frame[3]), instruction: bundleLines[line - 1].trim() };
}

export function inspectHeldUpdateCause(entry, bundleLines) {
  const replay = inspectHeldUpdateCase(entry);
  assert.deepEqual(replay.errors, []); assert.deepEqual(entry.errors, replay.errors);
  assert.deepEqual(entry.checks, replay.checks);
  const expectedFailure = ['equivalent', 'sibling-text', 'sibling-paint'].includes(entry.scenario);
  assert.deepEqual(Object.entries(replay.checks).filter(([, pass]) => !pass).map(([name]) => name), expectedFailure ? failureNames : []);
  const before = entry.stages[2].astylar, after = entry.stages[3].astylar;
  assert.equal(before.diagnostics.interaction.pressedElementId, 'first');
  assert.equal(before.active.tag, 'CANVAS');
  assert.equal(after.diagnostics.interaction.focusedElementId, 'first');
  const expectedStrategy = entry.scenario === 'equivalent' ? 'reuse' : expectedFailure ? 'rebuild' : 'initial';
  assert.equal(after.diagnostics.reconciliation.strategy, expectedStrategy);
  assert.equal(after.active.tag, expectedFailure ? 'BUTTON' : 'CANVAS');
  assert.equal(after.active.authoredId, expectedFailure ? 'first' : null);
  const updateKind = entry.scenario === 'after-release' ? 'sibling-text' : entry.scenario;
  for (const side of ['reference', 'astylar']) {
    const final = entry.stages.at(-1)[side], expected = structuredClone(final.initialSite);
    if (updateKind === 'sibling-text') expected.root.children[1].textContent = 'changed';
    if (updateKind === 'sibling-paint') expected.styles[2].background = '#abcdef';
    assert.deepEqual(final.site, expected);
    if (entry.scenario !== 'none') {
      assert.deepEqual(final.updates[0].before, final.initialSite);
      assert.deepEqual(final.updates[0].after, expected);
      assert.equal(final.updates[0].kind, updateKind);
    }
    for (const [index, stage] of entry.stages.entries()) {
      const sample = stage[side];
      const updated = entry.scenario !== 'none' && index >= (entry.scenario === 'after-release' ? 5 : 3);
      assert.deepEqual(sample.site, updated ? expected : final.initialSite);
      assert.deepEqual(sample.updates, updated ? final.updates : []);
      assert.ok(sample.nativeEvents.every(e => Number.isFinite(e.time) && e.time <= sample.time));
      if (side === 'astylar') {
        assert.ok(sample.publicEvents.every(e => Number.isFinite(e.time) && e.time <= sample.time));
        if (index) assert.deepEqual(sample.publicEvents.slice(0, entry.stages[index - 1][side].publicEvents.length), entry.stages[index - 1][side].publicEvents);
      }
      if (index) assert.ok(sample.time >= entry.stages[index - 1][side].time);
    }
    assert.equal(entry[`${side}Runtime`].disposed, true);
  }
  const result = { scenario: entry.scenario, dpr: entry.dpr, repetition: entry.repetition, stackTracing: entry.stackTracing,
    failed: expectedFailure, checks: replay.checks, strategy: expectedStrategy,
    pressedBeforeUpdate: before.diagnostics.interaction.pressedElementId,
    pressedAfterUpdate: after.diagnostics.interaction.pressedElementId ?? null,
    nativeFocusBeforeUpdate: before.active, nativeFocusAfterUpdate: after.active,
    nativeReleasesBeforeExplicitRelease: count(after.nativeEvents, 'pointerup'),
    publicReleasesBeforeExplicitRelease: count(after.publicEvents, 'pointerup'),
    publicClicksBeforeExplicitRelease: count(after.publicEvents, 'click'),
    causeFrames: [], screenshot: entry.stages[3].astylar.screenshot };
  if (expectedFailure) {
    const up = after.publicEvents.filter(e => e.type === 'pointerup'); assert.equal(up.length, 1);
    const click = after.publicEvents.filter(e => e.type === 'click'); assert.equal(click.length, 1);
    assert.equal(up[0].targetId, 'first'); assert.equal(click[0].targetId, 'first');
    assert.equal(up[0].buttons, 0);
    assert.ok(up[0].time >= after.updates[0].time && click[0].time >= up[0].time && click[0].time <= after.time);
    const blurs = after.nativeEvents.filter(e => e.type === 'blur' && e.target.tag === 'CANVAS');
    assert.equal(blurs.length, 2);
    assert.ok(blurs[0].time >= after.updates[0].time && blurs[0].time <= up[0].time);
    if (entry.stackTracing) {
      for (const event of [up[0], click[0]]) {
        assert.equal(typeof event.stack, 'string');
        const blur = event.stack.indexOf('HTMLCanvasElement._pointerBlurEvent');
        const focus = event.stack.indexOf('_AstylarSemanticBridge.syncFocus');
        const handling = event.stack.indexOf('AstylarInteractionRuntime.handlePointer');
        assert.ok(handling >= 0 && blur > handling && focus > blur);
      }
      result.causeFrames = [
        sourceFrame(up[0].stack, 'AstylarInteractionRuntime.handlePointer', bundleLines, /dispatchPointer\("pointerup"/),
        sourceFrame(up[0].stack, 'HTMLCanvasElement._pointerBlurEvent', bundleLines, /this\._onInputChanged\(/),
        sourceFrame(up[0].stack, '_AstylarSemanticBridge.syncFocus', bundleLines, /node\.focus\(\{ preventScroll: true \}\)/),
      ];
      for (const blur of blurs) sourceFrame(blur.stack, '_AstylarSemanticBridge.syncFocus', bundleLines, /node\.focus\(/);
      result.releaseStack = up[0].stack; result.clickStack = click[0].stack;
    } else {
      assert.equal(up[0].stack, null); assert.equal(click[0].stack, null);
      assert.ok(after.nativeEvents.every(e => e.stack === null));
    }
  }
  return result;
}

export function validateHeldUpdateEvidence(report, { root = process.cwd(), artifactRoot = heldUpdateArtifactRoot, read = readFileSync } = {}) {
  const fromRoot = file => read(path.resolve(root, file));
  const artifact = file => {
    assert.equal(path.basename(file), file, 'artifact basename only');
    return fromRoot(path.join(artifactRoot, file));
  };
  assert.equal(report.schemaVersion, 1); assert.equal(report.kind, 'public-button-held-compatible-update-proof');
  assert.deepEqual(report.viewport, { width: 640, height: 360 });
  assert.deepEqual(report.surfaceCssSize, { width: 400, height: 160 });
  assert.deepEqual(report.scenarios, heldUpdateScenarios); assert.deepEqual(report.runtimeErrors, []);
  const provenanceBytes = artifact(report.provenance.file); assert.equal(hash(provenanceBytes), report.provenance.sha256);
  const provenance = JSON.parse(provenanceBytes);
  assert.deepEqual(report.packages, provenance.packages);
  assert.equal(provenance.script.file, 'scripts/audit-button-held-update.mjs');
  assert.equal(hash(fromRoot(provenance.script.file)), provenance.script.sha256);
  const bundle = artifact('audit.js'); assert.equal(hash(bundle), provenance.bundleSha256);
  assert.ok(provenance.bundleInputs.length > 0);
  assert.equal(new Set(provenance.bundleInputs.map(i => i.file)).size, provenance.bundleInputs.length);
  for (const input of provenance.bundleInputs) assert.equal(hash(fromRoot(input.file)), input.sha256, input.file);
  assert.ok(provenance.bundleInputs.some(i => i.file === 'examples/material-showcase/audit/button-held-update.mjs'));
  const bundleLines = bundle.toString('utf8').split('\n'), observations = [];
  let index = 0;
  for (const dpr of [1, 2]) for (const repetition of [1, 2]) for (const stackTracing of [false, true]) for (const scenario of heldUpdateScenarios) {
    const entry = report.results[index++];
    for (const [key, value] of Object.entries({ dpr, repetition, stackTracing, scenario })) assert.equal(entry[key], value);
    for (const side of ['reference', 'astylar']) {
      const runtime = entry[`${side}Runtime`];
      assert.ok(runtime.assets.some(a => a.type === 'document' && a.sha256 === provenance.htmlSha256));
      assert.ok(runtime.assets.some(a => a.type === 'script' && a.sha256 === provenance.bundleSha256));
      assert.ok(runtime.assets.every(a => a.sha256 === (a.type === 'document' ? provenance.htmlSha256 : provenance.bundleSha256)));
      const screenshot = entry.stages[3][side].screenshot, png = artifact(screenshot.file);
      assert.equal(hash(png), screenshot.sha256);
      assert.equal(png.readUInt32BE(16), report.viewport.width * dpr);
      assert.equal(png.readUInt32BE(20), report.viewport.height * dpr);
    }
    observations.push(inspectHeldUpdateCause(entry, bundleLines));
  }
  assert.equal(report.results.length, index); assert.equal(index, 40);
  for (const observation of observations.filter(o => o.stackTracing)) {
    const counterpart = observations.find(o => !o.stackTracing && o.scenario === observation.scenario && o.dpr === observation.dpr && o.repetition === observation.repetition);
    for (const key of ['checks', 'strategy', 'pressedBeforeUpdate', 'pressedAfterUpdate', 'nativeFocusBeforeUpdate', 'nativeFocusAfterUpdate',
      'nativeReleasesBeforeExplicitRelease', 'publicReleasesBeforeExplicitRelease', 'publicClicksBeforeExplicitRelease'])
      assert.deepEqual(observation[key], counterpart[key], `passive stack tracing preserves ${key}`);
  }
  assert.equal(observations.filter(o => o.failed).length, 24);
  return { cases: 40, failedCases: 24, passingControls: 16, failedChecks: 96, tracedCauseCases: 12,
    observedBoundaries: 240, provenance, observations, causeProvenInPublicReduction: true,
    materialHistoricalCauseProven: false, renderingEquivalent: false };
}
