import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { restoreSliderHoverHeldBenchmark, createSliderHoverHeldReviewReader } from './slider-hover-held-case-review-source.mjs';

test('slider hover-held source boundary recovers the complete prior benchmark and rejects drift', () => {
  const current = readFileSync('tests/material-parity/benchmark-config.spec.mjs');
  const prior = restoreSliderHoverHeldBenchmark(current);
  assert.equal(createHash('sha256').update(prior).digest('hex'),
    '31f2cb8ec0aa6299e4854d07b70f8031e0e646a2a39812841e984e5a7098ab57');
  assert.throws(() => restoreSliderHoverHeldBenchmark(Buffer.concat([current, Buffer.from('\n// unreviewed drift\n')])));
  assert.throws(() => restoreSliderHoverHeldBenchmark(prior));
  assert.throws(() => createSliderHoverHeldReviewReader({ root: process.cwd(), read: readFileSync, reviewSha256: '0'.repeat(64) }));
});
