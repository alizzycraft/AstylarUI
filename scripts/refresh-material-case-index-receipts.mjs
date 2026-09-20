import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const caseIndexReceiptRevision = '67db724e5f258c84cfdc70e9da2ccb6ee6353ad0';
export const caseIndexAuditModule = 'tests/material-parity/input-equivalence-audit.mjs';
export const caseIndexReceiptFiles = [
  'docs/material-container-caret-audit.json',
  'docs/material-root-height-audit.json',
  'docs/material-field-host-color-audit.json',
  'docs/material-root-color-audit.json',
  'docs/material-root-typography-audit.json',
  'docs/material-field-host-alignment-audit.json',
  'docs/material-field-host-typography-audit.json',
  'docs/material-nonwidget-appearance-audit.json',
  'docs/material-button-appearance-audit.json',
];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceHash = bytes => hash(bytes.toString('utf8').replaceAll('\r\n', '\n'));
const readRevision = file => execFileSync('git', ['show', `${caseIndexReceiptRevision}:${file}`], { maxBuffer: 16 * 1024 * 1024 });

// This constructs a proposal, not proof that the original membership assertions
// pass. Run those unchanged assertions before accepting a receipt refresh.
export function collectCaseIndexReceiptRefresh({ read = file => readFileSync(file), historical = readRevision } = {}) {
  const oldHash = sourceHash(historical(caseIndexAuditModule)), currentHash = sourceHash(read(caseIndexAuditModule));
  assert.equal(oldHash, '1189df0c574dc9e8058cf7a61ceb0f0751e0df48dca67b796f12dadde3ec6e45');
  const reports = [], receipts = [];
  for (const file of caseIndexReceiptFiles) {
    const originalBytes = historical(file), original = JSON.parse(originalBytes), before = JSON.parse(read(file));
    const prior = original.sourceFingerprints.filter(s => s.file === caseIndexAuditModule);
    assert.equal(prior.length, 1); assert.equal(prior[0].sha256, oldHash);
    const comparable = structuredClone(before), updated = comparable.sourceFingerprints.filter(s => s.file === caseIndexAuditModule);
    assert.equal(updated.length, 1); assert.ok([oldHash, currentHash].includes(updated[0].sha256), 'unrecognized receipt');
    updated[0].sha256 = oldHash;
    assert.deepEqual(comparable, original, `${file}: finding/capture/membership changed beyond the sole receipt`);
    for (const dependency of before.sourceFingerprints.filter(s => s.file !== caseIndexAuditModule))
      assert.equal(sourceHash(read(dependency.file)), dependency.sha256, `${file}: another dependency changed: ${dependency.file}`);
    const after = structuredClone(before); after.sourceFingerprints.find(s => s.file === caseIndexAuditModule).sha256 = currentHash;
    const content = JSON.stringify(after, null, 2) + '\n';
    reports.push({ file, content });
    receipts.push({ file, historicalSha256: hash(originalBytes), before: oldHash, after: currentHash,
      proposedSha256: hash(content), conservedObjectSha256: hash(JSON.stringify(comparable)),
      alreadyCurrent: before.sourceFingerprints.find(s => s.file === caseIndexAuditModule).sha256 === currentHash });
  }
  return { revision: caseIndexReceiptRevision, reports, receipts, allNonReceiptFieldsConserved: true,
    membershipAssertionsReplayed: false, canonicalClassificationVerified: false, renderingEquivalent: false };
}

function verifyMembership() {
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  const output = execFileSync(process.execPath, ['--test', '--test-concurrency=1',
    'tests/material-parity/case-index-receipt-conservation.spec.mjs'], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, env });
  assert.match(output, /^# tests 4$/m); assert.match(output, /^# pass 4$/m); assert.match(output, /^# fail 0$/m);
  return { command: 'node --test --test-concurrency=1 tests/material-parity/case-index-receipt-conservation.spec.mjs',
    outputSha256: hash(output), tests: 4, failures: 0 };
}

export function applyCaseIndexReceiptRefresh({ collect = collectCaseIndexReceiptRefresh, verify = verifyMembership, write = writeFileSync } = {}) {
  const before = collect(), verification = verify(), after = collect();
  assert.deepEqual(after, before, 'receipt dependencies changed while original membership assertions ran');
  for (const report of after.reports) write(report.file, report.content);
  return { ...after, membershipAssertionsReplayed: true, verification };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.equal(args.length, 1); assert.ok(['--plan', '--write', '--check'].includes(args[0]));
  const result = args[0] === '--write' ? applyCaseIndexReceiptRefresh() : collectCaseIndexReceiptRefresh();
  if (args[0] === '--check') for (const report of result.reports)
    assert.deepEqual(JSON.parse(readFileSync(report.file)), JSON.parse(report.content), `${report.file}: receipt remains stale`);
  const { reports, ...summary } = result; console.log(JSON.stringify({ mode: args[0], ...summary }));
}
