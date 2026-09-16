import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { collectButtonWidthHistory, extractButtonWidthExpressions } from '../../scripts/audit-material-button-width-history.mjs';

test('button width history verifies all 102 pinned revisions rather than only the endpoints', () => {
  const expected = JSON.parse(readFileSync('docs/material-button-width-history.json'));
  assert.deepEqual(collectButtonWidthHistory(), expected);
  assert.equal(expected.revisionCount, 102);
  assert.equal(new Set(expected.snapshots.map(s => s.commit)).size, 102);
  assert.equal(new Set(expected.snapshots.map(s => s.expressionSha256)).size, 1);
  assert.equal(expected.expressions.length, 9);
  assert.equal(expected.inputEquivalent, false);
});

test('historical width extraction detects changed and lost requests without including unrelated objects', () => {
  const data = JSON.parse(readFileSync('docs/material-button-width-history.json'));
  const text = execFileSync('git', ['show', `${data.endpoint}:${data.source}`], { maxBuffer: 4 * 1024 * 1024 }).toString();
  const selectors = data.expressions.map(e => e.selector);
  assert.deepEqual(extractButtonWidthExpressions(text, selectors), data.expressions);
  assert.notDeepEqual(extractButtonWidthExpressions(text.replace("'212.234375px'", "'213px'"), selectors), data.expressions);
  assert.notDeepEqual(extractButtonWidthExpressions(text.replace("'#core-primary'", "'#unrelated-owner'"), selectors), data.expressions);
  assert.deepEqual(extractButtonWidthExpressions(text + "\nconst unrelated = {selector:'#other',width:'99px'};", selectors), data.expressions);
  assert.throws(() => extractButtonWidthExpressions('const broken = {', selectors));
});
