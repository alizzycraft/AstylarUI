import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { buildMaterialInputAudit, validateMaterialInputAudit } from './input-equivalence-audit.mjs';
import { rootFlowHeightAttribution } from './root-flow-height-source-binding.mjs';
import { buttonPillRadiusAttribution } from './button-pill-radius-source-binding.mjs';
import { selectedButtonInputs } from './button-pill-radius-evidence.mjs';

const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';
const baselineCommit = 'c391a6fb8002ac1d11ec8cbb2bb027d6d8fa80a3';
const priorSource = execFileSync('git', ['show', `${baselineCommit}:${moduleFile}`], { maxBuffer: 4 * 1024 * 1024 }).toString('utf8');
const parsed = ts.createSourceFile(moduleFile, priorSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const current = ts.createSourceFile(moduleFile, readFileSync(moduleFile, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const functionText = (f, name) => f.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name).getText(f);
for (const name of ['reviewedTemplateTextMappings', 'canonicalStyle', 'equivalentValue'])
  assert.equal(functionText(current, name), functionText(parsed, name));
// Execute the actual committed prior pipeline. Only import locations change.
let relocated = priorSource;
for (const node of [...parsed.statements.filter(ts.isImportDeclaration)].reverse()) {
  if (!node.moduleSpecifier.text.startsWith('./')) continue;
  const s = node.moduleSpecifier, url = new URL(s.text, pathToFileURL(path.resolve(moduleFile))).href;
  relocated = relocated.slice(0, s.getStart(parsed)) + JSON.stringify(url) + relocated.slice(s.end);
}
const relocatedFile = ts.createSourceFile(moduleFile, relocated, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(relocatedFile.statements.length, parsed.statements.length);
for (let i = 0; i < parsed.statements.length; i++) {
  const withoutPath = (n, f) => ts.isImportDeclaration(n) ? n.getText(f).replace(n.moduleSpecifier.getText(f), '<import>') : n.getText(f);
  assert.equal(withoutPath(parsed.statements[i], parsed), withoutPath(relocatedFile.statements[i], relocatedFile));
}
const prior = await import(`data:text/javascript;base64,${Buffer.from(relocated).toString('base64')}`);
const scalar = r => [r.family, r.element, r.property, r.reference, r.astylar, r.occurrences, r.cases, r.states];
const hash = b => createHash('sha256').update(b).digest('hex');
const flowFamilies = ['button', 'toolbar', 'paginator'];
const attributions = [rootFlowHeightAttribution, buttonPillRadiusAttribution];
function selectStates(rows, interaction) {
  const seen = new Set();
  return rows.filter(e => {
    if (flowFamilies.includes(e.family)) return true;
    const buttons = selectedButtonInputs(e);
    if (interaction && !buttons.length) return false;
    const key = JSON.stringify([e.family, e.profile, e.state ?? 'static']);
    if (seen.has(key)) return false; seen.add(key); return true;
  }).map(e => {
    const ids = new Set(selectedButtonInputs(e).map(i => i.id));
    ids.add(e.family + '-root');
    return { ...e, styleInputs: e.styleInputs.filter(i => ids.has(i.id)) };
  });
}
function withCapture(run) {
  const directory = mkdtempSync(path.resolve('artifacts/material-parity/reviewed-authoring-integration-'));
  try {
    const raw = { ...original, results: selectStates(original.results, false), interactions: selectStates(original.interactions, true) };
    assert.equal([...raw.results, ...raw.interactions].filter(e => flowFamilies.includes(e.family)).length, 164);
    const file = path.join(directory, 'report.json'); writeFileSync(file, JSON.stringify(raw));
    return run(raw, { root: process.cwd(), parityPath: file, supplementalRoot: directory });
  } finally {
    assert.ok(directory.startsWith(path.resolve('artifacts/material-parity') + path.sep));
    rmSync(directory, { recursive: true, force: true });
  }
}

test('reviewed authoring production integration preserves raw rows and prior classification precedence', () => withCapture((raw, options) => {
  const inputBefore = structuredClone(raw), previous = prior.buildMaterialInputAudit(raw, options);
  const audit = buildMaterialInputAudit(raw, options);
  const flow = audit.discrepancies.filter(r => r.attribution === rootFlowHeightAttribution);
  const radius = audit.discrepancies.filter(r => r.attribution === buttonPillRadiusAttribution);
  assert.equal(flow.length, 9);
  assert.equal(flow.reduce((sum, r) => sum + r.occurrences, 0), 414);
  assert.equal(radius.length, 108);
  assert.equal(audit.rootFlowHeightInputs.observations.filter(o => !o.proof.heightOverrides.length).length, 26);
  assert.ok(radius.every(r => r.reference === '9999px' && ['15px', '20px', '30px'].includes(r.astylar)));
  assert.deepEqual(raw, inputBefore);
  assert.deepEqual(audit.discrepancies.map(scalar), previous.discrepancies.map(scalar));
  const selected = new Set([...flow, ...radius].map(r => JSON.stringify(scalar(r))));
  const oldSelected = previous.discrepancies.filter(r => selected.has(JSON.stringify(scalar(r))));
  assert.equal(oldSelected.length, 117);
  assert.ok(oldSelected.every(r => r.attribution === 'unresolved'));
  const others = r => r.discrepancies.filter(d => !selected.has(JSON.stringify(scalar(d))));
  assert.equal(hash(JSON.stringify(others(audit))), hash(JSON.stringify(others(previous))));
  assert.ok(!validateMaterialInputAudit(audit, { requireComplete: false }).some(e => /root flow height|button pill radius/.test(e)));
}));

test('reviewed authoring production validation rejects detached evidence and inflated claims', () => withCapture((raw, options) => {
  const audit = buildMaterialInputAudit(raw, options);
  for (const [index, field, errorText] of [[0, 'rootFlowHeightInputs', 'root flow height'], [1, 'buttonPillRadiusInputs', 'button pill radius']]) {
    const attribution = attributions[index];
    for (const mutate of [r => { delete r[field]; },
      r => { r[field].observations = []; r[field].captures = []; },
      r => { r.discrepancies = r.discrepancies.filter(d => d.attribution !== attribution); },
      r => { r.discrepancies.find(d => d.attribution === attribution).reviewEvidence.renderingEquivalent = true; },
      r => { r.discrepancies.find(d => d.attribution === attribution).reviewedCases.pop(); }]) {
      const changed = structuredClone(audit); mutate(changed);
      assert.ok(validateMaterialInputAudit(changed, { requireComplete: false }).some(e => e.includes(errorText)), errorText);
    }
  }
}));
