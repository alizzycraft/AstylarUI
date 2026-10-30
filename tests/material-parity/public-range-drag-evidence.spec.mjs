import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { makePartialRangeReport } from '../../scripts/audit-public-range-drag.mjs';
import { rangeDragArtifactRoot, inspectRangeDragCause, validateRangeDragEvidence } from './public-range-drag-evidence.mjs';
const report = JSON.parse(readFileSync(`${rangeDragArtifactRoot}/latest-report.json`));
const lines = readFileSync(`${rangeDragArtifactRoot}/audit.js`, 'utf8').split('\n');

test('partial range capture preserves completed cases without claiming completion', () => {
  const results = [{ target: 'first', checks: { value: false } }];
  const partial = makePartialRangeReport(results, [{ type: 'pageerror' }], new Error('navigation timeout'), 'digest');
  assert.equal(partial.complete, false);
  assert.equal(partial.kind, 'public-range-pointer-drag-partial');
  assert.deepEqual(partial.results, results);
  assert.deepEqual(partial.error, { name: 'Error', message: 'navigation timeout' });
  assert.deepEqual(partial.provenance, { file: 'provenance.json', sha256: 'digest' });
  assert.equal(partial.runtimeErrors.length, 1);
});

test('retained range timestamps are settled action samples, not continuous visual motion evidence', () => {
  const travel = JSON.parse(readFileSync('docs/material-public-range-travel-audit.json'));
  const bytes = readFileSync(`${rangeDragArtifactRoot}/latest-report.json`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), travel.originalReport.sha256);
  assert.equal(travel.originalReport.file, `${rangeDragArtifactRoot}/latest-report.json`);
  let samples = 0, movementPictures = 0;
  for (const entry of report.results) for (const side of ['reference', 'astylar']) {
    let previous = -Infinity;
    for (const stage of entry.stages) {
      const sample = stage[side];
      assert.ok(Number.isFinite(sample.time) && sample.time >= previous);
      previous = sample.time;
      assert.equal(Boolean(sample.screenshot), ['initial', 'updated', 'move-8', 'released'].includes(stage.name));
      if (stage.name.startsWith('move-') && sample.screenshot) movementPictures++;
      // These fields describe semantic controls/events, not an animation timeline
      // or rendered thumb positions at each frame. Do not compare clocks across
      // the separately navigated reference and candidate pages.
      assert.deepEqual(Object.keys(sample).filter(key => !['mode', 'translated', 'stackTracing', 'site',
        'controls', 'time', 'surfaceBox', 'nativeEvents', 'publicEvents', 'updates', 'active',
        'diagnostics', 'resolved', 'screenshot'].includes(key)), []);
      samples++;
    }
  }
  assert.equal(samples, 832);
  assert.equal(movementPictures, 64, 'only the final of eight movement boundaries has a raster per side');
  assert.equal(travel.renderingEquivalent, false);
});

test('public range reduction binds every case, source, served bundle, screenshot and causal stack', () => {
  const proof = validateRangeDragEvidence(report);
  assert.equal(proof.cases, 32); assert.equal(proof.pairedBoundaries, 416); assert.equal(proof.screenshots, 256);
  assert.equal(proof.prematureReleaseCases, 16); assert.equal(proof.missingOutsideReleaseCases, 16);
  assert.equal(proof.tracedCauseCases, 8); assert.equal(proof.materialSwappedThumbCauseProven, false);
  assert.equal(proof.renderingEquivalent, false);
});

