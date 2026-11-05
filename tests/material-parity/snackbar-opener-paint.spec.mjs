import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { joinSnackbarOpenerPaint, restoreSnackbarOpenerPaint, snackbarOpenerParent }
  from '../../scripts/join-material-snackbar-opener-paint.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const generation = 'ab2c875a63283401c78dad6c467437888a9a086f15e9afef23d0aa35fc1aa60d';
const bytes = fs.readFileSync(`artifacts/material-parity/working-audit/${generation}/index.json`);
assert.equal(hash(bytes), 'b26b0abd0d071f566ba6fa5190ded39925f55682145fef5b4e6fcc66b776df4b');
const cases = JSON.parse(bytes).metadata.coverage.inspectionEvidence.cases;

test('closed snackbar opener join preserves exact parents, statuses and unaffected objects', () => {
  const pointer = fs.readFileSync('artifacts/material-parity/working-audit/current.json');
  const joined = joinSnackbarOpenerPaint(cases);
  assert.equal(joined.changed, 26);
  assert.equal(joined.canonicalPublished, false);
  assert.equal(hash(JSON.stringify(cases)), snackbarOpenerParent);
  assert.deepEqual(restoreSnackbarOpenerPaint(joined.cases), cases);
  let unchanged = 0;
  for (let i = 0; i < cases.length; i++) {
    const before = cases[i], after = joined.cases[i];
    assert.equal(after.case, before.case);
    assert.equal(after.inspection, before.inspection);
    assert.equal(after.currentRendering, before.currentRendering);
    if (before === after) { unchanged++; continue; }
    assert.equal(after.family, 'snack-bar');
    assert.equal(after.obligations.localPaint.disposition, 'partial');
    for (const [name, value] of Object.entries(before.obligations)) {
      if (name !== 'localPaint') assert.equal(after.obligations[name], value);
    }
    for (const [name, value] of Object.entries(before.obligations.localPaint)) {
      if (name !== 'disposition') assert.equal(after.obligations.localPaint[name], value);
    }
  }
  assert.equal(unchanged, 2285);
  assert.deepEqual(fs.readFileSync('artifacts/material-parity/working-audit/current.json'), pointer);
});

test('closed snackbar opener join rejects wrong parents and changed evidence at each boundary', () => {
  assert.throws(() => joinSnackbarOpenerPaint(cases.slice(1)));
  const row = cases.find(row => row.family === 'snack-bar' &&
    row.obligations.localPaint.disposition === 'evidence-join-pending');
  const tree = row.evidence.pairedTrees.reference.file;
  const crop = tree.replace('reference-input-tree.json', 'snack-bar-primary-alignment-reference.png');
  const full = tree.replace('reference-input-tree.json', 'reference.png');
  for (const target of ['artifacts/material-parity/snackbar-pending-opener-raster-20261105.log', tree, crop, full]) {
    let reached = false;
    assert.throws(() => joinSnackbarOpenerPaint(cases, file => {
      if (file.replaceAll('\\', '/') === target.replaceAll('\\', '/')) {
        reached = true;
        return Buffer.from('corrupt evidence');
      }
      return fs.readFileSync(file);
    }));
    assert.equal(reached, true, `Corruption control did not reach ${target}`);
  }
});
