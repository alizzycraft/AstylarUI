import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import test from 'node:test';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { buildMaterialInputAudit, validateMaterialInputAudit, renderMaterialInputAuditMarkdown } from './input-equivalence-audit.mjs';
import { gapReviewAttributions } from './gap-review-classification.mjs';
import { assertLaterCaretClassifications } from './owner-gap-integration-conservation.mjs';

const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';
const baselineCommit = '3ebcff3e8f7bdfe7ecd9e00a4c2acbd11fefdc4a';
const source = execFileSync('git', ['show', `${baselineCommit}:${moduleFile}`], { maxBuffer: 4 * 1024 * 1024 }).toString('utf8');
const parsed = ts.createSourceFile(moduleFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const current = ts.createSourceFile(moduleFile, readFileSync(moduleFile, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const functionText = (file, name) => file.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name).getText(file);
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
  const withoutPath = (node, file) => ts.isImportDeclaration(node)
    ? node.getText(file).replace(node.moduleSpecifier.getText(file), '<import>') : node.getText(file);
  assert.equal(withoutPath(parsed.statements[i], parsed), withoutPath(relocatedFile.statements[i], relocatedFile));
}
const prior = await import(`data:text/javascript;base64,${Buffer.from(relocated).toString('base64')}`);
const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
const proof = JSON.parse(readFileSync('docs/material-gap-review-membership.json'));
const owner = (family, element) => JSON.stringify([family, element]);
const owners = new Set(proof.rows.map(r => owner(r.family, r.element)));
const select = entries => entries.filter(e => e.styleInputs.some(i => owners.has(owner(e.family, i.id))))
  .map(e => ({ ...e, styleInputs: e.styleInputs.filter(i => owners.has(owner(e.family, i.id)) || i.id === `${e.family}-root`) }));
const scalar = r => [r.family, r.element, r.property, r.reference, r.astylar, r.occurrences, r.cases, r.states];
const identity = r => JSON.stringify([r.family, r.element, r.property]);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const attributed = r => Object.values(gapReviewAttributions).includes(r.attribution);

test('production gap review integration preserves complete original inputs prior findings and unresolved motion', () => {
  const directory = mkdtempSync(path.resolve('artifacts/material-parity/gap-review-integration-'));
  try {
    const raw = { ...original, results: select(original.results), interactions: select(original.interactions) };
    assert.equal(raw.results.length + raw.interactions.length, 676);
    const rawHash = hash(raw), file = path.join(directory, 'report.json'); writeFileSync(file, JSON.stringify(raw));
    const options = { root: process.cwd(), parityPath: file, supplementalRoot: directory };
    const previous = prior.buildMaterialInputAudit(raw, options), audit = buildMaterialInputAudit(raw, options);
    const rows = audit.discrepancies.filter(attributed);
    assert.equal(rows.length, 36, 'all bounded gap review findings integrated');
    assert.equal(rows.reduce((n, r) => n + r.occurrences, 0), 1838);
    assert.equal(audit.gapReviewInputs.coverage.complete, true);
    assert.equal(audit.gapReviewInputs.observations.length, 1902);
    assert.equal(audit.gapReviewInputs.coverage.unresolvedObservations, 64);
    assert.equal(audit.summary.inputEquivalent, false); assert.equal(hash(raw), rawHash, 'original input unchanged');
    assert.deepEqual(audit.discrepancies.map(scalar), previous.discrepancies.map(scalar));
    const keys = new Set(rows.map(identity)), old = previous.discrepancies.filter(r => keys.has(identity(r)));
    assert.equal(old.length, 36); assert.ok(old.every(r => r.attribution === 'unresolved'));
    for (const row of rows) {
      const before = old.find(r => identity(r) === identity(row));
      assert.deepEqual(row.referenceAuthoredExamples, before.referenceAuthoredExamples);
      assert.deepEqual(row.astylarAuthoredExamples, before.astylarAuthoredExamples);
      assert.equal(row.classification, 'parity-harness-defect');
      assert.equal(row.reviewEvidence.inputEquivalent, false); assert.equal(row.reviewEvidence.rendererCauseProven, false);
    }
    // The original gap baseline predates these exact source-authenticated
    // caret metadata reviews. No other property or unexplained row is exempt.
    const laterCaret = assertLaterCaretClassifications(audit, previous, { root: process.cwd(), requireComplete: false });
    assert.equal(laterCaret.size, 32);
    assert.equal(audit.ownerCaretInputs.plannedCoverage.reviewedObservations, 796);
    assert.equal(audit.ownerCaretInputs.plannedCoverage.pendingObservations, 155);
    assert.ok(rows.every(r => !laterCaret.has(JSON.stringify(scalar(r)))));
    const others = report => report.discrepancies.filter(r => !keys.has(identity(r)) && !laterCaret.has(JSON.stringify(scalar(r))));
    assert.ok(isDeepStrictEqual(others(audit), others(previous)), 'all unrelated complete findings unchanged');
    assert.equal(others(audit).length, 2105);
    assert.equal(hash(others(audit)), 'e778dbd5ecca5dcd92e135ea75089295d84a5aaa563f5b5550cf0d0195e9203c');
    const pending = audit.discrepancies.filter(r => r.family === 'dialog' && r.element === 'dialog-panel' && ['rowGap', 'columnGap'].includes(r.property));
    assert.equal(pending.length, 2); assert.ok(pending.every(r => r.attribution === 'unresolved'));
    assert.deepEqual(pending, previous.discrepancies.filter(r => r.family === 'dialog' && r.element === 'dialog-panel' && ['rowGap', 'columnGap'].includes(r.property)));
    assert.equal(pending.reduce((n, r) => n + r.occurrences, 0), 64);
    assert.match(renderMaterialInputAuditMarkdown(audit), /Bounded gap reviews: 1902[^\n]*36/);
    assert.deepEqual(validateMaterialInputAudit(audit, { requireComplete: false }).filter(e => /gap review/i.test(e)), []);
    for (const mutate of [
      r => { delete r.gapReviewInputs; }, r => { r.gapReviewInputs.observations.pop(); },
      r => { r.discrepancies = r.discrepancies.filter(d => identity(d) !== identity(rows[0])); },
      r => { r.discrepancies.find(attributed).reviewEvidence.inputEquivalent = true; },
    ]) {
      const copy = structuredClone(audit); mutate(copy);
      assert.ok(validateMaterialInputAudit(copy, { requireComplete: false }).some(e => /gap review/i.test(e)));
    }
    console.log(JSON.stringify({ baselineCommit, diagnosticCases: 676, attributedGroups: 36,
      attributedObservations: 1838, unresolvedMotionObservations: 64, unchangedScalarRows: audit.discrepancies.length,
      laterCaretGroups: laterCaret.size, laterCaretObservations: 796, pendingCaretObservationsRetained: 155,
      unchangedCompleteRows: others(audit).length, unchangedCompleteRowsSha256: hash(others(audit)),
      inputEquivalent: false, fullCanonicalConservationVerified: false }));
  } finally {
    const boundary = path.resolve('artifacts/material-parity') + path.sep;
    assert.ok(directory.startsWith(boundary)); rmSync(directory, { recursive: true, force: true });
  }
});
