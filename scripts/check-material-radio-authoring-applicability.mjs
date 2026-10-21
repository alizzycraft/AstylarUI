import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const file = 'examples/material-showcase/src/app/astylar.component.ts';
const themeFile = 'examples/material-showcase/src/app/theme.ts';
const evidenceFile = 'artifacts/material-parity/radio-descendant-inputs-20261021.log';
const evidenceBytes = fs.readFileSync(evidenceFile);
assert.equal(hash(evidenceBytes), 'aa8c59ff5c9e751bb0ff0b2f391e43d57409ef6bf0d32bd7f2daa4fcd3e0b355');
const evidence = JSON.parse(evidenceBytes), source = fs.readFileSync(file, 'utf8');
const ast = ts.createSourceFile(file, source, 99, true);
let method; const rules = [];
function visit(node) {
  if (ts.isMethodDeclaration(node) && node.name?.getText(ast) === 'familyElements') method = node.getText(ast);
  if (ts.isObjectLiteralExpression(node)) {
    const selector = node.properties.find(p => p.name?.text === 'selector')?.initializer;
    if (selector && ts.isStringLiteral(selector) && /^(#radio-|\.radio-)/.test(selector.text)) rules.push(node.getText(ast));
  }
  ts.forEachChild(node, visit);
}
visit(ast); assert.ok(method); assert.equal(rules.length, 13);
const compile = source => ts.transpileModule(source, { compilerOptions: { target: 99, module: 99 } }).outputText;
const Owner = new Function(compile('class Owner {' + method + '}') + ';return Owner;')();
const themeSource = fs.readFileSync(themeFile, 'utf8');
const theme = new Function(compile(themeSource).replace(/^export /gm, '')
  + ';return {MATERIAL_THEME_PROFILES,resolveTheme,alphaHex};')();
const currentRules = new Function('theme', 'state', 'alphaHex', 'return [' + rules.join(',') + '];');
const flatten = roots => roots.flatMap(function walk(node) {
  const { children, ...authored } = node;
  return [authored, ...(children ?? []).flatMap(walk)];
});
const treeCache = new Map();
const readTree = receipt => {
  if (!treeCache.has(receipt.file)) {
    const bytes = fs.readFileSync(receipt.file); assert.equal(hash(bytes), receipt.sha256);
    treeCache.set(receipt.file, { receipt, tree: JSON.parse(bytes) });
  }
  assert.deepEqual(treeCache.get(receipt.file).receipt, receipt); return treeCache.get(receipt.file).tree;
};
const records = []; let rejected = 0;
for (const row of evidence.cases) {
  const profile = row.case.split('@')[1].split('/')[0];
  const resolvedTheme = theme.resolveTheme(theme.MATERIAL_THEME_PROFILES[profile]);
  const captured = readTree(row.inputTrees.astylar);
  const root = captured.nodes.find(n => n.authored?.id === 'radio-primary'); assert.ok(root);
  const authored = captured.nodes.filter(n => n.key === root.key || n.key.startsWith(root.key + '/')).map(n => n.authored);
  const selected = row.owners.find(o => o.value === 'team').candidate.option.authored.ariaChecked;
  const disabled = row.owners[0].candidate.option.authored.ariaDisabled;
  assert.equal(row.owners[1].candidate.option.authored.ariaDisabled, disabled);
  const state = { selected, disabled, open: false, error: false };
  const owner = new Owner(); owner.store = { state: () => state, tokens: () => resolvedTheme };
  const actual = flatten(owner.familyElements('radio')); assert.deepEqual(actual, authored);
  assert.ok(actual.every(n => n.type !== 'input' && n.type !== 'label'));
  const expectedRules = currentRules(resolvedTheme, state, theme.alphaHex);
  const selectors = new Set(expectedRules.map(r => r.selector)); assert.equal(selectors.size, 13);
  const capturedRules = captured.rules.filter(r => selectors.has(r.selector));
  assert.deepEqual(expectedRules, capturedRules);
  const changedTree = structuredClone(authored); changedTree.find(n => n.id === 'radio-team').ariaChecked = !selected;
  assert.throws(() => assert.deepEqual(actual, changedTree)); rejected++;
  const changedRules = structuredClone(capturedRules); changedRules.find(r => r.selector === '#radio-team').left = '74px';
  assert.throws(() => assert.deepEqual(expectedRules, changedRules)); rejected++;
  records.push({ case: row.case, tree: row.inputTrees.astylar, selected, disabled,
    authoredNodes: actual.length, nodesSha256: hash(JSON.stringify(actual)),
    rules: expectedRules, unchangedAuthoredStructure: true, unchangedRadioStyleDeclarations: true });
}
assert.equal(records.length, 68); assert.equal(rejected, 136);
const history = [];
for (const revision of ['2f440115740ff76fa9e55b3f4a11568207b2af5a', 'f3c8254c']) {
  const original = execFileSync('git', ['show', revision + ':' + file], { encoding: 'utf8', maxBuffer: 3_000_000 });
  const tree = ts.createSourceFile(file, original, 99, true), branches = [];
  function find(node) {
    if (ts.isIfStatement(node) && /^family\s*===\s*'radio'$/.test(node.expression.getText(tree))) branches.push(node);
    ts.forEachChild(node, find);
  }
  find(tree); assert.equal(branches.length, 1);
  const branch = branches[0];
  history.push({ revision, sourceSha256: hash(original), line: tree.getLineAndCharacterOfPosition(branch.getStart(tree)).line + 1,
    branchSha256: hash(branch.getText(tree)), branch: branch.getText(tree) });
}
const ownFile = 'scripts/check-material-radio-authoring-applicability.mjs';
console.log(JSON.stringify({ producer: { file: ownFile, sha256: hash(fs.readFileSync(ownFile)) },
  evidence: { file: evidenceFile, sha256: hash(evidenceBytes) },
  sources: [file, themeFile].map(file => ({ file, sha256: hash(fs.readFileSync(file)) })),
  currentFamilyMethodSha256: hash(method), cases: 68, owners: 136, rejectedControls: rejected, records, history,
  boundary: 'Current actual factory and radio style expressions executed with captured selected/disabled states and actual profile resolver;mocked authoring,not renderer/browser runtime. Initial and state-layer-introduction snapshots are not every revision or compensation-motive proof. Existing flow/native-control differences remain;no source edits,case closure or core diagnosis.' }));
