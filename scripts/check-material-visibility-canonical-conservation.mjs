import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readAudit } from './check-material-disabled-ink-canonical-conservation.mjs';
import { collectVisibilityAuditInputs, applyVisibilityAuditRows, visibilityObservationAttribution,
  verifyVisibilityAuditModuleTransition } from '../tests/material-parity/visibility-audit-source-binding.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const same = (a, b, message) => assert.ok(isDeepStrictEqual(a, b), message);
const receipt = row => row?.reviewEvidence?.observation?.normalizationReconciliation;

// expectedRows must come from fresh authenticated source replay, not from the
// current canonical document. The CLI below establishes that precondition.
export function compareVisibilityCanonical(previous, current, expectedRows, previousSource, currentSource) {
  const transition = verifyVisibilityAuditModuleTransition(previousSource, currentSource);
  same(current.rows, expectedRows, 'canonical rows differ from independently replayed classifications');
  assert.equal(previous.rows.length, current.rows.length);
  const changed = [];
  for (let i = 0; i < previous.rows.length; i++) {
    const before = previous.rows[i], after = current.rows[i];
    if (isDeepStrictEqual(before, after)) continue;
    assert.equal(before.attribution, 'unresolved');
    assert.equal(after.attribution, visibilityObservationAttribution);
    changed.push({ family: after.family, element: after.element, occurrences: after.occurrences,
      previousRowSha256: digest(before), currentRowSha256: digest(after) });
  }
  assert.equal(changed.length, 15);
  assert.equal(changed.reduce((n, row) => n + row.occurrences, 0), 530);
  const control = structuredClone(current.control), cases = [];
  assert.equal(control.differences.length, previous.control.differences.length);
  for (let i = 0; i < previous.control.differences.length; i++) {
    const before = previous.control.differences[i], after = control.differences[i];
    if (before.attribution !== 'reviewed-interactive-normal-line-box-stage-comparison' ||
        receipt(before)?.currentModuleSha256 !== transition.previousModuleSha256) continue;
    assert.equal(receipt(after)?.currentModuleSha256, transition.currentModuleSha256);
    receipt(after).currentModuleSha256 = transition.previousModuleSha256;
    same(after, before, 'control record changed beyond authenticated producer receipt');
    cases.push(before.case);
  }
  assert.equal(cases.length, 48); assert.equal(new Set(cases).size, 48);
  same(control, previous.control, 'unrelated control evidence changed');
  const { restoredSource, ...sourceProof } = transition;
  return { previous: previous.manifest, current: current.manifest,
    rows: current.rows.length, changedGroups: changed.length, changedOccurrences: 530,
    unchangedCompleteRows: current.rows.length - changed.length, changes: changed,
    previousUnresolved: previous.rows.filter(r => r.attribution === 'unresolved').length,
    currentUnresolved: current.rows.filter(r => r.attribution === 'unresolved').length,
    controlReceiptTransition: { ...sourceProof, records: cases.length, cases },
    allOtherControlEvidenceConserved: true, orderedCurrentRowsSha256: digest(current.rows),
    inputEquivalent: false, renderingEquivalent: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.equal(process.argv.length, 2);
  const previous = await readAudit('artifacts/material-parity/pre-visibility-222667e');
  assert.equal(previous.manifest.uncompressedSha256, '89e1beffd14cc7050456cda0cfba84b51beec9fa0e74ed9b18f305119b6142e0');
  const current = await readAudit('docs');
  const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
  const evidence = collectVisibilityAuditInputs(JSON.parse(readFileSync(parityPath)), { parityPath });
  assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
  const expected = applyVisibilityAuditRows(previous.rows, evidence);
  const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';
  const previousSource = execFileSync('git', ['show', `c090e1b:${moduleFile}`], { maxBuffer: 4 * 1024 * 1024 });
  console.log(JSON.stringify(compareVisibilityCanonical(previous, current, expected, previousSource,
    readFileSync(moduleFile)), null, 2));
}
