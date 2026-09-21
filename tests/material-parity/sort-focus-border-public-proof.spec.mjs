import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collectSortBorderAudit, readSortBorderLog } from '../../scripts/record-sort-focus-border-audit.mjs';

test('sort border proof retains the identical repeated equal-input failures', () => {
  const report = collectSortBorderAudit();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-sort-focus-border-public-proof.json')));
  assert.equal(report.repeatIdentical, true);
  assert.equal(report.rendererFixed, false);
  assert.equal(report.canonicalAttributionChanged, false);
});

test('sort border reader refuses erased failures, missing observations and altered inputs or output', () => {
  const text = readFileSync('artifacts/material-parity/sort-focus-border-1592ce3.log', 'utf8');
  const changed = [
    text.replace('TOTAL: 2 FAILED, 0 SUCCESS', 'TOTAL: 2 SUCCESS'),
    text.split(/\r?\n/).filter(line => !line.includes('MATERIAL_SORT_FOCUS_BORDER_AUDIT')).join('\n'),
    text.replaceAll('"height":28', '"height":27'),
    text.replaceAll('"borderWidth":"0 0 1px 0"', '"borderWidth":"0"'),
    text.replaceAll('"dpr":1', '"dpr":2'),
    text.replace('120/border/host/height: Expected 1', '120/border/host/height: Expected 0'),
    text.replaceAll('"y":-0.5', '"y":0'),
  ];
  for (const candidate of changed) {
    assert.notEqual(candidate, text);
    assert.throws(() => readSortBorderLog(candidate));
  }
});
