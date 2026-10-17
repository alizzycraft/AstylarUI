import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { sourceAuditDefinitions } from './input-equivalence-policy.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const id = '161aac37ac51e824208d69f1e6893573ac2f72b0142877d5b2940ee7c40272c5';
const file = `artifacts/material-parity/working-audit/proposals/${id}.json`;
function validate(review) {
  assert.equal(review.kind, 'material-source-finding-review');
  assert.equal(review.status, 'reviewed-not-integrated');
  assert.equal(review.groups.length, 164);
  assert.equal(sourceAuditDefinitions.length, 163);
  assert.deepEqual(review.groups.slice(0, -1), sourceAuditDefinitions);
  const finding = review.groups.at(-1);
  assert.equal(finding.id, 'core-legacy-css-clip-not-translated');
  assert.equal(finding.classification, 'documented-limitation');
  assert.equal([...readFileSync(finding.file, 'utf8').matchAll(new RegExp(finding.pattern, 'g'))].length, 1);
  for (const receipt of [...review.evidenceSources, ...finding.evidence])
    assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  return finding;
}

test('public legacy clip support limitation preserves controls and exact diagnostics', () => {
  const envelope = JSON.parse(readFileSync(file));
  assert.equal(hash(JSON.stringify(envelope.review)), id);
  const finding = validate(envelope.review);
  const result = JSON.parse(execFileSync(process.execPath,
    ['scripts/audit-public-legacy-clip.mjs', '--verify', 'artifacts/material-parity/public-legacy-clip-valid-input-20261018'], { encoding: 'utf8' }));
  assert.deepEqual(result, { pairs: 4, unclippedPaintControls: 2, legacyClipSupportFailures: 2,
    currentRenderingAccepted: false, negativeControlsRejected: 4 });
  assert.equal(finding.publicReproduction.pairs, result.pairs);
  const owner = JSON.parse(readFileSync('artifacts/material-parity/public-legacy-clip-current-owner-trim-20261018.log'));
  assert.equal(owner.currentInstalledOwnerAgreement, true);
  assert.equal(owner.completeResolverMethods, 12); assert.equal(owner.topLevelOwners, 5);
  assert.equal(owner.checks.length, 17);
  for (const receipt of [...owner.files, owner.report]) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  const report = JSON.parse(readFileSync(owner.report.file));
  for (const row of report.results) {
    const warnings = row.astylar.diagnostics.filter(d => d.code === 'document-css-declaration-unsupported' && d.property === 'clip');
    assert.equal(warnings.length, row.clipped ? 1 : 0);
  }
});

test('queued clip finding conserves every production definition and rejects altered claims', () => {
  const review = JSON.parse(readFileSync(file)).review;
  validate(review);
  for (const mutate of [
    value => value.groups[0].justification += ' altered',
    value => value.groups.at(-1).classification = 'intentional-documented-limitation',
    value => value.groups.at(-1).evidence[0].sha256 = '0'.repeat(64),
  ]) {
    const forged = structuredClone(review); mutate(forged); assert.throws(() => validate(forged));
  }
  assert.equal(sourceAuditDefinitions.some(row => row.id === 'core-legacy-css-clip-not-translated'), false);
});
