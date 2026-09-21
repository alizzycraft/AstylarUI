import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const hash = b => createHash('sha256').update(b).digest('hex');
export function assemblePositionQueue(population, reviews) {
  const indexed = new Map();
  for (const review of reviews) {
    for (const group of review.groups) {
      assert.ok(!indexed.has(group.element), 'duplicate reviewed element');
      const original = population.groups.filter(g => g.element === group.element);
      assert.equal(original.length, 1);
      assert.deepEqual(group.cases, original[0].observations.map(o => o.case), 'incomplete/reordered membership');
      if (group.priorRowSha256) assert.equal(group.priorRowSha256, original[0].priorRowSha256);
      indexed.set(group.element, { status: review.status, source: review.source });
    }
  }
  const groups = population.groups.map(g => ({ family: g.family, element: g.element,
    property: g.property, reference: g.reference, candidate: g.candidate,
    candidateOmitted: g.candidateOmitted, observations: g.occurrences, priorRowSha256: g.priorRowSha256,
    ...(indexed.get(g.element) ?? { status: 'investigation-pending', source: null }) }));
  const counts = {};
  for (const g of groups) {
    const c = counts[g.status] ??= { groups: 0, observations: 0 }; c.groups++; c.observations += g.observations;
  }
  return { schemaVersion: 1, kind: 'position-review-integration-queue', groups, counts,
    canonicalAcceptanceClaimed: false, inputEquivalent: false, renderingEquivalent: false };
}
export function collectPositionQueue() {
  const load = name => { const file = `docs/${name}.json`, b = readFileSync(file);
    return { data: JSON.parse(b), source: { file, sha256: hash(b) } }; };
  const population = load('material-position-input-population');
  assert.equal(population.source.sha256, '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff');
  const reviews = [];
  for (const name of ['material-grid-position-substitution', 'material-flow-position-substitutions']) {
    const { data, source } = load(name);
    reviews.push({ source, status: 'producer-integrated-conservation-pending', groups: data.groups.map(g => ({
      element: g.element, priorRowSha256: g.priorRowSha256, cases: g.reviewedCases ?? g.observations.map(o => o.case) })) });
  }
  for (const [name, element, status] of [
    ['material-tooltip-position-composition', 'tooltip-popup', 'classified-integration-pending'],
    ['material-tab-position-substitution', 'tabs-primary', 'classified-integration-pending'],
    ['material-stepper-position-substitution', 'stepper-primary', 'classified-integration-pending'],
    ['material-radio-position-substitution', 'radio-primary', 'classified-integration-pending'],
    ['material-sort-focus-placement', 'sort-primary', 'inspection-classification-pending'],
  ]) {
    const { data, source } = load(name);
    reviews.push({ source, status, groups: [{ element, cases: data.observations.map(o => o.case) }] });
  }
  const { data, source } = load('material-static-position-observation');
  reviews.push({ source, status: 'classified-integration-pending', groups: data.reviewed.map(g => ({
    element: g.element, priorRowSha256: g.priorRowSha256, cases: g.observations.map(o => o.case) })) });
  return { population: population.source, ...assemblePositionQueue(population.data, reviews) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = collectPositionQueue();
  writeFileSync('docs/material-position-review-queue.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.counts));
}
