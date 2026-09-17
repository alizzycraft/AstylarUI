import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { rangeDragArtifactRoot, inspectRangeDragCause, validateRangeDragEvidence } from './public-range-drag-evidence.mjs';
const report = JSON.parse(readFileSync(`${rangeDragArtifactRoot}/latest-report.json`));
const lines = readFileSync(`${rangeDragArtifactRoot}/audit.js`, 'utf8').split('\n');

test('public range reduction binds every case, source, served bundle, screenshot and causal stack', () => {
  const proof = validateRangeDragEvidence(report);
  assert.equal(proof.cases, 32); assert.equal(proof.pairedBoundaries, 416); assert.equal(proof.screenshots, 256);
  assert.equal(proof.prematureReleaseCases, 16); assert.equal(proof.missingOutsideReleaseCases, 16);
  assert.equal(proof.tracedCauseCases, 8); assert.equal(proof.materialSwappedThumbCauseProven, false);
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
