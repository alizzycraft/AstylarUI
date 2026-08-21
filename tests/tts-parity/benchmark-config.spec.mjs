import assert from 'node:assert/strict';
import test from 'node:test';
import { states, viewports } from './benchmark.config.mjs';

test('application benchmark owns named viewport and DPR profiles', () => {
  assert.deepEqual(states, ['initial', 'generated']);
  assert.ok(viewports.some((viewport) => viewport.width === 1919 && viewport.height === 870));
  assert.ok(viewports.some((viewport) => viewport.width === 1280 && viewport.height === 800));
  assert.ok(viewports.some((viewport) => viewport.width === 760));
  assert.ok(viewports.some((viewport) => viewport.width === 390));
  assert.ok(viewports.some((viewport) => viewport.deviceScaleFactor === 1));
  assert.ok(viewports.some((viewport) => viewport.deviceScaleFactor === 2));
  assert.equal(new Set(viewports.map((viewport) => viewport.id)).size, viewports.length);
});
