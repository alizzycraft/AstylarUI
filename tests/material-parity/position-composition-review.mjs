import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { collectGridPositionSubstitution } from '../../scripts/audit-material-grid-position-substitution.mjs';
import { collectFlowPositionSubstitutions } from '../../scripts/audit-material-flow-position-substitutions.mjs';
const hash = v => createHash('sha256').update(v).digest('hex');
const digest = v => hash(JSON.stringify(v));
const signature = r => JSON.stringify([r.family, r.element, r.property, r.reference, r.astylar]);
const metadata = ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases'];
export const positionCompositionAttribution = 'reviewed-position-composition-substitution';

export function collectPositionCompositionReview() {
  const populationFile = 'docs/material-position-input-population.json';
  const bytes = readFileSync(populationFile);
  assert.equal(hash(bytes), '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff');
  const population = JSON.parse(bytes);
  const proofs = [collectGridPositionSubstitution(), collectFlowPositionSubstitutions()];
  const sourceFiles = ['docs/material-grid-position-substitution.json', 'docs/material-flow-position-substitutions.json'];
  const sources = sourceFiles.map((file, index) => {
    const data = readFileSync(file); assert.deepEqual(JSON.parse(data), proofs[index]);
    return { file, sha256: hash(data) };
  });
  const groups = proofs.flatMap((proof, proofIndex) => proof.groups.map(reviewed => {
    const matches = population.groups.filter(g => g.element === reviewed.element);
    assert.equal(matches.length, 1); const prior = matches[0];
    assert.equal(prior.priorRowSha256, reviewed.priorRowSha256);
    assert.equal(prior.occurrences, reviewed.occurrences);
    const cases = reviewed.reviewedCases ?? reviewed.observations.map(o => o.case);
    assert.deepEqual(cases, prior.observations.map(o => o.case));
    const grid = proofIndex === 0;
    return { family: prior.family, element: prior.element, property: 'position', reference: prior.reference,
      ...(prior.candidateOmitted ? {} : { astylar: prior.candidate }), occurrences: prior.occurrences,
      classification: 'application-plugin-authoring-defect', attribution: positionCompositionAttribution,
      justification: grid
        ? 'Reference positioned block/tile composition is replaced by a zero-gap grid with relative flex tiles; authored layout intent diverges before core layout.'
        : prior.family === 'divider'
          ? 'Reference in-flow border separator is replaced by an absolute one-pixel background strip with calibrated coordinates.'
          : 'Reference centered inline-flex label composition is replaced by an absolute label inside a relative fixed-height host.',
      recommendedOwner: `showcase ${prior.family} translation; preserve equal inputs when resolving underlying core behavior`,
      reviewEvidence: { originalCompleteRowSha256: prior.priorRowSha256, completeSourceProofSha256: digest(proof),
        source: sources[proofIndex], observationCount: prior.occurrences,
        firstDivergence: 'authored layout composition', inputEquivalent: false,
        rendererCauseProven: false, renderingEquivalent: false }, reviewedCases: cases };
  }));
  assert.equal(groups.length, 6); assert.equal(new Set(groups.map(signature)).size, 6);
  assert.equal(groups.reduce((n, g) => n + g.occurrences, 0), 316);
  return { schemaVersion: 1, kind: 'reviewed-position-composition-batch', sources,
    counts: { groups: 6, observations: 316 }, groups, canonicalAttributionChanged: false };
}

// This boundary cannot accept a caller-invented proof, subset, or reordered
// review. The production producer is deliberately not wired to it yet.
export function validatePositionCompositionReview(review) {
  assert.deepEqual(review, collectPositionCompositionReview());
}
export function applyPositionCompositionReview(rows, review) {
  validatePositionCompositionReview(review);
  const expected = new Map(review.groups.map(g => [signature(g), g])), seen = new Set();
  const output = rows.map(row => {
    const key = signature(row), decision = expected.get(key); if (!decision) return row;
    assert.ok(!seen.has(key)); seen.add(key);
    assert.equal(row.attribution, 'unresolved');
    assert.equal(digest(row), decision.reviewEvidence.originalCompleteRowSha256, 'complete original position row changed');
    const priorMetadata = metadata.map(field => ({ field, present: Object.hasOwn(row, field),
      ...(Object.hasOwn(row, field) ? { value: structuredClone(row[field]) } : {}) }));
    return { ...row, ...Object.fromEntries(metadata.map(k => [k, structuredClone(decision[k])])),
      reviewEvidence: { ...structuredClone(decision.reviewEvidence), priorMetadata } };
  });
  assert.equal(seen.size, 6, 'position review population incomplete');
  return output;
}

// Reconstruct the complete predecessor from serialized metadata, then require
// its independently pinned digest. This protects raw fields and field absence,
// not merely selected scalar values or a self-reported observation count.
export function validatePositionCompositionRows(rows, review) {
  validatePositionCompositionReview(review);
  const actual = rows.filter(row => row.attribution === positionCompositionAttribution);
  const indexed = new Map(actual.map(row => [signature(row), row]));
  assert.equal(actual.length, 6); assert.equal(indexed.size, 6);
  for (const decision of review.groups) {
    const row = indexed.get(signature(decision)); assert.ok(row, 'position row missing');
    for (const field of metadata.filter(f => f !== 'reviewEvidence'))
      assert.deepEqual(row[field], decision[field], `position ${field} changed`);
    const { priorMetadata, ...proof } = row.reviewEvidence;
    assert.deepEqual(proof, decision.reviewEvidence);
    assert.deepEqual(priorMetadata.map(item => item.field), metadata);
    const original = structuredClone(row);
    for (const item of priorMetadata) {
      assert.equal(typeof item.present, 'boolean');
      assert.deepEqual(Object.keys(item).sort(), (item.present ? ['field', 'present', 'value'] : ['field', 'present']).sort());
      if (item.present) original[item.field] = structuredClone(item.value);
      else delete original[item.field];
    }
    assert.equal(original.attribution, 'unresolved');
    assert.equal(digest(original), proof.originalCompleteRowSha256, 'serialized position predecessor changed');
  }
}
