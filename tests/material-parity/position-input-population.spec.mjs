import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectPositionPopulation, verifyPositionMembers } from '../../scripts/audit-material-position-population.mjs';

test('position census replays every unresolved baseline group from complete original source membership', async () => {
  const report = await collectPositionPopulation();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-position-input-population.json')));
  assert.deepEqual(report.counts, { groups: 58, observations: 2950, candidateExplicit: 863,
    referenceExplicit: 1038, differingElementTypes: 1951 });
  assert.equal(report.canonicalAttributionChanged, false);
  assert.equal(report.rendererCauseProven, false);
  assert.ok(report.groups.every(group => group.attribution === 'unresolved' && !group.classificationChanged));
});

test('position membership rejects drops, duplicates, changed states, values and invented omission defaults', () => {
  const report = JSON.parse(readFileSync('docs/material-position-input-population.json'));
  const group = report.groups.find(row => row.element === 'badge-label');
  const row = { family: group.family, element: group.element, reference: group.reference,
    occurrences: group.occurrences, cases: group.observations.slice(0, 12).map(member => member.case),
    states: [...new Set(group.observations.map(member => member.state))] };
  verifyPositionMembers(row, group.observations);
  for (const mutate of [
    members => { members.pop(); },
    members => { members[1] = structuredClone(members[0]); },
    members => { members.reverse(); },
    members => { members[0].state = 'unobserved'; },
    members => { members[0].case = members[0].case.replace('badge@', 'card@'); },
    members => { members[0].reference.value = 'relative'; },
    members => { members[0].candidate.value = 'static'; },
    members => { members[0].candidate.present = true; },
  ]) {
    const members = structuredClone(group.observations); mutate(members);
    assert.throws(() => verifyPositionMembers(row, members));
  }
});
