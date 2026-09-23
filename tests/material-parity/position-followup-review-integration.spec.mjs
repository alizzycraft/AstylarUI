import assert from 'node:assert/strict';
import test from 'node:test';
import { withAuditEvidenceSession } from './audit-evidence-session.mjs';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import ts from 'typescript';
import { collectStyleDiscrepancies } from './input-equivalence-audit.mjs';
import { collectPositionFollowupAuditInputs, applyPositionFollowupAuditRows } from './position-followup-audit-source-binding.mjs';
import { collectPositionFollowupReview, validatePositionFollowupReview,
  applyPositionFollowupReview, validatePositionFollowupRows } from './position-followup-review.mjs';
test('actual aggregation preserves all raw fields and changes exactly fourteen reviewed predecessors', () => withAuditEvidenceSession(() => {
  const raw = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const fn = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'collectStyleDiscrepancies');
  const cases = [['static', raw.results], ['interaction', raw.interactions]].flatMap(([kind, entries]) => entries.map(e => ({ ...e, kind })));
  const before = collectStyleDiscrepancies(...fn.parameters.map(p => p.name.text === 'cases' ? cases
    : Object.assign([], { observations: [], comparisons: [], differences: [], groups: [] })));
  const review = collectPositionFollowupReview(), snapshot = structuredClone(before);
  const evidence = collectPositionFollowupAuditInputs(raw, {
    parityPath: 'artifacts/material-parity/current-ancestry-audit/latest-report.json',
  });
  assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
  assert.equal(evidence.observations.length, 768);
  assert.deepEqual(evidence.review, review);
  const after = applyPositionFollowupAuditRows(before, evidence);
  validatePositionFollowupRows(JSON.parse(JSON.stringify(after)), review);
  assert.deepEqual(before, snapshot); assert.equal(after.length, before.length);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const input = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  let changed = 0;
  for (let i = 0; i < before.length; i++) if (!isDeepStrictEqual(before[i], after[i])) {
    assert.deepEqual(input(before[i]), input(after[i])); changed++;
  }
  assert.equal(changed, 14);
  const index = after.findIndex(r => r.element === 'badge-label' && r.property === 'position');
  for (const mutate of [r => r.splice(index, 1), r => r.push(structuredClone(r[index])),
    r => { r[index].astylar = 'static'; }, r => { r[index].occurrences--; },
    r => { r[index].reviewEvidence.priorMetadata.reverse(); },
    r => { r[index].reviewEvidence.rendererCauseProven = true; }]) {
    const changedRows = structuredClone(after); mutate(changedRows);
    assert.throws(() => validatePositionFollowupRows(changedRows, review));
  }
  assert.throws(() => applyPositionFollowupReview([], review));
  console.log(JSON.stringify({ rows: before.length, changedGroups: changed, unchangedRows: before.length - changed,
    canonicalConservationProven: false }));
}));
