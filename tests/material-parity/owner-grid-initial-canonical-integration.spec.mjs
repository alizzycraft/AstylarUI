import assert from 'node:assert/strict';
import { buttonBoxSizingAttribution } from './button-box-sizing-classification.mjs';
import test from 'node:test';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { buildMaterialInputAudit, validateMaterialInputAudit, renderMaterialInputAuditMarkdown,
  collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { ownerGridInitialAttribution } from './owner-grid-initial-classification.mjs';
import { nonGridTemplateAttribution } from './grid-template-input-evidence.mjs';
import { fieldHostLayoutAttribution, fieldHostWidthAttribution } from './field-host-layout-source-binding.mjs';
import { assertLaterGapClassifications, assertLaterCaretClassifications } from './owner-gap-integration-conservation.mjs';
import { independentlyReconstructBeforeReviewedInputs } from './later-reviewed-input-conservation.mjs';
import { collectColorNormalizationTransition, verifyCanonicalColorPopulationTransition } from '../../scripts/audit-material-color-normalization-transition.mjs';
import { prepareRootBackgroundClassifications, rootBackgroundAttribution } from './root-background-classification-preparation.mjs';
import { withAuditScratch } from './audit-scratch.mjs';
import { validateCaretPositionReviews, isCaretPositionReviewRow } from './overlay-position-request-review.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';

const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';
const baselineCommit = '364f46a309319201317919b6a23dd1aadd08f405';
const source = execFileSync('git', ['show', `${baselineCommit}:${moduleFile}`], { maxBuffer: 4 * 1024 * 1024 }).toString();
// The old producer's ordering must not consume today's expanded owner fallback.
// That combination falsely admits expansion appearance before its specific
// followup review. Pin this dependency to the same historical endpoint; do not
// weaken reconstruction's prohibition on overwriting historical attributions.
const ownerModuleFile = 'tests/material-parity/owner-initial-style-attribution.mjs';
const ownerSource = execFileSync('git', ['show', `${baselineCommit}:${ownerModuleFile}`], { maxBuffer: 1024 * 1024 })
  .toString().replaceAll('\r\n', '\n');
assert.equal(createHash('sha256').update(ownerSource).digest('hex'),
  'a7bf825a194332eca06add7787b93f51e1d8699e5baba86afc7884a0d1351543');
const ownerParsed = ts.createSourceFile(ownerModuleFile, ownerSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(ownerParsed.parseDiagnostics.length, 0);
let relocatedOwner = ownerSource;
for (const node of [...ownerParsed.statements.filter(ts.isImportDeclaration)].reverse()) {
  if (!node.moduleSpecifier.text.startsWith('.')) continue;
  const s = node.moduleSpecifier, url = new URL(s.text, pathToFileURL(path.resolve(ownerModuleFile))).href;
  relocatedOwner = relocatedOwner.slice(0, s.getStart(ownerParsed)) + JSON.stringify(url) + relocatedOwner.slice(s.end);
}
const ownerMoved = ts.createSourceFile(ownerModuleFile, relocatedOwner, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(ownerMoved.statements.length, ownerParsed.statements.length);
for (let i = 0; i < ownerParsed.statements.length; i++) {
  const omitPath = (n, f) => ts.isImportDeclaration(n) ? n.getText(f).replace(n.moduleSpecifier.getText(f), '<import>') : n.getText(f);
  assert.equal(omitPath(ownerParsed.statements[i], ownerParsed), omitPath(ownerMoved.statements[i], ownerMoved));
}
const historicalOwnerUrl = `data:text/javascript;base64,${Buffer.from(relocatedOwner).toString('base64')}`;
const parsed = ts.createSourceFile(moduleFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const current = ts.createSourceFile(moduleFile, readFileSync(moduleFile, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const functionText = (f, name) => f.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name).getText(f);
for (const name of ['reviewedTemplateTextMappings', 'canonicalStyle', 'normalizeValue', 'formatNumber', 'equivalentValue'])
  assert.equal(functionText(current, name), functionText(parsed, name), `unchanged production ${name}`);
let relocated = source;
for (const node of [...parsed.statements.filter(ts.isImportDeclaration)].reverse()) {
  if (!node.moduleSpecifier.text.startsWith('./')) continue;
  const s = node.moduleSpecifier, url = s.text === './owner-initial-style-attribution.mjs'
    ? historicalOwnerUrl : new URL(s.text, pathToFileURL(path.resolve(moduleFile))).href;
  relocated = relocated.slice(0, s.getStart(parsed)) + JSON.stringify(url) + relocated.slice(s.end);
}
const moved = ts.createSourceFile(moduleFile, relocated, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(moved.statements.length, parsed.statements.length);
for (let i = 0; i < parsed.statements.length; i++) {
  const omitPath = (n, f) => ts.isImportDeclaration(n) ? n.getText(f).replace(n.moduleSpecifier.getText(f), '<import>') : n.getText(f);
  assert.equal(omitPath(parsed.statements[i], parsed), omitPath(moved.statements[i], moved));
}
const prior = await import(`data:text/javascript;base64,${Buffer.from(relocated).toString('base64')}`);
// Explicit diagnostic endpoint: only the authenticated color function changes.
// Keep the untouched historical endpoint too; never silently repin its values.
const colorNode = moved.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'normalizeColor');
const preciseSource = relocated.slice(0, colorNode.getStart(moved)) + functionText(current, 'normalizeColor') + relocated.slice(colorNode.end);
const preciseParsed = ts.createSourceFile(moduleFile, preciseSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(preciseParsed.parseDiagnostics.length, 0);
assert.equal(preciseParsed.statements.length, moved.statements.length);
for (let i = 0; i < moved.statements.length; i++) {
  const node = moved.statements[i];
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'normalizeColor') continue;
  assert.equal(node.getText(moved), preciseParsed.statements[i].getText(preciseParsed));
}
const precisePrior = await import(`data:text/javascript;base64,${Buffer.from(preciseSource).toString('base64')}`);
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

test('owner grid production integration preserves original scalars, earlier precedence and unrelated rows', () => withAuditScratch('owner-grid-integration-', directory => {
    assert.equal(selected.size, 36);
    assert.ok(interactions.length > 0);
    const raw = { ...original, results, interactions }, before = hash(raw);
    const file = path.join(directory, 'report.json'); writeFileSync(file, JSON.stringify(raw));
    const options = { root: process.cwd(), parityPath: file, supplementalRoot: directory };
    const historical = prior.buildMaterialInputAudit(raw, options);
    const previous = precisePrior.buildMaterialInputAudit(raw, options);
    const audit = buildMaterialInputAudit(raw, options);
    const caseIds = [...results.map(e => keyOf('static', e)), ...interactions.map(e => keyOf('interaction', e))];
    const transition = collectColorNormalizationTransition({ caseIds, previousRevision: baselineCommit });
    const population = verifyCanonicalColorPopulationTransition(historical.discrepancies, previous.discrepancies, transition);
    assert.equal(population.exposedObservations, 110);
    assert.equal(population.exposedGroups, 36);
    assert.equal(population.changedValueGroups, 7);
    const added = audit.discrepancies.filter(r => r.attribution === ownerGridInitialAttribution);
    assert.ok(added.length > 0, 'production builder must attribute independently reviewed grid observations');
    assert.equal(hash(raw), before);
    assert.deepEqual(audit.discrepancies.map(scalar), previous.discrepancies.map(scalar));
    // Root classification intentionally requires a complete original capture.
    // This partial diagnostic must not silently borrow the full classification.
    assert.equal(audit.rootBackgroundInputs.binding.status, 'invalid');
    assert.match(audit.rootBackgroundInputs.binding.error, /complete original capture required/);
    const rootEvidence = prepareRootBackgroundClassifications(original);
    const rootRows = audit.discrepancies.filter(r => r.attribution === rootBackgroundAttribution);
    assert.equal(rootRows.length, 0);
    const exposed = transition.findings.filter(r => r.outcome === 'newly-visible-difference');
    for (const finding of exposed) {
      const matches = audit.discrepancies.filter(r => r.family === finding.family && r.element === finding.element &&
        r.property === finding.property && r.reference === finding.after.reference && r.astylar === finding.after.candidate);
      assert.equal(matches.length, 1); const row = matches[0];
      const members = rootEvidence.observations.filter(o => o.family === row.family && o.element === row.element &&
        o.property === row.property && o.reference === row.reference && o.astylar === row.astylar && caseIds.includes(o.case));
      assert.deepEqual(members.map(o => o.case), finding.cases);
      assert.equal(row.occurrences, members.length);
      const oldRow = previous.discrepancies.find(r => JSON.stringify(scalar(r)) === JSON.stringify(scalar(row)));
      assert.ok(oldRow); assert.equal(oldRow.attribution, 'unresolved');
      assert.equal(row.attribution, 'unresolved');
      assert.deepEqual(row, oldRow, 'partial root row must remain completely conserved');
    }
    assert.equal(exposed.length, 36);
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
    for (const signature of assertLaterGapClassifications(audit, previous)) signatures.add(signature);
    // Independently authenticate the separate component caret/position layer
    // before the owner-caret pending comparison. Never exempt a named category.
    const selectedCases = [...results.map(e => ({ ...e, kind: 'static' })),
      ...interactions.map(e => ({ ...e, kind: 'interaction' }))];
    const selectedInventory = collectFullTreeInventory(selectedCases);
    assert.deepEqual(selectedInventory.errors, []);
    assert.deepEqual(validateCaretPositionReviews(audit.discrepancies, previous.discrepancies,
      selectedCases, selectedInventory, bindPreciseAuditNormalization()), []);
    const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
    const rawRow = row => Object.fromEntries(Object.entries(row).filter(([key]) => !metadata.has(key)));
    const componentConserved = { ...audit, discrepancies: audit.discrepancies.map(row => {
      if (!isCaretPositionReviewRow(row)) return row;
      const old = previous.discrepancies.filter(r => JSON.stringify(scalar(r)) === JSON.stringify(scalar(row)));
      assert.equal(old.length, 1);
      assert.deepEqual(rawRow(row), rawRow(old[0]), 'component review changed complete raw evidence');
      return old[0];
    }) };
    const laterCarets = assertLaterCaretClassifications(componentConserved, previous);
    assert.equal(laterCarets.size, 55);
    assert.equal(audit.ownerCaretInputs.plannedCoverage.reviewedObservations, 108);
    assert.equal(audit.ownerCaretInputs.plannedCoverage.pendingObservations, 97);
    assert.ok([...laterCarets].every(signature => !signatures.has(signature)),
      'authenticated caret reviews cannot replace original grid/box, field-host or gap proofs');
    for (const signature of laterCarets) signatures.add(signature);
    const restored = independentlyReconstructBeforeReviewedInputs(componentConserved, previous);
    assert.equal(restored.changes.length, 55);
    assert.equal(restored.changes.reduce((n, r) => n + r.occurrences, 0), 109);
    const other = report => (report === audit ? restored.rows : report.discrepancies)
      .filter(r => !signatures.has(JSON.stringify(scalar(r))));
    assert.equal(other(audit).length, 6055 + exposed.length);
    const currentOther = other(audit), previousOther = other(previous);
    const currentDigest = hash(currentOther), previousDigest = hash(previousOther);
    if (currentDigest !== previousDigest) {
      // Preserve the actual failure, not merely its hash. The same complete-row
      // assertion below remains authoritative; this does not exempt any row.
      const differences = [];
      for (let index = 0; index < Math.max(currentOther.length, previousOther.length); index++) {
        const currentRow = currentOther[index], previousRow = previousOther[index];
        if (hash(currentRow) === hash(previousRow)) continue;
        const fields = [...new Set([...Object.keys(currentRow ?? {}), ...Object.keys(previousRow ?? {})])]
          .filter(field => hash(currentRow?.[field] ?? { absent: !Object.hasOwn(currentRow ?? {}, field) }) !==
            hash(previousRow?.[field] ?? { absent: !Object.hasOwn(previousRow ?? {}, field) }));
        differences.push({ index, fields, previous: previousRow, current: currentRow });
      }
      const diagnostic = path.join(directory, 'unrelated-row-differences.json');
      writeFileSync(diagnostic, JSON.stringify({ baselineCommit,
        previousDigest, currentDigest, previousRows: previousOther.length,
        currentRows: currentOther.length, differences }, null, 2) + '\n');
      console.error(JSON.stringify({ diagnostic, changedRows: differences.length,
        firstRows: differences.slice(0, 20).map(d => ({ index: d.index,
          family: d.current?.family, element: d.current?.element,
          property: d.current?.property, fields: d.fields })) }));
    }
    assert.equal(currentDigest, previousDigest, 'complete unrelated rows unchanged');
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
      independentlyVerifiedLaterCaretGroups: laterCarets.size,
      independentlyVerifiedLaterCaretObservations: audit.ownerCaretInputs.plannedCoverage.reviewedObservations,
      retainedPendingCaretObservations: audit.ownerCaretInputs.plannedCoverage.pendingObservations,
      unchangedCompleteRows: other(audit).length, unchangedCompleteRowsSha256: hash(other(audit)),
      fullCanonicalConservationVerified: false, inputEquivalent: false }));
}));
