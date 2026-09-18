import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Retain each actual historical test and its failing unrelated-row assertion.
// This diagnostic identifies the complete delta; it does not waive a failure.
const choices = {
  'button-fixed-width': "    assert.ok(isDeepStrictEqual(others(audit), others(previous)), 'all complete rows outside the original width/box groups and independently verified later gaps remain unchanged');",
  'button-requests': "    assert.ok(isDeepStrictEqual(others(audit), others(previous)), 'complete unrelated rows remain unchanged after original groups and independently verified later gaps');",
  'reviewed-authoring': '  assert.equal(hash(JSON.stringify(others(audit))), hash(JSON.stringify(others(previous))));',
};
assert.equal(process.argv.length, 3);
const name = process.argv[2]; assert.ok(Object.hasOwn(choices, name));
const file = `tests/material-parity/${name}-canonical-integration.spec.mjs`;
const revision = 'a6c98bd';
const source = execFileSync('git', ['show', `${revision}:${file}`], { encoding: 'utf8' });
const sourceSha256 = createHash('sha256').update(source).digest('hex');
const anchor = choices[name]; assert.equal(source.split(anchor).length, 2);
const insertion = `
  const diagnosticBefore = others(previous), diagnosticAfter = others(audit);
  assert.equal(diagnosticBefore.length, diagnosticAfter.length);
  const diagnosticKeys = diagnosticCaretDelta(audit, previous);
  const diagnosticChanged = [], diagnosticUnchanged = [];
  const diagnosticDigest = v => diagnosticHash('sha256').update(JSON.stringify(v)).digest('hex');
  for (let i = 0; i < diagnosticAfter.length; i++) {
    const a = diagnosticBefore[i], b = diagnosticAfter[i];
    assert.deepEqual(scalar(a), scalar(b), 'original ordered scalar preserved');
    if (diagnosticEqual(a, b)) { diagnosticUnchanged.push(b); continue; }
    assert.ok(diagnosticKeys.has(JSON.stringify(scalar(b))), 'changed row is not independently reviewed caret evidence');
    diagnosticChanged.push({ family:b.family, element:b.element, property:b.property, occurrences:b.occurrences,
      previousAttribution:a.attribution, currentAttribution:b.attribution,
      changedFields:[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k => !diagnosticEqual(a[k],b[k])),
      previousCompleteSha256:diagnosticDigest(a), currentCompleteSha256:diagnosticDigest(b) });
  }
  assert.equal(diagnosticChanged.length, diagnosticKeys.size);
  const diagnosticOther = r => others(r).filter(d => !diagnosticKeys.has(JSON.stringify(scalar(d))));
  assert.deepEqual(diagnosticOther(audit), diagnosticOther(previous));
  console.log(JSON.stringify({ kind:'historical-button-later-caret-conservation-diagnostic',
    source:${JSON.stringify(file)}, sourceRevision:${JSON.stringify(revision)}, sourceSha256:${JSON.stringify(sourceSha256)}, baselineCommit,
    originalCases:raw.results.length+raw.interactions.length, originalRows:audit.discrepancies.length,
    changedOtherRows:diagnosticChanged.length, changed:diagnosticChanged,
    unchangedOtherRows:diagnosticUnchanged.length, unchangedCompleteRowsSha256:diagnosticDigest(diagnosticUnchanged),
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
const helperUrl = JSON.stringify(pathToFileURL(path.resolve('tests/material-parity/owner-gap-integration-conservation.mjs')).href);
const executable = `import { isDeepStrictEqual as diagnosticEqual } from 'node:util';
import { createHash as diagnosticHash } from 'node:crypto';
import { assertLaterCaretClassifications as diagnosticCaretDelta } from ${helperUrl};
` + relocated;
await import('data:text/javascript;base64,' + Buffer.from(executable).toString('base64'));
