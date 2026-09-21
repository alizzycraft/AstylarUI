import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { caseIndexReceiptFiles, caseIndexReceiptRevision, caseIndexAuditModule } from './refresh-material-case-index-receipts.mjs';
import { verifyAlignmentAuditProjection } from '../tests/material-parity/alignment-survey-conservation.mjs';
import { verifyCaseIndexAssertionMigration } from '../tests/material-parity/case-index-assertion-migration.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const normalize = value => value.toString().replaceAll('\r\n', '\n');
const sourceHash = value => hash(normalize(value));
const receiptRevision = '4650791a7208b841dd29f1ced015f98234949623';
const historical = (revision, file) => execFileSync('git', ['show', `${revision}:${file}`], { maxBuffer: 16 * 1024 * 1024 });

// Preserve saved historical receipts. The projected copies below are ONLY for
// executing unchanged legacy membership assertions, never replacement reports.
export function collectCaseIndexConservation({ read = readFileSync } = {}) {
  const baselineSource = historical(caseIndexReceiptRevision, caseIndexAuditModule);
  const recordedSource = historical(receiptRevision, caseIndexAuditModule);
  const currentSource = read(caseIndexAuditModule);
  assert.equal(sourceHash(baselineSource), '1189df0c574dc9e8058cf7a61ceb0f0751e0df48dca67b796f12dadde3ec6e45');
  assert.equal(sourceHash(recordedSource), '82854bccdaa6ff23fc5f9df987f6ec5cf3e22d0da5dbe64357109d5a03035f3b');
  const projection = verifyAlignmentAuditProjection(baselineSource, currentSource);
  const reports = [], replayReports = [];
  for (const file of caseIndexReceiptFiles) {
    const bytes = read(file), saved = JSON.parse(bytes);
    const baseline = JSON.parse(historical(caseIndexReceiptRevision, file));
    const receipt = saved.sourceFingerprints.filter(item => item.file === caseIndexAuditModule);
    assert.equal(receipt.length, 1); assert.equal(receipt[0].sha256, sourceHash(recordedSource));
    const oldReceipt = baseline.sourceFingerprints.filter(item => item.file === caseIndexAuditModule);
    assert.equal(oldReceipt.length, 1); assert.equal(oldReceipt[0].sha256, sourceHash(baselineSource));
    const conserved = structuredClone(saved);
    conserved.sourceFingerprints.find(item => item.file === caseIndexAuditModule).sha256 = oldReceipt[0].sha256;
    assert.deepEqual(conserved, baseline, `${file}: non-receipt evidence changed`);
    for (const dependency of saved.sourceFingerprints.filter(item => item.file !== caseIndexAuditModule))
      assert.equal(sourceHash(read(dependency.file)), dependency.sha256, `changed dependency: ${dependency.file}`);
    reports.push({ file, savedSha256: sourceHash(bytes), baselineRevision: caseIndexReceiptRevision,
      recordedSourceRevision: receiptRevision, recordedSourceSha256: receipt[0].sha256,
      currentSourceSha256: sourceHash(currentSource), conservedObjectSha256: hash(JSON.stringify(conserved)) });
    const replay = structuredClone(saved);
    replay.sourceFingerprints.find(item => item.file === caseIndexAuditModule).sha256 = sourceHash(currentSource);
    replayReports.push({ file, content: JSON.stringify(replay) });
  }
  return { report: { schemaVersion: 1, kind: 'historical-case-index-conservation', reports, projection,
    historicalReceiptsRewritten: false, allNonReceiptFieldsConserved: true,
    membershipAssertionsReplayed: false, canonicalClassificationVerified: false, renderingEquivalent: false }, replayReports };
}

export function replayCaseIndexMembership() {
  const collected = collectCaseIndexConservation();
  const file = 'tests/material-parity/input-equivalence-audit.spec.mjs';
  const statements = source => {
    const tree = ts.createSourceFile(file, normalize(source), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    assert.equal(tree.parseDiagnostics.length, 0);
    return tree.statements.filter(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) &&
      node.expression.expression.getText(tree) === 'test' && ts.isStringLiteral(node.expression.arguments[0]) &&
      node.expression.arguments[0].text.includes('case index')).map(node => node.getText(tree));
  };
  const beforeMigration = historical('6833850', file);
  const assertionMigration = verifyCaseIndexAssertionMigration(beforeMigration, readFileSync(file));
  const current = statements(beforeMigration);
  assert.equal(current.length, 11);
  assert.deepEqual(current, statements(historical(caseIndexReceiptRevision, file)), 'original membership assertions changed');
  const watched = caseIndexReceiptFiles.map(name => ({ file: name, sha256: hash(readFileSync(name)) }));
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('MEMBERSHIP_REPLAY_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  const output = execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'), '--test', '--test-concurrency=1',
    '--test-name-pattern=case index', file], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, env });
  for (const line of ['# tests 11', '# pass 11', '# fail 0', '# skipped 0'])
    assert.ok(output.split(/\r?\n/).includes(line), `missing successful replay result: ${line}`);
  for (const receipt of watched) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256, 'saved receipt was changed');
  assert.deepEqual(collectCaseIndexConservation().report, collected.report, 'sources changed during replay');
  return { ...collected.report, membershipAssertionsReplayed: true,
    membership: { testStatementsSha256: hash(JSON.stringify(current)), assertionMigration,
      diskReadSubstitution: false, tests: 11, failures: 0,
      outputSha256: hash(output), output } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.equal(process.argv.length, 2);
  const report = replayCaseIndexMembership();
  writeFileSync('docs/material-case-index-historical-conservation.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ reports: report.reports.length, tests: report.membership.tests,
    failures: report.membership.failures, historicalReceiptsRewritten: false }));
}
