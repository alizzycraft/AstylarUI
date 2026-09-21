import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { verifyCaseIndexAssertionMigration } from './case-index-assertion-migration.mjs';
const file = 'tests/material-parity/input-equivalence-audit.spec.mjs';
const previous = execFileSync('git', ['show', `6833850:${file}`], { maxBuffer: 8 * 1024 * 1024 });
const current = readFileSync(file, 'utf8');

test('entire legacy suite conserves every statement except nine authenticated receipt checks', () => {
  const result = verifyCaseIndexAssertionMigration(previous, current);
  assert.equal(result.replacedReceiptAssertions, 9);
  assert.equal(result.allOtherStatementsConserved, true);
  assert.match(result.originalSuiteAstSha256, /^[a-f0-9]{64}$/);
});
test('migration proof rejects unrelated assertion changes, missing checks and wrong index identity', () => {
  for (const changed of [
    current.replace('assert.equal(index.sourceFingerprints.length, 11)', 'assert.equal(index.sourceFingerprints.length, 10)'),
    current.replace("assertHistoricalCaseIndexSources('docs/material-container-caret-audit.json', index);", ''),
    current.replace("assertHistoricalCaseIndexSources('docs/material-container-caret-audit.json', index)", "assertHistoricalCaseIndexSources('docs/material-root-height-audit.json', index)"),
  ]) {
    assert.notEqual(changed, current); assert.throws(() => verifyCaseIndexAssertionMigration(previous, changed));
  }
});
