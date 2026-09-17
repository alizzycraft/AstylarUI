import assert from 'node:assert/strict';
import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { bindExplicitGapPopulation, selectExplicitGapPopulation, explicitGapClassificationContexts }
  from './explicit-gap-source-binding.mjs';
import { classifyExplicitGapComposition, explicitGapAttribution } from './explicit-gap-classification.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fields = ['family', 'element', 'property', 'reference', 'astylar', 'classification', 'attribution',
  'recommendedOwner', 'justification', 'reviewEvidence', 'reviewedCases', 'occurrences', 'cases', 'states'];

// Independently derive the expected classifications from the original scalar
// capture and fixed proof inventory, never from whatever rows remain in an audit.
// Full tree/descendant replay is additionally required by source validation.
export function expectedExplicitGapClassifications(evidence, { root = process.cwd(), requireComplete = true } = {}) {
  assert.equal(evidence?.binding?.status, 'bound', 'missing explicit gap source binding');
  assert.equal(evidence.binding.proof.file, 'docs/material-explicit-gap-canonical-binding.json');
  const proofBytes = readFileSync(path.resolve(root, evidence.binding.proof.file));
  assert.equal(hash(proofBytes), evidence.binding.proof.sha256, 'explicit gap proof digest changed');
  const proof = JSON.parse(proofBytes);
  assert.ok(isDeepStrictEqual(evidence.groups, proof.rows), 'explicit gap proof group inventory changed');
  const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
  const file = realpathSync(path.resolve(root, evidence.binding.file)), relative = path.relative(boundary, file);
  assert.ok(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
    'explicit gap coverage source escapes Material artifacts');
  const bytes = readFileSync(file);
  assert.equal(hash(bytes), evidence.binding.sha256, 'explicit gap original capture digest changed');
  const population = selectExplicitGapPopulation(JSON.parse(bytes), proof);
  const reconstructed = bindExplicitGapPopulation(population, proof);
  assert.deepEqual(evidence.coverage, reconstructed.coverage, 'explicit gap proof population coverage changed');
  if (requireComplete) assert.equal(reconstructed.coverage.complete, true, 'explicit gap complete proof population missing');
  assert.ok(isDeepStrictEqual(evidence.captures, reconstructed.captures), 'explicit gap captures changed');
  assert.ok(isDeepStrictEqual(evidence.observations, reconstructed.observations), 'explicit gap observations changed');
  const contexts = explicitGapClassificationContexts(reconstructed), expected = new Map();
  for (const entry of population) {
    const caseId = `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    for (const input of entry.styleInputs) for (const property of ['columnGap', 'rowGap']) {
      const context = contexts.get(JSON.stringify([caseId, input.id, property]));
      assert.ok(context, 'missing independent explicit gap context');
      const candidate = context.group.candidate;
      const classified = classifyExplicitGapComposition(input, property, 'normal', candidate, context);
      assert.ok(classified, 'source-bound explicit gap classification missing');
      const signature = JSON.stringify([entry.family, input.id, property]);
      if (!expected.has(signature)) expected.set(signature, {
        family: entry.family, element: input.id, property, reference: 'normal', astylar: candidate,
        classification: classified.classification, attribution: classified.attribution,
        recommendedOwner: classified.owner, justification: classified.justification,
        reviewEvidence: classified.reviewEvidence, reviewedCases: [], occurrences: 0, cases: [], states: [],
      });
      const row = expected.get(signature); row.reviewedCases.push(caseId); row.occurrences++;
      if (row.cases.length < 12) row.cases.push(caseId);
      const state = entry.state ?? 'static'; if (!row.states.includes(state)) row.states.push(state);
    }
  }
  return [...expected.values()].sort((a, b) => a.family.localeCompare(b.family) ||
    a.element.localeCompare(b.element) || a.property.localeCompare(b.property));
}

export function validateExplicitGapClassifications(evidence, discrepancies, options = {}) {
  try {
    const expected = expectedExplicitGapClassifications(evidence, options);
    const actual = discrepancies.filter(row => row.attribution === explicitGapAttribution)
      .map(row => Object.fromEntries(fields.map(field => [field, row[field]])));
    assert.ok(isDeepStrictEqual(actual, expected), 'explicit gap classifications differ from complete original coverage');
  } catch (error) { return [`explicit gap classification replay failed: ${error}`]; }
  return [];
}
