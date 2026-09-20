import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

const revision = '84861a6';
const hash = value => createHash('sha256').update(value).digest('hex');
const auditModule = 'tests/material-parity/input-equivalence-audit.mjs';
const files = [
  'docs/material-owner-gap-input-survey.json',
  'docs/material-owner-gap-canonical-join.json',
  'docs/material-explicit-gap-composition.json',
  'docs/material-explicit-gap-canonical-binding.json',
  'docs/material-owner-gap-motion-review.json',
  'docs/material-gap-scalar-rule-loss.json',
  'docs/material-gap-review-membership.json',
];
const scripts = [
  'scripts/audit-material-owner-gap-inputs.mjs',
  'scripts/audit-material-owner-gap-canonical-join.mjs',
  'scripts/audit-material-explicit-gap-composition.mjs',
  'scripts/bind-material-explicit-gap-composition.mjs',
  'scripts/audit-material-gap-motion-requests.mjs',
  'scripts/audit-material-gap-scalar-rule-loss.mjs',
  'scripts/bind-material-gap-review-membership.mjs',
];
const git = file => execFileSync('git', ['show', `${revision}:${file}`], { maxBuffer: 16 * 1024 * 1024 });
// This conservation claim belongs to the completed integration, not to every
// future revision of the audit. Current replay is verified separately below.
const integrationRevision = '4650791a7208b841dd29f1ced015f98234949623';
const read = file => execFileSync('git', ['show', `${integrationRevision}:${file}`], { maxBuffer: 16 * 1024 * 1024 });
const sourceHash = bytes => hash(bytes.toString('utf8').replaceAll('\r\n', '\n'));
const original = files.map(file => JSON.parse(git(file)));
const current = () => files.map(file => JSON.parse(read(file)));

// Exactly eleven dependency receipts may advance. None of the finding bodies,
// memberships, proof hashes, normalizers or original capture descriptors may.
function conserve(reports, readSource = read) {
  const projected = structuredClone(reports), changes = [];
  const receipt = (index, record, prior, source = false) => {
    assert.equal(record.file, prior.file);
    const actual = source ? sourceHash(readSource(record.file)) : hash(readSource(record.file));
    assert.equal(record.sha256, actual, 'receipt must authenticate actual current dependency');
    assert.notEqual(record.sha256, prior.sha256, 'expected integration receipt did not advance');
    changes.push({ report: files[index], dependency: record.file, before: prior.sha256, after: record.sha256 });
    record.sha256 = prior.sha256;
  };
  const source = projected[0].sourceFingerprints.filter(s => s.file === auditModule);
  assert.equal(source.length, 1);
  receipt(0, source[0], original[0].sourceFingerprints.find(s => s.file === auditModule), true);
  receipt(1, projected[1].survey, original[1].survey);
  receipt(2, projected[2].survey, original[2].survey);
  receipt(2, projected[2].join, original[2].join);
  receipt(3, projected[3].composition, original[3].composition);
  receipt(3, projected[3].join, original[3].join);
  receipt(4, projected[4].parent, original[4].parent);
  receipt(5, projected[5].parent, original[5].parent);
  assert.equal(projected[6].sources.length, 3);
  projected[6].sources.forEach((s, i) => receipt(6, s, original[6].sources[i]));
  // Mutation rejection requires exact equality, not formatting the entire
  // captured population into an assertion-error diff.
  assert.ok(isDeepStrictEqual(projected, original), 'gap evidence changed beyond the eleven dependency receipts');
  assert.equal(changes.length, 11);
  for (const source of reports[0].sourceFingerprints.filter(s => s.file !== auditModule))
    assert.equal(sourceHash(readSource(source.file)), source.sha256, 'gap implementation dependency changed');
  return changes;
}

test('historical reviewed-input integration conserved all seven gap reports except eleven authenticated receipts', () => {
  for (const file of scripts) assert.equal(sourceHash(read(file)), sourceHash(git(file)), 'original gap generator changed');
  const changes = conserve(current());
  console.log(JSON.stringify({ baselineRevision: revision, reports: files.length,
    receiptChanges: changes, allOtherFieldsConserved: true, rendererChanged: false,
    canonicalClassificationVerified: false, renderingEquivalent: false }));
});

test('gap receipt conservation rejects changed observations, conclusions, dependency identities and forged digests', () => {
  const mutations = [
    r => { r[0].groups[0].originalCases.reverse(); },
    r => { r[0].groups[0].proofSha256 = '0'.repeat(64); },
    r => { r[0].productionNormalization.sha256 = '0'.repeat(64); },
    r => { r[0].capture.sha256 = '0'.repeat(64); },
    r => { r[1].rows[0].observations.pop(); },
    r => { r[2].owners[0].witness.finding = 'different'; },
    r => { r[3].rows[0].classification = 'equivalent'; },
    r => { r[4].remainingReviewGroups = 0; },
    r => { r[5].inputEquivalent = true; },
    r => { r[6].rows[0].reviewDisposition = 'different'; },
    r => { r[6].sources.pop(); },
    r => { r[6].sources.reverse(); },
    r => { r[1].survey.sha256 = '0'.repeat(64); },
    r => { r[1].survey.file = files[1]; },
    r => { r[0].sourceFingerprints.find(s => s.file === auditModule).sha256 = '0'.repeat(64); },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const reports = current(); mutate(reports);
    assert.throws(() => conserve(reports), `receipt mutation ${index}`);
  }
  assert.throws(() => conserve(current(), file => file === scripts[0] ? Buffer.from('changed generator') : read(file)));
  assert.equal(mutations.length + 1, 16);
});

test('all seven gap generators independently replay current receipts with writes prohibited', () => {
  const watched = [...files, 'docs/material-input-equivalence-audit.json',
    'docs/material-input-equivalence-audit.json.gz', 'docs/material-input-equivalence-audit.md'];
  const before = watched.map(file => hash(readFileSync(file)));
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  // NODE_OPTIONS propagates the write guard into the membership script's own
  // motion/scalar replay children, not merely its top-level process.
  const option = '--import=data:text/javascript;base64,' + Buffer.from(guard).toString('base64');
  for (const script of scripts) {
    const output = execFileSync(process.execPath, [script, '--check'], {
      encoding: 'utf8', maxBuffer: 2 * 1024 * 1024,
      env: { ...process.env, NODE_OPTIONS: [process.env.NODE_OPTIONS, option].filter(Boolean).join(' ') },
    });
    console.log(JSON.stringify({ script, result: JSON.parse(output.trim()) }));
  }
  assert.deepEqual(watched.map(file => hash(readFileSync(file))), before);
});
