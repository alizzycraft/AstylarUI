import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { inspectRangeDrag } from '../../scripts/audit-public-range-drag.mjs';

export const rangeDragArtifactRoot = 'artifacts/material-parity/public-range-drag-audit-v2';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const events = (sample, type, native = false) => sample[native ? 'nativeEvents' : 'publicEvents'].filter(e => e.type === type);
const values = entry => entry.stages.map(s => [s.reference.controls.map(c => c.value), s.astylar.controls.map(c => c.value)]);
function frame(stack, name, lines, instruction) {
  const matches = [...stack.matchAll(/at ([^\n]+?) \(http:\/\/127\.0\.0\.1:\d+\/audit\.js:(\d+):(\d+)\)/g)]
    .filter(m => m[1] === name);
  assert.equal(matches.length, 1, name); const line = Number(matches[0][2]);
  assert.match(lines[line - 1], instruction, name);
  return { name, line, column: Number(matches[0][3]), instruction: lines[line - 1].trim() };
}

export function inspectRangeDragCause(entry, bundleLines) {
  const replay = inspectRangeDrag(entry); assert.deepEqual(replay.errors, []);
  assert.deepEqual(entry.errors, replay.errors); assert.deepEqual(entry.checks, replay.checks);
  const index = entry.target === 'first' ? 0 : 1, peer = 1 - index;
  const held = entry.stages[2].astylar, updated = entry.stages[3].astylar, final = entry.stages[12].astylar;
  const hasUpdate = entry.update === 'held-equivalent', initial = index ? '65' : '30', end = index ? '0' : '100';
  assert.deepEqual(entry.stages[0].reference.controls.map(c => c.value), ['30', '65']);
  assert.deepEqual(entry.stages[0].astylar.controls.map(c => c.value), ['30', '65']);
  assert.equal(held.diagnostics.interaction.pressedElementId, entry.target);
  assert.equal(held.active.tag, 'CANVAS');
  assert.equal(updated.diagnostics.reconciliation.strategy, hasUpdate ? 'reuse' : 'initial');
  assert.equal(updated.diagnostics.interaction.pressedElementId ?? null, hasUpdate ? null : entry.target);
  assert.equal(updated.active.tag, hasUpdate ? 'INPUT' : 'CANVAS');
  assert.equal(updated.active.authoredId, hasUpdate ? entry.target : null);
  assert.equal(events(updated, 'pointerup', true).length, 0);
  assert.equal(events(updated, 'pointerup').length, hasUpdate ? 1 : 0);
  assert.equal(events(final, 'pointerup', true).length, 1);
  assert.equal(events(final, 'pointerup').length, hasUpdate ? 1 : 0);
  assert.equal(final.diagnostics.interaction.pressedElementId ?? null, null);
  assert.equal(entry.stages[12].reference.controls[index].value, end);
  assert.equal(final.controls[index].value, hasUpdate ? initial : end);
  const from = { x: (entry.translated ? 64 : 0) + (index ? 240 : 20) + 160 * (index ? .65 : .3),
    y: (entry.translated ? 40 : 0) + 60 };
  const to = { x: (entry.translated ? 64 : 0) + (index ? 240 : 20) + (index ? -15 : 175), y: from.y };
  assert.deepEqual(entry.pointer, { from, to });
  let unequalMoveValues = 0;
  for (const [i, stage] of entry.stages.entries()) {
    for (const side of ['reference', 'astylar']) {
      const sample = stage[side];
      assert.deepEqual(sample.site, entry.stages[0].reference.site, 'no authored input changes');
      assert.equal(sample.controls[peer].value, peer ? '65' : '30');
      for (const update of sample.updates) assert.deepEqual(update.document, sample.site);
      assert.ok(sample.nativeEvents.every(e => Number.isFinite(e.time) && e.time <= sample.time));
      if (i >= 2) {
        const down = events(sample, 'pointerdown', true)[0];
        assert.equal(down.clientX, from.x); assert.equal(down.clientY, from.y); assert.equal(down.buttons, 1);
        assert.equal(down.target.tag, side === 'reference' ? 'INPUT' : 'CANVAS');
        if (side === 'reference') assert.equal(down.target.id, entry.target);
      }
      if (i >= 4 && i <= 11) {
        const move = events(sample, 'pointermove', true).at(-1);
        assert.equal(move.clientX, from.x + (to.x - from.x) * (i - 3) / 8);
        assert.equal(move.clientY, from.y); assert.equal(move.buttons, 1);
      }
      if (side === 'astylar' && i) assert.deepEqual(sample.publicEvents.slice(0, entry.stages[i - 1][side].publicEvents.length),
        entry.stages[i - 1][side].publicEvents);
    }
    if (i >= 4 && i <= 11) {
      if (stage.reference.controls[index].value !== stage.astylar.controls[index].value) unequalMoveValues++;
      if (hasUpdate) assert.equal(stage.astylar.controls[index].value, initial);
      else {
        const move = events(stage.astylar, 'pointermove').at(-1);
        assert.equal(move.targetId, entry.target);
        const localX = from.x + (to.x - from.x) * (i - 3) / 8 - (entry.translated ? 64 : 0) - (index ? 240 : 20);
        assert.equal(move.localX, localX, 'public event uses CSS-local coordinates');
        assert.equal(Number(stage.astylar.controls[index].value), Math.round(Math.max(0, Math.min(1, localX / 160)) * 100 / 5) * 5);
      }
    }
  }
  assert.equal(unequalMoveValues, hasUpdate ? 8 : index ? 3 : 2);
  const causeFrames = [];
  if (hasUpdate) {
    const up = events(updated, 'pointerup')[0];
    assert.equal(up.targetId, entry.target); assert.equal(up.buttons, 0);
    assert.ok(up.time >= updated.updates[0].time && up.time <= updated.time);
    const blurs = events(updated, 'blur', true).filter(e => e.target.tag === 'CANVAS');
    assert.ok(blurs.length && blurs[0].time >= updated.updates[0].time && blurs[0].time <= up.time);
    if (entry.stackTracing) {
      const handling = up.stack.indexOf('AstylarInteractionRuntime.handlePointer');
      const blur = up.stack.indexOf('HTMLCanvasElement._pointerBlurEvent');
      const focus = up.stack.indexOf('_AstylarSemanticBridge.syncFocus');
      assert.ok(handling >= 0 && blur > handling && focus > blur);
      causeFrames.push(frame(up.stack, 'AstylarInteractionRuntime.handlePointer', bundleLines, /dispatchPointer\("pointerup"/),
        frame(up.stack, 'HTMLCanvasElement._pointerBlurEvent', bundleLines, /this\._onInputChanged\(/),
        frame(up.stack, '_AstylarSemanticBridge.syncFocus', bundleLines, /node\.focus\(/));
    } else assert.equal(up.stack, null);
  } else {
    assert.equal(events(final, 'change').length, 1);
    assert.equal(events(final, 'change')[0].targetId, entry.target);
    assert.equal(events(final, 'gotpointercapture', true).length, 1);
    assert.equal(events(final, 'lostpointercapture', true).length, 1);
  }
  return { dpr: entry.dpr, translated: entry.translated, target: entry.target, update: entry.update,
    stackTracing: entry.stackTracing, values: values(entry), unequalMoveValues,
    publicReleasesWhileHeld: events(updated, 'pointerup').length,
    nativeReleasesWhileHeld: events(updated, 'pointerup', true).length,
    publicReleasesAfterNativeUp: events(final, 'pointerup').length,
    strategy: updated.diagnostics.reconciliation.strategy, causeFrames,
    failedChecks: Object.entries(replay.checks).filter(([, pass]) => !pass).map(([name]) => name) };
}

export function validateRangeDragEvidence(report, { root = process.cwd(), read = readFileSync } = {}) {
  const source = file => read(path.resolve(root, file));
  const artifact = file => { assert.equal(path.basename(file), file); return source(`${rangeDragArtifactRoot}/${file}`); };
  assert.equal(report.schemaVersion, 1); assert.equal(report.kind, 'public-range-pointer-drag-reduction');
  assert.deepEqual(report.runtimeErrors, []); assert.deepEqual(report.viewport, { width: 640, height: 360 });
  assert.deepEqual(report.surfaceCssSize, { width: 440, height: 140 });
  const pbytes = artifact(report.provenance.file); assert.equal(hash(pbytes), report.provenance.sha256);
  const provenance = JSON.parse(pbytes); assert.deepEqual(report.packages, provenance.packages);
  assert.equal(provenance.script.file, 'scripts/audit-public-range-drag.mjs');
  assert.equal(hash(source(provenance.script.file)), provenance.script.sha256);
  assert.equal(new Set(provenance.bundleInputs.map(i => i.file)).size, provenance.bundleInputs.length);
  assert.ok(provenance.bundleInputs.some(i => i.file === 'examples/material-showcase/audit/range-drag.mjs'));
  for (const input of provenance.bundleInputs) assert.equal(hash(source(input.file)), input.sha256, input.file);
  const bundle = artifact('audit.js'); assert.equal(hash(bundle), provenance.bundleSha256);
  const text = bundle.toString('utf8'), lines = text.split('\n');
  assert.match(text, /setFromRatio\(input2, localX \/ width\)/);
  assert.match(text, /if \(targetId\)\s+this\.dispatchPointer\("pointerup", targetId, pointerInfo\)/);
  const observations = []; let index = 0;
  for (const dpr of [1, 2]) for (const translated of [false, true]) for (const target of ['first', 'second'])
    for (const update of ['none', 'held-equivalent']) for (const stackTracing of [false, true]) {
      const entry = report.results[index++];
      for (const [key, value] of Object.entries({ dpr, translated, target, update, stackTracing })) assert.equal(entry[key], value);
      for (const side of ['reference', 'astylar']) {
        const runtime = entry[`${side}Runtime`]; assert.equal(runtime.disposed, true);
        assert.ok(runtime.assets.some(a => a.type === 'script' && a.sha256 === provenance.bundleSha256));
        assert.ok(runtime.assets.some(a => a.type === 'document' && a.sha256 === provenance.htmlSha256));
        for (const stage of entry.stages.filter(s => ['initial', 'updated', 'move-8', 'released'].includes(s.name))) {
          const screenshot = stage[side].screenshot, png = artifact(screenshot.file); assert.equal(hash(png), screenshot.sha256);
          assert.equal(png.readUInt32BE(16), report.viewport.width * dpr); assert.equal(png.readUInt32BE(20), report.viewport.height * dpr);
        }
      }
      observations.push(inspectRangeDragCause(entry, lines));
    }
  assert.equal(report.results.length, index); assert.equal(index, 32);
  for (const observation of observations) {
    const counterpart = observations.find(o => o.target === observation.target && o.update === observation.update &&
      o.dpr === 1 && o.translated === false && o.stackTracing === false);
    for (const key of ['values', 'unequalMoveValues', 'failedChecks', 'publicReleasesWhileHeld', 'nativeReleasesWhileHeld',
      'publicReleasesAfterNativeUp', 'strategy']) assert.deepEqual(observation[key], counterpart[key], key);
  }
  return { cases: index, pairedBoundaries: index * 13, screenshots: index * 8,
    prematureReleaseCases: observations.filter(o => o.publicReleasesWhileHeld === 1).length,
    missingOutsideReleaseCases: observations.filter(o => o.update === 'none' && o.publicReleasesAfterNativeUp === 0).length,
    tracedCauseCases: observations.filter(o => o.causeFrames.length).length,
    failedChecks: observations.reduce((n, o) => n + o.failedChecks.length, 0), observations,
    updateReleaseCauseProvenInPublicReduction: true, materialSwappedThumbCauseProven: false, renderingEquivalent: false };
}
