import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';

// Diagnostic-only replay: retain the original test, its inputs and its failing
// assertion. Add a bounded report immediately before that assertion rather than
// weakening the test or editing dependencies of the running full harness.
const file = 'tests/material-parity/button-fixed-width-canonical-integration.spec.mjs';
const source = readFileSync(file, 'utf8');
const anchor = "    assert.ok(isDeepStrictEqual(others(audit), others(previous)), 'all complete rows outside the eight width and nine box-sizing groups remain unchanged');";
assert.equal(source.split(anchor).length, 2, 'the reviewed conservation assertion must occur exactly once');
const sourceSha256 = createHash('sha256').update(source).digest('hex');
const insertion = `
    const priorOther = others(previous), currentOther = others(audit);
    assert.equal(currentOther.length, priorOther.length);
    const changed = [], unchanged = [];
    for (let i = 0; i < currentOther.length; i++) {
      const before = priorOther[i], after = currentOther[i];
      assert.deepEqual(scalar(after), scalar(before), 'diagnostic original ordered scalar');
      if (isDeepStrictEqual(after, before)) { unchanged.push(hash(JSON.stringify(after))); continue; }
      changed.push({ identity: [after.family, after.element, after.property], occurrences: after.occurrences,
        previousAttribution: before.attribution, currentAttribution: after.attribution,
        previousClassification: before.classification, currentClassification: after.classification,
        originalAuthoredExamplesUnchanged: isDeepStrictEqual(
          [before.referenceAuthoredExamples, before.astylarAuthoredExamples],
          [after.referenceAuthoredExamples, after.astylarAuthoredExamples]),
        previousCompleteSha256: hash(JSON.stringify(before)), currentCompleteSha256: hash(JSON.stringify(after)) });
    }
    let laterGapProof;
    try {
      const later = assertDiagnosticLaterGapClassifications(audit, previous);
      const unaccounted = currentOther.filter((row, i) =>
        !isDeepStrictEqual(row, priorOther[i]) && !later.has(JSON.stringify(scalar(row))));
      laterGapProof = { verified: true, sourceBoundSignatures: later.size,
        remainingChangedIdentities: unaccounted.map(r => [r.family, r.element, r.property]) };
    } catch (error) { laterGapProof = { verified: false, error: String(error) }; }
    console.log(JSON.stringify({ kind: 'button-fixed-width-historical-conservation-diagnostic',
      source: ${JSON.stringify(file)}, sourceSha256: ${JSON.stringify(sourceSha256)}, baselineCommit,
      diagnosticCases: raw.results.length + raw.interactions.length,
      unchangedScalarRows: audit.discrepancies.length, originalWidthAndBoxGroups: keys.size,
      changedOtherRows: changed.length, unchangedOtherRows: unchanged.length,
      unchangedOrderedRowDigestsSha256: hash(JSON.stringify(unchanged)), changed, laterGapProof,
      originalAssertionRetained: true, inputEquivalent: false, renderingEquivalent: false,
      limitation: 'Diagnostic replay, not a corrected-test pass or complete audit acceptance.' }));
`;
const augmented = source.replace(anchor, insertion + anchor);
assert.equal(augmented.replace(insertion, ''), source, 'insertion cannot replace original proof');
const parsed = ts.createSourceFile(file, augmented, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const requireFromTest = createRequire(pathToFileURL(path.resolve(file)));
let relocated = augmented;
for (const node of [...parsed.statements.filter(ts.isImportDeclaration)].reverse()) {
  if (node.moduleSpecifier.text.startsWith('node:')) continue;
  const s = node.moduleSpecifier;
  const absolute = s.text.startsWith('.') ? new URL(s.text, pathToFileURL(path.resolve(file))).href
    : pathToFileURL(requireFromTest.resolve(s.text)).href;
  relocated = relocated.slice(0, s.getStart(parsed)) + JSON.stringify(absolute) + relocated.slice(s.end);
}
const moved = ts.createSourceFile(file, relocated, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(moved.statements.length, parsed.statements.length);
for (let i = 0; i < parsed.statements.length; i++) {
  const omitImportPath = (n, f) => ts.isImportDeclaration(n)
    ? n.getText(f).replace(n.moduleSpecifier.getText(f), '<import>') : n.getText(f);
  assert.equal(omitImportPath(parsed.statements[i], parsed), omitImportPath(moved.statements[i], moved));
}
const helper = pathToFileURL(path.resolve('tests/material-parity/owner-gap-integration-conservation.mjs')).href;
const executable = `import { assertLaterGapClassifications as assertDiagnosticLaterGapClassifications } from ${JSON.stringify(helper)};\n` + relocated;
await import(`data:text/javascript;base64,${Buffer.from(executable).toString('base64')}`);
