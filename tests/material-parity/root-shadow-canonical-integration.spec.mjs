import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { buildMaterialInputAudit, validateMaterialInputAudit } from './input-equivalence-audit.mjs';
import { rootShadowAttribution } from './root-shadow-source-binding.mjs';

const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
const baselineCommit = '502ea44a064d49cd4c273bd93dfb5d51f6adbc87';
const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';
const priorSource = execFileSync('git', ['show', `${baselineCommit}:${moduleFile}`], { maxBuffer: 4 * 1024 * 1024 }).toString('utf8');
const parsed = ts.createSourceFile(moduleFile, priorSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const current = ts.createSourceFile(moduleFile, readFileSync(moduleFile, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const functionText = (f, name) => f.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name).getText(f);
for (const name of ['reviewedTemplateTextMappings', 'canonicalStyle', 'equivalentValue'])
  assert.equal(functionText(current, name), functionText(parsed, name));
// Run the real prior pipeline; only relative module locations change.
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
function selectStates(rows) {
  const seen = new Set();
  return rows.filter(e => {
    const key = JSON.stringify([e.family, e.state ?? 'static']);
    if (seen.has(key)) return false; seen.add(key); return true;
  }).map(e => ({ ...e, styleInputs: e.styleInputs.filter(i => i.id === e.family + '-root') }));
}
function withCapture(run) {
  const directory = mkdtempSync(path.resolve('artifacts/material-parity/root-shadow-integration-'));
  try {
    const raw = { ...original, results: selectStates(original.results), interactions: selectStates(original.interactions) };
    assert.equal(raw.results.length, 36);
    assert.deepEqual([...new Set(raw.interactions.map(e => JSON.stringify([e.family, e.state])))],
      [...new Set(original.interactions.map(e => JSON.stringify([e.family, e.state])))]);
    const file = path.join(directory, 'report.json'); writeFileSync(file, JSON.stringify(raw));
    return run(raw, { root: process.cwd(), parityPath: file, supplementalRoot: directory });
  } finally {
    assert.ok(directory.startsWith(path.resolve('artifacts/material-parity') + path.sep));
    rmSync(directory, { recursive: true, force: true });
  }
}

test('root shadow production integration preserves scalar rows and existing attribution precedence', () => withCapture((raw, options) => {
  const inputBefore = structuredClone(raw), previous = prior.buildMaterialInputAudit(raw, options);
  const audit = buildMaterialInputAudit(raw, options), rows = audit.discrepancies.filter(r => r.attribution === rootShadowAttribution);
  assert.equal(rows.length, 36);
  assert.equal(rows.reduce((sum, r) => sum + r.occurrences, 0), raw.results.length + raw.interactions.length);
  for (const r of rows) assert.deepEqual([r.element, r.property, r.reference, r.astylar],
    [r.family + '-root', 'boxShadow', 'rgba(0,0,0,0.133) 0 2px 8px 0', '0 2px 8px rgba(0,0,0,0.14)']);
  assert.deepEqual(raw, inputBefore);
  assert.deepEqual(audit.discrepancies.map(scalar), previous.discrepancies.map(scalar));
  const selected = new Set(rows.map(r => JSON.stringify(scalar(r))));
  assert.ok(previous.discrepancies.filter(r => selected.has(JSON.stringify(scalar(r)))).every(r => r.attribution === 'unresolved'));
  const others = r => r.discrepancies.filter(d => !selected.has(JSON.stringify(scalar(d))));
  assert.equal(hash(JSON.stringify(others(audit))), hash(JSON.stringify(others(previous))));
  assert.ok(!validateMaterialInputAudit(audit, { requireComplete: false }).some(e => e.includes('root shadow')));
}));

test('root shadow production validation rejects detached evidence missing rows and false claims', () => withCapture((raw, options) => {
  const audit = buildMaterialInputAudit(raw, options);
  for (const mutate of [r => { delete r.rootShadowInputs; },
    r => { r.rootShadowInputs.observations = []; r.rootShadowInputs.captures = []; },
    r => { r.discrepancies = r.discrepancies.filter(d => d.attribution !== rootShadowAttribution); },
    r => { r.discrepancies.find(d => d.attribution === rootShadowAttribution).reviewEvidence.renderingEquivalent = true; },
    r => { r.discrepancies.find(d => d.attribution === rootShadowAttribution).reviewedCases.pop(); }]) {
    const changed = structuredClone(audit); mutate(changed);
    assert.ok(validateMaterialInputAudit(changed, { requireComplete: false }).some(e => e.includes('root shadow')));
  }
}));
