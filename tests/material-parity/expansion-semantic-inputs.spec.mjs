import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { sourceAuditDefinitions } from './input-equivalence-policy.mjs';
import { expansionSemanticPredecessor, restoreExpansionSemanticPolicy, restoreExpansionSemanticProducer } from './expansion-semantic-registration.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const normalize = bytes => bytes.toString().replaceAll('\r\n', '\n');
test('expansion semantic registration preserves176 findings and exact predecessor sources', () => {
  const id = 'bfba66484e2e218edab363a40ade43294d0fdc588b7063daea22e2e5bf065059';
  const proposal = JSON.parse(readFileSync(`artifacts/material-parity/working-audit/proposals/${id}.json`));
  assert.equal(hash(JSON.stringify(proposal.review)), id);
  assert.deepEqual(sourceAuditDefinitions, proposal.review.groups); assert.equal(sourceAuditDefinitions.length, 178);
  assert.equal(expansionSemanticPredecessor(sourceAuditDefinitions).length, 176);
  assert.deepEqual(sourceAuditDefinitions.slice(-2).map(row => row.classification),
    ['confirmed-core-renderer-defect', 'application-plugin-authoring-defect']);
  for (const finding of sourceAuditDefinitions.slice(-2)) for (const receipt of finding.evidence)
    assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  const file = 'tests/material-parity/input-equivalence-policy.mjs', policy = readFileSync(file);
  assert.equal(restoreExpansionSemanticPolicy(policy), normalize(execFileSync('git', ['show', `09431889:${file}`], { maxBuffer: 4000000 })));
  for (const altered of [normalize(policy) + '\n// drift', normalize(policy).replace(sourceAuditDefinitions.at(-2).id, 'forged-id')])
    assert.throws(() => restoreExpansionSemanticPolicy(altered));
  for (const i of [0, 176, 177]) {
    const altered = structuredClone(sourceAuditDefinitions); altered[i].classification = 'equivalent-representation';
    assert.throws(() => expansionSemanticPredecessor(altered));
  }
  assert.throws(() => expansionSemanticPredecessor(sourceAuditDefinitions.slice(0, -1)));
  const producerFile = 'tests/material-parity/input-equivalence-audit.mjs', producer = readFileSync(producerFile);
  assert.equal(restoreExpansionSemanticProducer(producer), normalize(execFileSync('git', ['show', `3834df66:${producerFile}`], { maxBuffer: 4000000 })));
  for (const altered of [normalize(producer) + '\n// drift', normalize(producer).replace('expansion semantic CSS hiding public failures and Material AX binding', 'forged-proof')])
    assert.throws(() => restoreExpansionSemanticProducer(altered));
  const helperFile = 'tests/material-parity/card-title-registration.mjs';
  let helper = normalize(readFileSync(helperFile));
  for (const [added, before] of [
    ["import { expansionSemanticPredecessor, restoreExpansionSemanticPolicy, restoreExpansionSemanticProducer } from './expansion-semantic-registration.mjs';\n", ''],
    ['  current = expansionSemanticPredecessor(current);\n', ''],
    ['  const text = restoreExpansionSemanticPolicy(source);', "  const text = source.toString().replaceAll('\\r\\n', '\\n');"],
    ['  const text = restoreExpansionSemanticProducer(source);', "  const text = source.toString().replaceAll('\\r\\n', '\\n');"],
  ]) { assert.equal(helper.split(added).length, 2); helper = helper.replace(added, before); }
  assert.equal(helper, normalize(execFileSync('git', ['show', `09431889:${helperFile}`])));
  const suiteFile = 'tests/material-parity/card-title-inputs.spec.mjs';
  const prelude = "import { sourceAuditDefinitions as expansionSemanticRegisteredDefinitions } from './input-equivalence-policy.mjs';\n"
    + "import { expansionSemanticPredecessor } from './expansion-semantic-registration.mjs';\n"
    + 'const sourceAuditDefinitions = expansionSemanticPredecessor(expansionSemanticRegisteredDefinitions);';
  const suite = normalize(readFileSync(suiteFile)); assert.equal(suite.split(prelude).length, 2);
  assert.equal(suite.replace(prelude, "import { sourceAuditDefinitions } from './input-equivalence-policy.mjs';"),
    normalize(execFileSync('git', ['show', `09431889:${suiteFile}`])));
});
test('expansion semantic public failures and pinned Material AX replay independently', () => {
  for (const [script, file] of [
    ['scripts/check-material-semantic-visibility-binding.mjs', 'artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log'],
    ['scripts/check-expansion-static-ax.mjs', 'artifacts/material-parity/expansion-static-ax-review-20261021.log'],
  ]) assert.deepEqual(execFileSync(process.execPath, [script], { maxBuffer: 4000000 }), readFileSync(file));
  for (const row of sourceAuditDefinitions.at(-1).history) {
    const bytes = execFileSync('git', ['show', `${row.revision}:${row.file}`], { maxBuffer: 4000000 });
    assert.equal(hash(bytes), row.sha256);
    for (const excerpt of typeof row.excerpt === 'object' ? Object.values(row.excerpt) : [row.excerpt])
      assert.ok(bytes.toString().includes(excerpt));
  }
});
