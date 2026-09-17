import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const key = row => JSON.stringify([row.family, row.element, row.reference]);

// Independent original-case enumeration. The survey's counts, case list and
// recorded hashes are assertions to verify, not the source of membership.
export function bindOwnerCaretMembership(groups, rows, original, canonicalStyle) {
  assert.equal(groups.length, rows.length);
  const indexed = new Map(rows.map(row => [key(row), { row, observations: [] }]));
  assert.equal(indexed.size, rows.length, 'duplicate canonical caret group');
  const seenGroups = new Set(), allCases = new Set(), selectedCases = new Map();
  for (const { row } of indexed.values()) {
    assert.equal(row.property, 'caretColor'); assert.equal(row.attribution, 'unresolved');
    assert.equal(row.astylar, undefined, 'only actual omitted candidate values are covered');
    assert.equal(Object.hasOwn(row, 'astylar'), false);
  }
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) {
    for (const entry of entries) {
      const caseId = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
      assert.ok(!allCases.has(caseId), 'duplicate original case'); allCases.add(caseId);
      const owners = new Set();
      for (const input of entry.styleInputs) {
        assert.ok(!owners.has(input.id), 'duplicate original scalar owner'); owners.add(input.id);
        const reference = canonicalStyle(input.reference ?? {}), candidate = canonicalStyle(input.astylar ?? {});
        if (candidate.caretColor !== undefined) continue;
        const record = indexed.get(key({ family: entry.family, element: input.id, reference: reference.caretColor }));
        if (!record) continue;
        assert.equal(Object.hasOwn(input.astylar, 'caretColor'), false, 'raw omission must not be invented');
        record.observations.push({ case: caseId, state: entry.state ?? 'static', inputSha256: hash(input),
          inputTrees: entry.inputTrees, referenceRaw: input.reference.caretColor,
          referenceColorRaw: input.reference.color, candidateRaw: '<omitted>' });
        selectedCases.set(caseId, { case: caseId, inputTrees: entry.inputTrees });
      }
    }
  }
  const memberships = groups.map(group => {
    assert.equal(group.property, 'caretColor'); assert.equal(group.candidate, '<omitted>');
    const identity = key(group); assert.ok(!seenGroups.has(identity), 'duplicate survey group'); seenGroups.add(identity);
    const record = indexed.get(identity); assert.ok(record, 'survey group absent from canonical rows');
    const { row, observations } = record;
    assert.ok(observations.length, 'canonical group has no original members');
    assert.equal(group.canonicalRowSha256, hash(row), 'complete canonical row changed');
    assert.equal(group.canonicalOccurrences, row.occurrences);
    assert.equal(row.occurrences, observations.length);
    assert.equal(group.originalCountMatchesCanonical, true);
    assert.equal(new Set(observations.map(o => o.case)).size, observations.length);
    assert.deepEqual(row.cases, observations.slice(0, 12).map(o => o.case), 'canonical ordered case sample changed');
    assert.deepEqual(row.states, [...new Set(observations.map(o => o.state))], 'canonical state population changed');
    const project = ({ state, ...o }) => o;
    assert.deepEqual(group.observations.map(o => ({ case: o.case, inputSha256: o.inputSha256,
      inputTrees: o.inputTrees, referenceRaw: o.referenceRaw, referenceColorRaw: o.referenceColorRaw,
      candidateRaw: o.candidateRaw })), observations.map(project), 'complete ordered survey membership differs');
    return { family: row.family, element: row.element, property: row.property, reference: row.reference,
      canonicalRowSha256: hash(row), originalMembershipSha256: hash(observations),
      observations: observations.length, canonicalSample: row.cases, states: row.states };
  });
  return { groups: memberships.length, originalCasesScanned: allCases.size,
    selectedCases: [...selectedCases.values()], observations: memberships.reduce((n, g) => n + g.observations, 0),
    memberships, inputEquivalent: false, computedCandidateVerified: false, renderingEquivalent: false,
    rendererCauseProven: false };
}
