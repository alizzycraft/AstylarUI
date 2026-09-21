import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import ts from 'typescript';
import { collectStyleDiscrepancies } from './input-equivalence-audit.mjs';
import { collectPositionCompositionReview, validatePositionCompositionReview, applyPositionCompositionReview } from './position-composition-review.mjs';
test('position batch replays all six source-backed groups without inventing candidate defaults', () => {
  const review = collectPositionCompositionReview();
  validatePositionCompositionReview(review);
  assert.deepEqual(review.counts, { groups: 6, observations: 316 });
  const root = review.groups.find(g => g.element === 'grid-list-primary');
  assert.equal(Object.hasOwn(root, 'astylar'), false);
  assert.ok(review.groups.every(g => g.reviewEvidence.inputEquivalent === false && g.reviewEvidence.rendererCauseProven === false));
});
test('position batch rejects altered classifications, coverage, sources and fabricated prior rows', () => {
  const original = collectPositionCompositionReview();
  for (const mutate of [
    r => r.groups.pop(), r => r.groups.reverse(), r => { r.groups[0].classification = 'equivalent-representation'; },
    r => { r.groups[0].reviewedCases.pop(); }, r => { r.groups[0].astylar = 'static'; },
    r => { r.sources[0].sha256 = 'forged'; }, r => { r.groups[0].reviewEvidence.rendererCauseProven = true; },
  ]) { const changed = structuredClone(original); mutate(changed); assert.throws(() => validatePositionCompositionReview(changed)); }
  assert.throws(() => applyPositionCompositionReview([], original));
  assert.throws(() => applyPositionCompositionReview(original.groups.map(g => ({ ...g, attribution: 'unresolved' })), original),
    /complete original position row changed/);
});

test('actual aggregation changes exactly the six complete predecessors and preserves raw rows', () => {
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
    r => { r[index].reference = 'static'; }, r => { r[index].attribution = 'another-review'; }]) {
    const altered = structuredClone(before); mutate(altered); assert.throws(() => applyPositionCompositionReview(altered, review));
  }
  console.log(JSON.stringify({ rows: before.length, changedGroups: changed,
    unchangedCompleteRows: before.length - changed, canonicalCoverageProven: false }));
});
