import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { buildMaterialInputAudit } from './input-equivalence-audit.mjs';
import { restoreInventoryAssertion } from './case-index-assertion-migration.mjs';

// Independently enumerate additions missing from the existing 356-file test.
const additions = [
  ...['reviewed-source-batch-audit-source-binding.mjs', 'reviewed-source-batch-audit-source-binding.spec.mjs',
    'reviewed-source-batch-pipeline.spec.mjs', 'reviewed-source-batch-observation-binding.mjs',
    'reviewed-source-batch-observation-binding.spec.mjs', 'reviewed-source-batch-transition.mjs',
    'reviewed-source-batch-transition.spec.mjs', 'reviewed-source-batch.spec.mjs',
    'reviewed-batch-motion-replay.mjs', 'motion-source-conservation.mjs', 'motion-source-conservation.spec.mjs',
    'alignment-adapter-receipt-source.mjs', 'alignment-adapter-receipt-source.spec.mjs',
    'alignment-font-audit-source-binding.spec.mjs', 'text-align-audit-source-binding.spec.mjs',
    'ltr-alignment-audit-source-binding.spec.mjs', 'vertical-align-canonical-plan.spec.mjs',
    'text-align-canonical-plan.spec.mjs', 'additional-control-font-style-attribution.spec.mjs',
    'audit-normalization-contracts.mjs', 'audit-normalization-contracts.spec.mjs',
    'control-line-box-normalization.mjs', 'root-background-classification-preparation.mjs',
    'root-background-classification-preparation.spec.mjs', 'root-background-pipeline.spec.mjs',
    'control-line-box-reconciliation.spec.mjs', 'control-line-box-normalization-transition.spec.mjs',
    'line-box-normalization-census.spec.mjs', 'gap-survey-source-replay.mjs',
    'gap-survey-source-replay.spec.mjs', 'caret-normalization-transition.spec.mjs',
    'disabled-ink-source-transition.mjs', 'disabled-ink-source-transition.spec.mjs',
    'disabled-ink-precision-preparation.spec.mjs'].map(file => `tests/material-parity/${file}`),
  'scripts/prepare-material-reviewed-source-batch.mjs',
  'scripts/audit-material-root-background-inputs.mjs', 'docs/material-root-background-inputs.json',
  'scripts/audit-material-line-box-normalization.mjs', 'docs/material-line-box-normalization-census.json',
];
assert.equal(additions.length, 39); assert.equal(new Set(additions).size, 39);
const file = 'tests/material-parity/input-equivalence-audit.spec.mjs';
const source = restoreInventoryAssertion(readFileSync(file, 'utf8')).replaceAll('\r\n', '\n');
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const target = ast.statements.find(n => ts.isExpressionStatement(n) && ts.isCallExpression(n.expression) &&
  n.expression.arguments[0]?.text === 'records source fingerprints and actual visual acceptance fields');
const callback = target.expression.arguments[1].getText(ast);
const fixture = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'parityReport').getText(ast);
function prepare(original) {
  let updated = original;
  const edits = [
    ['audit.sourceFingerprints.length, 356', 'audit.sourceFingerprints.length, 395'],
    ['entry.file)).size, 356', 'entry.file)).size, 395'],
    ['!followupFiles.includes(f) && !alignmentFiles.includes(f)', '!followupFiles.includes(f) && !alignmentFiles.includes(f) && !additions.includes(f)'],
    ['[...followupFiles, ...alignmentFiles].sort()', '[...followupFiles, ...alignmentFiles, ...additions].sort()'],
    ['for (const file of [...followupFiles, ...alignmentFiles])', 'for (const file of [...followupFiles, ...alignmentFiles, ...additions])'],
    ['38 follow-up and 10 alignment dependencies', '38 follow-up, 10 alignment and 39 additional dependencies'],
  ];
  for (const [before, after] of edits) {
    assert.equal(updated.split(before).length, 2); updated = updated.replace(before, after);
  }
  let restored = updated;
  for (const [before, after] of edits.toReversed()) restored = restored.replace(after, before);
  assert.equal(restored, original, 'other test logic changed');
  return updated;
}
const run = (callbackSource, builder) => new Function('assert', 'buildMaterialInputAudit', 'readFileSync',
  'createHash', 'execFileSync', 'ts', 'additions', `${fixture}\nreturn (${callbackSource})();`)
  (assert, builder, readFileSync, createHash, execFileSync, ts, additions);

test('prepared inventory assertion retains the full original test and checks all 395 exact source receipts', () => {
  run(prepare(callback), buildMaterialInputAudit);
});

test('prepared inventory assertion rejects missing, duplicate, reordered and forged source receipts', () => {
  const baseline = buildMaterialInputAudit({ schemaVersion: 1, results: [], interactions: [] });
  const mutations = [
    r => { r.sourceFingerprints.pop(); },
    r => { r.sourceFingerprints[0] = structuredClone(r.sourceFingerprints[1]); },
    r => { r.sourceFingerprints.reverse(); },
    r => { r.sourceFingerprints.find(row => row.file === additions[0]).sha256 = 'forged'; },
  ];
  for (const mutate of mutations) {
    assert.throws(() => run(prepare(callback), (...args) => {
      const result = buildMaterialInputAudit(...args); mutate(result); return result;
    }));
  }
  assert.equal(baseline.sourceFingerprints.length, 395);
});
