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
for (const name of ['reviewedTemplateTextMappings', 'canonicalStyle', 'normalizeValue', 'formatNumber', 'equivalentValue', 'expandQuad', 'expandPair', 'splitCssTerms'])
  assert.equal(functionText(current, name), functionText(parsed, name), `unchanged production ${name}`);
// Compare classification stages under the same current measurement contract.
// Never round current input evidence back to the historical sRGB quantization.
const normalizationHash = value => createHash('sha256').update(value).digest('hex');
const historicalColor = functionText(parsed, 'normalizeColor'), preciseColor = functionText(current, 'normalizeColor');
assert.equal(normalizationHash(historicalColor), '8fb8ac9b17cc2a2cad2fce61e36c8dd1b77991bb56c73e3dee94354aa4a28a1a');
assert.equal(normalizationHash(preciseColor), '72ccd81044437192569c028d93be8312b700cd199e3cb0f173d16f64b0839d42');
const colorNode = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'normalizeColor');
let relocated = source.slice(0, colorNode.getStart(parsed)) + preciseColor + source.slice(colorNode.end);
// All remaining statements stay historical; the AST check below permits only
// this pinned normalizer replacement and relocation of relative import paths.
for (const node of [...parsed.statements.filter(ts.isImportDeclaration)].reverse()) {
  if (!node.moduleSpecifier.text.startsWith('./')) continue;
  const s = node.moduleSpecifier, url = new URL(s.text, pathToFileURL(path.resolve(moduleFile))).href;
  relocated = relocated.slice(0, s.getStart(parsed)) + JSON.stringify(url) + relocated.slice(s.end);
}
const moved = ts.createSourceFile(moduleFile, relocated, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(moved.statements.length, parsed.statements.length);
for (let i = 0; i < parsed.statements.length; i++) {
  const omitPath = (n, f) => ts.isImportDeclaration(n) ? n.getText(f).replace(n.moduleSpecifier.getText(f), '<import>') : n.getText(f);
  const original = parsed.statements[i];
  assert.equal(original === colorNode ? preciseColor : omitPath(original, parsed), omitPath(moved.statements[i], moved));
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

// Account for newly observable inputs rather than silently updating an old count.
// The normalizer bodies are authenticated above; this never rounds live rows.
const normalizationNames = ['canonicalStyle', 'expandQuad', 'expandPair', 'splitCssTerms', 'normalizeValue', 'normalizeColor', 'formatNumber'];
const normalizeAt = tree => new Function(normalizationNames.map(name => functionText(tree, name)).join('\n') + '\nreturn canonicalStyle;')();
const rounded = normalizeAt(parsed), precise = normalizeAt(current);
assert.equal(functionText(parsed, 'caseKey'), functionText(current, 'caseKey'));
const capturedCaseKey = new Function(functionText(current, 'caseKey') + '\nreturn caseKey;')();
const precisionKey = row => JSON.stringify([row.family, row.element, row.property, row.reference, row.astylar]);
function precisionOnlyPopulation() {
  assert.equal(hash({ ...original, results, interactions }), '703ba4cbeb92f658b9382216caed8839cdb504bce92eee589461f17e2841b242');
  const groups = new Map();
  for (const entry of [...results, ...interactions]) for (const input of entry.styleInputs ?? []) {
    const oldReference = rounded(input.reference ?? {}), oldCandidate = rounded(input.astylar ?? {});
    const reference = precise(input.reference ?? {}), candidate = precise(input.astylar ?? {});
    for (const property of new Set([...Object.keys(reference), ...Object.keys(candidate)])) {
      if (oldReference[property] !== oldCandidate[property] || reference[property] === candidate[property]) continue;
      assert.equal(property, 'backgroundColor'); assert.equal(input.id, `${entry.family}-root`);
      assert.equal(reference[property], 'rgba(245.879925,240.73989,248.60001,1)');
      assert.equal(candidate[property], 'rgba(246,241,249,1)');
      const row = { family: entry.family, element: input.id, property, reference: reference[property], astylar: candidate[property] };
      const key = precisionKey(row), group = groups.get(key) ?? { ...row, occurrences: 0, cases: [], states: [] };
      group.occurrences++;
      const caseId = capturedCaseKey(entry), state = entry.state ?? 'static';
      if (!group.cases.includes(caseId)) group.cases.push(caseId);
      if (!group.states.includes(state)) group.states.push(state);
      groups.set(key, group);
    }
  }
  assert.equal(groups.size, 36); assert.equal(new Set([...groups.values()].map(row => row.family)).size, 36);
  assert.equal([...groups.values()].reduce((n, row) => n + row.occurrences, 0), 88);
  return groups;
}
function assertPrecisionPopulation(rows, expected) {
  const matched = rows.filter(row => expected.has(precisionKey(row)));
  assert.equal(matched.length, expected.size, 'complete precision-only population');
  assert.equal(new Set(matched.map(precisionKey)).size, expected.size, 'duplicate precision-only row');
  for (const row of matched) {
    const wanted = expected.get(precisionKey(row));
    assert.deepEqual(Object.fromEntries(Object.keys(wanted).map(key => [key, row[key]])), wanted,
      'source-bound precision-only membership and observations');
  }
  return matched.length;
}

test('precise color population accounts for exactly thirty-six source-bound root groups', () => {
  const expected = precisionOnlyPopulation(), rows = [...expected.values()];
  assert.equal(assertPrecisionPopulation(rows, expected), 36);
  assert.throws(() => assertPrecisionPopulation(rows.slice(1), expected), /complete precision-only population/);
  assert.throws(() => assertPrecisionPopulation([...rows.slice(1), rows[1]], expected), /duplicate precision-only row/);
  for (const property of ['occurrences', 'cases', 'states']) {
    const forged = structuredClone(rows); forged[0][property] = property === 'occurrences' ? 99 : ['forged'];
    assert.throws(() => assertPrecisionPopulation(forged, expected), /source-bound precision-only membership/);
  }
});

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
  const precisionPopulation = precisionOnlyPopulation();
  const newlyObservable = assertPrecisionPopulation(other(audit), precisionPopulation);
  assert.equal(assertPrecisionPopulation(other(previous), precisionPopulation), newlyObservable);
  assert.equal(other(audit).length - newlyObservable, 6282, 'historical count plus exact newly observable input population');
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
