import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { inspectButtonBoxSizingInput } from './button-box-sizing-input-evidence.mjs';
import { selectedButtonInputs } from './button-pill-radius-evidence.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const report = JSON.parse(readFileSync('docs/material-button-box-sizing-input-survey.json'));
const bytes = readFileSync(report.capture.file); assert.equal(hash(bytes), report.capture.sha256);
const raw = JSON.parse(bytes), entries = [...raw.results.map(e => ({ ...e, kind: 'static' })),
  ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
const read = d => { const b = readFileSync(d.file); assert.equal(hash(b), d.sha256); return JSON.parse(b); };
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;

test('button box-sizing survey replays all original owners and keeps interaction geometry gaps', () => {
  assert.equal(report.captureCases, 2311); assert.equal(report.selectedCases, 480); assert.equal(report.owners, 600);
  assert.equal(report.groups.length, 9);
  for (const flag of ['canonicalAttributionChanged', 'inputEquivalent', 'renderingEquivalent']) assert.equal(report[flag], false);
  for (const s of report.sourceFingerprints) assert.equal(hash(readFileSync(s.file, 'utf8').replaceAll('\r\n', '\n')), s.sha256);
  const captures = [], observations = [];
  for (const entry of entries) {
    const inputs = selectedButtonInputs(entry), candidate = read(entry.inputTrees.astylar);
    assert.deepEqual(inputs.map(i => i.id).sort(), candidate.nodes.filter(n => n.authored?.class?.split(/\s+/)
      .includes('material-button')).map(n => n.authored.id).sort());
    captures.push({ case: keyOf(entry), owners: inputs.map(i => i.id), inputTrees: entry.inputTrees });
    if (!inputs.length) continue;
    const reference = read(entry.inputTrees.reference);
    for (const input of inputs) observations.push({ case: keyOf(entry), family: entry.family, profile: entry.profile,
      viewport: entry.viewport, state: entry.state ?? 'static', inputSha256: hash(JSON.stringify(input)),
      proof: inspectButtonBoxSizingInput(input, reference, candidate, entry) });
  }
  assert.deepEqual(report.captures, captures); assert.deepEqual(report.observations, observations);
  assert.equal(captures.filter(c => !c.owners.length).length, 1831);
  assert.equal(report.observedDeclaredBorderBoxes, observations.filter(o => o.proof.observedDeclaredBorderBox).length);
  assert.equal(report.interactionGeometryGaps, observations.filter(o => !o.proof.observedDeclaredBorderBox).length);
  assert.equal(report.observedDeclaredBorderBoxes + report.interactionGeometryGaps, 600);
  const grouped = report.groups.flatMap(g => g.cases.map(c => [c, g.element]));
  assert.deepEqual(grouped.map(JSON.stringify).sort(), observations.map(o => JSON.stringify([o.case, o.proof.element])).sort());
  for (const g of report.groups) {
    const rows = observations.filter(o => o.family === g.family && o.proof.element === g.element);
    assert.deepEqual(g.measuredCases, rows.filter(o => o.proof.observedDeclaredBorderBox).map(o => o.case));
    assert.deepEqual(g.geometryGapCases, rows.filter(o => !o.proof.observedDeclaredBorderBox).map(o => o.case));
  }
});

test('button box-sizing input proof rejects unsupported defaults, compensated sizes and forged geometry', () => {
  const entry = entries.find(e => e.kind === 'static' && e.family === 'button' && e.profile === 'light');
  const input = selectedButtonInputs(entry)[0], reference = read(entry.inputTrees.reference), candidate = read(entry.inputTrees.astylar);
  for (const mutate of [
    v => { v.reference.rules.find(r => r.selector === '.mdc-button').declarations['box-sizing'].value = 'content-box'; },
    v => { v.input.reference.boxSizing = 'content-box'; },
    v => { v.candidate.rules.push({ selector: '.material-button:hover', boxSizing: 'border-box' }); },
    v => { v.candidate.rules.push({ selector: '[unreviewed]', all: 'initial' }); },
    v => { v.candidate.nodes.find(n => n.authored?.id === input.id).authored.style = { boxSizing: 'content-box' }; },
    v => { v.input.astylarNormalResolvedStyle.boxSizing = 'border-box'; },
    v => { v.input.astylar.width = 'auto'; },
    v => { v.entry.geometry.elements.find(g => g.id === input.id).actual.width += 48; },
    v => { delete v.entry.geometry; },
    v => { v.entry.geometry.elements.find(g => g.id === input.id).missing = true; },
    v => { v.entry.geometry.elements.find(g => g.id === input.id).expected.height += 2; },
  ]) {
    const value = structuredClone({ input, reference, candidate, entry }); mutate(value);
    assert.throws(() => inspectButtonBoxSizingInput(value.input, value.reference, value.candidate, value.entry));
  }
  const interaction = entries.find(e => e.kind === 'interaction' && e.family === 'button');
  const ii = selectedButtonInputs(interaction)[0], ir = read(interaction.inputTrees.reference), ia = read(interaction.inputTrees.astylar);
  const proof = inspectButtonBoxSizingInput(ii, ir, ia, interaction);
  assert.equal(proof.geometry, null); assert.equal(proof.observedDeclaredBorderBox, false); assert.ok(proof.geometryGap);
  assert.throws(() => inspectButtonBoxSizingInput(ii, ir, ia, { ...interaction, geometry: entry.geometry }));
});
