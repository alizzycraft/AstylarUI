import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { assertHistoricalCaseIndexSources } from './historical-case-index-source-assertion.mjs';
import { caseIndexReceiptFiles, caseIndexAuditModule } from '../../scripts/refresh-material-case-index-receipts.mjs';

test('historical source assertion authenticates all nine indexes without rewriting their receipt', () => {
  for (const file of caseIndexReceiptFiles) {
    const bytes = readFileSync(file), index = JSON.parse(bytes), copy = structuredClone(index);
    const result = assertHistoricalCaseIndexSources(file, index);
    assert.equal(result.recordedSourceSha256, '82854bccdaa6ff23fc5f9df987f6ec5cf3e22d0da5dbe64357109d5a03035f3b');
    assert.notEqual(result.currentSourceSha256, result.recordedSourceSha256);
    assert.equal(result.currentProjectionVerified, true);
    assert.equal(result.canonicalClassificationVerified, false);
    assert.deepEqual(index, copy); assert.deepEqual(readFileSync(file), bytes);
  }
});

test('historical source assertion refuses a different caller, unknown file and changed retained source', () => {
  const file = caseIndexReceiptFiles[0], index = JSON.parse(readFileSync(file));
  assert.throws(() => assertHistoricalCaseIndexSources('unknown.json', index), /unknown historical/);
  const changed = structuredClone(index); changed.groups.reverse();
  assert.notDeepEqual(index, changed);
  assert.throws(() => assertHistoricalCaseIndexSources(file, changed), /caller index differs/);
  assert.throws(() => assertHistoricalCaseIndexSources(file, index, { read: name => name === caseIndexAuditModule
    ? Buffer.from(readFileSync(name, 'utf8').replace('function reviewedTemplateTextMappings(', 'function changedTemplateTextMappings('))
    : readFileSync(name) }), /mapping or normalization changed/);
});
