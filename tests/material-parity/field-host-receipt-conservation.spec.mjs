import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

const revision = '80bf8879713ff53fdfdf97b187cabd2242e69d1b';
const main = 'tests/material-parity/input-equivalence-audit.mjs';
const typography = 'docs/material-field-host-typography-audit.json';
const files = ['docs/material-field-host-layout-inputs.json',
  'docs/material-field-host-layout-canonical-join.json',
  'docs/material-field-host-initial-style-audit.json',
  'docs/material-field-host-weight-tracking-audit.json'];
const hash = b => createHash('sha256').update(b).digest('hex');
const sourceHash = b => hash(b.toString('utf8').replaceAll('\r\n', '\n'));
const historical = f => execFileSync('git', ['show', `${revision}:${f}`], { maxBuffer: 16 * 1024 * 1024 });
const original = files.map(f => JSON.parse(historical(f)));
const current = () => files.map(f => JSON.parse(readFileSync(f)));

function conserve(reports, read = readFileSync) {
  const projected = structuredClone(reports), changes = [];
  const advance = (record, old, source) => {
    assert.equal(record.file, old.file);
    assert.equal(record.sha256, (source ? sourceHash : hash)(read(record.file)),
      'receipt must identify the actual dependency');
    assert.notEqual(record.sha256, old.sha256);
    changes.push({ file: record.file, before: old.sha256, after: record.sha256 });
    record.sha256 = old.sha256;
  };
  for (const [index, allowed] of [[0, [typography, main]], [2, [typography, main]], [3, [main]]]) {
    for (const file of allowed) {
      const matches = projected[index].sourceFingerprints.filter(s => s.file === file);
      assert.equal(matches.length, 1);
      advance(matches[0], original[index].sourceFingerprints.find(s => s.file === file), true);
    }
  }
  advance(projected[1].survey, original[1].survey, false);
  assert.equal(changes.length, 6);
  // Keep strict deep equality without constructing a multi-megabyte diff for
  // every intentional mutation in the rejection tests.
  assert.ok(isDeepStrictEqual(projected, original), 'field-host evidence changed beyond the six receipts');
  for (const report of reports) for (const source of report.sourceFingerprints)
    assert.equal(sourceHash(read(source.file)), source.sha256, 'another producer dependency changed');
  return changes;
}

test('field-host refresh preserves every historical evidence field except six authenticated dependency receipts', () => {
  for (const file of ['scripts/audit-material-field-host-layout-inputs.mjs',
    'scripts/audit-material-field-host-layout-join.mjs', 'scripts/audit-material-field-host-initial-styles.mjs',
    'tests/material-parity/field-host-weight-tracking-evidence.spec.mjs'])
    assert.equal(sourceHash(readFileSync(file)), sourceHash(historical(file)), 'original producer/proof changed');
  console.log(JSON.stringify({ revision, reports: files.length, receiptChanges: conserve(current()),
    allOtherFieldsConserved: true, inputEquivalent: false, renderingEquivalent: false }));
});

test('field-host conservation rejects changed observations, historical joins, conclusions and forged receipts', () => {
  const mutations = [
    r => { r[0].caseCount--; },
    r => { r[0].proofSha256 = '0'.repeat(64); },
    r => { r[0].capture.sha256 = '0'.repeat(64); },
    r => { r[1].rows.reverse(); },
    r => { r[1].canonical.revision = 'different'; },
    r => { r[1].survey.sha256 = '0'.repeat(64); },
    r => { r[1].survey.file = files[1]; },
    r => { r[2].groups.reverse(); },
    r => { r[2].computedCandidateVerified = true; },
    r => { r[3].groups.reverse(); },
    r => { r[3].classification = 'equivalent'; },
    r => { r[0].sourceFingerprints.pop(); },
    r => { r[3].sourceFingerprints[0].sha256 = '0'.repeat(64); },
    r => { r[3].unexpected = true; },
  ];
  for (const [i, mutate] of mutations.entries()) {
    const reports = current(); mutate(reports);
    assert.throws(() => conserve(reports), `field-host mutation ${i}`);
  }
  assert.throws(() => conserve(current(), file => file === main ? Buffer.from('forged source') : readFileSync(file)));
  assert.equal(mutations.length + 1, 15);
});
