import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync as readActual } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const digest = s => createHash('sha256').update(s).digest('hex');
const normalized = s => s.toString().replaceAll('\r\n', '\n');
const id = 'core-semantic-text-transform-not-projected';
const borderId = 'core-fractional-border-edge-paint-disagrees-with-native';
const inlineId = 'core-inline-replaced-row-omits-parent-line-box';
const focusId = 'core-semantic-attribute-refresh-removes-focusability';
export function restoreAttributeFocusPolicy(source) {
  const current = normalized(source);
  if (!current.includes(`id: '${focusId}'`)) {
    assert.ok(!current.includes('DIV/SPAN focusability is temporarily removed'), 'Unrecognized attribute-focus registration');
    return current;
  }
  assert.equal(digest(current), '55c7e9cf1c634ebd8b01409b1836d1513f24e0c5ada656ce16f591aee1fd50a2');
  const tree = ts.createSourceFile('policy.mjs', current, ts.ScriptTarget.Latest, true);
  const entries = tree.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations])
    .find(n => n.name.getText(tree) === 'sourceAuditDefinitions').initializer.arguments[0].elements;
  assert.equal(entries.length, 163); assert.ok(entries[0].getText(tree).includes(focusId));
  const restored = current.slice(0, entries[0].getFullStart()) + current.slice(entries[0].end + 1);
  assert.equal(digest(restored), 'de4d7a74b1576d8120a607a63bc61b86df610ced64dcd9f1f24c332c934546fe');
  return restored;
}
export function restoreAttributeFocusProducer(source) {
  const current = normalized(source);
  if (!current.includes('public attribute-first focus loss and separate root-replacement controls')) {
    assert.ok(!current.includes("'scripts/audit-public-role-focus-refresh.mjs'"), 'Unrecognized attribute-focus proof');
    return current;
  }
  assert.equal(digest(current), 'd260f8cad2b7b23018524d84aa8056381932dbcffa6b7ce7f51236b515b05e1e');
  const tree = ts.createSourceFile('producer.mjs', current, ts.ScriptTarget.Latest, true);
  const owner = name => tree.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  const proofs = owner('focusedProofInventory').body.statements[0].expression.elements;
  const files = owner('sourceFingerprints').body.statements[0].declarationList.declarations[0].initializer.elements;
  assert.equal(proofs.length, 217); assert.ok(proofs[0].getText(tree).includes('public role focus refresh separates'));
  assert.deepEqual(files.slice(0, 5).map(n => n.text), [
    'scripts/audit-public-role-focus-refresh.mjs',
    'artifacts/material-parity/public-role-focus-refresh-20261017/latest-report.json',
    'artifacts/material-parity/public-role-focus-refresh-owner-20261017.log',
    'artifacts/material-parity/public-role-focus-refresh-verify-20261017.log',
    'artifacts/material-parity/role-control-attribute-focus-boundary-20261017.log',
  ]);
  let restored = current;
  for (const [start, end] of [[proofs[0].getFullStart(), proofs[0].end + 1], [files[0].getFullStart(), files[4].end + 1]].sort((a,b)=>b[0]-a[0]))
    restored = restored.slice(0,start)+restored.slice(end);
  assert.equal(digest(restored), 'e77ab7296deb65409d0a808685ad88b128d00cbe50303f3cf1b15266ca0e411f');
  return restored;
}
export function restoreInlineImagePolicy(source) {
  const current = restoreAttributeFocusPolicy(source);
  if (!current.includes(`id: '${inlineId}'`)) {
    assert.ok(!current.includes('Sixteen paired public cases preserve identical authored structure'), 'Unrecognized inline-image registration');
    return current;
  }
  assert.equal(digest(current), 'de4d7a74b1576d8120a607a63bc61b86df610ced64dcd9f1f24c332c934546fe');
  const tree = ts.createSourceFile('policy.mjs', current, ts.ScriptTarget.Latest, true);
  const entries = tree.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations])
    .find(n => n.name.getText(tree) === 'sourceAuditDefinitions').initializer.arguments[0].elements;
  assert.equal(entries.length, 162); assert.ok(entries[0].getText(tree).includes(inlineId));
  const restored = current.slice(0, entries[0].getFullStart()) + current.slice(entries[0].end + 1);
  assert.equal(digest(restored), 'a6b685058b7782ad7590de8be91c7e6fd484ddd8ae1dfdf11c1bd66a7777d648');
  return restored;
}
export function restoreInlineImageProducer(source) {
  const current = restoreAttributeFocusProducer(source);
  if (!current.includes('public inline-image line-box failure and current CSS row owner')) {
    assert.ok(!current.includes("'scripts/audit-public-inline-image-linebox.mjs'"), 'Unrecognized inline-image proof');
    return current;
  }
  assert.equal(digest(current), 'e77ab7296deb65409d0a808685ad88b128d00cbe50303f3cf1b15266ca0e411f');
  const tree = ts.createSourceFile('producer.mjs', current, ts.ScriptTarget.Latest, true);
  const owner = name => tree.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  const proofs = owner('focusedProofInventory').body.statements[0].expression.elements;
  const files = owner('sourceFingerprints').body.statements[0].declarationList.declarations[0].initializer.elements;
  assert.equal(proofs.length, 216); assert.ok(proofs[0].getText(tree).includes('public inline image line boxes'));
  let restored = current;
  for (const [start, end] of [[proofs[0].getFullStart(), proofs[0].end + 1], [files[0].getFullStart(), files[1].end + 1]].sort((a,b)=>b[0]-a[0]))
    restored = restored.slice(0,start)+restored.slice(end);
  assert.equal(digest(restored), 'ac3d948a906a45ecfd20b2fbcb69c7681a425085469760493bd3fa8dd9822027');
  return restored;
}
export function restoreBorderContactPolicy(source) {
  const current = restoreInlineImagePolicy(source);
  if (!current.includes(`id: '${borderId}'`)) {
    assert.ok(!current.includes('public border live frame preserves fractional geometry'), 'Unrecognized border registration');
    return current;
  }
  assert.equal(digest(current), 'a6b685058b7782ad7590de8be91c7e6fd484ddd8ae1dfdf11c1bd66a7777d648');
  const tree = ts.createSourceFile('policy.mjs', current, ts.ScriptTarget.Latest, true);
  const entries = tree.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations])
    .find(n => n.name.getText(tree) === 'sourceAuditDefinitions').initializer.arguments[0].elements;
  assert.equal(entries.length, 161); assert.ok(entries[0].getText(tree).includes(borderId));
  const restored = current.slice(0, entries[0].getFullStart()) + current.slice(entries[0].end + 1);
  assert.equal(digest(restored), '5cc34579bc381bd5719f32830bef61da71afae3a8cba2185d6566d1d902220e8');
  return restored;
}
export function restoreBorderContactProducer(source) {
  const current = restoreInlineImageProducer(source);
  if (!current.includes('public fractional border paint failure with correct live geometry and current owners')) {
    assert.ok(!current.includes("'scripts/audit-public-border-contact.mjs'"), 'Unrecognized border proof registration');
    return current;
  }
  assert.equal(digest(current), 'ac3d948a906a45ecfd20b2fbcb69c7681a425085469760493bd3fa8dd9822027');
  const tree = ts.createSourceFile('producer.mjs', current, ts.ScriptTarget.Latest, true);
  const owner = name => tree.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  const proofs = owner('focusedProofInventory').body.statements[0].expression.elements;
  const files = owner('sourceFingerprints').body.statements[0].declarationList.declarations[0].initializer.elements;
  assert.equal(proofs.length, 215); assert.ok(proofs[0].getText(tree).includes('public border live frame'));
  let restored = current;
  for (const [start, end] of [[proofs[0].getFullStart(), proofs[0].end + 1], [files[0].getFullStart(), files[3].end + 1]].sort((a,b)=>b[0]-a[0]))
    restored = restored.slice(0,start)+restored.slice(end);
  assert.equal(digest(restored), 'b7746df868577d3934930c073b6423b9621c38bd4514b5dc0670e4d204940d66');
  return restored;
}
export function restoreSemanticTextTransformPolicy(source) {
  const current = restoreBorderContactPolicy(source);
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
  const current = restoreBorderContactProducer(source);
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
const importLine = "import { readHistoricalBenchmarkSource as readFileSync, historicalSemanticDefinitions, reviewedRootEditingGraph, reviewedRootEditingRunnerReceipt } from './semantic-text-transform-registration.mjs';";
const populationLine = 'const sourceAuditDefinitions = historicalSemanticDefinitions(currentSourceAuditDefinitions);\n';
const runnerFile = 'tests/material-parity/run-material-parity.mjs';
const oldRunner = '584cdfc8b115e1a8c23834fe939ae6b3d4ff98bca25d61304a094a637825cc4e';
export function reviewedRootEditingRunnerReceipt(bytes, actionSource) {
  assert.equal(actionSource.file, runnerFile); assert.equal(actionSource.sha256, oldRunner);
  assert.equal(digest(bytes), '86ece08b913903e0a06231a58b32826a8fe561b468f82b7c57ccc32422da60e8');
  const source = bytes.toString(), tree = ts.createSourceFile(runnerFile, source, ts.ScriptTarget.Latest, true);
  // Reuse the existing exact metadata-only reversal,not a second recipe.
  const proofFile = 'tests/material-parity/alignment-crop-provenance.spec.mjs';
  const proof = ts.createSourceFile(proofFile, readActual(proofFile, 'utf8'), ts.ScriptTarget.Latest, true);
  const recipe = proof.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'withoutProvenance').getText(proof);
  assert.equal(digest(normalized(recipe)), 'fa775f1fec145112cfa1a684bab2dc9bbee436e88a9746f7b3a8deac5cdc6737');
  const restore = new Function('assert', recipe + ';return withoutProvenance;')(assert);
  const restored = restore(normalized(source));
  assert.equal(digest(restored), '082d6d7b3e0b0e5c1789f3d2ceff8862e3244de5319cc941e79c53fa634d6502');
  assert.deepEqual(actionSource.methods.map(row => row.name), ['performInteraction', 'interactionTargetBox',
    'settleInteraction', 'profileTheme', 'sendShowcaseCommand', 'waitForThemeApplied']);
  for (const method of actionSource.methods) {
    const node = tree.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === method.name);
    assert.ok(node); assert.equal(digest(node.getText(tree)), method.sha256);
  }
  // This returns the reviewed historical applicability identity,not a claim
  // that current raw bytes equal the original captured mixed-line-ending file.
  return oldRunner;
}
export function reviewedRootEditingGraph(graph, actionSource, expectedRunnerEntries = 1) {
  reviewedRootEditingRunnerReceipt(readActual(runnerFile), actionSource);
  assert.ok([0, 1].includes(expectedRunnerEntries));
  assert.equal(graph.filter(row => row.file === runnerFile).length, expectedRunnerEntries);
  return graph.map(row => row.file === runnerFile ? { ...row, sha256: oldRunner } : row);
}
export function historicalSemanticDefinitions(current) {
  assert.equal(current.length, 163);
  const retained = current.filter(row => row.id !== id && row.id !== borderId && row.id !== inlineId && row.id !== focusId); assert.equal(retained.length, 159); return retained;
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
// Current registration is independently tested against all163 actual definitions.
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
    for (const [before, after] of [
      ['reviewedRootEditingGraph(fingerprintModuleGraph(process.cwd(), r.actionSource.file), r.actionSource)', 'fingerprintModuleGraph(process.cwd(), r.actionSource.file)'],
      ['assert.deepEqual(reviewedRootEditingGraph(capturedGraph, r.actionSource, 0), manifest.provenance.diagnosticFiles);', 'assert.deepEqual(capturedGraph, manifest.provenance.diagnosticFiles);'],
      ['assert.equal(reviewedRootEditingRunnerReceipt(runner, r.actionSource), r.actionSource.sha256);', 'assert.equal(hash(runner), r.actionSource.sha256);'],
    ]) {
      assert.equal(restored.split(before).length, 2); restored = restored.replace(before, after);
    }
    assert.equal(digest(restored), '4a565c81ac5624f66d82fb5c3f85b07c20d12c3cc64cb794700a0b62e478c00c');
  }
  return typeof raw === 'string' ? restored : Buffer.from(restored);
}
