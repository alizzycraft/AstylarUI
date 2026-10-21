import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
const esbuild = createRequire(`${process.cwd()}/examples/material-showcase/package.json`)('esbuild');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(fs.readFileSync(file)) });
const comparisonFile = 'scripts/check-public-native-checkable-value.mjs';
const ast = ts.createSourceFile(comparisonFile, fs.readFileSync(comparisonFile, 'utf8'), 99, true);
const canonicalDefinition = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'canonical');
assert.equal(canonicalDefinition.length, 1);
const canonical = new Function('ts', 'esbuild', 'assert', canonicalDefinition[0].getText(ast) + ';return canonical;')(ts, esbuild, assert);
const publicVerifier = 'scripts/check-public-semantic-css-hidden.mjs';
const publicProof = 'artifacts/material-parity/public-semantic-css-hidden-verification-final-20261021.log';
assert.deepEqual(execFileSync(process.execPath, [publicVerifier]), fs.readFileSync(publicProof));
const checkpointFile = 'artifacts/material-parity/divider-current-browser-20261020/checkpoint/manifest.json';
assert.equal(receipt(checkpointFile).sha256, '9d0f1220ea6c2ca95cbfb143d94f7f5680a0d8cb11e074db879768f9763fd5b0');
const checkpoint = JSON.parse(fs.readFileSync(checkpointFile));
const servedFile = 'examples/material-showcase/dist/material-showcase/browser/chunk-XOU37TRR.js';
const helperFile = 'examples/material-showcase/dist/material-showcase/browser/chunk-35ENWJA4.js';
for (const file of [servedFile, helperFile]) {
  const pinned = checkpoint.provenance.browserFiles.filter(r => r.file === file.split('/').at(-1));
  assert.equal(pinned.length, 1); assert.equal(receipt(file).sha256, pinned[0].sha256);
}
const names = ['reconcile', 'reconcileElement', 'applyAttributes'];
function methods(text, selected = names) {
  const source = ts.createSourceFile('source.ts', text, 99, true), owners = [];
  function visit(node) {
    if ((ts.isClassDeclaration(node) || ts.isClassExpression(node)) && /^_?AstylarSemanticBridge$/.test(node.name?.text ?? '')) owners.push(node);
    ts.forEachChild(node, visit);
  }
  visit(source); assert.equal(owners.length, 1);
  return Object.fromEntries(selected.map(name => {
    const matches = owners[0].members.filter(m => m.name?.getText(source) === name); assert.equal(matches.length, 1);
    return [name, matches[0].getText(source)];
  }));
}
const currentFile = 'src/lib/astylar-semantic-bridge.ts';
const current = methods(fs.readFileSync(currentFile, 'utf8')), served = methods(fs.readFileSync(servedFile, 'utf8'));
for (const name of ['reconcile', 'applyAttributes']) assert.deepEqual(canonical(current[name]), canonical(served[name]), name);
// Ask the installed compiler for its exact spread lowering,then authenticate the
// complete generated method and every helper declaration,not a regex substitution.
const lowered = esbuild.transformSync(`class AstylarSemanticBridge {${current.reconcileElement}}`, {
  loader: 'ts', target: 'es2022', format: 'esm', supported: { 'object-rest-spread': false },
}).code;
assert.deepEqual(canonical(methods(lowered, ['reconcileElement']).reconcileElement), canonical(served.reconcileElement));
const helperNames = ['__defProp', '__getOwnPropSymbols', '__hasOwnProp', '__propIsEnum', '__defNormalProp', '__spreadValues'];
function helpers(text) {
  const source = ts.createSourceFile('helper.js', text, 99, true);
  return Object.fromEntries(helperNames.map(name => {
    const found = source.statements.filter(ts.isVariableStatement).flatMap(s => [...s.declarationList.declarations])
      .filter(d => d.name.getText(source) === name);
    assert.equal(found.length, 1); return [name, `var ${found[0].getText(source)};`];
  }));
}
const expectedHelpers = helpers(lowered), actualHelpers = helpers(fs.readFileSync(helperFile, 'utf8'));
for (const name of helperNames)
  assert.deepEqual(canonical(`probe(){${expectedHelpers[name]}}`), canonical(`probe(){${actualHelpers[name]}}`), name);
let rejected = 0;
for (const [name, before, after] of [['__defNormalProp', 'enumerable: true', 'enumerable: false'],
  ['__spreadValues', '__hasOwnProp.call', '__propIsEnum.call']]) {
  assert.ok(actualHelpers[name].includes(before));
  assert.notDeepEqual(canonical(`probe(){${actualHelpers[name].replace(before, after)}}`),
    canonical(`probe(){${expectedHelpers[name]}}`)); rejected++;
}
assert.notDeepEqual(canonical(served.reconcileElement.replace('if (child.hidden)', 'if (false)')),
  canonical(methods(lowered, ['reconcileElement']).reconcileElement)); rejected++;
console.log(JSON.stringify({ producer: receipt('scripts/check-material-semantic-visibility-binding.mjs'),
  publicProof: receipt(publicProof), publicVerifier: receipt(publicVerifier), canonicalComparator: receipt(comparisonFile),
  current: receipt(currentFile), served: receipt(servedFile), helper: receipt(helperFile), checkpoint: receipt(checkpointFile),
  completeBoundMethods: names, completeHelperDeclarations: helperNames, negativeControlsRejected: rejected,
  conclusion: 'Pinned Material served semantic bridge has the same complete visibility-relevant methods as current/public-package proof after exact compiler spread lowering,with every helper declaration authenticated. This binds the public CSS-hidden AX defect to the observed Material collapsed-content exposure;not a stale bridge-method explanation.',
  boundary: 'No claim about all core methods,open states,update behavior,AT traversal,paint or complete-case acceptance.' }));
