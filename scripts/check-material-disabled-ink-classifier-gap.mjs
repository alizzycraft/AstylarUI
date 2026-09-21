import assert from 'node:assert/strict';
import { readFileSync, createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { createGunzip } from 'node:zlib';
import Parser from 'jsonparse';
import ts from 'typescript';

const manifest = JSON.parse(readFileSync('docs/material-input-equivalence-audit.json'));
assert.equal(manifest.uncompressedSha256, 'b1a0e6e9f8c2a72625666444f9828f46e42d649acafd95354b5b75e62731424e');
const parser = new Parser(), hash = createHash('sha256');
let control, bytes = 0;
parser.onValue = function(value) {
  const top = this.stack[1]?.key ?? (this.stack.length === 1 ? this.key : undefined);
  if (this.stack.length === 1) {
    if (this.key === 'controlTypography') control = value;
    delete this.value[this.key];
  } else if (this.value && top !== 'controlTypography') delete this.value[this.key];
};
for await (const chunk of createReadStream('docs/' + manifest.payload).pipe(createGunzip())) {
  hash.update(chunk); bytes += chunk.length; parser.write(chunk);
}
assert.equal(bytes, manifest.uncompressedBytes);
assert.equal(hash.digest('hex'), manifest.uncompressedSha256);
assert.equal(parser.stack.length, 0);
const pending = control.differences.filter(row => row.attribution === 'unresolved');
assert.equal(pending.length, 60);
const file = 'tests/material-parity/input-equivalence-audit.mjs';
const source = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const guards = [];
function visit(node) {
  if (ts.isIfStatement(node) && node.expression.getText(ast).includes("ast.authored.id === 'button-disabled'") &&
      node.expression.getText(ast).includes('stages.reference.color')) guards.push(node.expression);
  ts.forEachChild(node, visit);
}
visit(ast); assert.equal(guards.length, 1);
const patterns = [];
function regexes(node) {
  if (node.kind === ts.SyntaxKind.RegularExpressionLiteral) patterns.push(node.getText(ast));
  ts.forEachChild(node, regexes);
}
regexes(guards[0]);
const pattern = patterns.find(value => value.includes('0\\.38'));
assert.ok(pattern); assert.ok(pattern.startsWith('/') && pattern.endsWith('/'));
const guard = new RegExp(pattern.slice(1, -1));
assert.equal(guard.test('rgba(29,27,32,0.38)'), true);
const cases = pending.map(row => {
  assert.equal(row.family, 'button'); assert.equal(row.element, 'button-disabled');
  assert.equal(row.property, 'color'); assert.equal(guard.test(row.values.reference), false);
  assert.equal(row.values.normal, row.values.effective); assert.equal(row.values.normal, row.values.painted);
  return { case: row.case, reference: row.values.reference, painted: row.values.painted,
    referenceRejectedByCurrentGuard: true };
});
assert.equal(new Set(cases.map(row => row.case)).size, 60);
console.log(JSON.stringify({ canonicalPayloadSha256: manifest.uncompressedSha256,
  source: { file, guard: guards[0].getText(ast),
    sha256: createHash('sha256').update(source).digest('hex') },
  cases, classificationChanged: false, otherClassificationPreconditionsReplayed: false,
  rendererCauseProven: false }, null, 2));
