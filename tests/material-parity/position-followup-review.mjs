import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { collectTooltipPositionComposition } from './tooltip-position-composition.mjs';
import { collectTabPositionSubstitution } from '../../scripts/audit-material-tab-position-substitution.mjs';
import { collectStepperPositionSubstitution } from '../../scripts/audit-material-stepper-position-substitution.mjs';
import { collectRadioPositionSubstitution } from './radio-position-substitution.mjs';
import { collectStaticPositionObservations } from './static-position-observation.mjs';
import { collectChoiceLabelStacking } from './choice-label-stacking-substitution.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const digest = v => hash(JSON.stringify(v));
const signature = r => JSON.stringify([r.family, r.element, r.property, r.reference, r.astylar]);
const metadata = ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases'];
export const positionFollowupAttribution = 'reviewed-position-followup-batch';

export function collectPositionFollowupReview() {
  const bytes = readFileSync('docs/material-position-input-population.json');
  assert.equal(hash(bytes), '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff');
  const population = JSON.parse(bytes);
  const definitions = [
    ['material-tooltip-position-composition', collectTooltipPositionComposition, 'tooltip-popup'],
    ['material-tab-position-substitution', collectTabPositionSubstitution, 'tabs-primary'],
    ['material-stepper-position-substitution', collectStepperPositionSubstitution, 'stepper-primary'],
    ['material-radio-position-substitution', collectRadioPositionSubstitution, 'radio-primary'],
    ['material-static-position-observation', collectStaticPositionObservations, null],
    ['material-choice-label-stacking-substitution', collectChoiceLabelStacking, null],
  ];
  const sources = [], groups = [];
  for (const [name, collect, element] of definitions) {
    const proof = collect(), file = `docs/${name}.json`, sourceBytes = readFileSync(file);
    assert.deepEqual(proof, JSON.parse(sourceBytes));
    const source = { file, sha256: hash(sourceBytes) }; sources.push(source);
    const reviewed = element ? [{ element, observations: proof.observations }] : proof.reviewed ?? proof.groups;
    for (const group of reviewed) {
      const matches = population.groups.filter(g => g.element === group.element); assert.equal(matches.length, 1);
      const prior = matches[0], cases = group.observations.map(o => o.case);
      assert.deepEqual(cases, prior.observations.map(o => o.case));
      if (group.priorRowSha256) assert.equal(group.priorRowSha256, prior.priorRowSha256);
      const classifications = [...new Set(group.observations.map(o => o.proof.classification))];
      assert.equal(classifications.length, 1);
      const classification = classifications[0];
      assert.ok(['application-plugin-authoring-defect', 'parity-harness-defect'].includes(classification));
      assert.ok(group.observations.every(o => o.proof.rendererCauseProven === false && o.proof.inputEquivalent === false));
      const justification = group.observations[0].proof.justification ?? group.observations[0].proof.firstDivergence;
      assert.equal(typeof justification, 'string');
      groups.push({ family: prior.family, element: prior.element, property: 'position', reference: prior.reference,
        ...(prior.candidateOmitted ? {} : { astylar: prior.candidate }), occurrences: prior.occurrences,
        classification, attribution: positionFollowupAttribution, justification,
        recommendedOwner: classification === 'parity-harness-defect'
          ? 'comparison measurement-stage contract; candidate computed defaults remain unproven'
          : `showcase ${prior.family} input translation; test core with equivalent inputs before removing compensation`,
        reviewedCases: cases, reviewEvidence: { originalCompleteRowSha256: prior.priorRowSha256,
          completeSourceProofSha256: digest(proof), source, observationCount: prior.occurrences,
          inputEquivalent: false, renderingEquivalent: false, rendererCauseProven: false } });
    }
  }
  assert.equal(groups.length, 14); assert.equal(new Set(groups.map(signature)).size, 14);
  assert.equal(groups.reduce((n, g) => n + g.occurrences, 0), 768);
  return { schemaVersion: 1, kind: 'position-followup-review', sources, groups,
    counts: { groups: 14, observations: 768 }, canonicalAttributionChanged: false };
}
export function validatePositionFollowupReview(review) { assert.deepEqual(review, collectPositionFollowupReview()); }
export function applyPositionFollowupReview(rows, review) {
  validatePositionFollowupReview(review);
  const expected = new Map(review.groups.map(g => [signature(g), g])), seen = new Set();
  const output = rows.map(row => {
    const key = signature(row), decision = expected.get(key); if (!decision) return row;
    assert.ok(!seen.has(key)); seen.add(key); assert.equal(row.attribution, 'unresolved');
    assert.equal(digest(row), decision.reviewEvidence.originalCompleteRowSha256, 'original followup row changed');
    const priorMetadata = metadata.map(field => ({ field, present: Object.hasOwn(row, field),
      ...(Object.hasOwn(row, field) ? { value: structuredClone(row[field]) } : {}) }));
    return { ...row, ...Object.fromEntries(metadata.map(k => [k, structuredClone(decision[k])])),
      reviewEvidence: { ...structuredClone(decision.reviewEvidence), priorMetadata } };
  });
  assert.equal(seen.size, 14, 'followup population incomplete'); return output;
}
export function validatePositionFollowupRows(rows, review) {
  validatePositionFollowupReview(review);
  const actual = rows.filter(r => r.attribution === positionFollowupAttribution);
  const indexed = new Map(actual.map(r => [signature(r), r]));
  assert.equal(actual.length, 14); assert.equal(indexed.size, 14);
  for (const decision of review.groups) {
    const row = indexed.get(signature(decision)); assert.ok(row);
    for (const field of metadata.filter(f => f !== 'reviewEvidence')) assert.deepEqual(row[field], decision[field]);
    const { priorMetadata, ...proof } = row.reviewEvidence; assert.deepEqual(proof, decision.reviewEvidence);
    assert.deepEqual(priorMetadata.map(p => p.field), metadata);
    const original = structuredClone(row);
    for (const item of priorMetadata) {
      assert.equal(typeof item.present, 'boolean');
      assert.deepEqual(Object.keys(item).sort(), (item.present ? ['field', 'present', 'value'] : ['field', 'present']).sort());
      if (item.present) original[item.field] = structuredClone(item.value); else delete original[item.field];
    }
    assert.equal(original.attribution, 'unresolved');
    assert.equal(digest(original), proof.originalCompleteRowSha256, 'serialized followup predecessor changed');
  }
}