test('historical range evidence replays with exact retained dependency bytes', () => {
  const root = process.cwd();
  const provenance = JSON.parse(readFileSync(`${rangeDragArtifactRoot}/provenance.json`));
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  const oldRunner = execFileSync('git', ['show', '5e948fb7:scripts/audit-public-range-drag.mjs']);
  assert.equal(digest(oldRunner), provenance.script.sha256);
  const expected = new Map(provenance.bundleInputs.map(entry => [path.resolve(entry.file), entry.sha256]));
  let recovered = 0;
  const read = file => {
    if (file === path.resolve(provenance.script.file)) return oldRunner;
    let bytes = readFileSync(file);
    const hash = expected.get(file);
    if (hash && digest(bytes) !== hash) {
      const prior = file.replace(`node_modules${path.sep}`, `node_modules.audit-prior-junction${path.sep}`);
      assert.notEqual(prior, file, 'only retained package inputs may be recovered');
      bytes = readFileSync(prior);
      assert.equal(digest(bytes), hash, file);
      recovered++;
    }
    return bytes;
  };
  const proof = validateRangeDragEvidence(report, { root, read });
  assert.equal(recovered, 27);
  assert.equal(proof.cases, 32);
  assert.equal(proof.pairedBoundaries, 416);
  assert.equal(proof.renderingEquivalent, false);
});

test('range cause proof rejects mismatched inputs, fabricated timing, altered state and unbound stack frames', () => {
  const base = report.results.find(e => e.update === 'held-equivalent' && e.stackTracing);
  const mutations = [
    e => { e.stages[3].astylar.site.styles[0].width = '200px'; },
    e => { e.stages[4].reference.controls[0].step = '1'; },
    e => { e.stages[3].astylar.nativeEvents.push({ type: 'pointerup', trusted: true }); },
    e => { e.stages[3].astylar.publicEvents.find(v => v.type === 'pointerup').targetId = 'second'; },
    e => { e.stages[3].astylar.publicEvents.find(v => v.type === 'pointerup').stack = 'invented'; },
    e => { e.stages[3].astylar.publicEvents.find(v => v.type === 'pointerup').stack = e.stages[3].astylar.publicEvents.find(v => v.type === 'pointerup').stack.replace(/audit.js:\d+/g, 'audit.js:1'); },
    e => { e.stages[3].astylar.publicEvents.find(v => v.type === 'pointerup').time = 0; },
    e => { e.stages[3].astylar.diagnostics.interaction.pressedElementId = 'first'; },
    e => { e.stages[3].astylar.diagnostics.reconciliation.strategy = 'rebuild'; },
    e => { e.stages[4].astylar.controls[1].value = '70'; },
    e => { e.stages[4].astylar.nativeEvents.find(v => v.type === 'pointerdown').trusted = false; },
    e => { e.stages[3].astylar.updates[0].document.root.children[0].value = '50'; },
    e => { e.pointer.to.x++; },
    e => { e.checks['updated:release-count'] = true; },
  ];
  for (const [i, mutate] of mutations.entries()) {
    const entry = structuredClone(base); mutate(entry); assert.throws(() => inspectRangeDragCause(entry, lines), `mutation ${i}`);
  }
  const noUpdate = structuredClone(report.results.find(e => e.update === 'none'));
  noUpdate.stages[4].astylar.publicEvents.filter(e => e.type === 'pointermove').at(-1).localX++;
  assert.throws(() => inspectRangeDragCause(noUpdate, lines));
});

test('stack-disabled final runs repeat the original independent public drag values and release observations', () => {
  const original = JSON.parse(readFileSync('artifacts/material-parity/public-range-drag-audit-v1/latest-report.json'));
  assert.equal(original.results.length, 16); assert.deepEqual(original.runtimeErrors, []);
  for (const before of original.results) {
    const after = report.results.find(e => !e.stackTracing && e.dpr === before.dpr && e.translated === before.translated &&
      e.target === before.target && e.update === before.update);
    assert.ok(after);
    const projection = e => e.stages.map(s => ['reference', 'astylar'].map(side => ({ values: s[side].controls.map(c => c.value),
      nativeUp: s[side].nativeEvents.filter(e => e.type === 'pointerup').length,
      publicUp: s[side].publicEvents.filter(e => e.type === 'pointerup').length })));
    assert.deepEqual(projection(after), projection(before));
  }
});
