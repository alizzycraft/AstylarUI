import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectCaseIndexConservation, verifyInputTreeHeadingExtension, policyProjection } from '../../scripts/audit-material-case-index-conservation.mjs';
import { caseIndexReceiptFiles, caseIndexAuditModule } from '../../scripts/refresh-material-case-index-receipts.mjs';

test('policy additions conserve the complete historical policy without promoting new classifications', () => {
  const current = readFileSync('tests/material-parity/input-equivalence-policy.mjs', 'utf8');
  const expected = '7e939aece26dd69b846b78fc6d21aa332463b53068f488cf19343578306d80d8';
  const proof = policyProjection(current, expected);
  assert.equal(proof.retainedSourceUnchanged, true);
  assert.deepEqual(proof.addedClassifications, ['documented-limitation']);
  assert.deepEqual(proof.addedSourceFindings, ['core-rounded-radius-sampling-uses-unclamped-request',
    'fixture-dialog-sampled-panel-and-action-geometry', 'fixture-icon-svg-replaced-by-fixed-raster']);
  for (const changed of [current + '\n// unrelated',
    current.replace("  'documented-limitation',", ''),
    current.replace("  'equivalent-representation',", ''),
    current.replace('fixture-icon-svg-replaced-by-fixed-raster', 'unreviewed-icon-finding'),
    current.replace('intentional-documented-limitation', 'equivalent-representation'),
  ]) {
    assert.notEqual(changed, current);
    assert.throws(() => policyProjection(changed, expected), /unreviewed policy transition/);
  }
  assert.throws(() => policyProjection(current, '0'.repeat(64)));
});

test('heading overflow coverage conserves the complete original input-tree suite', () => {
  const current = readFileSync('tests/material-parity/input-tree-evidence.spec.mjs', 'utf8');
  const expected = 'c2d0884f99fc4e1f41ac65d22b95643c8785f4fb7a339a47746bf31fe91344b3';
  const proof = verifyInputTreeHeadingExtension(current, expected);
  assert.equal(proof.retainedSourceUnchanged, true);
  assert.deepEqual(proof.addedHeadingCases, ['omitted', 'visible', 'hidden', 'ancestor-clipped']);
  for (const changed of [current + '\n// unrelated',
    current.replace("type = 'div'", "type = 'h2'"),
    current.replace('assert.deepEqual(observations.visible, observations.omitted);', ''),
    current.replace('headingHidden: observe', 'unreviewedHidden: observe'),
    current.replace("margin: '0'", "margin: '1px'"),
    current + "\nconst observe = (overflow, parentClips = false, type = 'div') => {\n}",
  ]) {
    assert.notEqual(changed, current);
    assert.throws(() => verifyInputTreeHeadingExtension(changed, expected));
  }
  assert.throws(() => verifyInputTreeHeadingExtension(current, '0'.repeat(64)));
});

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
  assert.deepEqual(collected.report.dependencyProjections.map(p => p.addedSourceFindings), [[
    'core-rounded-radius-sampling-uses-unclamped-request', 'fixture-dialog-sampled-panel-and-action-geometry',
  ]]);
  assert.equal(collected.report.dependencyProjections[0].retainedSourceUnchanged, true);
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
  // Establish the unchanged baseline before mutations; an already-broken
  // collector must not make every rejection control pass vacuously.
  assert.equal(collectCaseIndexConservation().report.reports.length, 9);
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
  const policyFile = 'tests/material-parity/input-equivalence-policy.mjs';
  const policy = readFileSync(policyFile, 'utf8');
  for (const changed of [policy + '\nexport const unrelated = true;\n',
    policy.replace('core-rounded-radius-sampling-uses-unclamped-request', 'unreviewed-source-finding'),
    policy.replace('export const sourceAuditDefinitions', 'export const replacedDefinitions')]) {
    assert.notEqual(changed, policy);
    assert.throws(() => collectCaseIndexConservation({ read: name => name === policyFile
      ? Buffer.from(changed) : readFileSync(name) }), /unreviewed policy transition/);
  }
  const source = readFileSync(caseIndexAuditModule, 'utf8');
  assert.ok(source.includes('function reviewedTemplateTextMappings('));
  assert.throws(() => collectCaseIndexConservation({ read: name => name === caseIndexAuditModule
    ? Buffer.from(source.replace('function reviewedTemplateTextMappings(', 'function renamedTemplateTextMappings('))
    : readFileSync(name) }), /producer changed beyond reviewed stacking integration/);
});
