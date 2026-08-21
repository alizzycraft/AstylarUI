import assert from 'node:assert/strict';
import test from 'node:test';
import { compareScrolling } from './scrolling-metrics.mjs';

const reachable = (maxScrollTop = 0, maxScrollLeft = 0) => ({
  maxScrollTop,
  maxScrollLeft,
  canReachBottom: true,
  canReachRight: true,
});

test('ignores subpixel diagnostic overflow that browsers round away', () => {
  const result = compareScrolling({}, { settings: reachable(0, 0.438) }, 1);
  assert.equal(result.matches, true);
  assert.deepEqual(result.owners, []);
});

test('detects meaningful scroll ownership and reachability mismatches', () => {
  const missingOwner = compareScrolling({ history: reachable(12, 0) }, {}, 1);
  assert.equal(missingOwner.ownershipMatches, false);
  assert.equal(missingOwner.matches, false);

  const unreachable = compareScrolling(
    { history: reachable(12, 0) },
    { history: { ...reachable(12, 0), canReachBottom: false } },
    1,
  );
  assert.equal(unreachable.ownershipMatches, true);
  assert.equal(unreachable.reachabilityMatches, false);
  assert.equal(unreachable.matches, false);
});
