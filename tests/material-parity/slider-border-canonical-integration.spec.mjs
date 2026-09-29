import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { buildMaterialInputAudit, validateMaterialInputAudit } from './input-equivalence-audit.mjs';
import { sliderBorderDefaultAttribution } from './slider-border-default-source-binding.mjs';
import { ownerInitialStyleAttribution } from './owner-initial-style-attribution.mjs';
import { rootShadowAttribution } from './root-shadow-source-binding.mjs';
import { ownerGridInitialAttribution } from './owner-grid-initial-classification.mjs';
import { assertLaterGapClassifications, assertLaterCaretClassifications } from './owner-gap-integration-conservation.mjs';
import { ownerGapAttribution } from './owner-gap-classification.mjs';
import { withAuditScratch } from './audit-scratch.mjs';
import { rangeCaretAttribution } from '../../scripts/audit-material-range-caret-inputs.mjs';
import { validateCaretPositionReviews } from './overlay-position-request-review.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';

const prior = JSON.parse(readFileSync('docs/material-slider-border-defaults.json'));
const bytes = readFileSync(prior.capture.file);
assert.equal(createHash('sha256').update(bytes).digest('hex'), prior.capture.sha256);
const original = JSON.parse(bytes);
const baselineCommit = '165ec492add8dd69d8ca82104219d83c1b4ed3ba';
const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';
const baselineSource = execFileSync('git', ['show', `${baselineCommit}:${moduleFile}`],
  { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
assert.equal(createHash('sha256').update(baselineSource).digest('hex'),
  '242eda5b01049814e1ce0251d432acf27a886ab6e550736423dc349452486b1b');
const baselineAst = ts.createSourceFile(moduleFile, baselineSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
let relocated = baselineSource;
for (const node of [...baselineAst.statements.filter(ts.isImportDeclaration)].reverse()) {
  const specifier = node.moduleSpecifier;
  if (!specifier.text.startsWith('./')) continue;
  const url = new URL(specifier.text, pathToFileURL(path.resolve(moduleFile))).href;
  relocated = relocated.slice(0, specifier.getStart(baselineAst)) + JSON.stringify(url) + relocated.slice(specifier.end);
}
const relocatedAst = ts.createSourceFile(moduleFile, relocated, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(relocatedAst.parseDiagnostics.length, 0);
assert.equal(relocatedAst.statements.length, baselineAst.statements.length);
for (let i = 0; i < baselineAst.statements.length; i++) {
  const comparable = (node, file) => ts.isImportDeclaration(node)
    ? node.getText(file).replace(node.moduleSpecifier.getText(file), '<import>') : node.getText(file);
  assert.equal(comparable(baselineAst.statements[i], baselineAst), comparable(relocatedAst.statements[i], relocatedAst));
}
const baselineBuilder = await import(`data:text/javascript;base64,${Buffer.from(relocated).toString('base64')}`);

function withCapture(run) {
  const root = process.cwd();
  return withAuditScratch('slider-border-canonical-', folder => {
    const raw = {
      results: [structuredClone(original.results.find(e => e.family === 'slider'))],
      interactions: [structuredClone(original.interactions.find(e => e.family === 'slider'))],
    };
    const parityPath = path.join(folder, 'report.json');
    writeFileSync(parityPath, JSON.stringify(raw));
    run({ raw, root, options: { root, parityPath } });
  });
}

const signature = row => JSON.stringify([row.family, row.element, row.property, row.reference, row.astylar,
  row.occurrences, row.cases, row.states]);

test('slider border canonical integration preserves raw values and attributes exactly sixteen proven properties', () => withCapture(({ raw, root, options }) => {
  const snapshot = structuredClone(raw), unbound = buildMaterialInputAudit(raw, { root });
  const audit = buildMaterialInputAudit(raw, options);
  const rows = audit.discrepancies.filter(row => row.attribution === sliderBorderDefaultAttribution);
  assert.equal(rows.length, 32);
  assert.equal(rows.reduce((sum, row) => sum + row.occurrences, 0), 64);
  assert.ok(rows.some(row => row.property === 'borderTopWidth' && row.reference === '0' && row.astylar === '1px'));
  assert.ok(rows.some(row => row.property === 'borderTopStyle' && row.reference === 'none' && row.astylar === 'solid'));
  assert.ok(rows.some(row => row.property === 'borderTopLeftRadius' && row.reference === '0' && row.astylar === '4px'));
  const colors = rows.filter(row => /Color$/.test(row.property));
  assert.equal(colors.length, 8);
  assert.deepEqual(colors.map(row => [row.element, row.property]),
    ['slider-primary', 'slider-start'].flatMap(element =>
      ['borderBottomColor', 'borderLeftColor', 'borderRightColor', 'borderTopColor']
        .map(property => [element, property])));
  for (const row of colors) {
    assert.deepEqual([row.reference, row.astylar, row.occurrences],
      ['rgba(16,16,16,1)', 'rgba(189,195,199,1)', 2]);
    assert.deepEqual(row.reviewedCases,
      ['static:slider@light/desktop', 'interaction:slider@light/desktop-dpr1/focus']);
  }
  assert.ok(rows.every(row => row.classification === 'intentional-documented-limitation' &&
    row.reviewEvidence.borderAuthoringEquivalent && !row.reviewEvidence.inputEquivalent &&
    !row.reviewEvidence.usedBoxParityVerified && !row.reviewEvidence.finalRasterVerified));
  assert.deepEqual(raw, snapshot);
  assert.deepEqual(audit.discrepancies.map(signature), unbound.discrepancies.map(signature));
  // Frozen before integration at 165ec49, using these same two original cases.
  // Eight border colors belonged to that predecessor's non-border population;
  // precise color normalization later exposed one slider-root background row.
  // Reverse only those transitions before checking its complete-row digest.
  // Only the 25 explicitly reviewed
  // owner-stage attributions, the later single root-shadow authoring finding,
  // six source-bound grid observation-stage rows, and independently replayed
  // later gap observation-stage rows and the one authenticated later caret row
  // may be projected back to unresolved; all 220 predecessor rows must still
  // reproduce the original frozen digest. Do not replace the historical hash.
  const otherRows = audit.discrepancies.filter(row => !rows.includes(row));
  assert.equal(otherRows.length, 213);
  const preciseBackgrounds = otherRows.filter(row => row.family === 'slider' &&
    row.element === 'slider-root' && row.property === 'backgroundColor' &&
    row.reference === 'rgba(245.879925,240.73989,248.60001,1)' &&
    row.astylar === 'rgba(246,241,249,1)');
  assert.equal(preciseBackgrounds.length, 1);
  assert.equal(preciseBackgrounds[0].occurrences, 2);
  assert.deepEqual(preciseBackgrounds[0].cases,
    ['static:slider@light/desktop', 'interaction:slider@light/desktop-dpr1/focus']);
  assert.deepEqual(preciseBackgrounds[0].states, ['static', 'focus']);
  assert.equal(preciseBackgrounds[0].attribution, 'unresolved');
  const shared = otherRows.filter(row => row.attribution === ownerInitialStyleAttribution);
  const common = ['overflowWrap', 'pointerEvents', 'textTransform', 'visibility', 'whiteSpace', 'wordBreak', 'wordSpacing'];
  const expected = ['slider-primary', 'slider-start', 'slider-visual'].flatMap(element =>
    (element === 'slider-visual' ? ['appearance', 'color', 'fontStyle', 'fontWeight', ...common] : common)
      .map(property => [element, property]));
  assert.deepEqual(shared.map(row => [row.element, row.property]), expected);
  const oldRows = new Map(unbound.discrepancies.map(row => [signature(row), row]));
  assert.equal(oldRows.size, unbound.discrepancies.length);
  for (const row of shared) {
    assert.equal(row.classification, 'parity-harness-defect');
    assert.equal(row.astylar, undefined); assert.equal(row.occurrences, 2);
    assert.deepEqual(row.reviewedCases, ['static:slider@light/desktop', 'interaction:slider@light/desktop-dpr1/focus']);
    assert.equal(row.reviewEvidence.computedCandidateVerified, false);
    assert.equal(row.reviewEvidence.renderingEquivalent, false);
  }
  const shadows = otherRows.filter(row => row.attribution === rootShadowAttribution);
  assert.equal(shadows.length, 1);
  const shadow = shadows[0];
  assert.deepEqual([shadow.family, shadow.element, shadow.property, shadow.reference, shadow.astylar,
    shadow.classification, shadow.occurrences], ['slider', 'slider-root', 'boxShadow',
    'rgba(0,0,0,0.133) 0 2px 8px 0', '0 2px 8px rgba(0,0,0,0.14)', 'application-plugin-authoring-defect', 2]);
  assert.deepEqual(shadow.reviewedCases, ['static:slider@light/desktop', 'interaction:slider@light/desktop-dpr1/focus']);
  for (const flag of ['inputEquivalent', 'originalRasterCauseProven', 'candidateUsedPaintVerified', 'renderingEquivalent'])
    assert.equal(shadow.reviewEvidence[flag], false);
  assert.equal(audit.rootShadowInputs.observations.length, 2);
  const grids = otherRows.filter(row => row.attribution === ownerGridInitialAttribution);
  assert.deepEqual(grids.map(row => [row.element, row.property]),
    ['slider-primary', 'slider-start', 'slider-visual'].flatMap(element =>
      ['gridTemplateColumns', 'gridTemplateRows'].map(property => [element, property])));
  assert.equal(audit.ownerGridInitialInputs.observations.length, 16);
  for (const row of grids) {
    assert.equal(row.classification, 'parity-harness-defect');
    assert.equal(row.reference, 'none'); assert.equal(row.astylar, undefined);
    assert.equal(row.occurrences, 2);
    assert.deepEqual(row.reviewedCases, ['static:slider@light/desktop', 'interaction:slider@light/desktop-dpr1/focus']);
    for (const flag of ['computedCandidateVerified', 'gridLayoutEquivalent', 'renderingEquivalent', 'wholeElementInputEquivalent'])
      assert.equal(row.reviewEvidence[flag], false);
  }
  const gapSignatures = assertLaterGapClassifications(audit, unbound, { root });
  const gaps = otherRows.filter(row => gapSignatures.has(signature(row)));
  assert.equal(gaps.length, gapSignatures.size, 'all later gap findings belong to the historical non-border population');
  const later = new Set([...shared, shadow, ...grids, ...gaps]);
  const rangeCarets = otherRows.filter(row => row.attribution === rangeCaretAttribution);
  assert.deepEqual(rangeCarets.map(row => [row.element, row.property, row.occurrences]),
    [['slider-primary', 'caretColor', 2], ['slider-start', 'caretColor', 2]]);
  const cases = [...raw.results.map(entry => ({ ...entry, kind: 'static' })),
    ...raw.interactions.map(entry => ({ ...entry, kind: 'interaction' }))];
  assert.deepEqual(validateCaretPositionReviews(audit.discrepancies, unbound.discrepancies,
    cases, audit.elementInventory, bindPreciseAuditNormalization()), []);
  const rangeSignatures = new Set(rangeCarets.map(signature));
  const beforeRangeCaret = { ...audit, discrepancies: audit.discrepancies.map(row =>
    rangeSignatures.has(signature(row)) ? oldRows.get(signature(row)) : row) };
  for (const row of rangeCarets) {
    const previous = oldRows.get(signature(row));
    assert.equal(previous.attribution, 'unresolved');
    assert.deepEqual([row.reference, row.astylar, row.cases, row.states],
      [previous.reference, previous.astylar, previous.cases, previous.states]);
    later.add(row);
  }
  const caretSignatures = assertLaterCaretClassifications(beforeRangeCaret, unbound, { root });
  const carets = otherRows.filter(row => caretSignatures.has(signature(row)));
  assert.equal(caretSignatures.size, 1);
  assert.deepEqual(carets.map(row => [row.element, row.property, row.occurrences]), [['slider-visual', 'caretColor', 2]]);
  assert.equal(audit.ownerCaretInputs.plannedCoverage.reviewedObservations, 2);
  assert.equal(audit.ownerCaretInputs.plannedCoverage.pendingObservations, 4);
  assert.ok(carets.every(row => !later.has(row)), 'caret metadata cannot replace earlier proofs');
  for (const row of carets) later.add(row);
  const historicalRows = audit.discrepancies.filter(row => !rows.includes(row) || colors.includes(row))
    .filter(row => !preciseBackgrounds.includes(row)).map(row => {
    if (colors.includes(row)) return oldRows.get(signature(row));
    if (!later.has(row)) return row;
    const previous = oldRows.get(signature(row)); assert.equal(previous.attribution, 'unresolved'); return previous;
  });
  assert.equal(historicalRows.length, 220);
  const baselineAudit = baselineBuilder.buildMaterialInputAudit(raw, options);
  const baselineBorder = row => ['slider-primary', 'slider-start'].includes(row.element) &&
    /^(?:border(?:Top|Right|Bottom|Left)(?:Width|Style)|border(?:TopLeft|TopRight|BottomRight|BottomLeft)Radius)$/.test(row.property) &&
    (row.reference === '0' || row.reference === 'none');
  assert.equal(baselineAudit.discrepancies.filter(baselineBorder).length, 24);
  const baselineOther = baselineAudit.discrepancies.filter(row => !baselineBorder(row));
  assert.equal(baselineOther.length, 220);
  const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  assert.equal(digest(baselineOther), '4e1f09fc03af948aec7b2d1d927ee13c298b6439ceaa3bb0145a72122eb315ee');
  const metadata = new Set(['classification', 'justification', 'recommendedOwner', 'attribution',
    'reviewEvidence', 'reviewedCases']);
  const rawRow = row => Object.fromEntries(Object.entries(row).filter(([field]) => !metadata.has(field)));
  assert.deepEqual(historicalRows.map(rawRow), baselineOther.map(rawRow),
    'all 220 baseline raw, case, state and authored rows remain unchanged');
  const remaining = historicalRows.flatMap((row, index) => JSON.stringify(row) === JSON.stringify(baselineOther[index])
    ? [] : [{ before: baselineOther[index], after: row }]);
  assert.equal(remaining.length, 48);
  assert.ok(remaining.every(({ before }) => before.attribution === 'unresolved'));
  const attributionCounts = Object.fromEntries([...new Set(remaining.map(({ after }) => after.attribution))]
    .sort().map(attribution => [attribution, remaining.filter(({ after }) => after.attribution === attribution).length]));
  assert.deepEqual(attributionCounts, {
    'reviewed-alignment-observation-stage-mismatch': 2,
    'reviewed-captured-typography-observation-stage': 4,
    'reviewed-container-font-family-declaration-stage': 1,
    'reviewed-container-font-size-declaration-stage': 1,
    'reviewed-control-font-style-inheritance-reset-omission': 2,
    'reviewed-control-overflow-owner-boundary': 2,
    'reviewed-custom-host-border-initial-divergence': 4,
    'reviewed-display-request-substitution': 1,
    'reviewed-minimum-size-request-omission': 1,
    'reviewed-native-box-sizing-request-local-omission': 1,
    'reviewed-range-appearance-initial-request': 2,
    'reviewed-range-color-default-policy': 2,
    'reviewed-range-line-height-inheritance-omission': 2,
    'reviewed-range-visible-overflow-initial-value': 4,
    'reviewed-range-weight-inherit-observation-boundary': 2,
    'reviewed-reference-alignment-request-omission': 1,
    'reviewed-slider-computed-offset-boundary': 7,
    'reviewed-slider-host-cursor-omission': 1,
    'reviewed-slider-margin-owner-boundary': 2,
    'reviewed-slider-position-request-substitution': 3,
    'reviewed-text-alignment-observation-stage-mismatch': 3,
  });
  console.log(JSON.stringify({ historicalCompleteRows: historicalRows.length,
    historicalSha256: digest(baselineOther), laterMetadataRows: remaining.length,
    sourceValidatedLaterGapRows: gaps.map(row => [row.element, row.property, row.occurrences]),
    sourceValidatedLaterCaretRows: carets.map(row => [row.element, row.property, row.occurrences]),
    pendingCaretObservations: audit.ownerCaretInputs.plannedCoverage.pendingObservations }));
  const errors = validateMaterialInputAudit(audit, { root, requireComplete: false });
  assert.ok(!errors.some(error => error.includes('slider border') || error.includes('owner initial-style') || error.includes('root shadow') || error.includes('owner grid')));
}));

test('slider historical conservation requires exact later gap source and classification coverage', () => withCapture(({ raw, root, options }) => {
  const audit = buildMaterialInputAudit(raw, options), unbound = buildMaterialInputAudit(raw, { root });
  for (const mutate of [
    report => { delete report.ownerGapInputs; },
    report => { report.ownerGapInputs.observations.pop(); },
    report => { report.discrepancies.find(row => row.attribution === ownerGapAttribution).reviewedCases.pop(); },
    report => { report.discrepancies.find(row => row.attribution === ownerGapAttribution).reviewEvidence.usedGapVerified = true; },
  ]) {
    const changed = structuredClone(audit); mutate(changed);
    assert.throws(() => assertLaterGapClassifications(changed, unbound, { root }));
  }
}));

test('slider integration retains exact source validation for later grid observation-stage rows', () => withCapture(({ raw, options }) => {
  const audit = buildMaterialInputAudit(raw, options);
  for (const mutate of [
    r => { delete r.ownerGridInitialInputs; },
    r => { r.ownerGridInitialInputs.observations.pop(); },
    r => { r.discrepancies.find(d => d.attribution === ownerGridInitialAttribution).reviewedCases.pop(); },
    r => { r.discrepancies.find(d => d.attribution === ownerGridInitialAttribution).reviewEvidence.gridLayoutEquivalent = true; },
  ]) {
    const changed = structuredClone(audit); mutate(changed);
    assert.ok(validateMaterialInputAudit(changed, { requireComplete: false }).some(e => e.includes('owner grid')));
  }
}));

test('slider integration retains exact source validation for the later shadow attribution', () => withCapture(({ raw, root, options }) => {
  const audit = buildMaterialInputAudit(raw, options);
  for (const mutate of [
    r => { delete r.rootShadowInputs; },
    r => { r.rootShadowInputs.observations.pop(); },
    r => { r.discrepancies.find(d => d.attribution === rootShadowAttribution).reviewedCases.pop(); },
    r => { r.discrepancies.find(d => d.attribution === rootShadowAttribution).reference = '0 2px 8px rgba(0,0,0,0.14)'; },
    r => { r.discrepancies.find(d => d.attribution === rootShadowAttribution).reviewEvidence.inputEquivalent = true; },
  ]) {
    const changed = structuredClone(audit); mutate(changed);
    assert.ok(validateMaterialInputAudit(changed, { root, requireComplete: false }).some(e => e.includes('root shadow')));
  }
}));

test('slider border canonical validation rejects missing sources altered scalars and fabricated parity', () => withCapture(({ raw, root, options }) => {
  const originalAudit = buildMaterialInputAudit(raw, options);
  assert.equal(originalAudit.sliderBorderDefaults?.observations?.length, 4);
  for (const mutate of [
    (report, row) => { delete report.sliderBorderDefaults; },
    (report, row) => { report.sliderBorderDefaults.observations.pop(); },
    (report, row) => { report.sliderBorderDefaults.captures = []; },
    (report, row) => { report.discrepancies = report.discrepancies.filter(other => other !== row); },
    (report, row) => { report.discrepancies.push(structuredClone(row)); },
    (report, row) => { row.attribution = 'unresolved'; },
    (report, row) => { row.reference = '1px'; },
    (report, row) => { row.classification = 'equivalent-representation'; },
    (report, row) => { row.reviewEvidence.usedBoxParityVerified = true; },
    (report, row) => { row.reviewEvidence.inputEquivalent = true; },
  ]) {
    const report = structuredClone(originalAudit);
    mutate(report, report.discrepancies.find(row => row.attribution === sliderBorderDefaultAttribution));
    assert.ok(validateMaterialInputAudit(report, { root, requireComplete: false }).some(error => error.includes('slider border')));
  }
}));
