import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { assemblePositionQueue, collectPositionQueue } from '../../scripts/material-position-review-queue.mjs';
test('position queue accounts for every original group without claiming canonical acceptance', () => {
  const q = collectPositionQueue();
  assert.deepEqual(q, JSON.parse(readFileSync('docs/material-position-review-queue.json')));
  assert.equal(q.groups.length, 58); assert.equal(q.groups.reduce((n, g) => n + g.observations, 0), 2950);
  assert.deepEqual(q.counts['classified-integration-pending'], { groups: 14, observations: 768 });
  assert.deepEqual(q.counts['producer-integrated-conservation-pending'], { groups: 6, observations: 316 });
  assert.deepEqual(q.counts['inspection-classification-pending'], { groups: 17, observations: 811 });
  assert.deepEqual(q.counts['investigation-pending'], { groups: 21, observations: 1055 });
});
test('queue refuses duplicated, incomplete, reordered and unknown review membership', () => {
  const p = { groups: [{ element: 'sample', observations: [{ case: 'a' }, { case: 'b' }], occurrences: 2 }] };
  for (const groups of [[{ element: 'sample', cases: ['a'] }], [{ element: 'sample', cases: ['b', 'a'] }],
    [{ element: 'unknown', cases: ['a', 'b'] }], Array(2).fill({ element: 'sample', cases: ['a', 'b'] })]) {
    assert.throws(() => assemblePositionQueue(p, [{ groups, status: 'test', source: null }]));
  }
});
