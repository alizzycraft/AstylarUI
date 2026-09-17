import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { loadFieldHostLayoutEvidence, buildFieldHostLayoutReport } from './audit-material-field-host-layout-inputs.mjs';
import { readCanonicalFieldHostRows, joinFieldHostLayout } from './audit-material-field-host-layout-join.mjs';

assert.equal(process.argv.length, 2);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const savedFile = 'docs/material-field-host-layout-inputs.json';
const savedBytes = readFileSync(savedFile), saved = JSON.parse(savedBytes);
const fresh = buildFieldHostLayoutReport(loadFieldHostLayoutEvidence());
const changedFields = Object.keys(fresh).filter(key => !isDeepStrictEqual(fresh[key], saved[key]));
assert.deepEqual(changedFields, ['sourceFingerprints']);
const changedSources = fresh.sourceFingerprints.flatMap((source, index) => {
  const previous = saved.sourceFingerprints[index]; assert.equal(source.file, previous.file);
  return source.sha256 === previous.sha256 ? [] : [{ file: source.file, previous: previous.sha256, current: source.sha256 }];
});
assert.deepEqual(changedSources.map(s => s.file), ['docs/material-field-host-typography-audit.json',
  'tests/material-parity/input-equivalence-audit.mjs']);
const payload = ({ sourceFingerprints, ...rest }) => rest;
assert.deepEqual(payload(fresh), payload(saved));
const joinFile = 'docs/material-field-host-layout-canonical-join.json', join = JSON.parse(readFileSync(joinFile));
assert.equal(join.survey.sha256, hash(savedBytes));
const canonical = await readCanonicalFieldHostRows(), captureBytes = readFileSync(saved.capture.file);
assert.equal(hash(captureBytes), saved.capture.sha256);
const rows = joinFieldHostLayout({ survey: fresh, original: JSON.parse(captureBytes), discrepancies: canonical.discrepancies });
assert.deepEqual(rows, join.rows, 'all historical join rows, source members and interpretations remain unchanged');
assert.equal(rows.length, 72); assert.equal(rows.reduce((n, r) => n + r.occurrences, 0), 4616);
console.log(JSON.stringify({ kind: 'field-host-layout-stale-receipt-diagnostic',
  survey: { file: savedFile, sha256: hash(savedBytes) }, join: { file: joinFile, sha256: hash(readFileSync(joinFile)) },
  cases: fresh.caseCount, groups: fresh.groupCount, observations: fresh.propertyObservations,
  changedFields, changedSources, unchangedNonReceiptSha256: hash(JSON.stringify(payload(fresh))),
  originalProofSha256: fresh.proofSha256, historicalJoinRows: rows.length,
  unchangedHistoricalJoinRowsSha256: hash(JSON.stringify(rows)),
  canonicalRevision: canonical.revision, evidenceFilesWritten: false, renderingEquivalent: false }));

// Replay the existing weight/tracking test unchanged, inserting a diagnostic
// before its failing fingerprint guard. Prove the assertions after that guard
// too, then retain the original failure. This is not a corrected-test pass.
const file = 'tests/material-parity/field-host-weight-tracking-evidence.spec.mjs';
const source = readFileSync(file, 'utf8');
const anchor = "  for (const s of durable.sourceFingerprints) assert.equal(createHash('sha256').update(readFileSync(s.file, 'utf8').replaceAll('\\r\\n', '\\n')).digest('hex'), s.sha256, s.file);";
assert.equal(source.split(anchor).length, 2);
const insertion = `
  const diagnosticGroups = [...groups.values()].sort((a, b) => (a.family + '/' + a.property).localeCompare(b.family + '/' + b.property))
    .map(g => ({ ...g, cases: [...g.cases].sort(), occurrences: g.cases.length }));
  assert.deepEqual(durable.groups, diagnosticGroups);
  assert.deepEqual(durable.capture, index.capture);
  assert.equal(durable.caseCount, 577); assert.equal(durable.proofCount, 1154);
  const diagnosticChanges = durable.sourceFingerprints.flatMap(s => {
    const current = createHash('sha256').update(readFileSync(s.file, 'utf8').replaceAll('\\r\\n', '\\n')).digest('hex');
    return current === s.sha256 ? [] : [{ file: s.file, previous: s.sha256, current }];
  });
  assert.deepEqual(diagnosticChanges.map(s => s.file), ['tests/material-parity/input-equivalence-audit.mjs']);
  console.log(JSON.stringify({ kind: 'field-host-weight-tracking-stale-receipt-diagnostic',
    source: ${JSON.stringify(file)}, sourceSha256: ${JSON.stringify(hash(source))},
    cases: expectedCases.length, proofs: proofs.length, originalScalarGroups: diagnosticGroups.length,
    changedSources: diagnosticChanges,
    unchangedOriginalGroupsSha256: createHash('sha256').update(JSON.stringify(diagnosticGroups)).digest('hex'),
    originalAssertionRetained: true, evidenceFilesWritten: false, renderingEquivalent: false }));
`;
const augmented = source.replace(anchor, insertion + anchor);
assert.equal(augmented.replace(insertion, ''), source);
const parsed = ts.createSourceFile(file, augmented, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(parsed.parseDiagnostics.length, 0);
let relocated = augmented;
for (const node of [...parsed.statements.filter(ts.isImportDeclaration)].reverse()) {
  const specifier = node.moduleSpecifier;
  if (specifier.text.startsWith('node:')) continue;
  assert.ok(specifier.text.startsWith('.'), 'review any new package import');
  const url = new URL(specifier.text, pathToFileURL(path.resolve(file))).href;
  relocated = relocated.slice(0, specifier.getStart(parsed)) + JSON.stringify(url) + relocated.slice(specifier.end);
}
const moved = ts.createSourceFile(file, relocated, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(moved.parseDiagnostics.length, 0); assert.equal(moved.statements.length, parsed.statements.length);
for (let i = 0; i < parsed.statements.length; i++) {
  const omitPath = (n, f) => ts.isImportDeclaration(n)
    ? n.getText(f).replace(n.moduleSpecifier.getText(f), '<import>') : n.getText(f);
  assert.equal(omitPath(parsed.statements[i], parsed), omitPath(moved.statements[i], moved));
}
await import(`data:text/javascript;base64,${Buffer.from(relocated).toString('base64')}`);
