import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Execute the actual historical integration test with its failure intact. Only
// insert a bounded diagnostic immediately before the failed conservation check.
assert.equal(process.argv.length, 2);
const file = 'tests/material-parity/field-host-layout-canonical-integration.spec.mjs';
const revision = '80bf887';
const source = execFileSync('git', ['show', `${revision}:${file}`], { encoding: 'utf8' });
const sourceSha256 = createHash('sha256').update(source).digest('hex');
const anchor = "  assert.equal(hash(other(audit)), hash(other(previous)), 'all unrelated complete rows unchanged');";
assert.equal(source.split(anchor).length, 2);
const insertion = `
  const diagnosticBefore = other(previous), diagnosticAfter = other(audit);
  assert.equal(diagnosticBefore.length, diagnosticAfter.length);
  const diagnosticChanged = [], diagnosticUnchanged = [];
  const classificationFields = new Set(['classification','attribution','justification','recommendedOwner','reviewEvidence','reviewedCases']);
  const rawFields = row => Object.fromEntries(Object.entries(row).filter(([k]) => !classificationFields.has(k)));
  for (let i = 0; i < diagnosticAfter.length; i++) {
    const a = diagnosticBefore[i], b = diagnosticAfter[i];
    assert.deepEqual(scalar(a), scalar(b), 'original ordered scalar preserved');
    if (diagnosticEqual(a, b)) { diagnosticUnchanged.push(hash(b)); continue; }
    diagnosticChanged.push({ family:b.family, element:b.element, property:b.property, occurrences:b.occurrences,
      previousAttribution:a.attribution, currentAttribution:b.attribution,
      changedFields:[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k => !diagnosticEqual(a[k],b[k])),
      rawAndAuthoredFieldsUnchanged:diagnosticEqual(rawFields(a),rawFields(b)),
      previousCompleteSha256:hash(a), currentCompleteSha256:hash(b) });
  }
  assert.deepEqual(validateDiagnosticCaretSource(audit.ownerCaretInputs, { requireComplete:false }), []);
  assert.deepEqual(validateDiagnosticCaretRows(audit.ownerCaretInputs.plannedCoverage, audit.discrepancies), []);
  console.log(JSON.stringify({ kind:'field-host-later-caret-conservation-diagnostic', source:${JSON.stringify(file)},
    sourceRevision:${JSON.stringify(revision)}, sourceSha256:${JSON.stringify(sourceSha256)}, baselineCommit,
    originalCases:raw.results.length+raw.interactions.length, originalRows:audit.discrepancies.length,
    changedOtherRows:diagnosticChanged.length, changed:diagnosticChanged,
    unchangedOtherRows:diagnosticUnchanged.length, unchangedOrderedDigestsSha256:hash(diagnosticUnchanged),
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
  const s = node.moduleSpecifier;
  if (s.text.startsWith('node:')) continue;
  const url = s.text.startsWith('.') ? new URL(s.text, pathToFileURL(path.resolve(file))).href
    : pathToFileURL(requireFromTest.resolve(s.text)).href;
  relocated = relocated.slice(0, s.getStart(parsed)) + JSON.stringify(url) + relocated.slice(s.end);
}
const moved = parse(relocated);
assert.equal(moved.parseDiagnostics.length, 0);
assert.equal(moved.statements.length, parsed.statements.length);
for (let i = 0; i < parsed.statements.length; i++) {
  const withoutPath = (n, f) => ts.isImportDeclaration(n) ? n.getText(f).replace(n.moduleSpecifier.getText(f), '<import>') : n.getText(f);
  assert.equal(withoutPath(parsed.statements[i], parsed), withoutPath(moved.statements[i], moved));
}
const url = f => JSON.stringify(pathToFileURL(path.resolve('tests/material-parity', f)).href);
const executable = `import { isDeepStrictEqual as diagnosticEqual } from 'node:util';
import { validateOwnerCaretAuditInputs as validateDiagnosticCaretSource } from ${url('owner-caret-audit-source-binding.mjs')};
import { validateOwnerCaretAttributionRows as validateDiagnosticCaretRows } from ${url('owner-caret-attribution-coverage.mjs')};
` + relocated;
await import('data:text/javascript;base64,' + Buffer.from(executable).toString('base64'));
