import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { dividerConsumerSources, dividerConsumerProofs, prepareDividerConsumerProducer,
  restoreDividerConsumerProducer, createDividerConsumerProducerHistoricalRead } from './divider-consumer-registration.mjs';

const file = 'tests/material-parity/input-equivalence-audit.mjs';
function inventory(source) {
  const ast = ts.createSourceFile(file, source, 99, true); assert.deepEqual(ast.parseDiagnostics, []);
  return Object.fromEntries(['sourceFingerprints', 'focusedProofInventory', 'implementationPlan'].map(name => {
    const fn = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name); assert.ok(fn);
    let array; const visit = n => { if (!array && ts.isArrayLiteralExpression(n)) array = n; ts.forEachChild(n, visit); }; visit(fn);
    return [name, array.elements.map(n => n.getText(ast))];
  }));
}
test('Divider consumer staged inventory conserves all existing sources proofs and plans', () => {
  const bytes = fs.readFileSync(file), before = bytes.toString().replaceAll('\r\n', '\n');
  const staged = prepareDividerConsumerProducer(bytes), old = inventory(before), next = inventory(staged);
  assert.equal(old.sourceFingerprints.length, 1143); assert.equal(old.focusedProofInventory.length, 472);
  assert.equal(old.implementationPlan.length, 73);
  assert.deepEqual(next.sourceFingerprints.slice(dividerConsumerSources.length), old.sourceFingerprints);
  assert.deepEqual(next.focusedProofInventory.slice(dividerConsumerProofs.length), old.focusedProofInventory);
  assert.deepEqual(next.implementationPlan, old.implementationPlan);
  const sources = next.sourceFingerprints.map(v => Function(`return ${v}`)());
  assert.equal(new Set(sources).size, sources.length);
  assert.deepEqual(sources.slice(0, dividerConsumerSources.length), dividerConsumerSources);
  for (const f of dividerConsumerSources) assert.ok(fs.readFileSync(f).length);
  const proof = (_root, f, expression, title) => {
    assert.equal([...fs.readFileSync(f, 'utf8').matchAll(new RegExp(expression.source, 'g'))].length, 1); return title;
  };
  assert.deepEqual(next.focusedProofInventory.slice(0, dividerConsumerProofs.length)
    .map(v => Function('proof', 'root', `return ${v}`)(proof, '.')), dividerConsumerProofs.map(r => r[1]));
  assert.equal(restoreDividerConsumerProducer(staged), before);
  assert.deepEqual(fs.readFileSync(file), bytes);
  console.log(JSON.stringify({ stagedSources: sources.length, stagedProofs: next.focusedProofInventory.length,
    preservedPlans: next.implementationPlan.length, liveProducerChanged: false }));
});
test('Divider consumer historical producer read is exact reversible and drift rejecting', () => {
  const before = fs.readFileSync(file).toString().replaceAll('\r\n', '\n');
  let staged = Buffer.from(prepareDividerConsumerProducer(before));
  const raw = (_name, options) => options ? staged.toString(typeof options === 'string' ? options : options.encoding) : Buffer.from(staged);
  const read = createDividerConsumerProducerHistoricalRead({ root: process.cwd(), read: raw });
  assert.equal(read(file, 'utf8'), before); assert.equal(read(file, { encoding: 'utf8' }), before);
  const copy = read(file); copy.fill(0); assert.equal(read(file, 'utf8'), before);
  assert.notEqual(raw(file, 'utf8'), before);
  staged = Buffer.from(before); assert.equal(read(file, 'utf8'), before);
  staged = Buffer.from(prepareDividerConsumerProducer(before) + '\n// unknown drift');
  assert.throws(() => read(file)); assert.throws(() => prepareDividerConsumerProducer(before + '\n// drift'));
  assert.throws(() => restoreDividerConsumerProducer(before + '\n// drift'));
});
