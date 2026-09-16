import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { buildMaterialInputAudit, validateMaterialInputAudit,
  renderMaterialInputAuditMarkdown } from './input-equivalence-audit.mjs';
import { buttonFixedWidthAttribution } from './button-fixed-width-classification.mjs';
import { selectedButtonInputs } from './button-pill-radius-evidence.mjs';

const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';
const baselineCommit = '30357b9f8c7b95da668914032557c5f7416c81db';
const source = execFileSync('git', ['show', `${baselineCommit}:${moduleFile}`], { maxBuffer: 4 * 1024 * 1024 }).toString('utf8');
const parsed = ts.createSourceFile(moduleFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const current = ts.createSourceFile(moduleFile, readFileSync(moduleFile, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const functionText = (f, name) => f.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name).getText(f);
for (const name of ['reviewedTemplateTextMappings', 'canonicalStyle', 'normalizeValue', 'formatNumber', 'equivalentValue'])
  assert.equal(functionText(current, name), functionText(parsed, name), `unchanged production ${name}`);
let relocated = source;
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
const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
const select = rows => rows.filter(e => selectedButtonInputs(e).length).map(e => {
  const ids = new Set(selectedButtonInputs(e).map(i => i.id)); ids.add(e.family + '-root');
  return { ...e, styleInputs: e.styleInputs.filter(i => ids.has(i.id)) };
});
const scalar = r => [r.family, r.element, r.property, r.reference, r.astylar, r.occurrences, r.cases, r.states];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('button fixed widths production integration preserves matching authoring and prior unrelated rows', () => {
  const directory = mkdtempSync(path.resolve('artifacts/material-parity/button-fixed-width-integration-'));
  try {
    const raw = { ...original, results: select(original.results), interactions: select(original.interactions) };
    assert.equal(raw.results.length + raw.interactions.length, 480);
    assert.equal([...raw.results, ...raw.interactions].flatMap(selectedButtonInputs).length, 600);
    const file = path.join(directory, 'report.json'); writeFileSync(file, JSON.stringify(raw));
    const options = { root: process.cwd(), parityPath: file, supplementalRoot: directory };
    const inputBefore = structuredClone(raw), previous = prior.buildMaterialInputAudit(raw, options);
    const audit = buildMaterialInputAudit(raw, options);
    const rows = audit.discrepancies.filter(r => r.attribution === buttonFixedWidthAttribution);
    assert.equal(rows.length, 8);
    assert.equal(rows.reduce((n, r) => n + r.occurrences, 0), 548);
    assert.equal(audit.buttonFixedWidthInputs.observations.length, 600);
    assert.equal(audit.buttonFixedWidthInputs.groups.length, 9);
    const core = audit.buttonFixedWidthInputs.groups.find(g => g.element === 'core-primary');
    assert.equal(core.occurrences, 52); assert.equal(core.inputEquivalent, false);
    assert.equal(core.referenceAuthoredWidth, '<omitted>');
    assert.equal(core.referenceComputedWidth, '212.234px'); assert.equal(core.candidateAuthoredWidth, '212.234375px');
    for (const r of [previous, audit]) assert.equal(r.discrepancies.filter(d => d.element === 'core-primary' && d.property === 'width').length, 0);
    assert.deepEqual(raw, inputBefore);
    assert.deepEqual(audit.discrepancies.map(scalar), previous.discrepancies.map(scalar));
    const keys = new Set(rows.map(r => JSON.stringify(scalar(r))));
    const old = previous.discrepancies.filter(r => keys.has(JSON.stringify(scalar(r))));
    assert.equal(old.length, 8); assert.ok(old.every(r => r.attribution === 'unresolved'));
    for (const row of rows) {
      const before = old.find(r => JSON.stringify(scalar(r)) === JSON.stringify(scalar(row)));
      assert.deepEqual(row.referenceAuthoredExamples, before.referenceAuthoredExamples);
      assert.deepEqual(row.astylarAuthoredExamples, before.astylarAuthoredExamples);
    }
    const others = r => r.discrepancies.filter(d => !keys.has(JSON.stringify(scalar(d))));
    assert.deepEqual(others(audit), others(previous));
    assert.match(renderMaterialInputAuditMarkdown(audit), /Fixed button width authoring: 600[^\n]*9[^\n]*52/);
    const errors = validateMaterialInputAudit(audit, { requireComplete: false });
    assert.deepEqual(errors.filter(e => /button fixed width/.test(e)), []);
    for (const mutate of [r => { delete r.buttonFixedWidthInputs; }, r => {
      r.buttonFixedWidthInputs.observations = r.buttonFixedWidthInputs.observations.filter(o => o.element !== 'core-primary');
      r.buttonFixedWidthInputs.groups = r.buttonFixedWidthInputs.groups.filter(g => g.element !== 'core-primary');
    }]) {
      const copy = structuredClone(audit); mutate(copy);
      const invalid = validateMaterialInputAudit(copy, { requireComplete: false });
      assert.ok(invalid.some(e => /button fixed width/.test(e)));
    }
    console.log(JSON.stringify({ baselineCommit, diagnosticCases: 480, sourceBoundOwners: 600,
      authoringGroups: 9, retainedScalarMatchingOwners: 52, attributedScalarGroups: rows.length,
      attributedScalarObservations: 548, unchangedScalarRows: audit.discrepancies.length,
      unchangedCompleteRows: others(audit).length, unchangedCompleteRowsSha256: hash(JSON.stringify(others(audit))),
      inputEquivalent: false, limitation: 'Actual production normalization/precedence with all original button owners; full unrelated-family report conservation and final enforced matrix remain separate.' }));
  } finally {
    assert.ok(directory.startsWith(path.resolve('artifacts/material-parity') + path.sep));
    rmSync(directory, { recursive: true, force: true });
  }
});
