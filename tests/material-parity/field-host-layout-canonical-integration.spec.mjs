import assert from 'node:assert/strict';
import test from 'node:test';
import { withAuditScratch } from './audit-scratch.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { buildMaterialInputAudit, validateMaterialInputAudit, renderMaterialInputAuditMarkdown } from './input-equivalence-audit.mjs';
import { fieldHostLayoutAttribution, fieldHostWidthAttribution } from './field-host-layout-source-binding.mjs';
import { assertLaterGapClassifications, assertLaterCaretClassifications } from './owner-gap-integration-conservation.mjs';

const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs', baselineCommit = 'f987b7f';
const source = execFileSync('git', ['show', `${baselineCommit}:${moduleFile}`], { maxBuffer: 4 * 1024 * 1024 }).toString();
const parsed = ts.createSourceFile(moduleFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const current = ts.createSourceFile(moduleFile, readFileSync(moduleFile, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const functionText = (f, name) => f.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name).getText(f);
for (const name of ['reviewedTemplateTextMappings', 'canonicalStyle', 'normalizeValue', 'formatNumber', 'equivalentValue', 'classifyStyleDifference'])
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
const families = new Set(['autocomplete', 'datepicker', 'form-field', 'input', 'select', 'timepicker']);
const negativeFamilies = new Set();
const results = original.results.filter(e => {
  if (families.has(e.family)) return true;
  if (e.profile !== 'light' || e.viewport.id !== 'desktop' || negativeFamilies.has(e.family)) return false;
  negativeFamilies.add(e.family); return true;
});
const interactions = original.interactions.filter(e => families.has(e.family));
const scalar = r => [r.family, r.element, r.property, r.reference, r.astylar, r.occurrences, r.cases, r.states];
const hash = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');

test('production field-host classification binds all source cases and supersedes only the verified generic rows', () => withAuditScratch('field-host-layout-integration-', directory => {
  const raw = { ...original, results, interactions }, before = hash(raw);
  assert.equal(negativeFamilies.size, 30); assert.equal(results.length, 102); assert.equal(interactions.length, 505);
  const file = path.join(directory, 'report.json'); writeFileSync(file, JSON.stringify(raw));
  const options = { root: process.cwd(), parityPath: file, supplementalRoot: directory };
  const previous = prior.buildMaterialInputAudit(raw, options), audit = buildMaterialInputAudit(raw, options);
  const selected = r => [fieldHostLayoutAttribution, fieldHostWidthAttribution].includes(r.attribution);
  const added = audit.discrepancies.filter(selected);
  assert.equal(added.length, 72); assert.equal(added.reduce((n, r) => n + r.occurrences, 0), 4616);
  assert.equal(added.filter(r => r.classification === 'application-plugin-authoring-defect').length, 54);
  assert.equal(added.filter(r => r.classification === 'parity-harness-defect').length, 18);
  assert.equal(hash(raw), before);
  assert.deepEqual(audit.discrepancies.map(scalar), previous.discrepancies.map(scalar));
  const signatures = new Set(added.map(r => JSON.stringify(scalar(r))));
  const old = previous.discrepancies.filter(r => signatures.has(JSON.stringify(scalar(r))));
  assert.equal(old.filter(r => r.attribution === 'unresolved').length, 48);
  assert.equal(old.filter(r => r.classification === 'equivalent-representation').length, 6);
  assert.ok(old.filter(r => r.classification === 'equivalent-representation').every(r => r.property === 'minWidth'));
  for (const row of added) {
    const priorRow = old.find(r => JSON.stringify(scalar(r)) === JSON.stringify(scalar(row)));
    assert.deepEqual(row.referenceAuthoredExamples, priorRow.referenceAuthoredExamples);
    assert.deepEqual(row.astylarAuthoredExamples, priorRow.astylarAuthoredExamples);
    for (const flag of ['inputEquivalent', 'computedCandidateVerified', 'rendererCauseProven', 'wholeElementInputEquivalent', 'originalRendererCauseProven'])
      assert.equal(row.reviewEvidence[flag], false);
  }
  for (const signature of assertLaterGapClassifications(audit, previous)) signatures.add(signature);
  for (const signature of assertLaterCaretClassifications(audit, previous)) signatures.add(signature);
  const other = report => report.discrepancies.filter(r => !signatures.has(JSON.stringify(scalar(r))));
  assert.equal(hash(other(audit)), hash(other(previous)), 'all unrelated complete rows unchanged');
  const binding = audit.fieldHostLayoutInputs;
  assert.equal(binding.binding.status, 'bound', binding.binding.error);
  assert.equal(binding.captures.length, 607); assert.equal(binding.observations.length, 577);
  assert.equal(binding.captures.filter(c => !c.selectedOwners.length).length, 30);
  assert.equal(binding.observations.filter(o => o.proof.geometry.status === 'measured-original-static-box').length, 72);
  assert.equal(binding.observations.filter(o => o.proof.geometry.status === 'original-capture-host-geometry-gap').length, 505);
  assert.deepEqual(audit.buttonBoxSizingInputs, previous.buttonBoxSizingInputs);
  assert.deepEqual(audit.ownerGridInitialInputs, previous.ownerGridInitialInputs);
  assert.equal(audit.summary.inputEquivalent, false);
  assert.match(renderMaterialInputAuditMarkdown(audit), /Field-host layout requests:/);
  assert.deepEqual(validateMaterialInputAudit(audit, { requireComplete: false }).filter(e => /field-host layout/.test(e)), []);
  // Broad detached-data mutations are covered by the source/coverage spec.
  // Here verify that the production validator actually calls those guards.
  const bad = { ...audit, fieldHostLayoutInputs: undefined };
  assert.ok(validateMaterialInputAudit(bad, { requireComplete: false }).some(e => /field-host layout/.test(e)));
  console.log(JSON.stringify({ baselineCommit, staticCases: results.length, interactionCases: interactions.length,
    originalHosts: 577, measuredCases: 72, geometryGapCases: 505, attributedGroups: 72, correctedEquivalenceGroups: 6,
    resolvedPreviouslyUnattributedGroups: 48, unchangedScalarRows: audit.discrepancies.length,
    unchangedCompleteRows: other(audit).length, unchangedCompleteRowsSha256: hash(other(audit)),
    fullCanonicalConservationVerified: false, inputEquivalent: false, temporaryDiagnosticCapture: file }));
}));
