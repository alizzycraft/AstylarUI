import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { sourceAuditDefinitions } from './input-equivalence-policy.mjs';
import { stepperSemanticPredecessor, restoreStepperSemanticPolicy, restoreStepperSemanticProducer, restoreStepperCaseSelection, restoreStepperRunnerSelection, restoreStepperLauncherSelection } from './stepper-semantic-registration.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const normalize = bytes => bytes.toString().replaceAll('\r\n', '\n');
const previous = file => normalize(execFileSync('git', ['show', `e38618a0:${file}`], { maxBuffer: 4000000 }));

test('stepper semantic registration preserves178 findings and complete predecessor sources', () => {
  const id = '5d5c15f9532ea5446bad81e49280432e9393cf83db986f21cc5aac048d24ddd9';
  const proposal = JSON.parse(readFileSync(`artifacts/material-parity/working-audit/proposals/${id}.json`));
  assert.equal(hash(JSON.stringify(proposal.review)), id);
  assert.deepEqual(sourceAuditDefinitions, proposal.review.groups);
  assert.equal(sourceAuditDefinitions.length, 179);
  assert.deepEqual(stepperSemanticPredecessor(sourceAuditDefinitions), proposal.review.groups.slice(0, -1));
  const finding = sourceAuditDefinitions.at(-1);
  assert.equal(finding.id, 'fixture-stepper-tab-panel-relationships-omitted');
  assert.equal(finding.classification, 'application-plugin-authoring-defect');
  for (const receipt of finding.evidence) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256, receipt.file);
  const file = 'tests/material-parity/input-equivalence-policy.mjs', policy = normalize(readFileSync(file));
  assert.equal(restoreStepperSemanticPolicy(policy), previous(file));
  for (const altered of [policy + '\n// drift', policy.replace(finding.id, 'forged-id')])
    assert.throws(() => restoreStepperSemanticPolicy(altered));
  for (const index of [0, 177, 178]) {
    const altered = structuredClone(sourceAuditDefinitions); altered[index].classification = 'equivalent-representation';
    assert.throws(() => stepperSemanticPredecessor(altered));
  }
  assert.throws(() => stepperSemanticPredecessor([...sourceAuditDefinitions, finding]));
  const helperFile = 'tests/material-parity/expansion-semantic-registration.mjs';
  let helper = normalize(readFileSync(helperFile));
  for (const [addition, before] of [
    ["import { stepperSemanticPredecessor, restoreStepperSemanticPolicy, restoreStepperSemanticProducer, restoreStepperCaseSelection, restoreStepperRunnerSelection, restoreStepperLauncherSelection } from './stepper-semantic-registration.mjs';\n", ''],
    ['  current = stepperSemanticPredecessor(current);\n', ''],
    ['  const text = restoreStepperSemanticPolicy(source);', "  const text = source.toString().replaceAll('\\r\\n', '\\n');"],
    ['  const text = restoreStepperSemanticProducer(source);', "  const text = source.toString().replaceAll('\\r\\n', '\\n');"],
    ['  let text = restoreStepperCaseSelection(source);', "  let text = source.toString().replaceAll('\\r\\n', '\\n');"],
    ['  let text = restoreStepperRunnerSelection(source);', "  let text = source.toString().replaceAll('\\r\\n', '\\n');"],
    ['  let text = restoreStepperLauncherSelection(source);', "  let text = source.toString().replaceAll('\\r\\n', '\\n');"],
  ]) { assert.equal(helper.split(addition).length, 2); helper = helper.replace(addition, before); }
  assert.equal(helper, previous(helperFile));
  const suiteFile = 'tests/material-parity/expansion-semantic-inputs.spec.mjs';
  const prelude = "import { sourceAuditDefinitions as stepperSemanticRegisteredDefinitions } from './input-equivalence-policy.mjs';\n"
    + "import { stepperSemanticPredecessor } from './stepper-semantic-registration.mjs';\n"
    + 'const sourceAuditDefinitions = stepperSemanticPredecessor(stepperSemanticRegisteredDefinitions);';
  const suite = normalize(readFileSync(suiteFile)); assert.equal(suite.split(prelude).length, 2);
  assert.equal(suite.replace(prelude, "import { sourceAuditDefinitions } from './input-equivalence-policy.mjs';"), previous(suiteFile));
  const producerFile = 'tests/material-parity/input-equivalence-audit.mjs', producer = normalize(readFileSync(producerFile));
  assert.equal(restoreStepperSemanticProducer(producer), previous(producerFile));
  for (const altered of [producer + '\n// drift', producer.replace('stepper semantic additive registration preserves accepted findings', 'forged-proof')])
    assert.throws(() => restoreStepperSemanticProducer(altered));
  for (const [file, restore] of [
    ['tests/material-parity/text-backing-case-review-source.mjs', restoreStepperCaseSelection],
    ['scripts/run-material-input-audit.mjs', restoreStepperRunnerSelection],
    ['scripts/export-material-input-audit-current-ancestry.mjs', restoreStepperLauncherSelection],
  ]) {
    const source = readFileSync(file, 'utf8');
    assert.equal(restore(source), previous(file));
    assert.throws(() => restore(source + '\n// drift'));
  }
  const launcher = 'scripts/export-material-input-audit-current-ancestry.mjs';
  const before = JSON.parse(execFileSync(process.execPath, [launcher, '--expansion-semantics', '--dry-run']));
  const after = JSON.parse(execFileSync(process.execPath, [launcher, '--stepper-inputs', '--dry-run']));
  const oldId = '5caa57e5f2254471d9d082ff0831db36704f73997b41ae48aa4b4064b45c4c99';
  const newId = 'ff305b14217b7123b98a2e00f3ecb9ad443cd89606eaf688ea11f6118b7fb069';
  assert.equal(after.args.filter(arg => arg.includes(newId)).length, 2);
  assert.deepEqual({ ...after, args: after.args.map(arg => arg.replace(newId, oldId)) }, before);
  for (const other of ['--card-inputs', '--static-ax', '--expansion-semantics'])
    assert.throws(() => execFileSync(process.execPath, [launcher, '--stepper-inputs', other, '--dry-run'], { stdio: 'pipe' }));
});

