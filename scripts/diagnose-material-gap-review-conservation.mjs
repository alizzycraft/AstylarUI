import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Preserve the complete original test, including the failing assertion. Add
// evidence immediately before it; an explained failure still exits nonzero.
const file = 'tests/material-parity/gap-review-canonical-integration.spec.mjs';
const revision = 'f5285a47025a303a14bf7ad30181abdc9f31363e';
const source = execFileSync('git', ['show', `${revision}:${file}`], { encoding: 'utf8' });
const hash = value => createHash('sha256').update(value).digest('hex');
const anchor = "    assert.ok(isDeepStrictEqual(others(audit), others(previous)), 'all unrelated complete findings unchanged');";
assert.equal(source.split(anchor).length, 2);
const insertion = `
    const diagnosticOptions = { root: process.cwd(), requireComplete: false };
    assert.deepEqual(diagnosticValidateGapInputs(audit.gapReviewInputs, diagnosticOptions), []);
    assert.deepEqual(diagnosticValidateGapRows(audit.gapReviewInputs, audit.discrepancies, diagnosticOptions), []);
    const diagnosticCaretKeys = diagnosticCaretDelta(audit, previous, diagnosticOptions);
    assert.ok(rows.every(r => !diagnosticCaretKeys.has(JSON.stringify(scalar(r)))), 'original gap and later caret populations overlap');
    const diagnosticFields = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
    const diagnosticRaw = row => Object.fromEntries(Object.entries(row).filter(([k]) => !diagnosticFields.has(k)));
    const diagnosticBefore = others(previous), diagnosticAfter = others(audit), diagnosticChanged = [], diagnosticUnchanged = [];
    assert.equal(diagnosticBefore.length, diagnosticAfter.length);
    for (let i = 0; i < diagnosticAfter.length; i++) {
      const before = diagnosticBefore[i], after = diagnosticAfter[i];
      assert.deepEqual(scalar(before), scalar(after));
      if (isDeepStrictEqual(before, after)) { diagnosticUnchanged.push(after); continue; }
      assert.ok(diagnosticCaretKeys.has(JSON.stringify(scalar(after))), 'unexplained changed historical row');
      assert.equal(before.attribution, 'unresolved');
      assert.deepEqual(diagnosticRaw(before), diagnosticRaw(after), 'raw/authored evidence changed');
      diagnosticChanged.push({ family: after.family, element: after.element, property: after.property,
        reference: after.reference, astylar: after.astylar, occurrences: after.occurrences, cases: after.cases, states: after.states,
        previousAttribution: before.attribution, currentAttribution: after.attribution,
        changedFields: [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(k => !isDeepStrictEqual(before[k], after[k])),
        previousCompleteSha256: hash(before), currentCompleteSha256: hash(after) });
    }
    assert.equal(diagnosticChanged.length, diagnosticCaretKeys.size, 'every independently authenticated later caret review must be accounted for');
    const diagnosticRemaining = report => others(report).filter(r => !diagnosticCaretKeys.has(JSON.stringify(scalar(r))));
    assert.ok(isDeepStrictEqual(diagnosticRemaining(previous), diagnosticRemaining(audit)));
    const diagnosticPendingMotion = report => report.discrepancies.filter(r => r.family === 'dialog' && r.element === 'dialog-panel' && ['rowGap', 'columnGap'].includes(r.property));
    const diagnosticMotion = diagnosticPendingMotion(audit);
    assert.equal(diagnosticMotion.length, 2);
    assert.ok(diagnosticMotion.every(r => r.attribution === 'unresolved'));
    assert.deepEqual(diagnosticMotion, diagnosticPendingMotion(previous));
    assert.equal(diagnosticMotion.reduce((n, r) => n + r.occurrences, 0), 64);
    const diagnosticReport = { schemaVersion: 1, kind: 'gap-review-historical-conservation-diagnostic',
      source: ${JSON.stringify(file)}, sourceRevision: ${JSON.stringify(revision)}, sourceSha256: ${JSON.stringify(hash(source))},
      baselineCommit, originalAssertionRetained: true, originalRawSha256: rawHash,
      originalCases: raw.results.length + raw.interactions.length, orderedScalarRows: audit.discrepancies.length,
      originalGapReviewGroups: rows.length, originalGapReviewObservations: rows.reduce((n, r) => n + r.occurrences, 0),
      originalGapInputObservations: audit.gapReviewInputs.observations.length,
      pendingMotionGroupsRetained: diagnosticMotion.length, pendingMotionObservationsRetained: 64,
      laterCaretGroups: diagnosticCaretKeys.size,
      laterCaretObservations: audit.ownerCaretInputs.plannedCoverage.reviewedObservations,
      pendingCaretObservationsRetained: audit.ownerCaretInputs.plannedCoverage.pendingObservations,
      changedOtherRows: diagnosticChanged.length, changed: diagnosticChanged,
      unchangedOtherRows: diagnosticUnchanged.length, unchangedCompleteRowsSha256: hash(diagnosticUnchanged),
      inputEquivalent: false, renderingEquivalent: false,
      limitation: 'Exact original gap-review test population. Later caret metadata is independently source-authenticated; all other complete findings and unresolved motion remain unchanged. The original failing assertion is retained. Not a corrected-test pass or full harness acceptance.' };
    writeFileSync('docs/material-gap-review-later-conservation.json', JSON.stringify(diagnosticReport, null, 2) + '\\n');
    console.log(JSON.stringify(diagnosticReport));
`;
const augmented = source.replace(anchor, insertion + anchor);
assert.equal(augmented.replace(insertion, ''), source);
const parse = text => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const parsed = parse(augmented), requireFromTest = createRequire(pathToFileURL(path.resolve(file)));
assert.equal(parsed.parseDiagnostics.length, 0);
let relocated = augmented;
for (const node of [...parsed.statements.filter(ts.isImportDeclaration)].reverse()) {
  const s = node.moduleSpecifier; if (s.text.startsWith('node:')) continue;
  const url = s.text.startsWith('.') ? new URL(s.text, pathToFileURL(path.resolve(file))).href
    : pathToFileURL(requireFromTest.resolve(s.text)).href;
  relocated = relocated.slice(0, s.getStart(parsed)) + JSON.stringify(url) + relocated.slice(s.end);
}
const moved = parse(relocated); assert.equal(moved.parseDiagnostics.length, 0); assert.equal(moved.statements.length, parsed.statements.length);
for (let i = 0; i < parsed.statements.length; i++) {
  const withoutPath = (n, f) => ts.isImportDeclaration(n) ? n.getText(f).replace(n.moduleSpecifier.getText(f), '<import>') : n.getText(f);
  assert.equal(withoutPath(parsed.statements[i], parsed), withoutPath(moved.statements[i], moved));
}
const url = file => JSON.stringify(pathToFileURL(path.resolve('tests/material-parity', file)).href);
const executable = `import { assertLaterCaretClassifications as diagnosticCaretDelta } from ${url('owner-gap-integration-conservation.mjs')};
import { validateGapReviewInputs as diagnosticValidateGapInputs } from ${url('gap-review-source-binding.mjs')};
import { validateGapReviewClassifications as diagnosticValidateGapRows } from ${url('gap-review-coverage.mjs')};
` + relocated;
await import('data:text/javascript;base64,' + Buffer.from(executable).toString('base64'));
