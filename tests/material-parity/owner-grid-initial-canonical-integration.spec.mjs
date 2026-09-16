import assert from 'node:assert/strict';
import { buttonBoxSizingAttribution } from './button-box-sizing-classification.mjs';
import test from 'node:test';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { buildMaterialInputAudit, validateMaterialInputAudit, renderMaterialInputAuditMarkdown } from './input-equivalence-audit.mjs';
import { ownerGridInitialAttribution } from './owner-grid-initial-classification.mjs';
import { nonGridTemplateAttribution } from './grid-template-input-evidence.mjs';
import { fieldHostLayoutAttribution, fieldHostWidthAttribution } from './field-host-layout-source-binding.mjs';

const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';
const baselineCommit = '364f46a309319201317919b6a23dd1aadd08f405';
const source = execFileSync('git', ['show', `${baselineCommit}:${moduleFile}`], { maxBuffer: 4 * 1024 * 1024 }).toString();
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
const moved = ts.createSourceFile(moduleFile, relocated, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(moved.statements.length, parsed.statements.length);
for (let i = 0; i < parsed.statements.length; i++) {
  const omitPath = (n, f) => ts.isImportDeclaration(n) ? n.getText(f).replace(n.moduleSpecifier.getText(f), '<import>') : n.getText(f);
  assert.equal(omitPath(parsed.statements[i], parsed), omitPath(moved.statements[i], moved));
}
const prior = await import(`data:text/javascript;base64,${Buffer.from(relocated).toString('base64')}`);
const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
const keyOf = (kind, e) => `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const selected = new Set();
const results = original.results.filter(e => {
  if (e.profile !== 'light' || e.viewport.id !== 'desktop' || selected.has(e.family)) return false;
  selected.add(e.family); return true;
});
const seen = new Set();
const interactions = original.interactions.filter(e => {
  if (!['chips', 'slider', 'datepicker', 'timepicker', 'tooltip', 'dialog', 'bottom-sheet'].includes(e.family)) return false;
  if (!['hover', 'held', 'focus', 'activate', 'activate-leave'].includes(e.state)) return false;
  const key = JSON.stringify([e.family, e.state, e.viewport.id]);
  if (seen.has(key)) return false; seen.add(key); return true;
});
const scalar = r => [r.family, r.element, r.property, r.reference, r.astylar, r.occurrences, r.cases, r.states];
const hash = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');

test('owner grid production integration preserves original scalars, earlier precedence and unrelated rows', () => {
  const directory = mkdtempSync(path.resolve('artifacts/material-parity/owner-grid-integration-'));
  try {
    assert.equal(selected.size, 36);
    assert.ok(interactions.length > 0);
    const raw = { ...original, results, interactions }, before = hash(raw);
    const file = path.join(directory, 'report.json'); writeFileSync(file, JSON.stringify(raw));
    const options = { root: process.cwd(), parityPath: file, supplementalRoot: directory };
    const previous = prior.buildMaterialInputAudit(raw, options);
    const audit = buildMaterialInputAudit(raw, options);
    const added = audit.discrepancies.filter(r => r.attribution === ownerGridInitialAttribution);
    assert.ok(added.length > 0, 'production builder must attribute independently reviewed grid observations');
    assert.equal(hash(raw), before);
    assert.deepEqual(audit.discrepancies.map(scalar), previous.discrepancies.map(scalar));
    const boxes = audit.discrepancies.filter(r => r.attribution === buttonBoxSizingAttribution);
    assert.equal(boxes.length, 9);
    assert.equal(boxes.reduce((n, r) => n + r.occurrences, 0), audit.buttonBoxSizingInputs.observations.length);
    const signatures = new Set([...added, ...boxes].map(r => JSON.stringify(scalar(r))));
    const old = previous.discrepancies.filter(r => signatures.has(JSON.stringify(scalar(r))));
    assert.equal(old.length, added.length + 9); assert.ok(old.every(r => r.attribution === 'unresolved'));
    for (const row of added) {
      const previousRow = old.find(r => JSON.stringify(scalar(r)) === JSON.stringify(scalar(row)));
      assert.deepEqual(row.referenceAuthoredExamples, previousRow.referenceAuthoredExamples);
      assert.deepEqual(row.astylarAuthoredExamples, previousRow.astylarAuthoredExamples);
      assert.equal(row.reference, 'none'); assert.equal(row.astylar, undefined);
      for (const flag of ['computedCandidateVerified', 'gridLayoutEquivalent', 'renderingEquivalent', 'wholeElementInputEquivalent'])
        assert.equal(row.reviewEvidence[flag], false);
    }
    // Keep the original grid/box-sizing precedence assertions above intact.
    // Check the later source-bound host changes explicitly before conservation.
    const fields = audit.discrepancies.filter(r => [fieldHostLayoutAttribution, fieldHostWidthAttribution].includes(r.attribution));
    assert.deepEqual([...new Set(fields.map(r => r.family))].sort(), ['autocomplete', 'datepicker', 'form-field', 'input', 'select', 'timepicker']);
    assert.equal(fields.reduce((n, r) => n + r.occurrences, 0), audit.fieldHostLayoutInputs.observations.length * 8);
    const previousFields = previous.discrepancies.filter(r => fields.some(f => JSON.stringify(scalar(f)) === JSON.stringify(scalar(r))));
    assert.equal(previousFields.length, fields.length);
    assert.equal(previousFields.filter(r => r.classification === 'equivalent-representation').length, 6);
    assert.ok(previousFields.filter(r => r.classification === 'equivalent-representation').every(r => r.property === 'minWidth'));
    assert.ok(previousFields.filter(r => r.classification !== 'equivalent-representation').every(r => r.classification === 'parity-harness-defect'));
    for (const row of fields) signatures.add(JSON.stringify(scalar(row)));
    const other = report => report.discrepancies.filter(r => !signatures.has(JSON.stringify(scalar(r))));
    assert.equal(hash(other(audit)), hash(other(previous)), 'complete unrelated rows unchanged');
    assert.deepEqual(audit.discrepancies.filter(r => r.attribution === nonGridTemplateAttribution),
      previous.discrepancies.filter(r => r.attribution === nonGridTemplateAttribution));
    const binding = audit.ownerGridInitialInputs;
    assert.equal(binding.binding.status, 'bound');
    assert.deepEqual(binding.captures.map(c => c.case), [
      ...results.map(e => keyOf('static', e)), ...interactions.map(e => keyOf('interaction', e)),
    ]);
    assert.ok(binding.observations.some(o => o.proof.issues.length), 'negative observations remain');
    assert.equal(audit.summary.inputEquivalent, false);
    assert.match(renderMaterialInputAuditMarkdown(audit), /Grid-template observation stages:/);
    assert.deepEqual(validateMaterialInputAudit(audit, { requireComplete: false }).filter(e => /owner grid|button box sizing|field-host layout/.test(e)), []);
    for (const mutate of [
      a => { delete a.ownerGridInitialInputs; },
      a => { a.ownerGridInitialInputs.observations.splice(a.ownerGridInitialInputs.observations.findIndex(o => o.proof.issues.length), 1); },
      a => { a.discrepancies.find(r => r.attribution === ownerGridInitialAttribution).reviewEvidence.gridLayoutEquivalent = true; },
      a => { a.summary.inputEquivalent = true; },
    ]) {
      const copy = structuredClone(audit); mutate(copy);
      assert.ok(validateMaterialInputAudit(copy, { requireComplete: false }).some(e => /owner grid/.test(e)));
    }
    console.log(JSON.stringify({ baselineCommit, staticCases: results.length, interactionCases: interactions.length,
      eligibleObservations: binding.observations.length, addedGroups: added.length,
      addedOccurrences: added.reduce((n, r) => n + r.occurrences, 0), laterBoxSizingGroups: boxes.length, laterFieldHostGroups: fields.length, unchangedScalarRows: audit.discrepancies.length,
      unchangedCompleteRows: other(audit).length, unchangedCompleteRowsSha256: hash(other(audit)),
      fullCanonicalConservationVerified: false, inputEquivalent: false }));
  } finally {
    assert.ok(directory.startsWith(path.resolve('artifacts/material-parity') + path.sep));
    rmSync(directory, { recursive: true, force: true });
  }
});
