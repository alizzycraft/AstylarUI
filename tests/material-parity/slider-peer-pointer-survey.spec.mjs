import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const file = 'docs/material-slider-peer-pointer-survey.json';
const report = JSON.parse(readFileSync(file));
const hash = value => createHash('sha256').update(value).digest('hex');

test('slider peer-pointer survey retains every original owner and separates held suppression from drag causality', () => {
  const rawBytes = readFileSync(report.capture.file);
  assert.equal(hash(rawBytes), report.capture.sha256);
  const raw = JSON.parse(rawBytes);
  const entries = [...raw.results.map(e => ({ ...e, kind: 'static' })), ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => e.family === 'slider');
  const key = e => `${e.kind}:slider@${e.profile}/${e.viewport.id}${e.state ? `/${e.state}` : ''}`;
  assert.equal(report.cases, 78); assert.equal(report.owners, 156);
  assert.deepEqual(report.observations.map(o => o.case), entries.map(key));
  assert.equal(report.candidateComputedPointerEventsVerified, false);
  assert.equal(report.dragCauseVerified, false); assert.equal(report.canonicalIntegration, false);
  let suppressed = 0;
  for (const [i, observation] of report.observations.entries()) {
    const entry = entries[i]; assert.deepEqual(observation.inputTrees, entry.inputTrees);
    assert.deepEqual(observation.owners.map(o => o.element), ['slider-start', 'slider-primary']);
    for (const owner of observation.owners) {
      const input = entry.styleInputs.find(s => s.id === owner.element);
      assert.equal(owner.referenceComputed, input.reference.pointerEvents);
      assert.equal(owner.candidateLocalDeclaration, '<omitted>');
      assert.equal(input.astylar.pointerEvents, undefined);
      assert.deepEqual(owner.candidateMatchingRules, input.astylarAuthored);
      if (owner.suppressedSibling) {
        suppressed++;
        assert.equal(entry.state, 'held'); assert.equal(owner.element, 'slider-start');
        assert.equal(owner.referenceComputed, 'none');
        assert.equal(owner.referencePointerRules.length, 1);
        assert.deepEqual(owner.referencePointerRules[0].declarations, { 'pointer-events': { value: 'none', important: false } });
      } else assert.equal(owner.referenceComputed, 'auto');
    }
  }
  assert.equal(suppressed, 8); assert.equal(report.suppressedSiblingCases, 8);
  for (const source of report.sourceFingerprints)
    assert.equal(hash(readFileSync(source.file, 'utf8').replaceAll('\r\n', '\n')), source.sha256, source.file);
});

test('slider peer-pointer survey independently reopens all paired trees and reproduces the exact report', () => {
  const before = hash(readFileSync(file));
  const output = execFileSync(process.execPath, ['scripts/audit-material-slider-peer-pointer.mjs', '--check'], { encoding: 'utf8' });
  assert.deepEqual(JSON.parse(output), { file, cases: 78, owners: 156, suppressedSiblingCases: 8, dragCauseVerified: false });
  assert.equal(hash(readFileSync(file)), before, 'check mode must not rewrite the evidence');
});
