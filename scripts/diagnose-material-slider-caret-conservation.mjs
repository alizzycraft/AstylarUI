import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Diagnose the original frozen checksum without replacing it or editing the
// canonical integration test. --source-only checks relocation, not the claim.
assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--source-only'));
const revision = 'a6c98bd', file = 'tests/material-parity/slider-border-canonical-integration.spec.mjs';
const source = execFileSync('git', ['show', `${revision}:${file}`], { encoding: 'utf8' });
const sourceSha256 = createHash('sha256').update(source).digest('hex');
const anchor = "  assert.equal(createHash('sha256').update(JSON.stringify(historicalRows)).digest('hex'),\n    '4e1f09fc03af948aec7b2d1d927ee13c298b6439ceaa3bb0145a72122eb315ee');";
assert.equal(source.split(anchor).length, 2);
const insertion = `
  const diagnosticCaretKeys = diagnosticCaretDelta(audit, unbound, { root });
  const diagnosticCaretRows = historicalRows.filter(row => diagnosticCaretKeys.has(signature(row)));
  assert.equal(diagnosticCaretRows.length, diagnosticCaretKeys.size);
  assert.ok(diagnosticCaretRows.every(row => !later.has(row)), 'later caret overlaps an earlier attribution');
  const diagnosticDigest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const diagnosticRestored = historicalRows.map(row => diagnosticCaretKeys.has(signature(row))
    ? oldRows.get(signature(row)) : row);
  assert.equal(diagnosticRestored.length, 220);
  const diagnosticExpected = '4e1f09fc03af948aec7b2d1d927ee13c298b6439ceaa3bb0145a72122eb315ee';
  assert.equal(diagnosticDigest(diagnosticRestored), diagnosticExpected,
    'authenticated caret rollback does not reproduce the original complete-row checksum');
  console.log(JSON.stringify({ kind:'historical-slider-later-caret-conservation-diagnostic',
    source:${JSON.stringify(file)}, sourceRevision:${JSON.stringify(revision)}, sourceSha256:${JSON.stringify(sourceSha256)},
    originalCases:raw.results.length+raw.interactions.length, originalRows:audit.discrepancies.length,
    historicalRows:historicalRows.length, actualHistoricalSha256:diagnosticDigest(historicalRows),
    restoredHistoricalSha256:diagnosticDigest(diagnosticRestored), expectedHistoricalSha256:diagnosticExpected,
    changed:diagnosticCaretRows.map(row => ({ element:row.element, property:row.property,
      occurrences:row.occurrences, previousAttribution:oldRows.get(signature(row)).attribution,
      currentAttribution:row.attribution, previousCompleteSha256:diagnosticDigest(oldRows.get(signature(row))),
      currentCompleteSha256:diagnosticDigest(row) })),
    sourceBoundCaretGroups:audit.ownerCaretInputs.plannedCoverage.reviewedGroups,
    sourceBoundCaretObservations:audit.ownerCaretInputs.plannedCoverage.reviewedObservations,
    pendingCaretObservations:audit.ownerCaretInputs.plannedCoverage.pendingObservations,
    originalAssertionRetained:true, inputEquivalent:false, renderingEquivalent:false }));
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
const moved = parse(relocated);
assert.equal(moved.parseDiagnostics.length, 0); assert.equal(moved.statements.length, parsed.statements.length);
for (let i = 0; i < parsed.statements.length; i++) {
  const withoutPath = (n, f) => ts.isImportDeclaration(n) ? n.getText(f).replace(n.moduleSpecifier.getText(f), '<import>') : n.getText(f);
  assert.equal(withoutPath(parsed.statements[i], parsed), withoutPath(moved.statements[i], moved));
}
if (process.argv[2] === '--source-only') {
  console.log(JSON.stringify({ source:file, revision, sourceSha256, originalSourceReconstructed:true,
    importRelocationOnly:true, originalAssertionRetained:true, conservationExecuted:false }));
} else {
  const helper = JSON.stringify(pathToFileURL(path.resolve('tests/material-parity/owner-gap-integration-conservation.mjs')).href);
  const executable = `import { assertLaterCaretClassifications as diagnosticCaretDelta } from ${helper};\n` + relocated;
  await import('data:text/javascript;base64,' + Buffer.from(executable).toString('base64'));
}
