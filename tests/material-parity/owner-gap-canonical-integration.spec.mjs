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
import { ownerGapAttribution } from './owner-gap-classification.mjs';
import { explicitGapAttribution } from './explicit-gap-classification.mjs';
import { gapReviewAttributions } from './gap-review-classification.mjs';
import { assertLaterGapClassifications, assertLaterCaretClassifications, gapScalarProjection as scalar } from './owner-gap-integration-conservation.mjs';

const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';
const baselineCommit = 'cab0cc3cc53b3728bb4022b89e0fe47168c18bae';
const source = execFileSync('git', ['show', `${baselineCommit}:${moduleFile}`], { maxBuffer: 4 * 1024 * 1024 }).toString();
const parsed = ts.createSourceFile(moduleFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const current = ts.createSourceFile(moduleFile, readFileSync(moduleFile, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const functionText = (file, name) => file.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name).getText(file);
for (const name of ['reviewedTemplateTextMappings', 'canonicalStyle', 'normalizeValue', 'formatNumber',
  'equivalentValue', 'classifyStyleDifference'])
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
const seen = new Set(), results = original.results.filter(e => {
  if (e.profile !== 'light' || e.viewport.id !== 'desktop' || seen.has(e.family)) return false;
  seen.add(e.family); return true;
});
const interactionKeys = new Set(), interactions = original.interactions.filter(e => {
  if (!['chips', 'slider', 'datepicker', 'timepicker', 'tooltip', 'dialog', 'bottom-sheet', 'snack-bar', 'stepper'].includes(e.family)) return false;
  if (!['hover', 'held', 'focus', 'activate', 'activate-leave', 'open', 'open-hover-content'].includes(e.state)) return false;
  const key = JSON.stringify([e.family, e.state, e.viewport.id]);
  if (interactionKeys.has(key)) return false; interactionKeys.add(key); return true;
});
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('owner gap production integration preserves all scalars prior precedence and unrelated complete rows', () => withAuditScratch('owner-gap-integration-', directory => {
  assert.equal(seen.size, 36); assert.ok(interactions.length > 0);
  const raw = { ...original, results, interactions }, before = hash(raw);
  const file = path.join(directory, 'report.json'); writeFileSync(file, JSON.stringify(raw));
  const options = { root: process.cwd(), parityPath: file, supplementalRoot: directory };
  const previous = prior.buildMaterialInputAudit(raw, options), audit = buildMaterialInputAudit(raw, options);
  const selected = assertLaterGapClassifications(audit, previous);
  assert.ok(selected.size > 0);
  assert.equal(hash(raw), before);
  assert.deepEqual(audit.discrepancies.map(scalar), previous.discrepancies.map(scalar));
  const laterCarets = assertLaterCaretClassifications(audit, previous);
  assert.equal(laterCarets.size, 55);
  assert.equal(audit.ownerCaretInputs.plannedCoverage.reviewedObservations, 169);
  assert.equal(audit.ownerCaretInputs.plannedCoverage.pendingObservations, 143);
  assert.ok([...laterCarets].every(signature => !selected.has(signature)),
    'authenticated caret reviews cannot replace original gap classifications');
  const other = report => report.discrepancies.filter(row => {
    const signature = JSON.stringify(scalar(row));
    return !selected.has(signature) && !laterCarets.has(signature);
  });
  assert.equal(other(audit).length, 6390);
  assert.equal(hash(other(audit)), hash(other(previous)), 'every unrelated complete row remains identical');
  const added = audit.discrepancies.filter(row => row.attribution === ownerGapAttribution);
  const explicit = audit.discrepancies.filter(row => row.attribution === explicitGapAttribution);
  const reviewed = audit.discrepancies.filter(row => Object.values(gapReviewAttributions).includes(row.attribution));
  assert.equal(explicit.length, 16, 'all eight explicit-spacing owners are present in this historical diagnostic');
  assert.equal(reviewed.length, 36, 'all eighteen bounded review owners are present in this historical diagnostic');
  assert.equal(selected.size, added.length + explicit.length + reviewed.length);
  assert.equal(added.reduce((n, row) => n + row.occurrences, 0),
    audit.ownerGapInputs.observations.filter(o => !o.proof.issues.length).length);
  assert.ok(audit.ownerGapInputs.observations.some(o => o.proof.issues.length), 'negative cases remain present');
  assert.equal(audit.summary.inputEquivalent, false);
  assert.match(renderMaterialInputAuditMarkdown(audit), /Gap observation stages:/);
  assert.deepEqual(validateMaterialInputAudit(audit, { requireComplete: false }).filter(e => /owner gap/.test(e)), []);
  // Detailed mutations belong to the complete source/coverage tests. These
  // checks establish that the production validator actually invokes them.
  for (const mutate of [
    a => { delete a.ownerGapInputs; },
    a => { a.discrepancies = a.discrepancies.filter(row => row.attribution !== ownerGapAttribution); },
    a => { a.summary.inputEquivalent = true; },
  ]) {
    const changed = structuredClone(audit); mutate(changed);
    assert.ok(validateMaterialInputAudit(changed, { requireComplete: false }).some(e => /owner gap/.test(e)));
  }
  // A historical guard may account for later findings only after their own
  // independent original-source and full-membership checks; no broad gap skip.
  for (const mutate of [
    a => { delete a.explicitGapInputs; },
    a => { a.explicitGapInputs.observations.pop(); },
    a => { a.explicitGapInputs.groups.pop(); },
    a => { a.explicitGapInputs.binding.proof.sha256 = '0'.repeat(64); },
    a => { a.discrepancies = a.discrepancies.filter(row => row.attribution !== explicitGapAttribution); },
    a => { a.discrepancies.find(row => row.attribution === explicitGapAttribution).reviewedCases.pop(); },
    a => { a.discrepancies.find(row => row.attribution === explicitGapAttribution).astylar = '99px'; },
    a => { a.discrepancies.find(row => row.attribution === explicitGapAttribution).reviewEvidence.rendererCauseProven = true; },
    a => { delete a.gapReviewInputs; },
    a => { a.gapReviewInputs.observations.pop(); },
    a => { a.gapReviewInputs.groups.pop(); },
    a => { a.gapReviewInputs.binding.proof.sha256 = '0'.repeat(64); },
    a => { a.discrepancies = a.discrepancies.filter(row => !Object.values(gapReviewAttributions).includes(row.attribution)); },
    a => { a.discrepancies.find(row => Object.values(gapReviewAttributions).includes(row.attribution)).reviewedCases.pop(); },
    a => { a.discrepancies.find(row => Object.values(gapReviewAttributions).includes(row.attribution)).astylar = '<omitted>'; },
    a => { a.discrepancies.find(row => Object.values(gapReviewAttributions).includes(row.attribution)).reviewEvidence.rendererCauseProven = true; },
  ]) {
    const changed = structuredClone(audit); mutate(changed);
    assert.throws(() => assertLaterGapClassifications(changed, previous));
  }
  console.log(JSON.stringify({ baselineCommit, staticCases: results.length, interactionCases: interactions.length,
    originalObservations: audit.ownerGapInputs.observations.length, attributedGroups: added.length,
    laterExplicitGroups: explicit.length, laterExplicitObservations: explicit.reduce((n, row) => n + row.occurrences, 0),
    laterReviewedGroups: reviewed.length, laterReviewedObservations: reviewed.reduce((n, row) => n + row.occurrences, 0),
    attributedOccurrences: added.reduce((n, row) => n + row.occurrences, 0), unchangedScalarRows: audit.discrepancies.length,
    independentlyVerifiedLaterCaretGroups: laterCarets.size,
    independentlyVerifiedLaterCaretObservations: audit.ownerCaretInputs.plannedCoverage.reviewedObservations,
    retainedPendingCaretObservations: audit.ownerCaretInputs.plannedCoverage.pendingObservations,
    unchangedCompleteRows: other(audit).length, unchangedCompleteRowsSha256: hash(other(audit)),
    fullCanonicalConservationVerified: false, inputEquivalent: false, temporaryDiagnosticCapture: file }));
}));
