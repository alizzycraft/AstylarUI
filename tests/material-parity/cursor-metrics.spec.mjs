import assert from 'node:assert/strict';
import test from 'node:test';
import { effectiveBrowserCursor } from './cursor-metrics.mjs';

test('resolves CSS auto to the browser cursor implied by the hit content', () => {
  assert.equal(effectiveBrowserCursor('auto', true), 'text');
  assert.equal(effectiveBrowserCursor('auto', false), 'default');
  assert.equal(effectiveBrowserCursor('pointer', true), 'pointer');
});
