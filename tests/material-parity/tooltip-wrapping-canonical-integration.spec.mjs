import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import ts from 'typescript';
import { buildMaterialInputAudit, validateMaterialInputAudit } from './input-equivalence-audit.mjs';
import { tooltipWrappingAttribution } from './tooltip-wrapping-source-binding.mjs';
import { assertLaterGapClassifications } from './owner-gap-integration-conservation.mjs';
import { withAuditScratch } from './audit-scratch.mjs';

// A separate diagnostic report retains the original full trees and every tooltip
// state, with only the target scalar owner selected for the integration proof.
// Complete canonical population conservation is a separate full-report gate.
const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
// Execute the actual prior committed pipeline, not an unbound approximation:
// removing bindings would also remove earlier tooltip-presence classifications.
const baselineCommit = '65487aeba6a26f9715f302f92b4ee454161a94ef';
const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';
const priorSource = execFileSync('git', ['show', `${baselineCommit}:${moduleFile}`], { maxBuffer: 4 * 1024 * 1024 }).toString('utf8');
const sourceFile = ts.createSourceFile(moduleFile, priorSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const currentFile = ts.createSourceFile(moduleFile, readFileSync(moduleFile, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const mappingDeclaration = f => f.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'reviewedTemplateTextMappings').getText(f);
assert.equal(mappingDeclaration(currentFile), mappingDeclaration(sourceFile), 'shared alias-mapping dependency must be unchanged');
// Only relocate relative import specifiers. Preserve every executable statement
// and verify the resulting AST apart from those specifier texts.
let relocated = priorSource;
const imports = sourceFile.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text.startsWith('./'));
for (const node of [...imports].reverse()) {
  const specifier = node.moduleSpecifier, url = new URL(specifier.text, pathToFileURL(path.resolve(moduleFile))).href;
  relocated = relocated.slice(0, specifier.getStart(sourceFile)) + JSON.stringify(url) + relocated.slice(specifier.end);
}
const relocatedFile = ts.createSourceFile(moduleFile, relocated, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(relocatedFile.statements.length, sourceFile.statements.length);
for (let i = 0; i < sourceFile.statements.length; i++) {
  const a = sourceFile.statements[i], b = relocatedFile.statements[i];
  const withoutPath = (node, f) => ts.isImportDeclaration(node)
    ? node.getText(f).replace(node.moduleSpecifier.getText(f), '<module-specifier>') : node.getText(f);
  assert.equal(withoutPath(a, sourceFile), withoutPath(b, relocatedFile));
}
const prior = await import(`data:text/javascript;base64,${Buffer.from(relocated).toString('base64')}`);
function withCapture(run) {
  return withAuditScratch('tooltip-wrapping-integration-', directory => {
    const raw = { ...original, results: original.results.filter(e => e.family === 'tooltip').map(select),
      interactions: original.interactions.filter(e => e.family === 'tooltip').map(select) };
    const file = path.join(directory, 'report.json'); writeFileSync(file, JSON.stringify(raw));
    return run(raw, { root: process.cwd(), parityPath: file, supplementalRoot: directory });
  });
}
function select(entry) {
  return { ...entry, styleInputs: entry.styleInputs.filter(i => i.id === 'tooltip-popup') };
}
const projection = r => [r.family, r.element, r.property, r.reference, r.astylar, r.occurrences, r.cases, r.states];
const laterTooltipReviews = new Map([
  ['appearance', ['reviewed-mapped-nonwidget-appearance-initial-request', 'equivalent-representation']],
  ...['borderBottomColor', 'borderLeftColor', 'borderRightColor', 'borderTopColor']
    .map(property => [property, ['reviewed-mapped-border-initial-color-divergence', 'intentional-documented-limitation']]),
  ['caretColor', ['reviewed-overlay-motion-caret-request-omission', 'application-plugin-authoring-defect']],
  ['display', ['reviewed-display-request-substitution', 'application-plugin-authoring-defect']],
  ['flexShrink', ['reviewed-tooltip-shrink-composition-substitution', 'application-plugin-authoring-defect']],
  ['fontFamily', ['reviewed-scalar-component-font-omission', 'application-plugin-authoring-defect']],
  ['fontStyle', ['reviewed-font-initial-computed-local-boundary', 'parity-harness-defect']],
  ...['gridTemplateColumns', 'gridTemplateRows']
    .map(property => [property, ['reviewed-mapped-grid-template-observation-stage', 'parity-harness-defect']]),
  ...['overflowX', 'overflowY']
    .map(property => [property, ['reviewed-overlay-overflow-request-omission', 'application-plugin-authoring-defect']]),
  ['pointerEvents', ['reviewed-overlay-pointer-policy-substitution', 'application-plugin-authoring-defect']],
  ['textAlign', ['reviewed-tooltip-scalar-text-alignment-omission', 'application-plugin-authoring-defect']],
  ['textTransform', ['reviewed-text-transform-computed-local-boundary', 'parity-harness-defect']],
  ['transformOrigin', ['reviewed-overlay-origin-owner-boundary', 'parity-harness-defect']],
  ['verticalAlign', ['reviewed-alignment-observation-stage-mismatch', 'parity-harness-defect']],
  ['width', ['reviewed-omitted-width-observation-stage', 'parity-harness-defect']],
  ['wordBreak', ['reviewed-tooltip-word-break-public-support-gap', 'documented-limitation']],
  ['wordSpacing', ['reviewed-inherited-word-computed-local-boundary', 'parity-harness-defect']],
  ['zIndex', ['reviewed-tooltip-stacking-owner-substitution', 'application-plugin-authoring-defect']],
]);
assert.equal(laterTooltipReviews.size, 23);

test('tooltip wrapping production integration preserves scalar values and existing classification precedence', () => withCapture((raw, options) => {
  const before = structuredClone(raw), previous = prior.buildMaterialInputAudit(raw, options);
  const audit = buildMaterialInputAudit(raw, options);
  const rows = audit.discrepancies.filter(r => r.attribution === tooltipWrappingAttribution);
  assert.equal(rows.length, 2); assert.equal(rows.reduce((n, r) => n + r.occurrences, 0), 36);
  assert.deepEqual(rows.map(r => [r.property, r.reference, r.astylar]), [
    ['overflowWrap', 'anywhere', undefined], ['whiteSpace', 'normal', 'nowrap']]);
  assert.ok(rows.every(r => r.classification === 'application-plugin-authoring-defect' && r.reviewedCases.length === 18));
  assert.deepEqual(raw, before, 'production integration must not mutate any captured input');
  assert.deepEqual(audit.discrepancies.map(projection), previous.discrepancies.map(projection));
  const selected = new Set(rows.map(r => JSON.stringify(projection(r))));
  assert.ok(previous.discrepancies.filter(r => selected.has(JSON.stringify(projection(r)))).every(r => r.attribution === 'unresolved'));
  for (const signature of assertLaterGapClassifications(audit, previous)) selected.add(signature);
  const predecessor = new Map(previous.discrepancies.map(r => [JSON.stringify(projection(r)), r]));
  assert.equal(predecessor.size, previous.discrepancies.length);
  const rawFields = row => Object.fromEntries(Object.entries(row).filter(([key]) =>
    !['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases'].includes(key)));
  const later = audit.discrepancies.filter(r => r.family === 'tooltip' && r.element === 'tooltip-popup' &&
    r.attribution === laterTooltipReviews.get(r.property)?.[0] &&
    !isDeepStrictEqual(r, predecessor.get(JSON.stringify(projection(r)))));
  assert.equal(later.length, laterTooltipReviews.size);
  for (const row of later) {
    const key = JSON.stringify(projection(row)), old = predecessor.get(key);
    assert.ok(old, `later tooltip ${row.property} lacks predecessor`);
    assert.equal(old.attribution, 'unresolved');
    assert.deepEqual([row.attribution, row.classification], laterTooltipReviews.get(row.property));
    assert.equal(row.occurrences, 18);
    assert.ok(isDeepStrictEqual(rawFields(row), rawFields(old)), `later tooltip ${row.property} changed raw evidence`);
    assert.equal(row.reviewEvidence?.inputEquivalent, false);
    assert.ok(!selected.has(key), `later tooltip ${row.property} overlaps wrapping or gap proof`);
    selected.add(key);
  }
  const others = report => report.discrepancies.filter(r => !selected.has(JSON.stringify(projection(r))));
  if (JSON.stringify(others(audit)) !== JSON.stringify(others(previous))) {
    const old = others(previous), current = others(audit);
    assert.deepEqual(current.map(projection), old.map(projection));
    writeFileSync(path.join(options.supplementalRoot, 'changed-unrelated-rows.json'), JSON.stringify({
      count: current.length,
      changed: current.flatMap((row, index) => JSON.stringify(row) === JSON.stringify(old[index]) ? []
        : [{ index, before: old[index], after: row }]),
    }, null, 2));
  }
  assert.equal(createHash('sha256').update(JSON.stringify(others(audit))).digest('hex'),
    createHash('sha256').update(JSON.stringify(others(previous))).digest('hex'), 'every unrelated complete row must be identical');
  // This diagnostic selects popup styles only. These exact full-population
  // prerequisites cannot bind to it; every other production validation must pass.
  assert.deepEqual(validateMaterialInputAudit(audit, { requireComplete: false }), [
    'overlaySurfaceAuditInputs classifications lack independently bound original source evidence',
    'chipPaintAuditInputs classifications lack independently bound original source evidence',
    'positionFollowupAuditInputs classifications lack independently bound original source evidence',
    'positionAuditInputs classifications lack independently bound original source evidence',
    'visibilityAuditInputs classifications lack independently bound original source evidence',
    'rootBackgroundInputs classifications lack independently bound original source evidence',
    'button box sizing attribution lacks independently bound original capture evidence',
    'button fixed width attribution lacks independently bound original capture evidence',
    '62 cases lack paired root style evidence',
  ]);
}));

test('tooltip wrapping production validation rejects missing binding lost rows and false equivalence', () => withCapture((raw, options) => {
  const audit = buildMaterialInputAudit(raw, options);
  for (const mutate of [r => { delete r.tooltipWrappingInputs; },
    r => { r.tooltipWrappingInputs.observations = []; r.tooltipWrappingInputs.captures = []; },
    r => { r.discrepancies = r.discrepancies.filter(d => d.attribution !== tooltipWrappingAttribution); },
    r => { r.discrepancies.find(d => d.attribution === tooltipWrappingAttribution).reviewEvidence.inputEquivalent = true; },
    r => { r.discrepancies.find(d => d.attribution === tooltipWrappingAttribution).reviewedCases.pop(); }]) {
    const changed = structuredClone(audit); mutate(changed);
    assert.ok(validateMaterialInputAudit(changed, { requireComplete: false }).some(e => e.includes('tooltip wrapping')));
  }
}));
