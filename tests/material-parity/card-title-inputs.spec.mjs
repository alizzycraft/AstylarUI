import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { sourceAuditDefinitions } from './input-equivalence-policy.mjs';
import { cardTitlePredecessor, restoreCardTitlePolicy, restoreCardTitleProducer } from './card-title-registration.mjs';
import { passiveMainPredecessor, restorePassiveMainPolicy } from './passive-main-registration.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const normalize = bytes => bytes.toString().replaceAll('\r\n', '\n');
test('card title registration preserves all175 findings and exact predecessor sources', () => {
  const id = '617d82df0024332dfbfc98002c8d8d4dc1543b7691a26bfcc5e65757106ee902';
  const proposal = JSON.parse(readFileSync(`artifacts/material-parity/working-audit/proposals/${id}.json`));
  assert.equal(hash(JSON.stringify(proposal.review)), id);
  assert.deepEqual(sourceAuditDefinitions, proposal.review.groups);
  assert.equal(sourceAuditDefinitions.length, 176);
  assert.equal(cardTitlePredecessor(sourceAuditDefinitions).length, 175);
  assert.equal(passiveMainPredecessor(sourceAuditDefinitions).length, 173);
  const finding = sourceAuditDefinitions.at(-1);
  assert.equal(finding.id, 'fixture-card-title-promoted-to-heading');
  assert.equal(finding.classification, 'application-plugin-authoring-defect');
  assert.equal(finding.observation.pairedStaticCases, 12);
  for (const receipt of finding.evidence) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  const file = 'tests/material-parity/input-equivalence-policy.mjs', policy = readFileSync(file);
  const prior = execFileSync('git', ['show', `d4cfb0e5:${file}`], { maxBuffer: 4000000 });
  assert.equal(restoreCardTitlePolicy(policy), normalize(prior));
  assert.equal(hash(restorePassiveMainPolicy(policy)), '13b2a2a13a44ab6cd9f40fa5e8ee63156d816c78ca93246b33b8a2c5e6cc94ee');
  const producerFile = 'tests/material-parity/input-equivalence-audit.mjs', producer = readFileSync(producerFile);
  assert.equal(restoreCardTitleProducer(producer), normalize(execFileSync('git', ['show', `d4cfb0e5:${producerFile}`], { maxBuffer: 4000000 })));
  for (const value of [normalize(producer) + '\n// drift', normalize(producer).replace('card title actual AX and complete recorded descendant evidence', 'forged-proof')])
    assert.throws(() => restoreCardTitleProducer(value));
  for (const value of [normalize(policy) + '\n// drift', normalize(policy).replace(finding.id, 'forged-id')])
    assert.throws(() => restoreCardTitlePolicy(value));
  for (const index of [0, 175]) {
    const altered = structuredClone(sourceAuditDefinitions); altered[index].classification = 'equivalent-representation';
    assert.throws(() => cardTitlePredecessor(altered));
  }
  const helperFile = 'tests/material-parity/passive-main-registration.mjs';
  let helper = normalize(readFileSync(helperFile));
  for (const [current, before] of [
    ["import { cardTitlePredecessor, restoreCardTitlePolicy, restoreCardTitleProducer } from './card-title-registration.mjs';\n", ''],
    ['  current = cardTitlePredecessor(current);\n', ''],
    ['  const text = restoreCardTitlePolicy(source);', '  const text = normalized(source);'],
    ['  const text = restoreCardTitleProducer(source);', '  const text = normalized(source);'],
  ]) { assert.equal(helper.split(current).length, 2); helper = helper.replace(current, before); }
  assert.equal(helper, normalize(execFileSync('git', ['show', `d4cfb0e5:${helperFile}`])));
  const suiteFile = 'tests/material-parity/passive-main-landmark-input.spec.mjs';
  const prelude = "import { sourceAuditDefinitions as cardTitleRegisteredDefinitions } from './input-equivalence-policy.mjs';\n"
    + "import { cardTitlePredecessor } from './card-title-registration.mjs';\n"
    + 'const sourceAuditDefinitions = cardTitlePredecessor(cardTitleRegisteredDefinitions);';
  const suite = normalize(readFileSync(suiteFile)); assert.equal(suite.split(prelude).length, 2);
  assert.equal(suite.replace(prelude, "import { sourceAuditDefinitions } from './input-equivalence-policy.mjs';"),
    normalize(execFileSync('git', ['show', `d4cfb0e5:${suiteFile}`])));
});
test('card title actual AX and recorded descendants replay their full retained populations', () => {
  for (const [script, file] of [
    ['scripts/check-card-static-ax.mjs', 'artifacts/material-parity/card-static-ax-review-20261021.log'],
    ['scripts/check-card-recorded-nodes.mjs', 'artifacts/material-parity/card-recorded-node-accounting-20261021.log'],
  ]) assert.deepEqual(execFileSync(process.execPath, [script], { maxBuffer: 4000000 }), readFileSync(file));
  for (const row of sourceAuditDefinitions.at(-1).history) {
    const bytes = execFileSync('git', ['show', `${row.revision}:${row.file}`], { maxBuffer: 4000000 });
    assert.equal(hash(bytes), row.sha256); assert.ok(bytes.toString().includes(row.excerpt));
  }
});
