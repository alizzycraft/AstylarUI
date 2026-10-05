import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { collectColorNormalizationTransition, verifyCanonicalColorPopulationTransition } from '../../scripts/audit-material-color-normalization-transition.mjs';
import { prepareRootBackgroundClassifications } from './root-background-classification-preparation.mjs';

const file = 'tests/material-parity/input-equivalence-audit.mjs';
const source = readFileSync(file, 'utf8');
const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(parsed.parseDiagnostics.length, 0);
const functions = ['normalizeColor', 'formatNumber'].map(name => {
  const matches = parsed.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.equal(matches.length, 1); return matches[0].getText(parsed);
}).join('\n');
const normalize = new Function(functions + '\nreturn normalizeColor;')();

test('sRGB unit conversion preserves fractional channels and agrees with equivalent RGB input', () => {
  for (const [srgb, rgb, expected] of [
    ['color(srgb 0.5 0 1)', 'rgb(127.5, 0, 255)', 'rgba(127.5,0,255,1)'],
    ['color(srgb 0.964235 0.944078 0.974902)', 'rgb(245.879925, 240.73989, 248.60001)', 'rgba(245.879925,240.73989,248.60001,1)'],
    ['color(srgb 0.94 0.94 0.94)', 'rgb(239.7, 239.7, 239.7)', 'rgba(239.7,239.7,239.7,1)'],
    ['color(srgb 0.1 0.2 0.3 / 0.123456)', 'rgba(25.5, 51, 76.5, .123456)', 'rgba(25.5,51,76.5,0.123456)'],
  ]) {
    assert.equal(normalize(srgb), expected); assert.equal(normalize(rgb), expected);
  }
  assert.notEqual(normalize('color(srgb 0.5 0 1)'), normalize('#8000ff'));
  assert.notEqual(normalize('color(srgb 0.964235 0.944078 0.974902)'), normalize('#f6f1f9'));
});

test('color channels and alpha do not inherit the layout helper three-decimal rounding', () => {
  assert.equal(normalize('rgba(12.3456789, 0, 255, .123456789)'), 'rgba(12.3456789,0,255,0.123456789)');
  assert.notEqual(normalize('rgb(12.3451, 0, 0)'), normalize('rgb(12.3452, 0, 0)'));
  assert.equal(normalize('#00000080'), 'rgba(0,0,0,0.5019607843137255)');
  assert.notEqual(normalize('#00000080'), normalize('rgba(0,0,0,.502)'));
});

test('lexical number aliases remain equivalent without rounding their values', () => {
  assert.equal(normalize('rgba(001.2500, -0, +2.5e1, 1.0)'), 'rgba(1.25,0,25,1)');
  assert.equal(normalize('#f0a'), 'rgba(255,0,170,1)');
  assert.equal(normalize('transparent'), 'rgba(0,0,0,0)');
  assert.equal(normalize('color(srgb 0 0 1)'), normalize('#0000ff'));
  for (const value of ['inherit', 'color(display-p3 .5 0 1)', 'rgb(1,2,3,4,5)', 'color(srgb 0..5 0 1)']) {
    assert.equal(normalize(value), undefined);
  }
});

test('complete capture changes only color evidence and exposes exactly the source-reviewed roots', () => {
  const report = collectColorNormalizationTransition();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-color-normalization-transition.json')));
  assert.equal(report.counts.cases, 2311); assert.equal(report.counts.owners, 6946);
  assert.equal(report.counts.nonColorChanges, 0);
  assert.deepEqual(report.counts.outcomeCounts, { 'newly-visible-difference': 2311, 'changed-difference-values': 612 });
  assert.equal(report.counts.groups, 210);
  const exposed = report.findings.filter(row => row.outcome === 'newly-visible-difference');
  assert.equal(exposed.length, 144);
  const roots = JSON.parse(readFileSync('docs/material-root-background-inputs.json'));
  const actual = exposed.flatMap(row => row.cases.map(c => JSON.stringify([row.family, row.element, row.property, c]))).sort();
  const expected = roots.findings.flatMap(row => row.observations.map(o => JSON.stringify([row.family, row.element, row.property, o.case]))).sort();
  assert.deepEqual(actual, expected);
  assert.equal(report.priorClassificationsRevalidated, false);
  assert.equal(report.canonicalReportRegenerated, false);
});

