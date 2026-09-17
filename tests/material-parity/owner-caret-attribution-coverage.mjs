import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { ownerCaretAttributions } from './owner-caret-classification.mjs';

const hash = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const key = r => JSON.stringify([r.family, r.element, r.reference]);
const assertSame = (a, b, message) => assert.ok(isDeepStrictEqual(a, b), message);
const flags = ['inputEquivalent', 'computedCandidateVerified', 'descendantCaretVerified',
  'renderingEquivalent', 'rendererCauseProven', 'wholeElementInputEquivalent'];

// The caller authenticates the pinned parent and replays the entire candidate
// report from original trees. This separate join derives output membership from
// original scalar cases, never from whichever classified rows survive a filter.
export function expectedOwnerCaretAttributionRows(report, parent, original, canonicalStyle) {
  assert.equal(report.canonicalIntegration, false);
  assert.equal(report.findings.length, parent.groups.length);
  const groups = new Map(parent.groups.map(g => [key(g), { parent: g, observations: [] }]));
  assert.equal(groups.size, parent.groups.length);
  const cases = new Set();
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) {
    for (const entry of entries) {
      const caseId = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
      assert.ok(!cases.has(caseId), 'duplicate original case'); cases.add(caseId);
      const owners = new Set();
      for (const input of entry.styleInputs) {
        assert.ok(!owners.has(input.id), 'duplicate original owner'); owners.add(input.id);
        if (canonicalStyle(input.astylar ?? {}).caretColor !== undefined) continue;
        const g = groups.get(key({ family: entry.family, element: input.id,
          reference: canonicalStyle(input.reference ?? {}).caretColor }));
        if (!g) continue;
        assert.equal(Object.hasOwn(input.astylar, 'caretColor'), false);
        g.observations.push({ case: caseId, state: entry.state ?? 'static', inputSha256: hash(input),
          inputTrees: entry.inputTrees, referenceRaw: input.reference.caretColor,
          referenceColorRaw: input.reference.color, candidateRaw: '<omitted>' });
      }
    }
  }
  assert.equal(cases.size, report.originalCasesScanned);
  const seen = new Set(), rows = [], pending = [];
  for (const finding of report.findings) {
    const identity = key(finding); assert.ok(!seen.has(identity), 'duplicate finding'); seen.add(identity);
    const g = groups.get(identity); assert.ok(g, 'unexpected finding');
    assert.equal(finding.property, 'caretColor'); assert.equal(finding.candidate, '<omitted>');
    assert.equal(finding.canonicalRowSha256, g.parent.canonicalRowSha256);
    assert.equal(finding.observations.length, g.observations.length);
    assert.equal(g.observations.length, g.parent.canonicalOccurrences);
    const project = o => ({ case: o.case, inputSha256: o.inputSha256, inputTrees: o.inputTrees,
      referenceRaw: o.referenceRaw, referenceColorRaw: o.referenceColorRaw, candidateRaw: o.candidateRaw });
    assertSame(finding.observations.map(project), g.observations.map(project), 'complete original membership changed');
    assertSame(g.parent.observations.map(project), g.observations.map(project), 'parent membership changed');
    for (let i = 0; i < finding.observations.length; i++) {
      const o = finding.observations[i];
      assert.equal(o.proofSha256, g.parent.observations[i].proofSha256);
      if (finding.disposition === 'requires-specific-review') {
        assert.equal(o.classification, null, 'pending observation promoted');
        assert.equal(o.disposition, 'requires-specific-review'); continue;
      }
      const c = o.classification; assert.ok(c, 'reviewed classification missing');
      assert.ok(Object.values(ownerCaretAttributions).includes(c.attribution));
      assert.equal(c.attribution, finding.disposition); assert.equal(c.classification, 'parity-harness-defect');
      assert.equal(o.disposition, 'reviewed-observation-stage');
      assert.equal(c.reviewEvidence.case, o.case); assert.equal(c.reviewEvidence.inputSha256, o.inputSha256);
      assert.equal(c.reviewEvidence.proofSha256, o.proofSha256);
      assert.equal(c.reviewEvidence.rawReference, o.referenceRaw);
      assert.equal(c.reviewEvidence.rawReferenceColor, o.referenceColorRaw);
      assert.equal(c.reviewEvidence.rawCandidate, '<omitted>');
      for (const flag of flags) assert.equal(c.reviewEvidence[flag], false);
    }
    const membership = { family: finding.family, element: finding.element, property: 'caretColor',
      reference: finding.reference, occurrences: g.observations.length,
      reviewedCases: g.observations.map(o => o.case), cases: g.observations.slice(0, 12).map(o => o.case),
      states: [...new Set(g.observations.map(o => o.state))] };
    if (finding.disposition === 'requires-specific-review') {
      pending.push({ ...membership, disposition: finding.disposition }); continue;
    }
    const first = finding.observations[0].classification;
    assert.ok(finding.observations.every(o => o.classification.justification === first.justification &&
      o.classification.owner === first.owner), 'mixed classification cannot be collapsed');
    rows.push({ ...membership, astylar: undefined, classification: first.classification,
      attribution: first.attribution, recommendedOwner: first.owner, justification: first.justification,
      reviewEvidence: first.reviewEvidence });
  }
  assert.equal(seen.size, groups.size);
  const sort = xs => xs.sort((a, b) => a.family.localeCompare(b.family) || a.element.localeCompare(b.element) ||
    a.property.localeCompare(b.property));
  return { rows: sort(rows), pending: sort(pending), originalCasesScanned: cases.size,
    reviewedGroups: rows.length, reviewedObservations: rows.reduce((n, r) => n + r.occurrences, 0),
    pendingGroups: pending.length, pendingObservations: pending.reduce((n, r) => n + r.occurrences, 0),
    canonicalIntegration: false, inputEquivalent: false, renderingEquivalent: false };
}

// Accept a full discrepancy population, not just rows already marked reviewed.
// An absent/relabeled row must fail just as a changed value or case list does.
export function validateOwnerCaretAttributionRows(expected, discrepancies) {
  const fields = ['family', 'element', 'property', 'reference', 'astylar', 'occurrences',
    'reviewedCases', 'cases', 'states', 'classification', 'attribution', 'recommendedOwner', 'justification', 'reviewEvidence'];
  const project = r => Object.fromEntries(fields.map(f => [f, r[f]]));
  const actual = discrepancies.filter(r => Object.values(ownerCaretAttributions).includes(r.attribution)).map(project);
  return isDeepStrictEqual(actual, expected.rows.map(project)) ? [] : ['caret attribution differs from complete original coverage'];
}
