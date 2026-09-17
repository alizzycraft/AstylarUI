import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Preserve the original fingerprint failure, but establish the complete root
// index and the assertions after that guard before proposing a metadata refresh.
assert.equal(process.argv.length, 2);
const hash = value => createHash('sha256').update(value).digest('hex');
const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';
const indexFile = 'docs/material-root-initial-style-audit.json';
const saved = JSON.parse(readFileSync(indexFile));
const baseline = execFileSync('git', ['rev-parse', '7cc8e93^'], { encoding: 'utf8' }).trim();
const previous = execFileSync('git', ['show', `${baseline}:${moduleFile}`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
assert.equal(hash(previous.replaceAll('\r\n', '\n')), saved.sourceFingerprints.find(s => s.file === moduleFile).sha256);
const parse = source => ts.createSourceFile(moduleFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const current = parse(readFileSync(moduleFile, 'utf8')), prior = parse(previous);
const selectedFunctions = ['collectFullTreeInventory', 'collectReferenceContextGaps', 'caseKey'];
const functionText = (ast, name) => {
  const matches = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.equal(matches.length, 1, name); return matches[0].getText(ast);
};
for (const name of selectedFunctions) assert.equal(functionText(current, name), functionText(prior, name), name);
const contextDeclaration = ast => {
  const statements = ast.statements.filter(n => ts.isVariableStatement(n) &&
    n.declarationList.declarations.some(d => ts.isIdentifier(d.name) && d.name.text === 'referenceContextProperties'));
  assert.equal(statements.length, 1); return statements[0].getText(ast);
};
assert.equal(contextDeclaration(current), contextDeclaration(prior));
const auditTestFile = 'tests/material-parity/input-equivalence-audit.spec.mjs';
const priorTest = execFileSync('git', ['show', `${baseline}:${auditTestFile}`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
assert.equal(hash(priorTest.replaceAll('\r\n', '\n')), saved.sourceFingerprints.find(s => s.file === auditTestFile).sha256);
const priorTestAst = parse(priorTest), currentTestAst = parse(readFileSync(auditTestFile, 'utf8'));
assert.equal(priorTestAst.statements.length, currentTestAst.statements.length);
const changedTestStatements = [];
for (let i = 0; i < priorTestAst.statements.length; i++) {
  if (priorTestAst.statements[i].getText(priorTestAst) === currentTestAst.statements[i].getText(currentTestAst)) continue;
  const statement = currentTestAst.statements[i];
  assert.ok(ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression));
  const call = statement.expression;
  assert.equal(call.expression.getText(currentTestAst), 'test');
  assert.ok(ts.isStringLiteral(call.arguments[0])); changedTestStatements.push(call.arguments[0].text);
}
assert.deepEqual(changedTestStatements, ['records source fingerprints and actual visual acceptance fields']);

const file = 'tests/material-parity/root-initial-style-evidence.spec.mjs';
const source = readFileSync(file, 'utf8');
const anchor = "  for (const source of durable.sourceFingerprints)\n    assert.equal(hash(readFileSync(source.file, 'utf8').replaceAll('\\r\\n', '\\n')), source.sha256, source.file);";
const normalized = source.replaceAll('\r\n', '\n');
assert.equal(normalized.split(anchor).length, 2, 'exact original source-fingerprint guard');
const insertion = `
  for (const p of proofs) {
    assert.equal(p.candidatePath[1].comparison[p.property], undefined);
    assert.equal(p.classification, 'parity-harness-defect');
    for (const flag of ['computedCandidateVerified', 'descendantConsumersVerified', 'finalRasterVerified']) assert.equal(p[flag], false);
  }
  const diagnosticChanges = durable.sourceFingerprints.flatMap(s => {
    const current = hash(readFileSync(s.file, 'utf8').replaceAll('\\r\\n', '\\n'));
    return current === s.sha256 ? [] : [{ file: s.file, previous: s.sha256, current }];
  });
  assert.deepEqual(diagnosticChanges.map(s => s.file), ${JSON.stringify([moduleFile, auditTestFile])});
  const { sourceFingerprints: diagnosticReceipts, ...diagnosticPayload } = durable;
  console.log(JSON.stringify({ kind: 'root-initial-style-stale-receipt-diagnostic',
    source: ${JSON.stringify(file)}, sourceSha256: ${JSON.stringify(hash(normalized))}, baseline: ${JSON.stringify(baseline)},
    unchangedFunctions: ${JSON.stringify(selectedFunctions)},
    changedTestStatements: ${JSON.stringify(changedTestStatements)},
    cases: entries.length, properties: Object.keys(rootInitialStyleValues).length,
    observations: proofs.length, groups: durable.groups.length,
    changedSources: diagnosticChanges, unchangedNonReceiptSha256: hash(JSON.stringify(diagnosticPayload)),
    originalMembershipSha256: hash(JSON.stringify(actual)),
    completeOriginalIndexVerified: true, subsequentAssertionsVerified: true,
    originalAssertionRetained: true, evidenceFilesWritten: false, renderingEquivalent: false }));
`;
const augmented = normalized.replace(anchor, insertion + anchor);
assert.equal(augmented.replace(insertion, ''), normalized);
const parsed = parse(augmented);
assert.equal(parsed.parseDiagnostics.length, 0);
let relocated = augmented;
for (const node of [...parsed.statements.filter(ts.isImportDeclaration)].reverse()) {
  const specifier = node.moduleSpecifier;
  if (specifier.text.startsWith('node:')) continue;
  assert.ok(specifier.text.startsWith('.'), 'review new package imports');
  const url = new URL(specifier.text, pathToFileURL(path.resolve(file))).href;
  relocated = relocated.slice(0, specifier.getStart(parsed)) + JSON.stringify(url) + relocated.slice(specifier.end);
}
const moved = parse(relocated);
assert.equal(moved.parseDiagnostics.length, 0);
assert.equal(moved.statements.length, parsed.statements.length);
for (let i = 0; i < parsed.statements.length; i++) {
  const omitPath = (n, f) => ts.isImportDeclaration(n) ? n.getText(f).replace(n.moduleSpecifier.getText(f), '<import>') : n.getText(f);
  assert.equal(omitPath(parsed.statements[i], parsed), omitPath(moved.statements[i], moved));
}
await import(`data:text/javascript;base64,${Buffer.from(relocated).toString('base64')}`);
