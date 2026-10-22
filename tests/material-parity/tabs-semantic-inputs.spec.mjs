import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { sourceAuditDefinitions } from './input-equivalence-policy.mjs';
import { tabsSemanticPredecessor, restoreTabsSemanticPolicy, restoreTabsSemanticProducer, restoreTabsCaseSelection, restoreTabsRunnerSelection, restoreTabsLauncherSelection } from './tabs-semantic-registration.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const normalize = value => value.toString().replaceAll('\r\n', '\n');
const previous = file => normalize(execFileSync('git', ['show', `f1fa0fcd:${file}`], { maxBuffer: 4000000 }));

test('tabs semantic registration preserves179 findings and complete predecessor sources', () => {
  const id = '4eb7698c523610a095b209c497274bdad32fefc4972934bde73980da28b9d5d5';
  const proposal = JSON.parse(readFileSync(`artifacts/material-parity/working-audit/proposals/${id}.json`));
  assert.equal(hash(JSON.stringify(proposal.review)), id);
  // The proposal records literal source; registry patterns are regular expressions.
  // Escape only the new literal, preserving every old definition and all claims.
  const registered = structuredClone(proposal.review.groups);
  registered.at(-1).pattern = registered.at(-1).pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.deepEqual(sourceAuditDefinitions, registered);
  assert.equal(sourceAuditDefinitions.length, 180);
  assert.deepEqual(tabsSemanticPredecessor(sourceAuditDefinitions), proposal.review.groups.slice(0, -1));
  const finding = sourceAuditDefinitions.at(-1);
  assert.equal(finding.id, 'fixture-tab-panel-accessible-name-substitution');
  assert.equal(finding.classification, 'application-plugin-authoring-defect');
  const expression = new RegExp(finding.pattern);
  assert.ok(expression.test(readFileSync(finding.file, 'utf8')));
  assert.ok(!expression.test(proposal.review.groups.at(-1).pattern.replace('?', '')));
  for (const receipt of finding.evidence) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256, receipt.file);
  for (const index of [0, 178, 179]) {
    const altered = structuredClone(sourceAuditDefinitions); altered[index].classification = 'equivalent-representation';
    assert.throws(() => tabsSemanticPredecessor(altered));
  }
  assert.throws(() => tabsSemanticPredecessor([...sourceAuditDefinitions, finding]));
  for (const [file, restore] of [
    ['tests/material-parity/input-equivalence-policy.mjs', restoreTabsSemanticPolicy],
    ['tests/material-parity/input-equivalence-audit.mjs', restoreTabsSemanticProducer],
    ['tests/material-parity/text-backing-case-review-source.mjs', restoreTabsCaseSelection],
    ['scripts/run-material-input-audit.mjs', restoreTabsRunnerSelection],
    ['scripts/export-material-input-audit-current-ancestry.mjs', restoreTabsLauncherSelection],
  ]) {
    const source = normalize(readFileSync(file)); assert.equal(restore(source), previous(file));
    assert.throws(() => restore(source + '\n// drift'));
  }
  const helperFile = 'tests/material-parity/stepper-semantic-registration.mjs';
  let helper = normalize(readFileSync(helperFile));
  for (const [addition, before] of [
    ["import { tabsSemanticPredecessor, restoreTabsSemanticPolicy, restoreTabsSemanticProducer, restoreTabsCaseSelection, restoreTabsRunnerSelection, restoreTabsLauncherSelection } from './tabs-semantic-registration.mjs';\n", ''],
    ['  current = tabsSemanticPredecessor(current);\n', ''],
    ['  const text = restoreTabsSemanticPolicy(source);', "  const text = source.toString().replaceAll('\\r\\n', '\\n');"],
    ['  const text = restoreTabsSemanticProducer(source);', "  const text = source.toString().replaceAll('\\r\\n', '\\n');"],
    ['  let text = restoreTabsCaseSelection(source);', "  let text = source.toString().replaceAll('\\r\\n', '\\n');"],
    ['  let text = restoreTabsRunnerSelection(source);', "  let text = source.toString().replaceAll('\\r\\n', '\\n');"],
    ['  let text = restoreTabsLauncherSelection(source);', "  let text = source.toString().replaceAll('\\r\\n', '\\n');"],
  ]) { assert.equal(helper.split(addition).length, 2); helper = helper.replace(addition, before); }
  assert.equal(helper, previous(helperFile));
  const suiteFile = 'tests/material-parity/stepper-semantic-inputs.spec.mjs';
  const prelude = "import { sourceAuditDefinitions as tabsSemanticRegisteredDefinitions } from './input-equivalence-policy.mjs';\n"
    + "import { tabsSemanticPredecessor } from './tabs-semantic-registration.mjs';\n"
    + 'const sourceAuditDefinitions = tabsSemanticPredecessor(tabsSemanticRegisteredDefinitions);';
  const suite = normalize(readFileSync(suiteFile)); assert.equal(suite.split(prelude).length, 2);
  assert.equal(suite.replace(prelude, "import { sourceAuditDefinitions } from './input-equivalence-policy.mjs';"), previous(suiteFile));
  const launcher = 'scripts/export-material-input-audit-current-ancestry.mjs';
  const before = JSON.parse(execFileSync(process.execPath, [launcher, '--stepper-inputs', '--dry-run']));
  const after = JSON.parse(execFileSync(process.execPath, [launcher, '--tabs-menu-sheet', '--dry-run']));
  const oldId = 'ff305b14217b7123b98a2e00f3ecb9ad443cd89606eaf688ea11f6118b7fb069';
  const newId = '7eb107dec98a464f2c859c3c6f205d678719649b890c586bb52ce2d1d59640b4';
  assert.equal(after.args.filter(arg => arg.includes(newId)).length, 2);
  assert.deepEqual({ ...after, args: after.args.map(arg => arg.replace(newId, oldId)) }, before);
  for (const other of ['--static-ax', '--card-inputs', '--expansion-semantics', '--stepper-inputs'])
    assert.throws(() => execFileSync(process.execPath, [launcher, '--tabs-menu-sheet', other, '--dry-run'], { stdio: 'pipe' }));
});

test('tabs semantic history and queued node AX presence evidence replay', () => {
  for (const row of sourceAuditDefinitions.at(-1).history) {
    const bytes = execFileSync('git', ['show', `${row.revision}:${row.file}`], { maxBuffer: 4000000 });
    assert.equal(hash(bytes), row.sha256); assert.ok(bytes.toString().includes(row.excerpt));
  }
  assert.deepEqual(execFileSync(process.execPath, ['scripts/check-material-semantic-visibility-binding.mjs'], { maxBuffer: 4000000 }),
    readFileSync('artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log'));
  assert.deepEqual(execFileSync(process.execPath, ['scripts/join-tabs-menu-sheet-input-evidence.mjs'], { maxBuffer: 4000000 }),
    readFileSync('artifacts/material-parity/tabs-menu-sheet-case-join-20261022.log'));
});
