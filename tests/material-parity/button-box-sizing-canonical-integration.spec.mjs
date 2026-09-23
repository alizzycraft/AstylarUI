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
import { buttonBoxSizingAttribution } from './button-box-sizing-classification.mjs';
import { selectedButtonInputs } from './button-pill-radius-evidence.mjs';
import { fieldHostLayoutAttribution, fieldHostWidthAttribution } from './field-host-layout-source-binding.mjs';
import { assertLaterGapClassifications, assertLaterCaretClassifications } from './owner-gap-integration-conservation.mjs';
import { independentlyReconstructBeforeReviewedInputs } from './later-reviewed-input-conservation.mjs';

const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs', baselineCommit = '0165f76';
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
const selected = new Set(), results = original.results.filter(e => {
  if (e.profile !== 'light' || e.viewport.id !== 'desktop' || selected.has(e.family)) return false;
  selected.add(e.family); return true;
});
const seen = new Set(), interactions = original.interactions.filter(e => {
  if (!selectedButtonInputs(e).length) return false;
  const key = JSON.stringify([e.family, e.state]);
  if (seen.has(key)) return false; seen.add(key); return true;
});
const scalar = r => [r.family, r.element, r.property, r.reference, r.astylar, r.occurrences, r.cases, r.states];
const hash = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');

