import assert from 'node:assert/strict';
import test from 'node:test';
import {
  acceptance, interactionApplicability, interactionScenarios, measurementIds, states,
  textMeasurementIds, viewports,
} from './benchmark.config.mjs';

test('application benchmark owns named viewport and DPR profiles', () => {
  assert.deepEqual(states, ['initial', 'generated']);
  assert.ok(viewports.some((viewport) => viewport.width === 1919 && viewport.height === 870));
  assert.ok(viewports.some((viewport) => viewport.width === 1280 && viewport.height === 800));
  assert.ok(viewports.some((viewport) => viewport.width === 760));
  assert.ok(viewports.some((viewport) => viewport.width === 390));
  assert.ok(viewports.some((viewport) => viewport.deviceScaleFactor === 1));
  assert.ok(viewports.some((viewport) => viewport.deviceScaleFactor === 2));
  assert.equal(new Set(viewports.map((viewport) => viewport.id)).size, viewports.length);
  assert.ok(textMeasurementIds.length >= 10);
  assert.ok(textMeasurementIds.every((id) => measurementIds.includes(id)));
  assert.equal(acceptance.maximumIncidentalScrollExtentPx, 1);
});

test('application benchmark owns a source-derived interaction matrix', () => {
  assert.ok(interactionScenarios.length >= 10);
  assert.equal(new Set(interactionScenarios.map(({ id }) => id)).size, interactionScenarios.length);
  assert.ok(interactionScenarios.every(({ state }) => states.includes(state)));
  assert.ok(interactionScenarios.every(({ profiles }) => profiles.includes('reference-large-dpr1')));
  assert.ok(interactionScenarios.some(({ id }) => id === 'editor-selection'));
  assert.ok(interactionScenarios.some(({ id }) => id === 'voice-pointer'));
  assert.ok(interactionScenarios.some(({ id }) => id === 'voice-dismissal'));
  assert.ok(interactionScenarios.some(({ id }) => id === 'history-play-hover'));
  assert.ok(interactionScenarios.some(({ id }) => id === 'history-card-hover'));
  assert.ok(interactionScenarios.some(({ id }) => id === 'history-text-copy'));
  assert.match(interactionApplicability.mobile, /not applicable/i);
});
