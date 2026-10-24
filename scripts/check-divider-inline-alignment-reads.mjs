import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';

// Reuse the complete retained placement proof, including its current/installed/
// captured method comparison. This observes only that proof's execution boundary.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const file = 'scripts/check-divider-inline-owner-placement.mjs';
const bytes = readFileSync(file);
assert.equal(hash(bytes), 'a163ef6170a60d50c9010c736f0f962f08cde5258f15b79d6d26982322409b75');
const original = bytes.toString();
const ast = ts.createSourceFile(file, original, 99, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
let source = original;
for (const node of ast.statements.filter(ts.isImportDeclaration).toReversed())
  source = source.slice(0, node.getFullStart()) + source.slice(node.end);
assert.equal(source.includes('import.meta'), false);
const invocation = '    owner.layoutInlineChildren(';
assert.equal(source.split(invocation).length, 2);
source = source.replace(invocation, `    const findStyle = render.actions.style.findStyleForElement;
    render.actions.style.findStyleForElement = element => {
      const style = findStyle(element);
      return new Proxy(style, { get(target, property, receiver) {
        reads.add(property);
        if (forbidden.has(property)) throw new Error('guarded-style-read:' + property);
        return Reflect.get(target, property, receiver);
      } });
    };
${invocation}`);
const execute = new Function('assert', 'readFileSync', 'createHash', 'ts', 'console', 'forbidden', 'reads', source);
const records = [], reads = new Set();
const fields = ['alignItems', 'alignContent', 'justifyContent'];
execute(assert, readFileSync, createHash, ts, { log: row => records.push(JSON.parse(row)) }, new Set(fields), reads);
assert.equal(records.length, 1);
assert.equal(records[0].observations.length, 48);
for (const field of fields) assert.equal(reads.has(field), false);
assert.ok(reads.has('height') && reads.has('display'));
const trees = new Map();
const tree = receipt => {
  if (!trees.has(receipt.file)) {
    const content = readFileSync(receipt.file);
    assert.equal(hash(content), receipt.sha256);
    trees.set(receipt.file, JSON.parse(content));
  }
  return trees.get(receipt.file);
};
for (const row of records[0].observations) {
  const native = tree(row.evidence.reference), candidate = tree(row.evidence.astylar);
  const leaf = native.nodes.find(node => node.attributes?.id === row.id);
  assert.ok(leaf);
  const parent = native.nodes.find(node => node.key === leaf.parent);
  const actual = candidate.nodes.find(node => node.authored?.id === `${row.id}-row`);
  assert.equal(parent.type, 'p'); assert.equal(actual.authored.type, 'p');
  assert.equal(native.styles[parent.style].display, 'block');
  assert.equal(actual.resolvedStyle.display, 'block');
  assert.deepEqual(fields.map(field => native.styles[parent.style][field]), ['normal', 'normal', 'normal']);
  assert.deepEqual(fields.map(field => actual.resolvedStyle[field]), ['stretch', 'stretch', 'flex-start']);
}
// A real consumed property must trip the identical reader, rather than a guard
// that silently fails to intercept the style returned to the actual method.
for (const field of ['height', 'display']) {
  assert.throws(() => execute(assert, readFileSync, createHash, ts,
    { log() { throw new Error('Unexpected completion'); } }, new Set([field]), new Set()),
  error => error.message === `guarded-style-read:${field}`);
}
console.log(JSON.stringify({
  producer: { file: 'scripts/check-divider-inline-alignment-reads.mjs', sha256: hash(readFileSync(import.meta.filename)) },
  reusedProof: { file, sha256: hash(bytes) },
  report: records[0].report,
  source: records[0].source,
  installed: records[0].installed,
  executableMap: records[0].executableMap,
  methodTokensSha256: records[0].methodTokensSha256,
  observations: 48, authenticatedPairedTrees: trees.size,
  recordedNativeValues: ['normal', 'normal', 'normal'],
  recordedCandidateValues: ['stretch', 'stretch', 'flex-start'],
  forbiddenFields: fields, observedStyleReads: [...reads].sort(),
  consumedPropertyControls: 2,
  conclusion: 'The retained single-span inline-placement method does not read alignItems,alignContent or justifyContent. These recorded fields cannot alter placement through this method in these contexts;consumed height/display controls reject.',
  boundary: 'Original proof retains mocked child creation,dimensions,borders and margins. Not absence of consumers elsewhere,whole renderer execution,native normal/stretch equivalence,anonymous strut/line-box equivalence,paint,current runtime or inspection closure. No input values or classifications changed.',
}));
