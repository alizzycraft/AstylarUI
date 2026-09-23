import assert from 'node:assert/strict';
import test from 'node:test';
import { withAuditEvidenceSession } from './audit-evidence-session.mjs';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import ts from 'typescript';
import { collectStyleDiscrepancies } from './input-equivalence-audit.mjs';
import { collectPositionCompositionReview, validatePositionCompositionReview, applyPositionCompositionReview,
  validatePositionCompositionRows } from './position-composition-review.mjs';
test('actual aggregation changes exactly the six complete predecessors and preserves raw rows', () => withAuditEvidenceSession(() => {
  const raw = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const fn = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'collectStyleDiscrepancies');
  const cases = [['static', raw.results], ['interaction', raw.interactions]]
    .flatMap(([kind, entries]) => entries.map(e => ({ ...e, kind })));
  const before = collectStyleDiscrepancies(...fn.parameters.map(p => p.name.text === 'cases' ? cases
    : Object.assign([], { observations: [], comparisons: [], differences: [], groups: [] })));
  const snapshot = structuredClone(before), review = collectPositionCompositionReview();
  const after = applyPositionCompositionReview(before, review);
  validatePositionCompositionRows(JSON.parse(JSON.stringify(after)), review);
  assert.deepEqual(before, snapshot); assert.equal(after.length, before.length);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const input = row => Object.fromEntries(Object.entries(row).filter(([k]) => !metadata.has(k)));
  let changed = 0;
  for (let i = 0; i < before.length; i++) {
    if (isDeepStrictEqual(before[i], after[i])) continue;
    assert.deepEqual(input(before[i]), input(after[i])); changed++;
  }
  assert.equal(changed, 6);
  const index = before.findIndex(r => r.property === 'position' && r.element === 'grid-tile-one');
  for (const mutate of [r => r.splice(index, 1), r => r.push(structuredClone(r[index])),
    r => { r[index].occurrences--; }, r => { r[index].cases.pop(); },
    r => { r[index].reviewEvidence.priorMetadata[0].value = 'invented'; },
    r => { r[index].reviewEvidence.priorMetadata.reverse(); },
    r => { r[index].reviewEvidence.rendererCauseProven = true; },
    r => { r[index].unexpectedRawField = true; }]) {
    const altered = structuredClone(after); mutate(altered);
    assert.throws(() => validatePositionCompositionRows(altered, review));
  }
  for (const mutate of [r => r.splice(index, 1), r => r.push(structuredClone(r[index])),
    r => { r[index].reference = 'static'; }, r => { r[index].attribution = 'another-review'; }]) {
    const altered = structuredClone(before); mutate(altered); assert.throws(() => applyPositionCompositionReview(altered, review));
  }
  console.log(JSON.stringify({ rows: before.length, changedGroups: changed,
    unchangedCompleteRows: before.length - changed, canonicalCoverageProven: false }));
}));
