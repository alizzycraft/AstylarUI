import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compareScrollOwnership,
  enrichScrollState,
  measureVisibility,
} from './visibility-metrics.mjs';

const viewport = { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 };

test('detects viewport clipping and an unreachable target', () => {
  const result = measureVisibility(
    { left: 10, top: 90, right: 90, bottom: 130, width: 80, height: 40 },
    viewport,
  );
  assert.equal(result.intersectsViewport, true);
  assert.equal(result.fullyVisible, false);
  assert.equal(result.clipped, true);
});

test('attributes clipping to the overflow owner', () => {
  const result = measureVisibility(
    { left: 10, top: 10, right: 90, bottom: 90, width: 80, height: 80 },
    viewport,
    [{ id: 'clipper', rect: { left: 20, top: 20, right: 80, bottom: 80 } }],
  );
  assert.deepEqual(result.clippingAncestorIds, ['clipper']);
});

test('reports correct bottom/right reachability', () => {
  const initial = { scrollLeft: 0, scrollTop: 0, scrollWidth: 250, scrollHeight: 300, clientWidth: 100, clientHeight: 100 };
  const final = enrichScrollState({ ...initial, scrollLeft: 150, scrollTop: 200 }, initial);
  assert.equal(final.canReachRight, true);
  assert.equal(final.canReachBottom, true);
  assert.equal(final.maxScrollLeft, 150);
  assert.equal(final.maxScrollTop, 200);
});

test('detects an unnecessary Astylar scroll owner', () => {
  assert.deepEqual(compareScrollOwnership({}, { shell: {} }), ['Unexpected Astylar scroll owner: shell']);
  assert.deepEqual(compareScrollOwnership({ shell: {} }, {}), ['Missing Astylar scroll owner: shell']);
});