test('stepper semantic actual AX and initial authoring history retain distinct public support limits', () => {
  assert.deepEqual(execFileSync(process.execPath, ['scripts/check-stepper-static-ax.mjs'], { maxBuffer: 4000000 }),
    readFileSync('artifacts/material-parity/stepper-static-ax-review-20261022.log'));
  for (const row of sourceAuditDefinitions.at(-1).history) {
    const bytes = execFileSync('git', ['show', `${row.revision}:${row.file}`], { maxBuffer: 4000000 });
    assert.equal(hash(bytes), row.sha256); assert.ok(bytes.toString().includes(row.excerpt));
  }
  assert.ok(sourceAuditDefinitions.some(row => row.id === 'core-public-semantic-subset-omits-accessibility-only-hiding'));
  assert.ok(sourceAuditDefinitions.some(row => row.id === 'fixture-stepper-inactive-panel-omitted'));
  const types = readFileSync('src/app/types/dom-element.ts', 'utf8');
  for (const name of ['ariaControls', 'ariaLabelledby']) assert.ok(types.includes(`${name}?: string;`));
  assert.ok(!/\bariaHidden\??\s*:/.test(types));
});

test('stepper and expansion recorded node accounting replays complete retained populations', () => {
  for (const family of ['stepper', 'expansion'])
    assert.deepEqual(execFileSync(process.execPath, [`scripts/check-${family}-recorded-nodes.mjs`], { maxBuffer: 4000000 }),
      readFileSync(`artifacts/material-parity/${family}-recorded-node-accounting-20261022.log`));
});
