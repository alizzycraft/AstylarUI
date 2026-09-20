import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { collectColorNormalizationTransition } from '../../scripts/audit-material-color-normalization-transition.mjs';

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
