import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectHeldTrace, inspectHeldTrace } from '../../scripts/audit-material-button-held-trace.mjs';

const survey = JSON.parse(readFileSync('docs/material-button-state-paint-survey.json'));
const capture = JSON.parse(readFileSync('artifacts/material-parity/button-held-temporal-audit/latest-report.json'));
const original = JSON.parse(readFileSync(survey.capture.file));
const row = survey.observations.find(r => r.case === 'core/light/desktop-dpr1/held');
const trace = JSON.parse(readFileSync(capture.results.find(r => r.case === row.case).file));
const entry = original.interactions.find(e => `${e.family}/${e.profile}/${e.viewport.id}/${e.state}` === row.case);

test('all 57 held primary buttons retain frozen provenance and prove 17 pre-release losses plus 40 controls', () => {
  const result = collectHeldTrace();
  assert.equal(result.cases, 57); assert.equal(result.lossesBeforeRelease, 17);
  assert.equal(result.retainedHeldControls, 40);
  assert.equal(result.rendererCauseProven, false);
  assert.equal(result.canonicalAttributionChanged, false);
});

test('temporal evidence rejects missing boundaries, wrong targets, early native release, altered paint and cause overclaims', () => {
  const mutations = [
    t => t.stages.splice(2, 1),
    t => { t.case = 'other'; },
    t => { t.element = 'other'; },
    t => { t.stages[1].astylar.interaction.pressedElementId = 'other'; },
    t => { t.stages[3].reference.active = false; },
    t => { t.stages[3].reference.layerOpacity = '0.08'; },
    t => { t.stages[3].astylar.nativeEvents.push({ type: 'pointerup', time: 0, trusted: true }); },
    t => { t.stages[3].astylar.nativeEvents[0].trusted = false; },
    t => { t.stages[1].astylar.nativeEvents.find(e => e.type === 'pointerdown').buttons = 0; },
    t => { t.stages[1].reference.nativeEvents.find(e => e.type === 'pointerdown').target.id = 'other'; },
    t => { t.stages[3].astylar.events = t.stages[3].astylar.events.filter(e => e.type !== 'click'); },
    t => { t.stages[3].astylar.effective.background = 'red'; },
    t => { t.stages[3].astylar.session.status = 'rendering'; },
    t => { t.stages[3].astylar.session.revision = 0; },
    t => { t.stages[7].astylar.interaction.pressedElementId = row.element; },
    t => { t.stages[3].astylar.nativeEvents = []; },
    t => { t.rendererCauseProven = true; },
    t => { t.historicalTimingProven = true; },
    t => { t.inputEquivalent = true; },
    t => { t.originalInteraction.pressedElementId = row.element; },
  ];
  for (const mutation of mutations) {
    const altered = structuredClone(trace); mutation(altered);
    assert.throws(() => inspectHeldTrace(altered, row, entry));
  }
  assert.throws(() => collectHeldTrace({ read: file => file === capture.originalCapture.file ? Buffer.from('{}') : readFileSync(file) }));
});
