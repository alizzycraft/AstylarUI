import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectCaseIndexConservation } from '../../scripts/audit-material-case-index-conservation.mjs';
import { caseIndexReceiptFiles, caseIndexAuditModule } from '../../scripts/refresh-material-case-index-receipts.mjs';

test('historical case-index binding retains saved receipts and never promotes source proof to canonical acceptance', () => {
  const collected = collectCaseIndexConservation();
  const saved = JSON.parse(readFileSync('docs/material-case-index-historical-conservation.json'));
  const { membership, ...recorded } = saved;
  assert.deepEqual({ ...recorded, membershipAssertionsReplayed: false }, collected.report);
  assert.equal(membership.tests, 11); assert.equal(membership.failures, 0);
  assert.equal(collected.report.reports.length, 9);
  assert.equal(collected.report.projection.normalizationTransition.colorValuesEquivalent, false);
  assert.equal(collected.report.historicalReceiptsRewritten, false);
  assert.equal(collected.report.canonicalClassificationVerified, false);
  for (const projected of collected.replayReports) {
    const disk = JSON.parse(readFileSync(projected.file)), copy = JSON.parse(projected.content);
    const receipt = disk.sourceFingerprints.find(row => row.file === caseIndexAuditModule);
    assert.equal(receipt.sha256, '82854bccdaa6ff23fc5f9df987f6ec5cf3e22d0da5dbe64357109d5a03035f3b');
    assert.notEqual(copy.sourceFingerprints.find(row => row.file === caseIndexAuditModule).sha256, receipt.sha256);
    copy.sourceFingerprints.find(row => row.file === caseIndexAuditModule).sha256 = receipt.sha256;
    assert.deepEqual(copy, disk, 'in-memory projection altered non-receipt data');
  }
});

test('historical binding rejects changed findings in every index, receipts, dependencies and retained source behavior', () => {
  for (const file of caseIndexReceiptFiles) {
    const report = JSON.parse(readFileSync(file)); report.unreviewedFinding = true;
    assert.throws(() => collectCaseIndexConservation({ read: name => name === file
      ? Buffer.from(JSON.stringify(report)) : readFileSync(name) }), /non-receipt evidence changed/);
  }
  const file = caseIndexReceiptFiles[0];
  for (const mutate of [
    report => { report.sourceFingerprints.find(row => row.file === caseIndexAuditModule).sha256 = '0'.repeat(64); },
    report => { report.sourceFingerprints.reverse(); },
    report => { report.groups.reverse(); },
  ]) {
    const report = JSON.parse(readFileSync(file)); mutate(report);
    assert.throws(() => collectCaseIndexConservation({ read: name => name === file
      ? Buffer.from(JSON.stringify(report)) : readFileSync(name) }));
  }
  assert.throws(() => collectCaseIndexConservation({ read: name => name === 'tests/material-parity/root-typography-input-evidence.mjs'
    ? Buffer.from('changed') : readFileSync(name) }), /changed dependency/);
  const source = readFileSync(caseIndexAuditModule, 'utf8');
  assert.ok(source.includes('function reviewedTemplateTextMappings('));
  assert.throws(() => collectCaseIndexConservation({ read: name => name === caseIndexAuditModule
    ? Buffer.from(source.replace('function reviewedTemplateTextMappings(', 'function renamedTemplateTextMappings('))
    : readFileSync(name) }), /mapping or normalization changed/);
});
