import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { heldUpdateArtifactRoot, inspectHeldUpdateCause, validateHeldUpdateEvidence } from './button-held-update-evidence.mjs';

const report = JSON.parse(readFileSync(`${heldUpdateArtifactRoot}/latest-report.json`));
const lines = readFileSync(`${heldUpdateArtifactRoot}/audit.js`, 'utf8').split('\n');
const example = report.results.find(e => e.scenario === 'equivalent' && e.stackTracing);

test('public update proof binds 40 cases to served package bytes and preserves 24 failures plus 16 controls', () => {
  const result = validateHeldUpdateEvidence(report);
  assert.equal(result.cases, 40); assert.equal(result.failedCases, 24);
  assert.equal(result.passingControls, 16); assert.equal(result.tracedCauseCases, 12);
  assert.equal(result.materialHistoricalCauseProven, false);
});

test('public update proof rejects non-equivalent input, false state, missing native action and substituted causal stack', () => {
  const mutations = [
    e => { e.stages[3].astylar.site.styles[0].width = '121px'; },
    e => { e.stages[3].reference.controls[0].active = false; },
    e => { e.stages[3].astylar.nativeEvents.push({ type: 'pointerup', trusted: true }); },
    e => { e.stages[2].astylar.nativeEvents.find(n => n.type === 'pointerdown').trusted = false; },
    e => { e.stages[3].astylar.diagnostics.interaction.pressedElementId = 'first'; },
    e => { e.stages[3].astylar.controls[0].retainedNativeNode = false; },
    e => { e.stages[3].astylar.diagnostics.reconciliation.strategy = 'rebuild'; },
    e => { e.stages[3].astylar.updates[0].kind = 'sibling-text'; },
    e => { e.stages[3].astylar.publicEvents.find(n => n.type === 'pointerup').stack = 'unrelated'; },
    e => { e.stages[3].astylar.publicEvents.find(n => n.type === 'pointerup').stack = e.stages[3].astylar.publicEvents.find(n => n.type === 'pointerup').stack.replace('HTMLCanvasElement._pointerBlurEvent', 'HTMLCanvasElement.other'); },
    e => { e.stages[3].astylar.publicEvents.find(n => n.type === 'pointerup').stack = e.stages[3].astylar.publicEvents.find(n => n.type === 'pointerup').stack.replace(/audit\.js:\d+:/g, 'audit.js:1:'); },
    e => { e.stages[3].astylar.nativeEvents.find(n => n.type === 'blur').stack = 'other'; },
    e => { e.astylarRuntime.disposed = false; },
    e => { e.checks['held-after-update:pressed'] = true; },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const altered = structuredClone(example); mutate(altered);
    assert.throws(() => inspectHeldUpdateCause(altered, lines), `mutation ${index}`);
  }
  const omitted = structuredClone(report); omitted.results.pop();
  assert.throws(() => validateHeldUpdateEvidence(omitted));
  const errors = structuredClone(report); errors.runtimeErrors.push({ error: 'broken' });
  assert.throws(() => validateHeldUpdateEvidence(errors));
  assert.throws(() => validateHeldUpdateEvidence(report, { read: file => file.endsWith('audit.js') ? Buffer.from('changed') : readFileSync(file) }));
});
