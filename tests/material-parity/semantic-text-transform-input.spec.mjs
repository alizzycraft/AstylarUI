import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { sourceAuditDefinitions } from './input-equivalence-policy.mjs';
import { restoreSemanticTextTransformPolicy, restoreSemanticTextTransformProducer,
  restoreSemanticRegistrationTransitionSource, readHistoricalBenchmarkSource, historicalSemanticDefinitions,
  reviewedRootEditingGraph, reviewedRootEditingRunnerReceipt } from './semantic-text-transform-registration.mjs';
import { restoreBorderContactPolicy, restoreBorderContactProducer } from './semantic-text-transform-registration.mjs';

test('border contact registration preserves all predecessor findings and proof sources', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const id = 'core-fractional-border-edge-paint-disagrees-with-native';
  const finding = sourceAuditDefinitions.find(row => row.id === id);
  assert.equal(sourceAuditDefinitions.length, 161);
  assert.equal(finding.classification, 'confirmed-core-renderer-defect');
  assert.equal([...readFileSync(finding.file, 'utf8').matchAll(new RegExp(finding.pattern, 'g'))].length, 1);
  for (const receipt of finding.evidence) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  for (const [file, restore] of [
    ['tests/material-parity/input-equivalence-policy.mjs', restoreBorderContactPolicy],
    ['tests/material-parity/input-equivalence-audit.mjs', restoreBorderContactProducer],
  ]) {
    const current = readFileSync(file, 'utf8');
    const previous = execFileSync('git', ['show', `19c2452c:${file}`], { encoding: 'utf8', maxBuffer: 4_000_000 }).replaceAll('\r\n', '\n');
    assert.equal(restore(current), previous);
    assert.throws(() => restore(current + '\n// unrelated drift'));
    if (file.endsWith('policy.mjs')) {
      const before = new Function(previous.replace(/^export const /gm, 'const ') + ';return sourceAuditDefinitions;')();
      assert.deepEqual(sourceAuditDefinitions.filter(row => row.id !== id), before);
      const changed = current.replace('fractional shadow-free cases fail22/44RGB', 'fractional shadow-free cases pass');
      assert.notEqual(changed, current); assert.throws(() => restore(changed));
      const renamed = current.replace(id, 'unreviewed-border-identifier');
      assert.notEqual(renamed, current); assert.throws(() => restore(renamed));
    } else {
      const ast = ts.createSourceFile(file, current, ts.ScriptTarget.Latest, true);
      const proofs = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'focusedProofInventory').body.statements[0].expression.elements;
      assert.equal(proofs.length, 215);
      const changed = current.replace('correct live geometry and current owners', 'unmeasured geometry');
      assert.notEqual(changed, current); assert.throws(() => restore(changed));
    }
  }
});

test('public semantic text transform preserves controls and current owner evidence', t => {
  const hash = b => createHash('sha256').update(b).digest('hex');
  const id = 'core-semantic-text-transform-not-projected';
  const finding = sourceAuditDefinitions.find(row => row.id === id);
  assert.equal(sourceAuditDefinitions.length, 161);
  assert.equal(finding.classification, 'confirmed-core-renderer-defect');
  assert.match(readFileSync(finding.file, 'utf8'), new RegExp(finding.pattern));
  for (const receipt of finding.evidence) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  const owner = JSON.parse(execFileSync(process.execPath, ['scripts/check-public-text-transform-owner.mjs'], { encoding: 'utf8' }));
  assert.equal(owner.verification.equalInputSemanticMismatches, 4);
  assert.equal(owner.verification.noTransformControls, 2);
  const heading = JSON.parse(execFileSync(process.execPath, ['scripts/check-material-icon-heading-ax.mjs'], { encoding: 'utf8' }));
  assert.equal(heading.contexts, 16); assert.equal(heading.matchingTitles, 0);
  for (const file of ['tests/material-parity/input-equivalence-policy.mjs', 'tests/material-parity/input-equivalence-audit.mjs']) {
    const current = (file.endsWith('policy.mjs') ? restoreBorderContactPolicy : restoreBorderContactProducer)(readFileSync(file, 'utf8'));
    const previous = execFileSync('git', ['show', `c3d1afde:${file}`], { encoding: 'utf8', maxBuffer: 4_000_000 }).replaceAll('\r\n', '\n');
    const ast = ts.createSourceFile(file, current, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const ranges = [];
    if (file.endsWith('policy.mjs')) {
      const entries = ast.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations])
        .find(n => n.name.getText(ast) === 'sourceAuditDefinitions').initializer.arguments[0].elements;
      assert.equal(entries.length, 160);
      const added = entries[0]; assert.ok(added.getText(ast).includes(id));
      ranges.push([added.getFullStart(), added.end + 1]);
      const priorDefinitions = new Function(previous.replace(/^export const /gm, 'const ') + ';return sourceAuditDefinitions;')();
      assert.deepEqual(sourceAuditDefinitions.filter(row => row.id !== id && row.id !== 'core-fractional-border-edge-paint-disagrees-with-native'), priorDefinitions);
    } else {
      const proofs = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'focusedProofInventory').body.statements[0].expression.elements;
      assert.equal(proofs.length, 214);
      assert.ok(proofs[0].getText(ast).includes('semantic-text-transform-input.spec.mjs'));
      ranges.push([proofs[0].getFullStart(), proofs[0].end + 1]);
      const files = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'sourceFingerprints')
        .body.statements[0].declarationList.declarations[0].initializer.elements;
      const additions = files.slice(0, 8);
      assert.equal(additions.length, 8);
      ranges.push([additions[0].getFullStart(), additions.at(-1).end + 1]);
    }
    let restored = current;
    for (const [start, end] of ranges.sort((a, b) => b[0] - a[0])) restored = restored.slice(0, start) + restored.slice(end);
    assert.equal(restored, previous, `Unrelated ${file} source must survive exactly`);
    assert.notEqual(restored + '\n// unrelated drift', previous);
  }
  t.diagnostic(JSON.stringify({ currentDefinitions: 161, semanticRegistrationDefinitions: 160, priorDefinitionsConserved: 159, semanticRegistrationProofs: 214,
    publicFailurePairs: 4, materialPhysicalContexts: 16, canonicalPublication: false }));
});

