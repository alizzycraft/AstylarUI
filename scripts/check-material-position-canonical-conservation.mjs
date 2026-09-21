import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readAudit } from './check-material-disabled-ink-canonical-conservation.mjs';
import { collectPositionCompositionReview, applyPositionCompositionReview,
  validatePositionCompositionRows, positionCompositionAttribution } from '../tests/material-parity/position-composition-review.mjs';
import { restorePositionProducer } from '../tests/material-parity/position-composition-producer-transition.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const same = (a, b, message) => assert.ok(isDeepStrictEqual(a, b), message);
const receipt = row => row?.reviewEvidence?.observation?.normalizationReconciliation;

// The CLI independently derives expectedRows from authenticated predecessor
// records and fresh source review. This comparator cannot create that premise.
export function comparePositionCanonical(previous, current, expectedRows, currentSource) {
  const transition = restorePositionProducer(currentSource);
  same(current.rows, expectedRows, 'canonical rows differ from independently replayed positioning review');
  assert.equal(previous.rows.length, current.rows.length);
  const changed = [];
  for (let i = 0; i < previous.rows.length; i++) {
    const before = previous.rows[i], after = current.rows[i];
    if (isDeepStrictEqual(before, after)) continue;
    assert.equal(before.attribution, 'unresolved');
    assert.equal(after.attribution, positionCompositionAttribution);
    changed.push({ family: after.family, element: after.element, occurrences: after.occurrences,
      previousRowSha256: digest(before), currentRowSha256: digest(after) });
  }
  assert.equal(changed.length, 6);
  assert.equal(changed.reduce((n, row) => n + row.occurrences, 0), 316);
  const control = structuredClone(current.control), cases = [];
  assert.equal(control.differences.length, previous.control.differences.length);
  for (let i = 0; i < previous.control.differences.length; i++) {
    const before = previous.control.differences[i], after = control.differences[i];
    if (before.attribution !== 'reviewed-interactive-normal-line-box-stage-comparison' ||
        receipt(before)?.currentModuleSha256 !== transition.previousModuleSha256) continue;
    assert.equal(receipt(after)?.currentModuleSha256, transition.currentModuleSha256);
    receipt(after).currentModuleSha256 = transition.previousModuleSha256;
    same(after, before, 'control record changed beyond producer receipt');
    cases.push(before.case);
  }
  assert.equal(cases.length, 48); assert.equal(new Set(cases).size, 48);
  same(control, previous.control, 'unrelated control evidence changed');
  const { restoredSource, ...sourceProof } = transition;
  return { previous: previous.manifest, current: current.manifest,
    rows: current.rows.length, changedGroups: changed.length, changedOccurrences: 316,
    unchangedCompleteRows: current.rows.length - changed.length, changes: changed,
    previousUnresolved: previous.rows.filter(r => r.attribution === 'unresolved').length,
    currentUnresolved: current.rows.filter(r => r.attribution === 'unresolved').length,
    controlReceiptTransition: { ...sourceProof, records: cases.length, cases },
    allOtherControlEvidenceConserved: true, orderedCurrentRowsSha256: digest(current.rows),
    inputEquivalent: false, renderingEquivalent: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.equal(process.argv.length, 2);
  const previous = await readAudit('artifacts/material-parity/pre-position-e62e846');
  assert.equal(previous.manifest.uncompressedSha256, '287ebb396d68ab064dca40a0c372879e8a0c3fd2c7f56498110577615bd430a2');
  const current = await readAudit('docs');
  const review = collectPositionCompositionReview();
  const expected = applyPositionCompositionReview(previous.rows, review);
  validatePositionCompositionRows(current.rows, review);
  console.log(JSON.stringify(comparePositionCanonical(previous, current, expected,
    readFileSync('tests/material-parity/input-equivalence-audit.mjs')), null, 2));
}
