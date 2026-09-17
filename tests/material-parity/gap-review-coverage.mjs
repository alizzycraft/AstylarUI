import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { bindGapReviewPopulation, gapReviewClassificationContexts, selectGapReviewPopulation } from './gap-review-source-binding.mjs';
import { classifyGapReview, gapReviewAttributions } from './gap-review-classification.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fields = ['family', 'element', 'property', 'reference', 'astylar', 'classification', 'attribution',
  'recommendedOwner', 'justification', 'reviewEvidence', 'reviewedCases', 'occurrences', 'cases', 'states'];

// Derive the expected population from the original capture, not from whichever
// classifications a consumer retains. Source validation separately authenticates
// the committed proof and replays its original full-tree/canonical verifiers.
export function expectedGapReviewClassifications(evidence, { root = process.cwd(), requireComplete = true } = {}) {
  assert.equal(evidence?.binding?.status, 'bound', 'missing gap review source binding');
  assert.equal(evidence.binding.proof.file, 'docs/material-gap-review-membership.json');
  const proofBytes = readFileSync(path.resolve(root, evidence.binding.proof.file));
  assert.equal(hash(proofBytes), evidence.binding.proof.sha256, 'gap review proof digest changed');
  const proof = JSON.parse(proofBytes);
  assert.ok(isDeepStrictEqual(evidence.groups, proof.rows), 'gap review proof group inventory changed');
  const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
  const file = realpathSync(path.resolve(root, evidence.binding.file)), relative = path.relative(boundary, file);
  assert.ok(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
    'gap review coverage source escapes Material artifacts');
  const bytes = readFileSync(file); assert.equal(hash(bytes), evidence.binding.sha256, 'gap review capture digest changed');
  const population = selectGapReviewPopulation(JSON.parse(bytes), proof);
  const reconstructed = bindGapReviewPopulation(population, proof);
  assert.deepEqual(evidence.coverage, reconstructed.coverage, 'gap review population coverage changed');
  if (requireComplete) assert.equal(reconstructed.coverage.complete, true, 'gap review complete proof population missing');
  assert.ok(isDeepStrictEqual(evidence.captures, reconstructed.captures), 'gap review captures changed');
  assert.ok(isDeepStrictEqual(evidence.observations, reconstructed.observations), 'gap review observations changed');
  const contexts = gapReviewClassificationContexts(reconstructed), expected = new Map();
  for (const entry of population) {
    const caseId = `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    for (const input of entry.styleInputs) for (const property of ['columnGap', 'rowGap']) {
      const context = contexts.get(JSON.stringify([caseId, input.id, property]));
      assert.ok(context, 'missing independent gap review context');
      const classified = classifyGapReview(input, property, 'normal', undefined, context);
      if (context.group.reviewDisposition === 'requires-review') {
        assert.equal(classified, undefined, 'unresolved original motion upgraded'); continue;
      }
      assert.ok(classified, 'source-bound gap review classification missing');
      const key = JSON.stringify([entry.family, input.id, property]);
      if (!expected.has(key)) expected.set(key, { family: entry.family, element: input.id, property,
        reference: 'normal', astylar: undefined, classification: classified.classification,
        attribution: classified.attribution, recommendedOwner: classified.owner, justification: classified.justification,
        reviewEvidence: classified.reviewEvidence, reviewedCases: [], occurrences: 0, cases: [], states: [] });
      const row = expected.get(key); row.reviewedCases.push(caseId); row.occurrences++;
      if (row.cases.length < 12) row.cases.push(caseId);
      const state = entry.state ?? 'static'; if (!row.states.includes(state)) row.states.push(state);
    }
  }
  return [...expected.values()].sort((a, b) => a.family.localeCompare(b.family) ||
    a.element.localeCompare(b.element) || a.property.localeCompare(b.property));
}

export function validateGapReviewClassifications(evidence, discrepancies, options = {}) {
  try {
    const expected = expectedGapReviewClassifications(evidence, options);
    const actual = discrepancies.filter(row => Object.values(gapReviewAttributions).includes(row.attribution))
      .map(row => Object.fromEntries(fields.map(field => [field, row[field]])));
    assert.ok(isDeepStrictEqual(actual, expected), 'gap review classifications differ from complete original coverage');
  } catch (error) { return [`gap review classification replay failed: ${error}`]; }
  return [];
}
