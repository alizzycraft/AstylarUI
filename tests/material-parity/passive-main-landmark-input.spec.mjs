import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { sourceAuditDefinitions } from './input-equivalence-policy.mjs';
import { passiveMainPredecessor, restorePassiveMainPolicy, restorePassiveMainProducer,
  restorePassiveMainCaseSelection, restorePassiveMainRunnerSelection, restorePassiveMainLauncherSelection } from './passive-main-registration.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');

test('passive landmark registration preserves accepted findings and exact source boundaries', () => {
  const digest = 'e89ad4a82100f3671f8d15210f19819eac4914a3e37fde47b200d734687fe104';
  const proposal = JSON.parse(readFileSync(`artifacts/material-parity/working-audit/proposals/${digest}.json`));
  assert.equal(hash(JSON.stringify(proposal.review)), digest);
  assert.deepEqual(sourceAuditDefinitions, proposal.review.groups);
  assert.equal(sourceAuditDefinitions.length, 175);
  assert.equal(passiveMainPredecessor(sourceAuditDefinitions).length, 173);
  assert.deepEqual(sourceAuditDefinitions.slice(-2).map(r => r.classification),
    ['application-plugin-authoring-defect', 'application-plugin-authoring-defect']);
  assert.deepEqual(sourceAuditDefinitions.slice(-2).map(r => r.observation.pairedStaticCases), [48, 12]);
  for (const finding of sourceAuditDefinitions.slice(-2)) {
    assert.equal(readFileSync(finding.file, 'utf8').split(finding.pattern).length, 2);
    for (const receipt of finding.evidence) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256, receipt.file);
  }
  const policy = readFileSync('tests/material-parity/input-equivalence-policy.mjs', 'utf8');
  const producer = readFileSync('tests/material-parity/input-equivalence-audit.mjs', 'utf8');
  assert.equal(hash(restorePassiveMainPolicy(policy)), '13b2a2a13a44ab6cd9f40fa5e8ee63156d816c78ca93246b33b8a2c5e6cc94ee');
  assert.equal(hash(restorePassiveMainProducer(producer)), '74c966fc3c3a178b0b64436026fa658e052bdaf021f2951c15558ceba0fbba9b');
  for (const input of [policy + '\n// drift', policy.replace('fixture-sidenav-content-promoted-to-main-landmark', 'forged-id')])
    assert.throws(() => restorePassiveMainPolicy(input));
  for (const input of [producer + '\n// drift', producer.replace('passive static actual AX and landmark history evidence', 'forged-proof')])
    assert.throws(() => restorePassiveMainProducer(input));
  const altered = structuredClone(sourceAuditDefinitions); altered[0].classification = 'equivalent-representation';
  assert.throws(() => passiveMainPredecessor(altered));
  const priorSuite = execFileSync('git', ['show', '06441205:tests/material-parity/native-checkable-inputs.spec.mjs'], { encoding: 'utf8' });
  const currentSuite = readFileSync('tests/material-parity/native-checkable-inputs.spec.mjs', 'utf8');
  const prelude = "import { sourceAuditDefinitions as passiveMainRegisteredDefinitions } from './input-equivalence-policy.mjs';\n"
    + "import { passiveMainPredecessor } from './passive-main-registration.mjs';\n"
    + 'const sourceAuditDefinitions = passiveMainPredecessor(passiveMainRegisteredDefinitions);';
  assert.equal(currentSuite.replaceAll('\r\n', '\n').split(prelude).length, 2);
  assert.equal(currentSuite.replaceAll('\r\n', '\n').replace(prelude,
    "import { sourceAuditDefinitions } from './input-equivalence-policy.mjs';"), priorSuite.replaceAll('\r\n', '\n'));
  const helperFile = 'tests/material-parity/native-checkable-registration.mjs';
  const priorHelper = execFileSync('git', ['show', `06441205:${helperFile}`], { encoding: 'utf8' }).replaceAll('\r\n', '\n');
  let helper = readFileSync(helperFile, 'utf8').replaceAll('\r\n', '\n');
  for (const [current, prior] of [
    ["import { passiveMainPredecessor, restorePassiveMainPolicy, restorePassiveMainProducer } from './passive-main-registration.mjs';\n", ''],
    ['  current = passiveMainPredecessor(current);\n', ''],
    ['  const text = restorePassiveMainPolicy(source);', '  const text = normalized(source);'],
    ['  const text = restorePassiveMainProducer(source);', '  const text = normalized(source);'],
  ]) { assert.equal(helper.split(current).length, 2); helper = helper.replace(current, prior); }
  assert.equal(helper, priorHelper);
  for (const [file, restore] of [
    ['tests/material-parity/text-backing-case-review-source.mjs', restorePassiveMainCaseSelection],
    ['scripts/run-material-input-audit.mjs', restorePassiveMainRunnerSelection],
    ['scripts/export-material-input-audit-current-ancestry.mjs', restorePassiveMainLauncherSelection],
  ]) {
    const source = readFileSync(file, 'utf8');
    const prior = execFileSync('git', ['show', `d0b4d633:${file}`], { encoding: 'utf8' }).replaceAll('\r\n', '\n');
    assert.equal(restore(source), prior);
    assert.throws(() => restore(source + '\n// drift'));
  }
  const launcher = 'scripts/export-material-input-audit-current-ancestry.mjs';
  const old = JSON.parse(execFileSync(process.execPath, [launcher, '--dry-run'], { encoding: 'utf8' }));
  const next = JSON.parse(execFileSync(process.execPath, [launcher, '--static-ax', '--dry-run'], { encoding: 'utf8' }));
  const before = '50315381bf02df83158d2743488dddd5aee827d4695f7047d49802c2637de44a';
  const after = '33b7ccf93a9df72a878ba302c5a0b8867ef01a2b24cb81a47a59e9c7a5b16460';
  assert.equal(next.args.filter(arg => arg.includes(after)).length, 2);
  assert.deepEqual({ ...next, args: next.args.map(arg => arg.replace(after, before)) }, old);
});

test('passive static AX and initial landmark history replay retained observations', () => {
  for (const [script, log] of [
    ['scripts/check-list-static-ax.mjs', 'artifacts/material-parity/list-static-ax-review-20261021.log'],
    ['scripts/check-passive-static-ax.mjs', 'artifacts/material-parity/passive-static-ax-review-20261021.log'],
  ]) assert.deepEqual(execFileSync(process.execPath, [script], { maxBuffer: 4000000 }), readFileSync(log));
  const history = JSON.parse(readFileSync('artifacts/material-parity/sidenav-main-authoring-history-20261021.log'));
  for (const row of history.history) {
    const bytes = execFileSync('git', ['show', `${row.revision}:${row.file}`], { maxBuffer: 4000000 });
    assert.equal(hash(bytes), row.sha256); assert.ok(bytes.toString().includes(row.excerpt));
  }
});
