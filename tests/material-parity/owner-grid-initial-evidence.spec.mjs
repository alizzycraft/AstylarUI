import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { chromium } from 'playwright-core';
import { inspectOwnerGridInitial, ownerGridInitialProperties } from './owner-grid-initial-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const report = JSON.parse(readFileSync('docs/material-owner-grid-initial-survey.json'));
const bytes = readFileSync(report.capture.file); assert.equal(hash(bytes), report.capture.sha256);
const raw = JSON.parse(bytes);
const read = d => { const b = readFileSync(d.file); assert.equal(hash(b), d.sha256); return JSON.parse(b); };

test('owner grid initial survey replays every eligible source pair and retains negative evidence', () => {
  assert.equal(report.captureCases, 2311);
  for (const flag of ['canonicalAttributionChanged', 'computedCandidateVerified', 'gridLayoutEquivalent', 'renderingEquivalent'])
    assert.equal(report[flag], false);
  for (const s of report.sourceFingerprints) assert.equal(hash(readFileSync(s.file, 'utf8').replaceAll('\r\n', '\n')), s.sha256);
  const captures = [], evidence = [];
  for (const [kind, entries] of [['static', raw.results], ['interaction', raw.interactions]]) for (const entry of entries) {
    const key = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    const selected = (entry.styleInputs ?? []).flatMap(input => ownerGridInitialProperties
      .filter(p => input.reference?.[p] === 'none' && input.astylar && !Object.hasOwn(input.astylar, p)).map(property => ({ input, property })));
    captures.push({ case: key, inputTrees: entry.inputTrees, selected: selected.map(({ input, property }) =>
      ({ element: input.id, property, inputSha256: hash(JSON.stringify(input)) })) });
    if (!selected.length) continue;
    const reference = read(entry.inputTrees.reference), candidate = read(entry.inputTrees.astylar);
    for (const { input, property } of selected) evidence.push({ case: key, family: entry.family,
      profile: entry.profile, viewport: entry.viewport, state: entry.state ?? 'static', inputSha256: hash(JSON.stringify(input)),
      proof: inspectOwnerGridInitial(input, property, reference, candidate) });
  }
  assert.deepEqual(report.captures, captures); assert.deepEqual(report.evidence, evidence);
  assert.equal(report.observations, evidence.length);
  assert.equal(report.reviewedObservations, evidence.filter(o => !o.proof.issues.length).length);
  assert.equal(report.reviewGaps, evidence.filter(o => o.proof.issues.length).length);
  assert.ok(report.reviewedObservations > 0); assert.ok(report.reviewGaps > 0);
  const grouped = report.groups.flatMap(g => [...g.reviewedCases, ...g.gapCases].map(c => JSON.stringify([c, g.element, g.property])));
  assert.deepEqual(grouped.sort(), evidence.map(o => JSON.stringify([o.case, o.proof.element, o.proof.property])).sort());
  for (const g of report.groups) {
    const rows = evidence.filter(o => o.family === g.family && o.proof.element === g.element && o.proof.property === g.property);
    assert.deepEqual(g.reviewedCases, rows.filter(o => !o.proof.issues.length).map(o => o.case));
    assert.deepEqual(g.gapCases, rows.filter(o => o.proof.issues.length).map(o => o.case));
    const reasons = {};
    for (const o of rows) for (const reason of new Set(o.proof.issues.map(i => i.reason))) reasons[reason] = (reasons[reason] ?? 0) + 1;
    assert.deepEqual(g.reasons, reasons);
  }
});

