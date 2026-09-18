import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

test('border context history replays exact ancestor methods and preserves the bounded evidence record', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const actual = JSON.parse(execFileSync(process.execPath, ['scripts/audit-material-border-context-history.mjs'],
    { cwd: root, encoding: 'utf8' }));
  const expected = JSON.parse(readFileSync(new URL('../../docs/material-border-context-history.json', import.meta.url), 'utf8'));
  assert.deepEqual(actual, expected);
  assert.equal(actual.observations.length, 6);
  assert.equal(actual.literalControls, 2);
  assert.equal(actual.keywordControls, 4);
  assert.equal(actual.historicalPublicRuntimeVerified, false);
  assert.equal(actual.historicalRasterVerified, false);
  assert.equal(actual.earliestRendererDefectRevisionEstablished, false);
  assert.equal(actual.canonicalClassificationChanged, false);
});
