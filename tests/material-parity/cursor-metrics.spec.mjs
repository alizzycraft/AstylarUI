import assert from 'node:assert/strict';
import test from 'node:test';
import { effectiveBrowserCursor, interactionLayerCursorProbe } from './cursor-metrics.mjs';

test('resolves CSS auto to the browser cursor implied by the hit content', () => {
  assert.equal(effectiveBrowserCursor('auto', true), 'text');
  assert.equal(effectiveBrowserCursor('auto', false), 'default');
  assert.equal(effectiveBrowserCursor('pointer', true), 'pointer');
});

test('probes the radio interaction layer instead of theme-dependent label space', () => {
  assert.deepEqual(interactionLayerCursorProbe('radio', 'hover'), {
    referenceSelector: '#radio-primary mat-radio-button:nth-of-type(2) .mdc-radio',
    astylarId: 'radio-team-state-layer',
  });
  assert.equal(interactionLayerCursorProbe('radio', 'focus'), undefined);
});
