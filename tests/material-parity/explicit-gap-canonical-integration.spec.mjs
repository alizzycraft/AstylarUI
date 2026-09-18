import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import test from 'node:test';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { buildMaterialInputAudit, validateMaterialInputAudit, renderMaterialInputAuditMarkdown }
  from './input-equivalence-audit.mjs';
import { explicitGapAttribution } from './explicit-gap-classification.mjs';
import { assertLaterCaretClassifications } from './owner-gap-integration-conservation.mjs';
import { independentlyReconstructBeforeReviewedInputs } from './later-reviewed-input-conservation.mjs';

const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';
const baselineCommit = '3abdb781279462cd1ca1a78e8cf2b6cdc618f3b5';
const source = execFileSync('git', ['show', `${baselineCommit}:${moduleFile}`], { maxBuffer: 4 * 1024 * 1024 }).toString('utf8');
const parsed = ts.createSourceFile(moduleFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const current = ts.createSourceFile(moduleFile, readFileSync(moduleFile, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const functionText = (file, name) => file.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name).getText(file);
for (const name of ['reviewedTemplateTextMappings', 'canonicalStyle', 'normalizeValue', 'formatNumber', 'equivalentValue'])
  assert.equal(functionText(current, name), functionText(parsed, name), `unchanged production ${name}`);
let relocated = source;
for (const node of [...parsed.statements.filter(ts.isImportDeclaration)].reverse()) {
  if (!node.moduleSpecifier.text.startsWith('./')) continue;
  const specifier = node.moduleSpecifier;
  const url = new URL(specifier.text, pathToFileURL(path.resolve(moduleFile))).href;
  relocated = relocated.slice(0, specifier.getStart(parsed)) + JSON.stringify(url) + relocated.slice(specifier.end);
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
const proof = JSON.parse(readFileSync('docs/material-explicit-gap-canonical-binding.json'));
const owner = (family, element) => JSON.stringify([family, element]);
const owners = new Set(proof.rows.map(r => owner(r.family, r.element)));
const select = entries => entries.filter(e => e.styleInputs.some(i => owners.has(owner(e.family, i.id))))
  .map(e => ({ ...e, styleInputs: e.styleInputs.filter(i => owners.has(owner(e.family, i.id)) || i.id === `${e.family}-root`) }));
const scalar = r => [r.family, r.element, r.property, r.reference, r.astylar, r.occurrences, r.cases, r.states];
const identity = r => JSON.stringify([r.family, r.element, r.property]);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('production explicit-gap integration preserves every scalar and all unrelated complete findings', () => {
  const directory = mkdtempSync(path.resolve('artifacts/material-parity/explicit-gap-integration-'));
  try {
    const raw = { ...original, results: select(original.results), interactions: select(original.interactions) };
    assert.equal(raw.results.length + raw.interactions.length, 296);
    const rawHash = hash(raw), file = path.join(directory, 'report.json');
    writeFileSync(file, JSON.stringify(raw));
    const options = { root: process.cwd(), parityPath: file, supplementalRoot: directory };
    const previous = prior.buildMaterialInputAudit(raw, options), audit = buildMaterialInputAudit(raw, options);
    const rows = audit.discrepancies.filter(r => r.attribution === explicitGapAttribution);
    assert.equal(rows.length, 16, 'all existing explicit-gap findings integrated');
    assert.equal(rows.reduce((n, r) => n + r.occurrences, 0), 1032);
    assert.equal(audit.explicitGapInputs.coverage.complete, true);
    assert.equal(audit.explicitGapInputs.observations.length, 1032);
    assert.equal(audit.summary.inputEquivalent, false);
    assert.equal(hash(raw), rawHash, 'original raw input unchanged');
    assert.deepEqual(audit.discrepancies.map(scalar), previous.discrepancies.map(scalar));
    const keys = new Set(rows.map(identity)), old = previous.discrepancies.filter(r => keys.has(identity(r)));
    assert.equal(old.length, 16); assert.ok(old.every(r => r.attribution === 'unresolved'));
    for (const row of rows) {
      const before = old.find(r => identity(r) === identity(row));
      assert.deepEqual(row.referenceAuthoredExamples, before.referenceAuthoredExamples);
      assert.deepEqual(row.astylarAuthoredExamples, before.astylarAuthoredExamples);
      assert.equal(row.classification, 'application-plugin-authoring-defect');
      assert.equal(row.reviewEvidence.inputEquivalent, false);
      assert.equal(row.reviewEvidence.rendererCauseProven, false);
    }
    // This historical baseline predates nine independently source-bound caret
    // reviews. Validate that exact metadata-only delta, not a broad property
    // exemption; all raw inputs and remaining complete rows stay conserved.
    const laterCaret = assertLaterCaretClassifications(audit, previous, { root: process.cwd(), requireComplete: false });
    assert.equal(laterCaret.size, 9);
    assert.equal(audit.ownerCaretInputs.plannedCoverage.reviewedObservations, 332);
    assert.equal(audit.ownerCaretInputs.plannedCoverage.pendingObservations, 184);
    assert.ok(rows.every(r => !laterCaret.has(JSON.stringify(scalar(r)))));
    // Reconstruct only independently source-bound later metadata. Preserve all
    // original scalar assertions and the complete unrelated-row digest below.
    const restored = independentlyReconstructBeforeReviewedInputs(audit, previous);
    assert.equal(restored.changes.length, 13);
    assert.equal(restored.changes.reduce((n, r) => n + r.occurrences, 0), 424);
    const others = report => (report === audit ? restored.rows : report.discrepancies)
      .filter(r => !keys.has(identity(r)) && !laterCaret.has(JSON.stringify(scalar(r))));
    assert.ok(isDeepStrictEqual(others(audit), others(previous)), 'all unrelated complete findings unchanged');
    assert.equal(others(audit).length, 867);
    assert.equal(hash(others(audit)), '148228a933f26e3b3e1ff6604bd175717194c4cbd57012f463fe8d1d70f1704b');
    assert.match(renderMaterialInputAuditMarkdown(audit), /Explicit gap composition: 1032[^\n]*16/);
    assert.deepEqual(validateMaterialInputAudit(audit, { requireComplete: false }).filter(e => /explicit gap/i.test(e)), []);
    for (const mutate of [
      report => { delete report.explicitGapInputs; },
      report => { report.explicitGapInputs.observations.pop(); },
      report => { report.discrepancies = report.discrepancies.filter(r => identity(r) !== identity(rows[0])); },
    ]) {
      const copy = structuredClone(audit); mutate(copy);
      assert.ok(validateMaterialInputAudit(copy, { requireComplete: false }).some(e => /explicit gap/i.test(e)));
    }
    console.log(JSON.stringify({ baselineCommit, diagnosticCases: 296, attributedGroups: 16,
      attributedObservations: 1032, unchangedScalarRows: audit.discrepancies.length,
      laterCaretGroups: laterCaret.size, laterCaretObservations: 332, pendingCaretObservationsRetained: 184,
      laterReviewedInputGroups: restored.changes.length, laterReviewedInputObservations: 424,
      unchangedCompleteRows: others(audit).length, unchangedCompleteRowsSha256: hash(others(audit)),
      inputEquivalent: false, limitation: 'Complete explicit-gap population through production normalization and precedence; full unrelated-family canonical conservation and enforced parity remain separate.' }));
  } finally {
    assert.ok(directory.startsWith(path.resolve('artifacts/material-parity') + path.sep));
    rmSync(directory, { recursive: true, force: true });
  }
});
