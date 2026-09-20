import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import test from 'node:test';
import ts from 'typescript';
import { collectStyleDiscrepancies } from './input-equivalence-audit.mjs';
import { replayReviewedSourceBatchObservations } from './reviewed-source-batch-observation-binding.mjs';
import { projectReviewedSourceBatchAuditInputs, reviewedSourceBatchAttributions,
  validateReviewedSourceBatchClassifications } from './reviewed-source-batch-audit-source-binding.mjs';

const file = 'tests/material-parity/input-equivalence-audit.mjs';
const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const declaration = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'collectStyleDiscrepancies');
const names = declaration.parameters.map(p => p.name.text);
const signature = r => JSON.stringify([r.family, r.element, r.property, r.reference, r.astylar]);

test('production discrepancy pipeline applies only the 6295 reviewed observations and preserves other classifications', () => {
  const replay = replayReviewedSourceBatchObservations();
  const evidence = { binding: { status: 'bound' }, ...projectReviewedSourceBatchAuditInputs(replay.original, replay) };
  const cases = [['static', replay.original.results], ['interaction', replay.original.interactions]]
    .flatMap(([kind, entries]) => entries.map(e => ({ ...e, kind })));
  // Other proof populations are deliberately absent in both calls. This tests
  // the real aggregation/classification path, not complete canonical coverage.
  const run = batch => collectStyleDiscrepancies(...names.map(name => name === 'cases' ? cases
    : name === 'reviewedSourceBatchInputs' ? batch
      : Object.assign([], { observations: [], comparisons: [], differences: [], groups: [] })));
  const before = run({ observations: [] }), after = run(evidence);
  const expected = new Map(evidence.groups.map(g => [signature(g), g]));
  assert.equal(expected.size, 146);
  const remaining = before.map(r => ({ ...r }));
  // With the OTHER source reviews absent, some baseline signatures contain
  // additional unreviewed cases. Splitting those rows is required, not a loss
  // of conservation. Subtract only the authenticated batch membership.
  for (const reviewed of expected.values()) {
    const matches = remaining.filter(r => signature(r) === signature(reviewed) && r.attribution === 'unresolved');
    assert.equal(matches.length, 1, 'missing or ambiguous prior unresolved group');
    assert.ok(matches[0].occurrences >= reviewed.occurrences);
    matches[0].occurrences -= reviewed.occurrences;
  }
  const changed = after.filter(r => reviewedSourceBatchAttributions.includes(r.attribution));
  const retained = after.filter(r => !reviewedSourceBatchAttributions.includes(r.attribution));
  const metadata = r => Object.fromEntries(Object.entries(r).filter(([key]) =>
    !['occurrences', 'cases', 'states', 'reviewedCases', 'referenceAuthoredExamples', 'astylarAuthoredExamples'].includes(key)));
  const retainedByMetadata = new Map(retained.map(r => [JSON.stringify(metadata(r)), r]));
  assert.equal(retainedByMetadata.size, retained.length);
  const expectedRemaining = remaining.filter(r => r.occurrences);
  assert.equal(retained.length, expectedRemaining.length);
  let unchangedCompleteRows = 0;
  for (const old of expectedRemaining) {
    const current = retainedByMetadata.get(JSON.stringify(metadata(old))); assert.ok(current, 'unreviewed classification changed');
    assert.equal(current.occurrences, old.occurrences, 'unreviewed observation count changed');
    if (!expected.has(signature(old))) {
      assert.ok(isDeepStrictEqual(current, old), 'unrelated complete row changed');
      unchangedCompleteRows++;
    }
  }
  assert.equal(after.reduce((n,r) => n+r.occurrences,0), before.reduce((n,r) => n+r.occurrences,0));
  assert.equal(changed.length, 146);
  assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 6295);
  assert.deepEqual(validateReviewedSourceBatchClassifications(evidence, after), []);
  assert.equal(after.filter(r => reviewedSourceBatchAttributions.includes(r.attribution)).length, 146);
  console.log(JSON.stringify({ pipelineGroups: after.length, changedGroups: changed.length,
    changedObservations: 6295, unchangedCompleteRows, residualSplitRows: after.length-before.length, canonicalCoverageProven: false }));
});
