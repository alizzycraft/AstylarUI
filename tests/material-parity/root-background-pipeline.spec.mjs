import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import test from 'node:test';
import ts from 'typescript';
import { collectStyleDiscrepancies } from './input-equivalence-audit.mjs';
import { collectRootBackgroundAuditInputs, rootBackgroundAttribution,
  validateRootBackgroundClassifications } from './root-background-classification-preparation.mjs';

const file = 'tests/material-parity/input-equivalence-audit.mjs';
const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'collectStyleDiscrepancies');
const names = declaration.parameters.map(parameter => parameter.name.text);
const signature = row => JSON.stringify([row.family, row.element, row.property, row.reference, row.astylar]);
const attributionFields = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !attributionFields.has(key)));

test('production pipeline classifies all 2311 root backgrounds without changing values or unrelated rows', () => {
  const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
  const original = JSON.parse(readFileSync(parityPath));
  const evidence = collectRootBackgroundAuditInputs(original, { parityPath });
  assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
  const cases = [['static', original.results], ['interaction', original.interactions]]
    .flatMap(([kind, entries]) => entries.map(entry => ({ ...entry, kind })));
  // Identical absence of OTHER source populations on both sides isolates the
  // actual production aggregation path; it is not canonical coverage proof.
  const run = roots => collectStyleDiscrepancies(...names.map(name => name === 'cases' ? cases
    : name === 'rootBackgroundInputs' ? roots
      : Object.assign([], { observations: [], comparisons: [], differences: [], groups: [] })));
  const before = run({ observations: [] }), after = run(evidence);
  assert.equal(after.length, before.length);
  // Scalar identity alone is not a row identity: other classifications may
  // legitimately split the same scalar. Match complete unrelated rows, and
  // require a unique unresolved predecessor only for each reviewed root.
  const remaining = [...before];
  let changed = 0, unchanged = 0;
  for (const row of after) {
    if (row.attribution !== rootBackgroundAttribution) {
      const index = remaining.findIndex(old => isDeepStrictEqual(row, old));
      assert.notEqual(index, -1, 'unrelated full row changed');
      remaining.splice(index, 1); unchanged++;
      continue;
    }
    const matches = remaining.filter(old => signature(row) === signature(old) && old.attribution === 'unresolved');
    assert.equal(matches.length, 1, 'missing or ambiguous unresolved root predecessor');
    const old = matches[0]; remaining.splice(remaining.indexOf(old), 1);
    assert.equal(old.attribution, 'unresolved');
    assert.deepEqual(raw(row), raw(old), 'raw inputs or membership changed');
    assert.equal(row.classification, 'application-plugin-authoring-defect');
    assert.notEqual(row.reference, row.astylar);
    assert.equal(row.reviewEvidence.rendererCauseProven, false);
    assert.equal(row.reviewEvidence.rasterDifferenceProven, false);
    changed++;
  }
  assert.equal(changed, 144);
  assert.equal(remaining.length, 0, 'prior rows were lost');
  assert.deepEqual(validateRootBackgroundClassifications(evidence, after), []);
  assert.equal(after.reduce((n, row) => n + row.occurrences, 0), before.reduce((n, row) => n + row.occurrences, 0));
  console.log(JSON.stringify({ groups: after.length, changedGroups: changed, changedObservations: 2311,
    unchangedCompleteRows: unchanged, canonicalCoverageProven: false }));
});
