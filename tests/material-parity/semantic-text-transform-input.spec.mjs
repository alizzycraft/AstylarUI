import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { sourceAuditDefinitions } from './input-equivalence-policy.mjs';

test('public semantic text transform preserves controls and current owner evidence', t => {
  const hash = b => createHash('sha256').update(b).digest('hex');
  const id = 'core-semantic-text-transform-not-projected';
  const finding = sourceAuditDefinitions.find(row => row.id === id);
  assert.equal(sourceAuditDefinitions.length, 160);
  assert.equal(finding.classification, 'confirmed-core-renderer-defect');
  assert.match(readFileSync(finding.file, 'utf8'), new RegExp(finding.pattern));
  for (const receipt of finding.evidence) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  const owner = JSON.parse(execFileSync(process.execPath, ['scripts/check-public-text-transform-owner.mjs'], { encoding: 'utf8' }));
  assert.equal(owner.verification.equalInputSemanticMismatches, 4);
  assert.equal(owner.verification.noTransformControls, 2);
  const heading = JSON.parse(execFileSync(process.execPath, ['scripts/check-material-icon-heading-ax.mjs'], { encoding: 'utf8' }));
  assert.equal(heading.contexts, 16); assert.equal(heading.matchingTitles, 0);
  for (const file of ['tests/material-parity/input-equivalence-policy.mjs', 'tests/material-parity/input-equivalence-audit.mjs']) {
    const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
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
      assert.deepEqual(sourceAuditDefinitions.filter(row => row.id !== id), priorDefinitions);
    } else {
      const proofs = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'focusedProofInventory').body.statements[0].expression.elements;
      assert.equal(proofs.length, 214);
      assert.ok(proofs[0].getText(ast).includes('semantic-text-transform-input.spec.mjs'));
      ranges.push([proofs[0].getFullStart(), proofs[0].end + 1]);
      const files = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'sourceFingerprints')
        .body.statements[0].declarationList.declarations[0].initializer.elements;
      const additions = files.slice(0, 7);
      assert.equal(additions.length, 7);
      ranges.push([additions[0].getFullStart(), additions.at(-1).end + 1]);
    }
    let restored = current;
    for (const [start, end] of ranges.sort((a, b) => b[0] - a[0])) restored = restored.slice(0, start) + restored.slice(end);
    assert.equal(restored, previous, `Unrelated ${file} source must survive exactly`);
    assert.notEqual(restored + '\n// unrelated drift', previous);
  }
  t.diagnostic(JSON.stringify({ definitions: 160, priorDefinitionsConserved: 159, focusedProofs: 214,
    publicFailurePairs: 4, materialPhysicalContexts: 16, canonicalPublication: false }));
});
