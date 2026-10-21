import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import ts from 'typescript';
const esbuild = createRequire(`${process.cwd()}/examples/material-showcase/package.json`)('esbuild');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => readFileSync(file), json = file => JSON.parse(read(file));
// Reuse the existing type-erasure/token comparison,not a new source normalizer.
const canonicalFile = 'scripts/check-public-native-checkable-value.mjs';
const canonicalBytes = read(canonicalFile), canonicalAst = ts.createSourceFile(canonicalFile, canonicalBytes.toString(), 99, true);
const definitions = canonicalAst.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'canonical');
assert.equal(definitions.length, 1);
const canonical = new Function('ts', 'esbuild', 'assert', definitions[0].getText(canonicalAst) + ';return canonical;')(ts, esbuild, assert);
const names = ['reconcile', 'reconcileElement', 'applyAttributes'];
function restoreBundledLocals(method) {
  const ast = ts.createSourceFile('method.js', `class Probe {${method}}`, 99, true);
  const declarations = [], identifiers = [];
  function scan(node) {
    if (ts.isVariableDeclaration(node) && ['text2', 'attribute2'].includes(node.name.getText(ast))) declarations.push(node);
    if (ts.isIdentifier(node) && ['text2', 'attribute2'].includes(node.text)) identifiers.push(node);
    ts.forEachChild(node, scan);
  }
  scan(ast);
  if (!identifiers.length) return method;
  for (const name of new Set(identifiers.map(id => id.text))) {
    const bindings = declarations.filter(d => d.name.getText(ast) === name);
    assert.equal(bindings.length, 1, 'One compiler-renamed local binding required');
    if (name === 'text2') assert.equal(bindings[0].initializer?.getText(ast), 'this.textNodes.get(key)');
    else {
      assert.ok(ts.isForOfStatement(bindings[0].parent.parent));
      assert.equal(bindings[0].parent.parent.expression.getText(ast), '[...node.attributes]');
    }
  }
  for (const id of identifiers) {
    assert.ok(!(ts.isPropertyAccessExpression(id.parent) && id.parent.name === id), 'Never rename a property');
    assert.ok(!(ts.isPropertyAssignment(id.parent) && id.parent.name === id), 'Never rename an object key');
  }
  const transformed = ts.transform(ast, [context => root => ts.visitNode(root, function visit(node) {
    if (ts.isIdentifier(node) && ['text2', 'attribute2'].includes(node.text)) return ts.factory.createIdentifier(node.text.slice(0, -1));
    return ts.visitEachChild(node, visit, context);
  })]);
  const result = ts.createPrinter().printNode(ts.EmitHint.Unspecified, transformed.transformed[0].statements[0].members[0], ast);
  transformed.dispose(); return result;
}
function methods(file) {
  const ast = ts.createSourceFile(file, read(file).toString(), 99, true), owners = [];
  function visit(node) {
    if ((ts.isClassDeclaration(node) || ts.isClassExpression(node)) && /^_?AstylarSemanticBridge$/.test(node.name?.text ?? '')) owners.push(node);
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.equal(owners.length, 1);
  return Object.fromEntries(names.map(name => {
    const found = owners[0].members.filter(n => n.name?.getText(ast) === name); assert.equal(found.length, 1);
    return [name, found[0].getText(ast)];
  }));
}
const currentFile = 'src/lib/astylar-semantic-bridge.ts';
const installedFile = 'examples/material-showcase/node_modules/astylarui/dist/lib/lib/astylar-semantic-bridge.js';
const current = methods(currentFile), installed = methods(installedFile);
for (const name of names) assert.deepEqual(canonical(current[name]), canonical(installed[name]), name);
assert.match(current.reconcile, /filter\(\(element\) => !element\.hidden\)/);
assert.match(current.reconcileElement, /if \(child\.hidden\) continue/);
assert.doesNotMatch(current.applyAttributes, /display|visibility|\.hidden/);
let controls = 0;
for (const forged of ['probe(){let text2=this.other.get(key);}',
  'probe(){let text2=this.textNodes.get(key);node.text2=text2;}',
  'probe(){for(const attribute2 of node.other){} }']) {
  assert.throws(() => restoreBundledLocals(forged)); controls++;
}
for (const [name, before, after] of [['reconcile', '!element.hidden', 'true'],
  ['reconcileElement', 'if (child.hidden) continue;', 'if (false) continue;']]) {
  assert.ok(current[name].includes(before));
  assert.notDeepEqual(canonical(current[name].replace(before, after)), canonical(current[name])); controls++;
}
const runs = ['public-semantic-css-hidden-20261021', 'public-semantic-css-hidden-repeat-20261021'];
const verified = [];
for (const run of runs) {
  const root = `artifacts/material-parity/${run}`, report = json(`${root}/latest-report.json`), provenance = json(`${root}/provenance.json`);
  assert.deepEqual(report.provenance, provenance);
  assert.equal(hash(read(`${root}/producer.mjs`)), provenance.producer.sha256);
  assert.equal(hash(read(provenance.producer.file)), provenance.producer.sha256);
  assert.equal(hash(read(`${root}/audit.js`)), provenance.bundleSha256);
  const bundled = methods(`${root}/audit.js`);
  for (const name of names) assert.deepEqual(canonical(current[name]), canonical(restoreBundledLocals(bundled[name])), `${run}:${name}`);
  for (const receipt of provenance.bundleInputs) assert.equal(hash(read(receipt.file)), receipt.sha256);
  for (const overlay of provenance.overlays) {
    assert.equal(hash(read(overlay.file)), overlay.originalSha256);
    assert.equal(hash(overlay.compiledSource), overlay.compiledSha256);
  }
  assert.equal(report.accepted, false); assert.deepEqual(report.errors, []); assert.equal(report.captures.length, 16);
  assert.equal(json(`${root}/failure.json`).captures.length, 16);
  const pairs = new Map(), failures = [];
  for (const capture of report.captures) {
    const file = `${root}/${capture.file}`, bytes = read(file); assert.equal(hash(bytes), capture.sha256);
    const value = JSON.parse(bytes);
    for (const key of ['mode', 'variant', 'dpr']) assert.equal(value[key], capture[key]);
    assert.equal(value.snapshot.mode, value.mode); assert.equal(value.snapshot.name, value.variant);
    const key = `${value.dpr}:${value.variant}`, pair = pairs.get(key) ?? {};
    assert.equal(pair[value.mode], undefined); pair[value.mode] = value.snapshot.site; pairs.set(key, pair);
    const actual = value.nodes.filter(n => !n.ignored && n.role?.value === 'StaticText' && n.name?.value === 'Hidden content').length;
    assert.equal(actual, value.exposedText); assert.equal(actual, capture.exposedText);
    const expected = value.variant === 'visible' ? 1 : 0; assert.equal(value.expected, expected);
    const shouldFail = value.mode === 'astylar' && ['display-none', 'visibility-hidden'].includes(value.variant);
    assert.equal(actual, shouldFail ? 1 : expected);
    if (shouldFail) failures.push({ mode: value.mode, variant: value.variant, dpr: value.dpr, expected, actual });
    if (value.mode === 'astylar' && value.variant !== 'authored-hidden') {
      const targets = value.snapshot.resolved.elements.filter(e => e.id === 'target'); assert.equal(targets.length, 1);
      for (const stage of ['normal', 'effective']) {
        assert.equal(targets[0][stage].display, value.variant === 'display-none' ? 'none' : 'block');
        assert.equal(targets[0][stage].visibility, value.variant === 'visibility-hidden' ? 'hidden' : 'visible');
      }
    }
    assert.equal(value.disposed.disposed, true);
  }
  assert.equal(pairs.size, 8);
  for (const pair of pairs.values()) assert.deepEqual(pair.reference, pair.astylar);
  assert.deepEqual(failures, report.failures); assert.equal(failures.length, 4);
  verified.push({ run, reportSha256: hash(read(`${root}/latest-report.json`)), captures: 16, failures });
}
console.log(JSON.stringify({ producer: { file: 'scripts/check-public-semantic-css-hidden.mjs',
  sha256: hash(read('scripts/check-public-semantic-css-hidden.mjs')) },
  canonicalComparator: { file: canonicalFile, sha256: hash(canonicalBytes) },
  methodBindings: [currentFile, installedFile].map(file => ({ file, sha256: hash(read(file)) })),
  boundMethods: names, negativeControlsRejected: controls, verified,
  classification: 'confirmed-core-renderer-defect',
  conclusion: 'Equal CSS display:none/visibility:hidden text inputs resolve correctly but remain exposed in the native semantic counterpart. The bridge reconciles authored hidden flags without consuming resolved CSS visibility. Current,installed and both actual public bundles bind complete methods. Visible/authored-hidden controls pass.',
  boundary: 'Static AX text visibility atDPR1/2,not inherited visibility overrides,updates,all semantic relationships,AT behavior,current Material paint or complete audit acceptance.' }));
