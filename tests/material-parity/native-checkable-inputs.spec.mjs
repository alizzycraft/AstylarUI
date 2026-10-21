import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { sourceAuditDefinitions as passiveMainRegisteredDefinitions } from './input-equivalence-policy.mjs';
import { passiveMainPredecessor } from './passive-main-registration.mjs';
const sourceAuditDefinitions = passiveMainPredecessor(passiveMainRegisteredDefinitions);
import { nativeCheckablePredecessor, restoreNativeCheckablePolicy, restoreNativeCheckableSuite, restoreNativeCheckableProducer } from './native-checkable-registration.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
test('native checkable registration preserves all prior findings and distinct core authoring causes', () => {
  const digest = '8806b3eca09284e7de6c14671b40897ae441fdb1f3c2e285a1210bccebe87774';
  const proposal = JSON.parse(readFileSync(`artifacts/material-parity/working-audit/proposals/${digest}.json`));
  assert.equal(hash(JSON.stringify(proposal.review)), digest);
  assert.deepEqual(sourceAuditDefinitions, proposal.review.groups);
  assert.equal(sourceAuditDefinitions.length, 173);
  assert.equal(nativeCheckablePredecessor(sourceAuditDefinitions).length, 171);
  assert.deepEqual(sourceAuditDefinitions.slice(-2).map(r => r.classification),
    ['confirmed-core-renderer-defect', 'application-plugin-authoring-defect']);
  for (const finding of sourceAuditDefinitions.slice(-2)) {
    assert.equal([...readFileSync(finding.file, 'utf8').matchAll(new RegExp(finding.pattern, 'g'))].length, 1);
    for (const r of finding.evidence) assert.equal(hash(readFileSync(r.file)), r.sha256, r.file);
  }
  const text = readFileSync('tests/material-parity/input-equivalence-policy.mjs', 'utf8');
  assert.equal(hash(restoreNativeCheckablePolicy(text)), '9734869f4dcc4777c4c18bacb5fed030c7cf01fd3c85757200624ecb72974ae3');
  for (const changed of [text + '\n// drift', text.replace('core-native-checkable-form-value-synthesizes-visible-label', 'forged-id')])
    assert.throws(() => restoreNativeCheckablePolicy(changed));
  const changed = structuredClone(sourceAuditDefinitions); changed[0].classification = 'equivalent-representation';
  assert.throws(() => nativeCheckablePredecessor(changed));
  const producer = readFileSync('tests/material-parity/input-equivalence-audit.mjs', 'utf8');
  assert.equal(hash(restoreNativeCheckableProducer(producer)), 'cca481561332a3ae872d49318014f5c4faa0e37cf6f03503e4a7c85024e5c284');
  assert.throws(() => restoreNativeCheckableProducer(producer + '\n// drift'));
  assert.throws(() => restoreNativeCheckableProducer(producer.replace('radio ring state paint requests before rendering', 'forged proof')));
  for (const file of ['semantic-text-transform-input.spec.mjs', 'legacy-clip-support-input.spec.mjs']) {
    const current = readFileSync(`tests/material-parity/${file}`, 'utf8');
    assert.ok(!restoreNativeCheckableSuite(current).includes('nativeRegisteredSourceAuditDefinitions'));
    assert.throws(() => restoreNativeCheckableSuite(current + '\n// drift'));
  }
});
test('public native checkable form values retain repeatable pixel failures and owning method binding', () => {
  const output = execFileSync(process.execPath, ['scripts/check-public-native-checkable-value.mjs'], { encoding: 'utf8' });
  assert.match(output, /three complete owning-method bindings pass/);
  assert.match(output, /four semantic drift controls reject/);
});
test('radio ring state paint inputs replay complete retained population', () => {
  const output = execFileSync(process.execPath, ['scripts/check-radio-ring-inputs.mjs'], { maxBuffer: 2_000_000 });
  assert.deepEqual(output, readFileSync('artifacts/material-parity/radio-ring-inputs-20261021.log'));
  const report = JSON.parse(output);
  assert.equal(report.rows.length, 136);
  assert.equal(report.counts.colorDifferences, 60); assert.equal(report.counts.opacityDifferences, 16);
});
