import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const file = 'artifacts/material-parity/button-held-temporal-audit/latest-report.json';
const output = 'docs/material-button-held-temporal-audit.json';
export const heldTraceStages = ['start-command', 'after-pointer-down', 'after-held-command', 'after-settlement',
  'after-authored-measurement', 'after-screenshot-before-release', 'after-explicit-release', 'after-release-settlement'];
const count = (events, type, id) => events.filter(e => e.type === type && (!id || e.targetId === id)).length;

export function inspectHeldTrace(trace, row, entry) {
  assert.equal(trace.case, row.case); assert.equal(trace.element, row.element);
  assert.equal(trace.family, row.family); assert.equal(trace.profile, row.profile);
  assert.deepEqual(trace.viewport, row.viewport); assert.equal(row.state, 'held');
  assert.deepEqual(trace.originalInputTrees, row.inputTrees);
  assert.deepEqual(trace.originalInputTrees, entry.inputTrees);
  assert.deepEqual(trace.originalInteraction, entry.resourceSnapshots.at(-1).surface.interaction);
  assert.deepEqual(trace.originalPaint, { normal: row.candidate.normal, interaction: row.candidate.interaction, effective: row.candidate.effective });
  assert.equal(trace.historicalTimingProven, false); assert.equal(trace.rendererCauseProven, false);
  assert.equal(trace.inputEquivalent, false);
  assert.deepEqual(trace.stages.map(s => s.stage), heldTraceStages);
  const id = row.element, initial = trace.stages[0], down = trace.stages[1], settled = trace.stages[3];
  assert.equal(initial.astylar.interaction.pressedElementId, undefined);
  assert.equal(initial.reference.active, false);
  assert.equal(down.astylar.interaction.pressedElementId, id);
  assert.equal(count(down.astylar.events, 'pointerdown', id), 1);
  assert.equal(count(down.astylar.events, 'pointerup', id), 0);
  assert.equal(count(down.astylar.events, 'click', id), 0);
  const lost = settled.astylar.interaction.pressedElementId === undefined;
  assert.equal(lost, trace.originalInteraction.pressedElementId === undefined);
  if (!lost) assert.equal(settled.astylar.interaction.pressedElementId, id);
  const lostAtCommand = trace.stages[2].astylar.interaction.pressedElementId === undefined;
  if (lostAtCommand) assert.equal(lost, true);
  else assert.equal(trace.stages[2].astylar.interaction.pressedElementId, id);
  assert.equal(count(trace.stages[2].astylar.events, 'pointerup', id), lostAtCommand ? 1 : 0);
  assert.equal(count(trace.stages[2].astylar.events, 'click', id), lostAtCommand ? 1 : 0);
  for (const [index, stage] of trace.stages.entries()) {
    for (const mode of ['reference', 'astylar']) {
      const sample = stage[mode]; assert.equal(sample.stage, stage.stage);
      assert.ok(Number.isFinite(sample.time));
      assert.ok(sample.nativeEvents.every(e => e.trusted === true && e.time <= sample.time));
      if (index) {
        const previous = trace.stages[index - 1][mode];
        assert.ok(sample.time >= previous.time);
        assert.deepEqual(sample.nativeEvents.slice(0, previous.nativeEvents.length), previous.nativeEvents);
      }
      assert.equal(count(sample.nativeEvents, 'pointercancel'), 0);
      if (index > 0) {
        const downs = sample.nativeEvents.filter(e => e.type === 'pointerdown');
        assert.equal(downs.length, 1); assert.equal(downs[0].buttons, 1);
        if (mode === 'astylar') assert.equal(downs[0].target.tag, 'CANVAS');
        else {
          // Native hit targets include the reference's anonymous label span.
          // The independently sampled expected button's :active state below
          // establishes the active owner; do not rewrite the raw event target.
          assert.ok(['BUTTON', 'SPAN'].includes(downs[0].target.tag));
          assert.equal(downs[0].target.id, downs[0].target.tag === 'BUTTON' ? id : '');
        }
        assert.equal(count(sample.nativeEvents, 'pointerup'), index < 6 ? 0 : 1);
        assert.equal(count(sample.nativeEvents, 'click'), index < 6 ? 0 : 1);
      }
    }
    if (index > 0 && index < 6) {
      assert.equal(stage.reference.active, true); assert.equal(stage.reference.layerOpacity, '0.12');
    }
    if (index >= 3 && index < 6) {
      assert.equal(stage.astylar.session.status, 'idle');
      assert.deepEqual(stage.astylar.normal, row.candidate.normal);
      assert.deepEqual(stage.astylar.interactionStyle, row.candidate.interaction);
      assert.deepEqual(stage.astylar.effective, row.candidate.effective);
      assert.equal(stage.astylar.interaction.pressedElementId, lost ? undefined : id);
      assert.equal(count(stage.astylar.events, 'pointerup', id), lost ? 1 : 0);
      assert.equal(count(stage.astylar.events, 'click', id), lost ? 1 : 0);
      const blurCount = stage.astylar.nativeEvents.filter(e => e.type === 'blur' && e.target.tag === 'CANVAS').length;
      assert.equal(blurCount, lost ? 2 : 0);
    }
    if (index >= 6) {
      assert.equal(stage.reference.active, false);
      assert.equal(stage.astylar.interaction.pressedElementId, undefined);
      assert.equal(count(stage.astylar.events, 'click', id), 1);
    }
    if (index) assert.deepEqual(stage.astylar.events.slice(0, trace.stages[index - 1].astylar.events.length), trace.stages[index - 1].astylar.events);
  }
  assert.equal(trace.stages.at(-1).astylar.session.status, 'idle');
  if (lost) assert.ok(settled.astylar.session.revision > down.astylar.session.revision);
  return { case: row.case, element: id, lostBeforeRelease: lost,
    publicReleaseWithoutNativeRelease: lost, publicClickWithoutNativeClick: lost,
    observedLossBoundary: lost ? (lostAtCommand ? 'pointer-down-to-held-command' : 'held-command-to-settlement') : null,
    causeClassification: lost ? 'suspected-core-focus-rebuild-interaction-defect' : 'retained-held-control',
    inputEquivalent: false, rendererCauseProven: false };
}

