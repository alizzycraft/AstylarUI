import assert from 'node:assert/strict';
import test from 'node:test';
import { withAuditScratch } from './audit-scratch.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { collectButtonBoxSizingInputs, validateButtonBoxSizingInputs } from './button-box-sizing-source-binding.mjs';
import { selectedButtonInputs } from './button-pill-radius-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const previous = JSON.parse(readFileSync('docs/material-button-box-sizing-input-survey.json'));
const bytes = readFileSync(previous.capture.file);
assert.equal(hash(bytes), previous.capture.sha256);
const raw = JSON.parse(bytes);

test('button box sizing binds all original trees and measured geometry without upgrading gaps or width authoring', () => {
  const durable = JSON.parse(readFileSync('docs/material-button-box-sizing-source-binding.json'));
  for (const s of durable.sourceFingerprints)
    assert.equal(hash(readFileSync(s.file, 'utf8').replaceAll('\r\n', '\n')), s.sha256, s.file);
  for (const flag of ['canonicalAttributionChanged', 'inputEquivalent', 'renderingEquivalent']) assert.equal(durable[flag], false);
  assert.equal(durable.previousObservationsUnchanged, true);
  const evidence = collectButtonBoxSizingInputs(raw, { parityPath: previous.capture.file });
  assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
  assert.deepEqual(evidence, durable.evidence);
  assert.deepEqual(evidence.observations, previous.observations);
  assert.equal(evidence.captures.length, 2311);
  assert.equal(evidence.captures.filter(c => !c.selectedOwners.length).length, 1831);
  assert.equal(evidence.observations.length, 600);
  assert.equal(evidence.groups.length, 9);
  assert.equal(evidence.groups.reduce((n, g) => n + g.measuredCases.length, 0), 108);
  assert.equal(evidence.groups.reduce((n, g) => n + g.geometryGapCases.length, 0), 492);
  for (const g of evidence.groups) {
    assert.equal(g.occurrences, g.reviewedCases.length);
    assert.deepEqual([...g.measuredCases, ...g.geometryGapCases].sort(), [...g.reviewedCases].sort());
    for (const flag of ['widthAuthoringEquivalent', 'inputEquivalent', 'renderingEquivalent',
      'fullLayoutVerified', 'interactionGeometryVerified']) assert.equal(g[flag], false);
  }
  assert.deepEqual(validateButtonBoxSizingInputs(evidence), []);
});

test('button box sizing source binding rejects detached geometry populations and upgraded claims', () => withAuditScratch('button-box-sizing-binding-control-', directory => {
  // Three real capture entries form a separate diagnostic corpus, not reduced
  // coverage of the full-source proof above. Retain files for failure diagnosis.
  const staticButton = raw.results.find(e => e.family === 'button' && e.profile === 'light');
  const interactionButton = raw.interactions.find(e => e.family === 'button' && e.profile === 'light');
  const negative = raw.results.find(e => selectedButtonInputs(e).length === 0);
  const small = { results: [staticButton, negative], interactions: [interactionButton] };
  const parityPath = path.join(directory, 'capture.json');
  writeFileSync(parityPath, JSON.stringify(small));
  const evidence = collectButtonBoxSizingInputs(small, { parityPath });
  assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
  assert.equal(evidence.captures.length, 3); assert.equal(evidence.observations.length, 6);
  assert.deepEqual(validateButtonBoxSizingInputs(evidence), []);
  const selectedId = selectedButtonInputs(staticButton)[0].id;
  const measured = e => e.results[0].geometry.elements.find(g => g.id === selectedId);
  const sourceMutations = [
    v => { v.results.pop(); },
    v => { v.results.push(v.results[0]); },
    v => { measured(v).actual.left += 7; measured(v).actual.right += 7; },
    v => { measured(v).expected.top += 7; measured(v).expected.bottom += 7; },
    v => { delete v.results[0].geometry; },
    v => { v.interactions[0].geometry = v.results[0].geometry; },
    v => { v.results[0].styleInputs = []; },
    v => { v.results[0].inputTrees.astylar.sha256 = '0'.repeat(64); },
  ];
  for (const [i, mutate] of sourceMutations.entries()) {
    const v = structuredClone(small); mutate(v);
    const result = collectButtonBoxSizingInputs(v, { parityPath });
    assert.equal(result.binding.status, 'invalid', `source control ${i}`);
    assert.deepEqual(result.observations, [], `partial proof escaped source control ${i}`);
  }
  const receiptMutations = [
    v => { v.captures.splice(1, 1); },
    v => { v.captures[0].geometrySha256 = '0'.repeat(64); },
    v => { v.captures[0].selectedOwners.pop(); },
    v => { v.observations[0].proof.geometry.actual.left += 7; v.observations[0].proof.geometry.actual.right += 7; },
    v => { const gap = v.observations.find(o => !o.proof.observedDeclaredBorderBox); gap.proof.geometry = v.observations[0].proof.geometry;
      gap.proof.observedDeclaredBorderBox = true; gap.proof.geometryGap = null; },
    v => { v.observations[0].inputSha256 = '0'.repeat(64); },
    v => { v.observations[0].proof.referenceRule.request['box-sizing'].value = 'content-box'; },
    v => { v.groups[0].measuredCases.push(v.groups[0].geometryGapCases.pop()); },
    v => { v.groups[0].inputEquivalent = true; },
    v => { v.groups[0].renderingEquivalent = true; },
    v => { v.groups[0].widthAuthoringEquivalent = true; },
    v => { v.groups[0].fullLayoutVerified = true; },
    v => { v.groups[0].interactionGeometryVerified = true; },
    v => { v.binding.sha256 = '0'.repeat(64); },
    v => { v.binding.file = 'package.json'; },
  ];
  for (const [i, mutate] of receiptMutations.entries()) {
    const v = structuredClone(evidence); mutate(v);
    assert.ok(validateButtonBoxSizingInputs(v).length, `receipt control ${i}`);
  }
  assert.equal(collectButtonBoxSizingInputs(small).binding.status, 'unbound');
  assert.equal(collectButtonBoxSizingInputs(small, { parityPath: 'package.json' }).binding.status, 'invalid');
  assert.ok(validateButtonBoxSizingInputs({ binding: { status: 'unbound' } }).length);
  console.log(JSON.stringify({ sourceControls: sourceMutations.length, receiptControls: receiptMutations.length,
    diagnosticCases: 3, diagnosticOwners: 6, temporaryDiagnosticCapture: parityPath }));
}));
