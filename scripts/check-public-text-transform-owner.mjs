import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

// Bind the public reproduction to complete current owning methods, not version
// labels or a selected source fragment. No runtime source replacement.
const directory = 'artifacts/material-parity/public-text-transform-ax-20261017';
const verification = JSON.parse(execFileSync(process.execPath,
  ['scripts/audit-public-text-transform-ax.mjs', '--verify', directory], { encoding: 'utf8' }));
assert.equal(verification.equalInputSemanticMismatches, 4);
assert.equal(verification.noTransformControls, 2);
assert.equal(verification.negativeControlsRejected, 3);
const hash = b => createHash('sha256').update(b).digest('hex');
const files = ['src/lib/astylar-semantic-bridge.ts',
  'examples/material-showcase/node_modules/astylarui/dist/lib/lib/astylar-semantic-bridge.js'];
const trees = files.map(f => ts.createSourceFile(f, readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true));
function find(tree, name) {
  const matches = [];
  function visit(node) {
    if (ts.isMethodDeclaration(node) && node.name.getText(tree) === name) matches.push(node.getText(tree));
    ts.forEachChild(node, visit);
  }
  visit(tree); assert.equal(matches.length, 1); return matches[0];
}
function tokens(source) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, source), result = [];
  for (let k = scanner.scan(); k !== ts.SyntaxKind.EndOfFileToken; k = scanner.scan()) result.push(scanner.getTokenText());
  return result;
}
const methods = ['reconcileElement', 'applyAttributes', 'semanticTagName'].map(name => {
  const emitted = ts.transpileModule('class Owner{' + find(trees[0], name) + '}', {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const tree = ts.createSourceFile('emitted.js', emitted, ts.ScriptTarget.Latest, true);
  const current = tokens(find(tree, name)), installed = tokens(find(trees[1], name));
  assert.deepEqual(current, installed);
  return { name, tokens: current.length, sha256: hash(JSON.stringify(current)) };
});
const report = JSON.parse(readFileSync(`${directory}/latest-report.json`));
assert.ok(report.inputs.some(r => r.file === files[1] && r.sha256 === hash(readFileSync(files[1]))));
assert.equal(readFileSync(files[0], 'utf8').includes('textTransform'), false);
console.log(JSON.stringify({ verification, reportSha256: hash(readFileSync(`${directory}/latest-report.json`)),
  files: files.map(file => ({ file, sha256: hash(readFileSync(file)) })), methods,
  boundary: 'Public installed-runtime failure and current complete owning-method equivalence. Not full current package/release acceptance or assistive-technology behavior.' }));