export function collectHeldTrace({ read = readFileSync } = {}) {
  const readBound = descriptor => {
    assert.match(descriptor.sha256, /^[a-f0-9]{64}$/);
    assert.ok(typeof descriptor.file === 'string' && !descriptor.file.split('/').includes('..'));
    const bytes = read(descriptor.file); assert.equal(hash(bytes), descriptor.sha256, descriptor.file); return bytes;
  };
  const bytes = read(file), capture = JSON.parse(bytes);
  assert.equal(capture.kind, 'shared-button-held-state-temporal-replay');
  assert.equal(capture.schemaVersion, 1); assert.equal(capture.cases, 57);
  assert.deepEqual(capture.capture.styleProperties, []);
  assert.equal(capture.capture.schemaVersion, 1);
  assert.equal(capture.historicalTimingProven, false); assert.equal(capture.rendererCauseProven, false);
  assert.equal(capture.inputEquivalent, false);
  const manifest = JSON.parse(readBound(capture.capture.checkpointManifest));
  assert.equal(capture.browser, manifest.provenance.browser);
  assert.deepEqual(capture.capture.sources.map(s => s.file), ['scripts/capture-material-button-held-trace.mjs',
    'tests/material-parity/supplemental-capture-evidence.mjs', 'tests/material-parity/input-tree-evidence.mjs']);
  assert.deepEqual(capture.sources.map(s => s.file), ['tests/material-parity/run-material-parity.mjs',
    'tests/material-parity/cursor-metrics.mjs', 'node_modules/typescript/lib/typescript.js']);
  for (const descriptor of [...capture.capture.sources, ...capture.sources]) readBound(descriptor);
  const survey = JSON.parse(readBound(capture.survey));
  assert.deepEqual(capture.originalCapture, survey.capture);
  const original = JSON.parse(readBound(capture.originalCapture));
  assert.deepEqual(manifest.provenance, original.captureProvenance);
  const rows = survey.observations.filter(r => r.state === 'held' && r.element === `${r.family}-primary`);
  assert.equal(rows.length, 57);
  assert.deepEqual(capture.results.map(r => r.case), rows.map(r => r.case));
  assert.equal(new Set(capture.results.map(r => r.file)).size, 57);
  const assetMap = new Map(manifest.provenance.browserFiles.map(a => [a.file, a.sha256]));
  const observations = capture.results.map((descriptor, index) => {
    const trace = JSON.parse(readBound(descriptor)), row = rows[index];
    assert.equal(descriptor.case, row.case);
    const entries = original.interactions.filter(e => `${e.family}/${e.profile}/${e.viewport.id}/${e.state}` === row.case);
    assert.equal(entries.length, 1);
    for (const side of ['reference', 'astylar']) {
      readBound(row.inputTrees[side]);
      assert.deepEqual(trace.runtime[side].errors, []);
      for (const type of ['document', 'script', 'stylesheet', 'font']) assert.ok(trace.runtime[side].assets.some(a => a.type === type));
      for (const asset of trace.runtime[side].assets) assert.equal(asset.sha256, assetMap.get(asset.file));
    }
    assert.deepEqual(trace.screenshots.map(s => s.mode), ['reference', 'astylar']);
    for (const screenshot of trace.screenshots) {
      const png = readBound(screenshot);
      assert.equal(png.readUInt32BE(16), row.viewport.width * row.viewport.deviceScaleFactor);
      assert.equal(png.readUInt32BE(20), row.viewport.height * row.viewport.deviceScaleFactor);
    }
    return { ...inspectHeldTrace(trace, row, entries[0]), trace: descriptor, stages: trace.stages };
  });
  assert.equal(observations.filter(r => r.lostBeforeRelease).length, 17);
  assert.equal(observations.filter(r => r.observedLossBoundary === 'pointer-down-to-held-command').length, 1);
  return { schemaVersion: 1, kind: 'shared-button-held-state-temporal-audit',
    capture: { file, sha256: hash(bytes) }, originalCapture: survey.capture,
    sources: [capture.survey, ...capture.capture.sources, ...capture.sources,
      { file: 'scripts/audit-material-button-held-trace.mjs', sha256: hash(read('scripts/audit-material-button-held-trace.mjs')) }],
    cases: observations.length, lossesBeforeRelease: 17, retainedHeldControls: 40, observations,
    canonicalAttributionChanged: false, historicalTimingProven: false, rendererCauseProven: false, inputEquivalent: false,
    limitation: 'Fresh temporal replay confirms release/click before native release across the 17 original affected cases; it does not establish the original timing or prove a causal code path. Focus/rebuild stack tracing and public equivalent-input reduction remain required.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = collectHeldTrace();
  if (process.argv.includes('--check')) assert.deepEqual(JSON.parse(readFileSync(output)), result);
  else writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ cases: result.cases, lossesBeforeRelease: result.lossesBeforeRelease,
    retainedHeldControls: result.retainedHeldControls, canonicalAttributionChanged: false, rendererCauseProven: false }));
}
