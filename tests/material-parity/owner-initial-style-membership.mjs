import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { collectFullTreeInventory, collectRetainedTypographyEvidence } from './input-equivalence-audit.mjs';
import { implicitReferenceValues } from './input-equivalence-policy.mjs';
import { ownerInitialValues } from './owner-initial-style-survey.mjs';

export const originalCaseKey = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? `/${e.state}` : ''}`;
const scalar = (p, value) => p === 'wordSpacing' && value === '0px' ? '0' : value;
export const ownerInitialSignature = r => JSON.stringify([r.family, r.element, r.property, r.reference, r.astylar]);

// Replay the existing static-only retained-text stage guard, not a new default
// equivalence rule. Its conditions mirror classifyReviewedTypographyStage;
// source fingerprints and the complete canonical partition constrain that use.
function staticStageWitness(entry, input, property, evidence) {
  const value = scalar(property, input.reference?.[property]), values = evidence?.properties[property];
  if (entry.state || input.astylar?.[property] !== undefined || !values || value === undefined ||
      implicitReferenceValues[property]?.includes(value) || input.astylarResolvedStyleEvidenceVersion !== 2 ||
      input.referenceStructure?.schemaVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
      input.referenceStructure.text !== evidence.text || input.astylarStructure.ownText !== evidence.text ||
      values.reference !== value || values.normal !== undefined || values.effective !== undefined || values.retained !== value) return;
  return { case: evidence.case, referenceNode: evidence.referenceNode, astylarNode: evidence.astylarNode,
    source: evidence.source, revision: evidence.revision, property,
    values: Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined)) };
}

export function bindOwnerInitialMembership(rows, raw, { root = process.cwd() } = {}) {
  assert.ok(Array.isArray(rows));
  const pending = rows.filter(r => r.attribution === 'unresolved' && Object.hasOwn(ownerInitialValues, r.property));
  const keys = new Set(pending.map(ownerInitialSignature));
  assert.equal(keys.size, pending.length, 'ambiguous unresolved signature');
  const siblings = rows.filter(r => keys.has(ownerInitialSignature(r)) && r.attribution !== 'unresolved');
  assert.ok(siblings.every(r => r.attribution === 'reviewed-stage-mismatch' && r.classification === 'parity-harness-defect' &&
    isDeepStrictEqual(r.states, ['static'])), 'unreviewed competing canonical classification');
  const entries = [...raw.results.map(e => ({ ...e, kind: 'static' })), ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  assert.equal(new Set(entries.map(originalCaseKey)).size, entries.length, 'duplicate original case');
  const siblingFamilies = new Set(siblings.map(r => r.family));
  const staticEntries = entries.filter(e => !e.state && siblingFamilies.has(e.family));
  const inventory = collectFullTreeInventory(staticEntries, { root });
  assert.deepEqual(inventory.errors, [], 'original static tree source binding');
  const retained = collectRetainedTypographyEvidence(staticEntries, inventory);
  const retainedByOwner = new Map(retained.comparisons.map(p => [JSON.stringify([p.case, p.element]), p]));
  assert.equal(retainedByOwner.size, retained.comparisons.length, 'duplicate retained owner');
  const groups = [];
  for (const row of pending) {
    const key = ownerInitialSignature(row), related = siblings.filter(r => ownerInitialSignature(r) === key);
    assert.ok(related.length <= 1, 'ambiguous reviewed sibling');
    const cases = [], preserved = [], witnesses = [];
    for (const entry of entries) {
      if (entry.family !== row.family) continue;
      const matching = entry.styleInputs.filter(input => ownerInitialSignature({ family: entry.family, element: input.id,
        property: row.property, reference: scalar(row.property, input.reference?.[row.property]),
        astylar: scalar(row.property, input.astylar?.[row.property]) }) === key);
      assert.ok(matching.length <= 1, 'duplicate original scalar owner');
      if (!matching.length) continue;
      const caseKey = originalCaseKey(entry);
      const proof = related.length && staticStageWitness(entry, matching[0], row.property,
        retainedByOwner.get(JSON.stringify([caseKey, row.element])));
      if (proof) { preserved.push(caseKey); witnesses.push(proof); }
      else cases.push(caseKey);
    }
    const states = [...new Set(cases.map(c => c.startsWith('static:') ? 'static' : c.split('/').slice(2).join('/')))];
    assert.equal(cases.length, row.occurrences, `${key}: unresolved occurrence conservation`);
    assert.deepEqual(cases.slice(0, 12), row.cases, `${key}: canonical sample conservation`);
    assert.deepEqual(states, row.states, `${key}: canonical state conservation`);
    if (related.length) {
      assert.equal(preserved.length, related[0].occurrences, `${key}: reviewed occurrence conservation`);
      assert.deepEqual(preserved.slice(0, 12), related[0].cases, `${key}: reviewed sample conservation`);
      assert.ok(witnesses.some(w => isDeepStrictEqual(w, related[0].reviewEvidence)), `${key}: retained witness conservation`);
    }
    groups.push({ family: row.family, element: row.element, property: row.property,
      reference: row.reference, candidateLocalDeclaration: row.astylar ?? '<omitted>',
      canonicalAttribution: row.attribution, cases, occurrences: cases.length, states,
      preservedStaticCases: preserved, preservedStaticWitnesses: witnesses,
      membershipVerified: true, inputEquivalent: false, renderingEquivalent: false });
  }
  return groups;
}