test('canonical color population preserves split classifications and rejects unrelated drift', () => {
  const row = (reference, occurrences, property = 'color') =>
    ({ family: 'example', element: 'owner', property, reference, astylar: 'candidate', occurrences });
  const previous = [row('old', 1), row('old', 2), row('unchanged', 4)];
  const current = [row('new', 3), row('unchanged', 4), row('exposed', 2)];
  const transition = { findings: [
    { ...row('old', 3), outcome: 'changed-difference-values',
      before: { reference: 'old', candidate: 'candidate' }, after: { reference: 'new', candidate: 'candidate' }, cases: ['a', 'b', 'c'] },
    { ...row('exposed', 2), outcome: 'newly-visible-difference',
      before: { reference: 'candidate', candidate: 'candidate' }, after: { reference: 'exposed', candidate: 'candidate' }, cases: ['a', 'b'] },
  ] };
  const result = verifyCanonicalColorPopulationTransition(previous, current, transition);
  assert.equal(result.previousObservations, 7); assert.equal(result.currentObservations, 9);
  assert.equal(result.classificationContinuityProven, false);
  assert.equal(result.completeCaseMembershipProven, false);
  for (const altered of [current.slice(1), [...current, row('unexpected', 1)],
    current.map(r => r.reference === 'unchanged' ? { ...r, occurrences: 5 } : r),
    current.map(r => r.reference === 'unchanged' ? { ...r, property: 'backgroundColor' } : r)]) {
    assert.throws(() => verifyCanonicalColorPopulationTransition(previous, altered, transition));
  }
  const missingSource = structuredClone(transition); missingSource.findings[0].cases.pop();
  assert.throws(() => verifyCanonicalColorPopulationTransition(previous, current, missingSource));
  assert.throws(() => verifyCanonicalColorPopulationTransition(previous, current,
    { findings: [...transition.findings, transition.findings[0]] }));
});

test('explicit color-transition subsets retain every selected occurrence and reject missing or duplicate cases', () => {
  const full = JSON.parse(readFileSync('docs/material-color-normalization-transition.json'));
  const caseIds = [full.findings[0].cases[0]];
  const subset = collectColorNormalizationTransition({ caseIds,
    previousRevision: '364f46a309319201317919b6a23dd1aadd08f405' });
  const expected = full.findings.flatMap(row => {
    const cases = row.cases.filter(id => caseIds.includes(id));
    return cases.length ? [{ ...row, cases, occurrences: cases.length }] : [];
  });
  assert.deepEqual(subset.findings, expected);
  assert.equal(subset.counts.cases, 1);
  assert.equal(subset.previous.sha256, full.previous.sha256);
  assert.equal(subset.current.sha256, full.current.sha256);
  assert.equal(subset.priorClassificationsRevalidated, false);
  assert.throws(() => collectColorNormalizationTransition({ caseIds: [...caseIds, ...caseIds] }), /duplicated/);
  assert.throws(() => collectColorNormalizationTransition({ caseIds: ['static:missing@light/desktop'] }), /missing/);
});

test('grid historical subset exposes only exact source-replayed root authoring observations', () => {
  const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
  const selected = new Set(), seen = new Set();
  const results = original.results.filter(e => {
    if (e.profile !== 'light' || e.viewport.id !== 'desktop' || selected.has(e.family)) return false;
    selected.add(e.family); return true;
  });
  const interactions = original.interactions.filter(e => {
    if (!['chips', 'slider', 'datepicker', 'timepicker', 'tooltip', 'dialog', 'bottom-sheet'].includes(e.family) ||
      !['hover', 'held', 'focus', 'activate', 'activate-leave'].includes(e.state)) return false;
    const key = JSON.stringify([e.family, e.state, e.viewport.id]);
    if (seen.has(key)) return false; seen.add(key); return true;
  });
  const key = (kind, e) => `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
  const caseIds = [...results.map(e => key('static', e)), ...interactions.map(e => key('interaction', e))];
  assert.equal(results.length, 36); assert.equal(interactions.length, 74);
  const transition = collectColorNormalizationTransition({ caseIds,
    previousRevision: '364f46a309319201317919b6a23dd1aadd08f405' });
  const roots = prepareRootBackgroundClassifications(original);
  const exposed = transition.findings.filter(row => row.outcome === 'newly-visible-difference');
  assert.equal(exposed.length, 36);
  assert.equal(exposed.reduce((n, row) => n + row.occurrences, 0), 110);
  for (const row of exposed) {
    const members = roots.observations.filter(o => o.family === row.family && o.element === row.element &&
      o.property === row.property && o.reference === row.after.reference &&
      o.astylar === row.after.candidate && caseIds.includes(o.case));
    assert.deepEqual(members.map(o => o.case).sort(), [...row.cases].sort(), 'complete original membership');
    assert.ok(members.every(o => o.classification.classification === 'application-plugin-authoring-defect' &&
      o.classification.reviewEvidence.rendererCauseProven === false));
  }
  assert.equal(transition.findings.filter(row => row.outcome === 'changed-difference-values').length, 7);
});
