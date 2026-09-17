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
import { ownerCaretAttributions } from './owner-caret-classification.mjs';

const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';
const baselineCommit = '68eaa7d1a573055feed65a0a650d13cd6f19c3d9';
const source = execFileSync('git', ['show', `${baselineCommit}:${moduleFile}`], { maxBuffer: 4 * 1024 * 1024 }).toString('utf8');
const parse = text => ts.createSourceFile(moduleFile, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const parsed = parse(source), current = parse(readFileSync(moduleFile, 'utf8'));
const parent = JSON.parse(readFileSync('docs/material-owner-caret-input-survey.json'));
for (const name of [...parent.productionNormalization.functions, 'reviewedTemplateTextMappings', 'equivalentValue']) {
  const extract = file => {
    const nodes = file.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
    assert.equal(nodes.length, 1); return nodes[0].getText(file);
  };
  assert.equal(extract(current), extract(parsed), `unchanged production ${name}`);
}
let relocated = source;
for (const node of [...parsed.statements.filter(ts.isImportDeclaration)].reverse()) {
  if (!node.moduleSpecifier.text.startsWith('./')) continue;
  const s = node.moduleSpecifier, url = new URL(s.text, pathToFileURL(path.resolve(moduleFile))).href;
  relocated = relocated.slice(0, s.getStart(parsed)) + JSON.stringify(url) + relocated.slice(s.end);
}
const relocatedFile = parse(relocated);
assert.equal(relocatedFile.statements.length, parsed.statements.length);
for (let i = 0; i < parsed.statements.length; i++) {
  const withoutPath = (node, file) => ts.isImportDeclaration(node)
    ? node.getText(file).replace(node.moduleSpecifier.getText(file), '<import>') : node.getText(file);
  assert.equal(withoutPath(parsed.statements[i], parsed), withoutPath(relocatedFile.statements[i], relocatedFile));
}
const prior = await import(`data:text/javascript;base64,${Buffer.from(relocated).toString('base64')}`);
const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
const proof = JSON.parse(readFileSync('docs/material-owner-caret-attribution.json'));
const local = proof.findings.find(r => r.disposition === ownerCaretAttributions.local && r.observations.length > 13);
const motion = proof.findings.find(r => r.disposition === ownerCaretAttributions.motion);
const range = proof.findings.find(r => r.disposition === 'requires-specific-review' && r.family === 'slider');
const tooltip = proof.findings.find(r => r.disposition === 'requires-specific-review' && r.family === 'tooltip');
assert.ok(local && motion && range && tooltip);
const wanted = new Set([[local.observations[13].case, local.element], [motion.observations[0].case, motion.element],
  [range.observations[0].case, range.element], [tooltip.observations[0].case, tooltip.element]].map(x => JSON.stringify(x)));
const select = (entries, kind) => entries.flatMap(e => {
  const key = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
  if (!e.styleInputs.some(i => wanted.has(JSON.stringify([key, i.id])))) return [];
  return [{ ...e, styleInputs: e.styleInputs.filter(i => wanted.has(JSON.stringify([key, i.id])) || i.id === `${e.family}-root`) }];
});
const scalar = r => [r.family, r.element, r.property, r.reference, r.astylar, r.occurrences, r.cases, r.states];
const identity = r => JSON.stringify([r.family, r.element, r.property, r.reference, r.astylar]);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const attributed = r => Object.values(ownerCaretAttributions).includes(r.attribution);

test('production caret integration preserves original inputs prior findings and pending observations', () => {
  const directory = mkdtempSync(path.resolve('artifacts/material-parity/caret-integration-'));
  try {
    const raw = { ...original, results: select(original.results, 'static'), interactions: select(original.interactions, 'interaction') };
    assert.equal(raw.results.length + raw.interactions.length, 4);
    const rawHash = hash(raw), file = path.join(directory, 'report.json'); writeFileSync(file, JSON.stringify(raw));
    const options = { root: process.cwd(), parityPath: file, supplementalRoot: directory };
    const previous = prior.buildMaterialInputAudit(raw, options), audit = buildMaterialInputAudit(raw, options);
    // A shared stale dependency must not make both builders silently lose the
    // same earlier findings and thereby manufacture a conservation pass.
    for (const report of [previous, audit]) for (const field of ['ownerGapInputs', 'explicitGapInputs', 'gapReviewInputs'])
      assert.equal(report[field].binding.status, 'bound', `${field}: ${report[field].binding.error}`);
    assert.equal(audit.ownerCaretInputs.binding.status, 'bound', audit.ownerCaretInputs.binding.error);
    assert.equal(audit.ownerCaretInputs.coverage.complete, false);
    assert.equal(audit.ownerCaretInputs.observations.length, 4);
    assert.equal(audit.ownerCaretInputs.coverage.missingObservations.length, 4046);
    const rows = audit.discrepancies.filter(attributed);
    assert.equal(rows.length, 2); assert.equal(rows.reduce((n, r) => n + r.occurrences, 0), 2);
    assert.equal(audit.ownerCaretInputs.plannedCoverage.pendingObservations, 2);
    assert.equal(audit.summary.inputEquivalent, false); assert.equal(hash(raw), rawHash);
    assert.deepEqual(audit.discrepancies.map(scalar), previous.discrepancies.map(scalar));
    const keys = new Set(rows.map(identity)), old = previous.discrepancies.filter(r => keys.has(identity(r)));
    assert.equal(old.length, 2); assert.ok(old.every(r => r.attribution === 'unresolved'));
    for (const row of rows) {
      const before = old.find(r => identity(r) === identity(row));
      assert.deepEqual(row.referenceAuthoredExamples, before.referenceAuthoredExamples);
      assert.deepEqual(row.astylarAuthoredExamples, before.astylarAuthoredExamples);
      for (const flag of ['inputEquivalent', 'computedCandidateVerified', 'descendantCaretVerified',
        'renderingEquivalent', 'rendererCauseProven', 'wholeElementInputEquivalent']) assert.equal(row.reviewEvidence[flag], false);
    }
    const others = report => report.discrepancies.filter(r => !keys.has(identity(r)));
    assert.ok(isDeepStrictEqual(others(audit), others(previous)), 'all unrelated complete findings unchanged');
    for (const finding of [range, tooltip]) {
      const row = audit.discrepancies.find(r => r.family === finding.family && r.element === finding.element && r.property === 'caretColor');
      assert.equal(row?.attribution, 'unresolved', 'pending owner must not be promoted');
    }
    assert.match(renderMaterialInputAuditMarkdown(audit), /Bounded caret reviews: 4[^\n]*2 observation-stage groups; 2 observations remain pending/);
    const validate = value => validateMaterialInputAudit(value, { requireComplete: false }).filter(e => /caret/i.test(e));
    assert.deepEqual(validate(audit), []);
    for (const mutate of [
      r => { delete r.ownerCaretInputs; }, r => { r.ownerCaretInputs.observations.pop(); },
      r => { r.discrepancies = r.discrepancies.filter(d => identity(d) !== identity(rows[0])); },
      r => { r.discrepancies.find(attributed).attribution = 'unresolved'; },
      r => { r.discrepancies.find(attributed).reviewEvidence.inputEquivalent = true; },
      r => { r.ownerCaretInputs.coverage.complete = true; },
    ]) {
      const copy = structuredClone(audit); mutate(copy);
      assert.ok(validate(copy).length, 'production validator must reject lost or fabricated caret evidence');
    }
    console.log(JSON.stringify({ baselineCommit, diagnosticCases: 4, attributedGroups: 2,
      attributedObservations: 2, pendingObservations: 2, missingObservations: 4046,
      unchangedScalarRows: audit.discrepancies.length, unchangedCompleteRows: others(audit).length,
      unchangedCompleteRowsSha256: hash(others(audit)), inputEquivalent: false,
      fullCanonicalConservationVerified: false }));
  } finally {
    const boundary = path.resolve('artifacts/material-parity') + path.sep;
    assert.ok(directory.startsWith(boundary)); rmSync(directory, { recursive: true, force: true });
  }
});