test('root editing runner applicability conserves metadata transition and rejects changed actions', () => {
  const file = 'artifacts/material-parity/configured-input-editing-current-20261015/latest-report.json';
  const bytes = readFileSync(file), hash = b => createHash('sha256').update(b).digest('hex');
  assert.equal(hash(bytes), '69695dabc9b1ff9c999f8cf6c92e5e8cdc3e3b9fdf68ddf4925ba176c3df3355');
  const report = JSON.parse(bytes), runner = readFileSync(report.actionSource.file);
  const before = JSON.stringify(report);
  assert.equal(reviewedRootEditingRunnerReceipt(runner, report.actionSource), report.actionSource.sha256);
  assert.throws(() => reviewedRootEditingRunnerReceipt(Buffer.from(runner.toString() + '\n// unreviewed'), report.actionSource));
  const wrong = structuredClone(report.actionSource); wrong.sha256 = '0'.repeat(64);
  assert.throws(() => reviewedRootEditingRunnerReceipt(runner, wrong));
  const missing = structuredClone(report.actionSource); missing.methods.pop();
  assert.throws(() => reviewedRootEditingRunnerReceipt(runner, missing));
  const action = structuredClone(report.actionSource); action.methods[0].sha256 = '0'.repeat(64);
  assert.throws(() => reviewedRootEditingRunnerReceipt(runner, action));
  assert.throws(() => reviewedRootEditingGraph([], report.actionSource));
  const original = [{ file: report.actionSource.file, sha256: hash(runner) }, { file: 'unrelated', sha256: 'unchanged' }];
  const mapped = reviewedRootEditingGraph(original, report.actionSource);
  assert.equal(mapped[0].sha256, report.actionSource.sha256);
  assert.deepEqual(mapped[1], original[1]); assert.equal(original[0].sha256, hash(runner));
  assert.equal(JSON.stringify(report), before); assert.equal(hash(readFileSync(file)), hash(bytes));
});

test('semantic registration historical boundary rejects drift and keeps current population explicit', () => {
  assert.equal(sourceAuditDefinitions.length, 161);
  const old = historicalSemanticDefinitions(sourceAuditDefinitions);
  assert.equal(old.length, 159);
  assert.equal(sourceAuditDefinitions.length, 161); // never mutates the production registry
  assert.throws(() => historicalSemanticDefinitions(old));
  let controls = 1;
  for (const [file, restore] of [
    ['tests/material-parity/input-equivalence-policy.mjs', restoreSemanticTextTransformPolicy],
    ['tests/material-parity/input-equivalence-audit.mjs', restoreSemanticTextTransformProducer],
  ]) {
    const current = readFileSync(file, 'utf8');
    const prior = execFileSync('git', ['show', `c3d1afde:${file}`], { encoding: 'utf8', maxBuffer: 4_000_000 }).replaceAll('\r\n', '\n');
    assert.equal(restore(current), prior);
    assert.equal(readHistoricalBenchmarkSource(file, 'utf8'), prior);
    assert.throws(() => restore(current + '\n// unexplained drift')); controls++;
    const changed = file.endsWith('policy.mjs')
      ? current.replace('four transformed names fail', 'four transformed names pass')
      : current.replace('sourceFindings,', 'sourceFindings: [],');
    assert.notEqual(changed, current); assert.throws(() => restore(changed)); controls++;
  }
  const suiteFile = 'tests/material-parity/benchmark-config.spec.mjs';
  const originalSuite = execFileSync('git', ['show', `c3d1afde:${suiteFile}`], { encoding: 'utf8', maxBuffer: 4_000_000 }).replaceAll('\r\n', '\n');
  assert.equal(readHistoricalBenchmarkSource(suiteFile, 'utf8'), originalSuite);
  assert.deepEqual(readHistoricalBenchmarkSource(suiteFile), Buffer.from(originalSuite));
  const transitionFile = 'tests/material-parity/position-composition-producer-transition.mjs';
  const transition = readFileSync(transitionFile, 'utf8');
  assert.equal(restoreSemanticRegistrationTransitionSource(transition), execFileSync('git', ['show', `c3d1afde:${transitionFile}`], { encoding: 'utf8', maxBuffer: 4_000_000 }).replaceAll('\r\n', '\n'));
  assert.throws(() => restoreSemanticRegistrationTransitionSource(transition + '\n// unexplained helper drift'));
  assert.throws(() => restoreSemanticRegistrationTransitionSource(transition.replace('return restored;', 'return source;')));
  assert.ok(controls >= 5);
});