test('owner grid initial proof rejects explicit shorthand, resets, motion, ambiguous identity and stage substitution', () => {
  const witness = report.evidence.find(o => !o.proof.issues.length);
  const entries = witness.case.startsWith('static:') ? raw.results : raw.interactions;
  const entry = entries.find(e => e.family === witness.family && e.profile === witness.profile &&
    e.viewport.id === witness.viewport.id && (e.state ?? 'static') === witness.state);
  const input = entry.styleInputs.find(i => i.id === witness.proof.element), reference = read(entry.inputTrees.reference), candidate = read(entry.inputTrees.astylar);
  const inspect = v => inspectOwnerGridInitial(v.input, witness.proof.property, v.reference, v.candidate);
  const original = { input, reference, candidate };
  assert.equal(inspect(original).issues.length, 0);
  for (const mutate of [
    v => { v.input.reference[witness.proof.property] = '100px'; },
    v => { v.input.astylar[witness.proof.property] = 'none'; },
    v => { v.candidate.resolvedStyleSource = 'paint-guess'; },
    v => { v.candidate.nodes.push(structuredClone(v.candidate.nodes[0])); },
    v => { v.candidate.rules.push({ selector: '#' + input.id, gridTemplate: 'none' }); },
    v => { v.candidate.rules.push({ selector: '[unreviewed]', all: 'initial' }); },
    v => { v.candidate.rules.push({ selector: '#' + input.id + ':hover', grid: 'none' }); },
    v => { v.candidate.rules.push({ selector: '#' + input.id, transition: 'all 1s' }); },
    v => { v.candidate.nodes.find(n => n.key === witness.proof.candidateNode).authored.attributes = { style: 'grid-template: none' }; },
    v => { v.reference.nodes.find(n => n.key === witness.proof.referenceNode).inline['grid-template-columns'] = 'none'; },
    v => { v.reference.nodes.find(n => n.key === witness.proof.referenceNode).attributes.style = 'animation-name: tracks'; },
  ]) {
    const v = structuredClone(original); mutate(v); assert.ok(inspect(v).issues.length > 0);
  }
  const unrelated = structuredClone(original); unrelated.candidate.rules.push({ selector: '#unrelated-owner', grid: 'none' });
  assert.deepEqual(inspect(unrelated), inspect(original));
});

for (const deviceScaleFactor of [1, 2]) test(`grid-template ownership and implicit-track sensitivity, DPR ${deviceScaleFactor}`, async t => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor });
    await page.setContent(`<div id="parent" style="grid-template-columns:10px 20px;grid-template-rows:30px 40px">
      <div id="omitted">Omitted</div>
      <div id="explicit" style="grid-template-columns:none;grid-template-rows:none">None</div>
      <div id="inherited" style="grid-template-columns:inherit;grid-template-rows:inherit">Inherited</div>
      </div><div id="implicit" style="display:grid;width:100px"><span>Track</span></div>`);
    const result = await page.evaluate(() => {
      const read = () => Object.fromEntries(['omitted', 'explicit', 'inherited', 'implicit'].map(id => {
        const node = document.getElementById(id), s = getComputedStyle(node);
        return [id, { columns: s.gridTemplateColumns, rows: s.gridTemplateRows,
          authoredColumns: node.style.gridTemplateColumns, authoredRows: node.style.gridTemplateRows }];
      }));
      const initial = read();
      Object.assign(document.getElementById('parent').style, { gridTemplateColumns: '50px 60px', gridTemplateRows: '70px 80px' });
      return { initial, changedParent: read() };
    });
    for (const stage of [result.initial, result.changedParent]) {
      assert.deepEqual(stage.omitted, { columns: 'none', rows: 'none', authoredColumns: '', authoredRows: '' });
      assert.deepEqual(stage.explicit, { columns: 'none', rows: 'none', authoredColumns: 'none', authoredRows: 'none' });
      assert.equal(stage.implicit.authoredColumns, ''); assert.equal(stage.implicit.authoredRows, '');
      assert.equal(stage.implicit.columns, '100px'); assert.notEqual(stage.implicit.rows, 'none');
    }
    assert.deepEqual(result.initial.inherited, { columns: '10px 20px', rows: '30px 40px', authoredColumns: 'inherit', authoredRows: 'inherit' });
    assert.deepEqual(result.changedParent.inherited, { columns: '50px 60px', rows: '70px 80px', authoredColumns: 'inherit', authoredRows: 'inherit' });
    t.diagnostic(JSON.stringify({ browserVersion: browser.version(), deviceScaleFactor, result,
      scope: 'Browser-only property ownership and implicit-track serialization; no candidate computed-value or grid-layout equivalence.' }));
  } finally { await browser.close(); }
});
