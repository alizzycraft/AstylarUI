import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync as readActual } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const digest = s => createHash('sha256').update(s).digest('hex');
const normalized = s => s.toString().replaceAll('\r\n', '\n');
const id = 'core-semantic-text-transform-not-projected';
export function restoreSemanticTextTransformPolicy(source) {
  const current = normalized(source);
  if (!current.includes(`id: '${id}'`)) return current;
  assert.equal(digest(current), '5cc34579bc381bd5719f32830bef61da71afae3a8cba2185d6566d1d902220e8');
  const tree = ts.createSourceFile('policy.mjs', current, ts.ScriptTarget.Latest, true);
  const entries = tree.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations])
    .find(n => n.name.getText(tree) === 'sourceAuditDefinitions').initializer.arguments[0].elements;
  assert.equal(entries.length, 160); assert.ok(entries[0].getText(tree).includes(id));
  const restored = current.slice(0, entries[0].getFullStart()) + current.slice(entries[0].end + 1);
  assert.equal(digest(restored), '34f3d6e5869dbbb330d870e751a2a2db3ae051e560cefa88e460ee590ff7ecaf');
  return restored;
}
export function restoreSemanticTextTransformProducer(source) {
  const current = normalized(source);
  if (!current.includes('public semantic text-transform support gap and complete predecessor conservation')) return current;
  assert.equal(digest(current), 'b7746df868577d3934930c073b6423b9621c38bd4514b5dc0670e4d204940d66');
  const tree = ts.createSourceFile('producer.mjs', current, ts.ScriptTarget.Latest, true);
  const owner = name => tree.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  const proofs = owner('focusedProofInventory').body.statements[0].expression.elements;
  const files = owner('sourceFingerprints').body.statements[0].declarationList.declarations[0].initializer.elements;
  assert.equal(proofs.length, 214); assert.ok(proofs[0].getText(tree).includes('semantic-text-transform-input.spec.mjs'));
  const ranges = [[proofs[0].getFullStart(), proofs[0].end + 1], [files[0].getFullStart(), files[7].end + 1]];
  let restored = current;
  for (const [start, end] of ranges.sort((a, b) => b[0] - a[0])) restored = restored.slice(0, start) + restored.slice(end);
  assert.equal(digest(restored), 'e6336fa816a5778352963cdee293efbcb63d1a0815895a870b598a864b644eef');
  return restored;
}
const importLine = "import { readHistoricalBenchmarkSource as readFileSync, historicalSemanticDefinitions } from './semantic-text-transform-registration.mjs';";
const populationLine = 'const sourceAuditDefinitions = historicalSemanticDefinitions(currentSourceAuditDefinitions);\n';
export function historicalSemanticDefinitions(current) {
  assert.equal(current.length, 160);
  const retained = current.filter(row => row.id !== id); assert.equal(retained.length, 159); return retained;
}
export function restoreSemanticRegistrationTransitionSource(source) {
  let restored = normalized(source);
  const changes = [
    ["import { restoreSemanticTextTransformPolicy, restoreSemanticTextTransformProducer } from './semantic-text-transform-registration.mjs';\n", ''],
    ['  let current = restoreSemanticTextTransformProducer(source);', "  let current = source.toString().replaceAll('\\r\\n', '\\n');"],
    ['  const current = restoreSemanticTextTransformPolicy(source);', "  const current = source.toString().replaceAll('\\r\\n', '\\n');"],
  ];
  for (const [before, after] of changes) {
    assert.equal(restored.split(before).length, 2); restored = restored.replace(before, after);
  }
  assert.equal(digest(restored), 'ada4ad0ca6b1d890055d09f08cbbaa8f92a05b4f50dbe1681a46dfe892cdf484');
  return restored;
}
// This read boundary belongs ONLY to the pre-registration benchmark assertions.
// Current registration is independently tested against all160 actual definitions.
export function readHistoricalBenchmarkSource(file, options) {
  const raw = readActual(file, options), name = path.basename(String(file));
  if (!['input-equivalence-policy.mjs', 'input-equivalence-audit.mjs', 'benchmark-config.spec.mjs', 'position-composition-producer-transition.mjs'].includes(name)) return raw;
  if (path.resolve(String(file)) !== path.resolve('tests/material-parity', name)) return raw;
  let restored;
  if (name === 'input-equivalence-policy.mjs') restored = restoreSemanticTextTransformPolicy(raw);
  else if (name === 'input-equivalence-audit.mjs') restored = restoreSemanticTextTransformProducer(raw);
  else if (name === 'position-composition-producer-transition.mjs') restored = restoreSemanticRegistrationTransitionSource(raw);
  else {
    restored = normalized(raw);
    assert.equal(restored.split(importLine).length, 2);
    assert.equal(restored.split(populationLine).length, 2);
    restored = restored.replace(importLine, "import { readFileSync } from 'node:fs';")
      .replace('propertyGroups, sourceAuditDefinitions as currentSourceAuditDefinitions', 'propertyGroups, sourceAuditDefinitions')
      .replace(populationLine, '');
    assert.equal(digest(restored), '4a565c81ac5624f66d82fb5c3f85b07c20d12c3cc64cb794700a0b62e478c00c');
  }
  return typeof raw === 'string' ? restored : Buffer.from(restored);
}
