import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const historicalRevision = '222667e7ebf5e847d6f3991a6ebb5af0ad8b5513';
const historicalModule = 'tests/material-parity/input-equivalence-audit.mjs';
const historicalSource = execFileSync('git', ['show', `${historicalRevision}:${historicalModule}`],
  { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
assert.equal(createHash('sha256').update(historicalSource).digest('hex'),
  '4ac2017e9b2d546de80dfb7cc209cee27b623a1f30f7cb73a024839b096b6213');
const historicalAst = ts.createSourceFile(historicalModule, historicalSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
let relocated = historicalSource;
for (const node of [...historicalAst.statements.filter(ts.isImportDeclaration)].reverse()) {
  const specifier = node.moduleSpecifier;
  if (!specifier.text.startsWith('./')) continue;
  const url = new URL(specifier.text, pathToFileURL(path.resolve(historicalModule))).href;
  relocated = relocated.slice(0, specifier.getStart(historicalAst)) + JSON.stringify(url) + relocated.slice(specifier.end);
}
const relocatedAst = ts.createSourceFile(historicalModule, relocated, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(relocatedAst.parseDiagnostics.length, 0);
assert.equal(relocatedAst.statements.length, historicalAst.statements.length);
for (let i = 0; i < historicalAst.statements.length; i++) {
  const comparable = (node, file) => ts.isImportDeclaration(node)
    ? node.getText(file).replace(node.moduleSpecifier.getText(file), '<import>') : node.getText(file);
  assert.equal(comparable(historicalAst.statements[i], historicalAst),
    comparable(relocatedAst.statements[i], relocatedAst));
}
const { buildMaterialInputAudit } = await import(`data:text/javascript;base64,${Buffer.from(relocated).toString('base64')}`);

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
  'tests/material-parity/visibility-audit-source-binding.mjs',
  'tests/material-parity/visibility-audit-source-binding.spec.mjs',
  'tests/material-parity/visibility-audit-pipeline.spec.mjs',
  'tests/material-parity/visibility-observation-stage.mjs',
  'tests/material-parity/visibility-observation-stage.spec.mjs',
  'tests/material-parity/visibility-observation-binding.mjs',
  'tests/material-parity/visibility-observation-binding.spec.mjs',
  'scripts/audit-material-visibility-ancestry.mjs',
  'scripts/audit-material-visibility-population.mjs',
  'scripts/prepare-material-visibility-observation-stages.mjs',
  'tests/material-parity/visibility-ancestry.spec.mjs',
  'tests/material-parity/visibility-input-population.spec.mjs',
  'docs/material-visibility-input-population.json',
  'docs/material-visibility-observation-stages.json',
];
assert.equal(additions.length, 53); assert.equal(new Set(additions).size, 53);
const file = 'tests/material-parity/input-equivalence-audit.spec.mjs';
const assertionRevision = '7cd5cb79f65f30a6468a41cbd9d643aadb723d72';
const source = execFileSync('git', ['show', `${assertionRevision}:${file}`],
  { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const target = ast.statements.find(n => ts.isExpressionStatement(n) && ts.isCallExpression(n.expression) &&
  n.expression.arguments[0]?.text === 'records source fingerprints and actual visual acceptance fields');
const callback = target.expression.arguments[1].getText(ast);
const fixture = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'parityReport').getText(ast);
function prepare(original) {
  let updated = original;
  const edits = [
    ['audit.sourceFingerprints.length, 356', 'audit.sourceFingerprints.length, 409'],
    ['entry.file)).size, 356', 'entry.file)).size, 409'],
    ['!followupFiles.includes(f) && !alignmentFiles.includes(f)', '!followupFiles.includes(f) && !alignmentFiles.includes(f) && !additions.includes(f)'],
    ['[...followupFiles, ...alignmentFiles].sort()', '[...followupFiles, ...alignmentFiles, ...additions].sort()'],
    ['for (const file of [...followupFiles, ...alignmentFiles])', 'for (const file of [...followupFiles, ...alignmentFiles, ...additions])'],
    ['38 follow-up and 10 alignment dependencies', '38 follow-up, 10 alignment and 53 additional dependencies'],
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

test('prepared inventory assertion retains the full original test and checks all 409 exact source receipts', () => {
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
  assert.equal(baseline.sourceFingerprints.length, 409);
});
