import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import test from 'node:test';
import { buildFieldHostLayoutJoin, joinFieldHostLayout, readCanonicalFieldHostRows } from '../../scripts/audit-material-field-host-layout-join.mjs';

test('all original field-host layout groups map to canonical values, counts, state ordering and exact source case membership', async () => {
  const report = await buildFieldHostLayoutJoin();
  assert.ok(isDeepStrictEqual(report, JSON.parse(readFileSync('docs/material-field-host-layout-canonical-join.json'))));
  assert.equal(report.counts.groups, 72); assert.equal(report.counts.propertyObservations, 4616);
  assert.equal(report.counts.currentAttributions.unresolved, 48);
  assert.deepEqual(report.counts.currentClassifications, { 'equivalent-representation': 6, 'parity-harness-defect': 66 });
  assert.ok(report.rows.filter(r => r.currentClassification === 'equivalent-representation')
    .every(r => r.property === 'minWidth' && r.referenceAuthored === '0px' && r.candidateAuthored === '<omitted>'));
  assert.deepEqual(report.counts.proposedClassifications, { 'application-plugin-authoring-defect': 54, 'parity-harness-defect': 18 });
  assert.equal(report.canonicalIntegration, false);
  assert.equal(report.canonical.revision, 'b059b4345b5d513b9eecf1b4a804498e31094d41');
  assert.equal(report.canonical.compressedSha256, 'dc3a0681ddbbb85b256db9b3616280d80727c33c96ee016f3cd15b0c0b91e853');
});

test('membership join rejects dropped, duplicated, reordered or reassigned evidence and unjustified claims', async () => {
  const survey = JSON.parse(readFileSync('docs/material-field-host-layout-inputs.json'));
  const original = JSON.parse(readFileSync(survey.capture.file));
  const { discrepancies } = await readCanonicalFieldHostRows();
  const input = { survey, original, discrepancies };
  const originalRows = joinFieldHostLayout(input);
  const changes = [
    s => { s.groups[0].cases[0] = s.groups[0].cases[1]; },
    s => { s.groups[0].occurrences--; },
    s => { s.groups[0].candidateAuthored = 'invented'; },
    s => { s.cases.pop(); },
    s => { s.cases[0].inputTrees = {}; },
    s => { s.cases[0].geometry = { status: 'measured-original-static-box', evidence: {} }; },
    s => { s.groups[0].rendererCauseProven = true; },
    s => { s.inputEquivalent = true; },
  ];
  for (const change of changes) {
    const copy = structuredClone(survey); change(copy);
    assert.throws(() => joinFieldHostLayout({ ...input, survey: copy }));
  }
  const first = originalRows[0];
  const selected = r => r.family === first.family && r.element === first.element && r.property === first.property;
  for (const change of [r => { r.occurrences--; }, r => { r.cases.reverse(); }, r => { r.states.pop(); }, r => { r.reference = 'invented'; }]) {
    const rows = discrepancies.map(r => selected(r) ? structuredClone(r) : r);
    change(rows.find(selected)); assert.throws(() => joinFieldHostLayout({ ...input, discrepancies: rows }));
  }
  assert.throws(() => joinFieldHostLayout({ ...input, discrepancies: discrepancies.filter(r => !selected(r)) }));
  assert.throws(() => joinFieldHostLayout({ ...input, discrepancies: [...discrepancies, discrepancies.find(selected)] }));
  const key = survey.cases[0].case;
  const entries = original.interactions.map(e => `interaction:${e.family}@${e.profile}/${e.viewport.id}/${e.state}` === key ? structuredClone(e) : e);
  const entry = entries.find(e => `interaction:${e.family}@${e.profile}/${e.viewport.id}/${e.state}` === key);
  entry.styleInputs.find(i => i.id === `${entry.family}-primary`).astylar.height = '76px';
  assert.throws(() => joinFieldHostLayout({ ...input, original: { ...original, interactions: entries } }));
});
