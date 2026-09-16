import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { readButtonBoxSizingProof } from '../../scripts/audit-material-button-box-sizing.mjs';

const log = readFileSync('artifacts/material-parity/button-box-sizing-input-audit/test.log', 'utf8');
const records = readButtonBoxSizingProof(log).cases;
const serialize = rows => rows.map(row => `INFO: 'MATERIAL_BUTTON_BOX_SIZING_PROOF', '${JSON.stringify(row)}'`).join('\n') + '\nTOTAL: 6 SUCCESS\n';
test('native button box-sizing log retains all six bounded browser measurements', () => {
  const proof = readButtonBoxSizingProof(log);
  assert.equal(proof.cases.length, 6); assert.equal(proof.rawRecords, 12);
  assert.deepEqual(readButtonBoxSizingProof(serialize(records)).cases, proof.cases);
});
test('native button box-sizing log rejects incomplete, contradictory or compensated evidence', () => {
  assert.throws(() => readButtonBoxSizingProof(serialize(records.slice(1))));
  assert.throws(() => readButtonBoxSizingProof(serialize(records).replace('TOTAL: 6 SUCCESS', 'TOTAL: 1 FAILED, 5 SUCCESS')));
  for (const mutate of [
    r => { r.actual.width += 1; }, r => { r.reference.x += 1; },
    r => { r.site.styles[1].left = '31px'; }, r => { r.css += '\nbutton{left:31px}'; },
    r => { r.stages[0].boxSizing = 'content-box'; }, r => { r.expected.height += 16; },
    r => { r.browserStyle.boxSizing = 'content-box'; }, r => { r.renderSize[0] = 800; },
  ]) {
    const rows = structuredClone(records); mutate(rows.find(r => r.mode === 'omitted'));
    assert.throws(() => readButtonBoxSizingProof(serialize(rows)));
  }
  const conflict = structuredClone(records[0]); conflict.actual.width += 1;
  assert.throws(() => readButtonBoxSizingProof(serialize([...records, conflict])), /contradictory duplicate/);
});
