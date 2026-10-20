import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { sourceAuditDefinitions as currentSourceAuditDefinitions } from './input-equivalence-policy.mjs';
import { restoreLegacyClipPolicy, restoreLegacyClipProducer, restoreTextBackingPolicy, restoreTextBackingProducer } from './semantic-text-transform-registration.mjs';

const sourceAuditDefinitions=currentSourceAuditDefinitions.slice(2,166);
assert.equal(sourceAuditDefinitions.length,164);
assert.equal(currentSourceAuditDefinitions[1].id,'core-text-backing-ceil-rescales-logical-line-height');
restoreTextBackingPolicy(readFileSync('tests/material-parity/input-equivalence-policy.mjs'));

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
test('text backing registration preserves complete clip predecessor and bounded public evidence', () => {
  assert.equal(currentSourceAuditDefinitions.length,170);
  const finding=currentSourceAuditDefinitions[1];
  assert.equal(finding.classification,'confirmed-core-renderer-defect');
  assert.equal([...readFileSync(finding.file,'utf8').matchAll(new RegExp(finding.pattern,'g'))].length,1);
  for(const receipt of finding.evidence)assert.equal(hash(readFileSync(receipt.file)),receipt.sha256);
  for(const [file,restore]of [['tests/material-parity/input-equivalence-policy.mjs',restoreTextBackingPolicy],
    ['tests/material-parity/input-equivalence-audit.mjs',restoreTextBackingProducer]]){
    const current=readFileSync(file,'utf8');
    const prior=execFileSync('git',['show',`98b60259:${file}`],{encoding:'utf8',maxBuffer:4_000_000}).replaceAll('\r\n','\n');
    assert.equal(restore(current),prior);
    assert.throws(()=>restore(current+'\n// unrelated source drift'));
    assert.throws(()=>restore(current.replace(file.includes('policy')?finding.id:
      'equal-input explicit line-height backing allocation and logical mapping','unreviewed replacement')));
  }
  assert.equal(finding.publicReproduction.pairs,2);
  assert.equal(finding.publicReproduction.backingMismatchCases,1);
  assert.equal(finding.publicReproduction.currentRenderingAccepted,false);
});
const id = '161aac37ac51e824208d69f1e6893573ac2f72b0142877d5b2940ee7c40272c5';
const file = `artifacts/material-parity/working-audit/proposals/${id}.json`;
function validate(review) {
  assert.equal(review.kind, 'material-source-finding-review');
  assert.equal(review.status, 'reviewed-not-integrated');
  assert.equal(review.groups.length, 164);
  assert.equal(sourceAuditDefinitions.length, 164);
  assert.deepEqual(review.groups.slice(0, -1), sourceAuditDefinitions.slice(1));
  const finding = review.groups.at(-1);
  assert.deepEqual(finding, sourceAuditDefinitions[0]);
  assert.equal(finding.id, 'core-legacy-css-clip-not-translated');
  assert.equal(finding.classification, 'documented-limitation');
  assert.equal([...readFileSync(finding.file, 'utf8').matchAll(new RegExp(finding.pattern, 'g'))].length, 1);
  for (const receipt of [...review.evidenceSources, ...finding.evidence]) {
    const bytes = readFileSync(receipt.file);
    const authenticated = receipt.file === 'tests/material-parity/input-equivalence-policy.mjs'
      ? Buffer.from(restoreLegacyClipPolicy(bytes)) : bytes;
    assert.equal(hash(authenticated), receipt.sha256);
  }
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

test('registered clip finding conserves its queued predecessor and rejects altered claims', () => {
  const review = JSON.parse(readFileSync(file)).review;
  validate(review);
  for (const mutate of [
    value => value.groups[0].justification += ' altered',
    value => value.groups.at(-1).classification = 'intentional-documented-limitation',
    value => value.groups.at(-1).evidence[0].sha256 = '0'.repeat(64),
  ]) {
    const forged = structuredClone(review); mutate(forged); assert.throws(() => validate(forged));
  }
  assert.equal(sourceAuditDefinitions.filter(row => row.id === 'core-legacy-css-clip-not-translated').length, 1);
});

test('legacy clip registration preserves complete predecessor source and proof inventory', () => {
  for (const [file, restore] of [
    ['tests/material-parity/input-equivalence-policy.mjs', restoreLegacyClipPolicy],
    ['tests/material-parity/input-equivalence-audit.mjs', restoreLegacyClipProducer],
  ]) {
    const current = readFileSync(file, 'utf8');
    const previous = execFileSync('git', ['show', `5f57f113:${file}`],
      { encoding: 'utf8', maxBuffer: 4_000_000 }).replaceAll('\r\n', '\n');
    assert.equal(restore(current), previous);
    assert.throws(() => restore(current + '\n// unreviewed source drift'));
    const changed = current.replace('legacy clip', 'changed legacy clipping');
    assert.notEqual(changed, current); assert.throws(() => restore(changed));
  }
});
