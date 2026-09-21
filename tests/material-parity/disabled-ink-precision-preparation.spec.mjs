import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const file = 'tests/material-parity/input-equivalence-audit.mjs';
const source = readFileSync(file, 'utf8');
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const declarations = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'reviewedButtonPaintInput');
assert.equal(declarations.length, 1);
const original = declarations[0].getText(ast);
const before = String.raw`/^rgba\(\d+,\d+,\d+,0\.38\)$/`;
const after = String.raw`/^rgba\(\d+(?:\.\d+)?,\d+(?:\.\d+)?,\d+(?:\.\d+)?,0\.38\)$/`;
assert.equal(original.split(before).length, 2);
const proposed = original.replace(before, after);
assert.equal(proposed.replace(after, before), original);
const canonicalStyle = bindPreciseAuditNormalization();
const current = vm.runInNewContext(`(${original})`, { canonicalStyle });
const prepared = vm.runInNewContext(`(${proposed})`, { canonicalStyle });
const bytes = readFileSync('docs/material-disabled-button-ink.json');
assert.equal(hash(bytes), '7fc910200d9c6727bd72ced2e81fbef2d5bc81f4eae7eb6e2595fae2ce048ee5');
const findings = JSON.parse(bytes).findings;

function inputs(finding) {
  const trees = {};
  for (const side of ['reference', 'astylar']) {
    const receipt = finding.inputTrees[side], bytes = readFileSync(receipt.file);
    assert.equal(hash(bytes), receipt.sha256); trees[side] = JSON.parse(bytes);
  }
  const r = trees.reference, c = trees.astylar;
  const parent = r.nodes.find(n => n.attributes?.id === 'button-disabled');
  const labels = r.nodes.filter(n => n.parent === parent.key && n.ownText === 'Disabled');
  assert.equal(labels.length, 1);
  const candidate = c.nodes.find(n => n.authored?.id === 'button-disabled');
  const inventory = { styles: r.styles.map(value => ({ side: 'reference', value })),
    rules: [...r.rules.map(value => ({ side: 'reference', value })), ...c.rules.map(value => ({ side: 'astylar', value }))] };
  const candidateTree = { ...c, rules: c.rules.map((_, index) => r.rules.length + index) };
  const stages = { reference: canonicalStyle(r.styles[labels[0].style]),
    normal: canonicalStyle(candidate.normalResolvedStyle), effective: canonicalStyle(candidate.resolvedStyle),
    painted: canonicalStyle(candidate.paintedControlText.style) };
  assert.equal(stages.reference.color, finding.reference);
  assert.equal(stages.painted.color, finding.candidate);
  return [{ family: 'button' }, 'color', labels[0], parent, candidate, stages, r, candidateTree, inventory];
}

test('prepared decimal guard replays the complete classifier for all 60 authenticated owners', () => {
  assert.equal(findings.length, 60);
  for (const finding of findings) {
    const args = inputs(finding), originalInputs = JSON.stringify(args);
    assert.equal(current(...args), undefined);
    const result = prepared(...args);
    assert.equal(result?.attribution, 'reviewed-disabled-button-ink', finding.case);
    assert.equal(result.classification, 'application-plugin-authoring-defect');
    assert.equal(result.reviewEvidence.referenceComputed, finding.reference);
    assert.equal(result.reviewEvidence.candidatePainted, finding.candidate);
    assert.equal(JSON.stringify(args), originalInputs);
  }
});

test('prepared guard preserves alpha, disabled owner, declaration and stage rejection checks', () => {
  const base = inputs(findings[0]);
  const mutations = [
    args => { args[5].reference.color = args[5].reference.color.replace('0.38)', '0.4)'); },
    args => { args[4].authored.disabled = false; },
    args => { args[4].authored.id = 'button-primary'; },
    args => { delete args[3].attributes.disabled; },
    args => { args[5].effective.color = 'rgba(0,0,0,1)'; },
    args => { args[5].painted.color = 'rgba(0,0,0,1)'; },
    args => { args[5].normal.color = 'rgba(164,160,167,0.38)'; },
    args => { args[3].rules = []; },
    args => { args[7].rules = []; },
    args => { args[8].styles[args[3].style].value.color = '#ffffff'; },
  ];
  for (const mutate of mutations) {
    const args = structuredClone(base); mutate(args);
    assert.equal(prepared(...args), undefined);
  }
});