test('button box sizing production integration preserves all scalar inputs earlier precedence and measurement gaps', () => withAuditScratch('button-box-sizing-integration-', directory => {
  assert.equal(selected.size, 36); assert.ok(interactions.length > 0);
  const raw = { ...original, results, interactions }, before = hash(raw);
  const file = path.join(directory, 'report.json'); writeFileSync(file, JSON.stringify(raw));
  const options = { root: process.cwd(), parityPath: file, supplementalRoot: directory };
  const previous = prior.buildMaterialInputAudit(raw, options), audit = buildMaterialInputAudit(raw, options);
  const added = audit.discrepancies.filter(r => r.attribution === buttonBoxSizingAttribution);
  assert.equal(added.length, 9, 'production builder must retain every reviewed shared-button box-sizing owner');
  assert.equal(hash(raw), before);
  assert.deepEqual(audit.discrepancies.map(scalar), previous.discrepancies.map(scalar));
  const signatures = new Set(added.map(r => JSON.stringify(scalar(r))));
  const old = previous.discrepancies.filter(r => signatures.has(JSON.stringify(scalar(r))));
  assert.equal(old.length, 9); assert.ok(old.every(r => r.attribution === 'unresolved'));
  for (const row of added) {
    const previousRow = old.find(r => JSON.stringify(scalar(r)) === JSON.stringify(scalar(row)));
    assert.deepEqual(row.referenceAuthoredExamples, previousRow.referenceAuthoredExamples);
    assert.deepEqual(row.astylarAuthoredExamples, previousRow.astylarAuthoredExamples);
    assert.equal(row.reference, 'border-box'); assert.equal(row.astylar, undefined);
    for (const flag of ['computedCandidateVerified', 'interactionGeometryVerified', 'fullLayoutVerified',
      'wholeElementInputEquivalent', 'widthAuthoringEquivalent', 'inputEquivalent', 'renderingEquivalent'])
      assert.equal(row.reviewEvidence[flag], false);
  }
  // Retain the original nine-group proof above. Later field-host attribution
  // must be independently replayed, not treated as an arbitrary ignored diff.
  const fields = audit.discrepancies.filter(r => [fieldHostLayoutAttribution, fieldHostWidthAttribution].includes(r.attribution));
  assert.equal(fields.length, 48);
  assert.equal(audit.fieldHostLayoutInputs.observations.length, 6);
  assert.equal(fields.reduce((n, r) => n + r.occurrences, 0), 48);
  assert.equal(fields.filter(r => r.attribution === fieldHostWidthAttribution).length, 6);
  const previousFields = previous.discrepancies.filter(r => fields.some(f => JSON.stringify(scalar(f)) === JSON.stringify(scalar(r))));
  assert.equal(previousFields.length, 48);
  assert.equal(previousFields.filter(r => r.classification === 'equivalent-representation').length, 6);
  assert.ok(previousFields.filter(r => r.classification === 'equivalent-representation').every(r => r.property === 'minWidth'));
  assert.ok(previousFields.filter(r => r.classification !== 'equivalent-representation').every(r => r.classification === 'parity-harness-defect'));
  for (const row of fields) signatures.add(JSON.stringify(scalar(row)));
  for (const signature of assertLaterGapClassifications(audit, previous)) signatures.add(signature);
  const laterCarets = assertLaterCaretClassifications(audit, previous);
  assert.equal(laterCarets.size, 55);
  assert.equal(audit.ownerCaretInputs.plannedCoverage.reviewedObservations, 119);
  assert.equal(audit.ownerCaretInputs.plannedCoverage.pendingObservations, 53);
  assert.ok([...laterCarets].every(signature => !signatures.has(signature)),
    'authenticated later caret reviews cannot replace original box, field-host or gap proofs');
  for (const signature of laterCarets) signatures.add(signature);
  const restored = independentlyReconstructBeforeReviewedInputs(audit, previous);
  assert.equal(restored.changes.length, 59);
  assert.equal(restored.changes.reduce((n, r) => n + r.occurrences, 0), 76);
  const other = report => (report === audit ? restored.rows : report.discrepancies)
    .filter(r => !signatures.has(JSON.stringify(scalar(r))));
  assert.equal(other(audit).length, 6282);
  assert.equal(hash(other(audit)), hash(other(previous)), 'complete unrelated rows unchanged');
  const binding = audit.buttonBoxSizingInputs;
  assert.equal(binding.binding.status, 'bound');
  assert.equal(binding.captures.length, results.length + interactions.length);
  assert.ok(binding.captures.some(c => c.selectedOwners.length === 0), 'negative families remain');
  assert.equal(binding.observations.filter(o => o.proof.observedDeclaredBorderBox).length, 9);
  assert.ok(binding.observations.some(o => !o.proof.observedDeclaredBorderBox), 'interaction geometry gaps remain');
  assert.equal(binding.observations.length, added.reduce((n, r) => n + r.occurrences, 0));
  assert.deepEqual(audit.buttonFixedWidthInputs, previous.buttonFixedWidthInputs);
  assert.deepEqual(audit.ownerGridInitialInputs, previous.ownerGridInitialInputs);
  assert.equal(audit.summary.inputEquivalent, false);
  assert.match(renderMaterialInputAuditMarkdown(audit), /Button box-sizing observation stages:/);
  assert.deepEqual(validateMaterialInputAudit(audit, { requireComplete: false }).filter(e => /button box sizing|field-host layout/.test(e)), []);
  for (const mutate of [
    a => { delete a.buttonBoxSizingInputs; },
    a => { a.buttonBoxSizingInputs.observations.splice(a.buttonBoxSizingInputs.observations.findIndex(o => !o.proof.observedDeclaredBorderBox), 1); },
    a => { a.discrepancies.find(r => r.attribution === buttonBoxSizingAttribution).reviewEvidence.fullLayoutVerified = true; },
    a => { a.summary.inputEquivalent = true; },
  ]) {
    const copy = structuredClone(audit); mutate(copy);
    assert.ok(validateMaterialInputAudit(copy, { requireComplete: false }).some(e => /button box sizing/.test(e)));
  }
  console.log(JSON.stringify({ baselineCommit, staticCases: results.length, interactionCases: interactions.length,
    originalOwners: binding.observations.length, measuredCases: 9,
    geometryGapCases: binding.observations.filter(o => !o.proof.observedDeclaredBorderBox).length,
    addedGroups: added.length, laterFieldHostGroups: fields.length, unchangedScalarRows: audit.discrepancies.length,
    independentlyVerifiedLaterCaretGroups: laterCarets.size,
    independentlyVerifiedLaterCaretObservations: audit.ownerCaretInputs.plannedCoverage.reviewedObservations,
    retainedPendingCaretObservations: audit.ownerCaretInputs.plannedCoverage.pendingObservations,
    independentlyVerifiedLaterInputGroups: restored.changes.length, independentlyVerifiedLaterInputObservations: 76,
    unchangedCompleteRows: other(audit).length, unchangedCompleteRowsSha256: hash(other(audit)),
    fullCanonicalConservationVerified: false, inputEquivalent: false, temporaryDiagnosticCapture: file }));
}));
