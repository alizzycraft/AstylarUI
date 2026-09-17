import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { bindGapReviewMembership, loadGapReviewMembership, recordGapReviewMembership }
  from '../../scripts/bind-material-gap-review-membership.mjs';

const inputs = await loadGapReviewMembership();

test('existing motion and scalar-layer reviews retain every original canonical membership and uncertainty', () => {
  const report = recordGapReviewMembership(inputs);
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-gap-review-membership.json')));
  assert.deepEqual(report.counts, { groups: 38, observations: 1902, cases: 676,
    motionNonGapGroups: 32, scalarLayerLossGroups: 4, unresolvedMotionGroups: 2 });
  assert.equal(report.inputEquivalent, false); assert.equal(report.canonicalIntegration, false);
  for (const row of report.rows) {
    assert.equal(row.priorAttribution, 'unresolved');
    assert.equal(row.reference, 'normal'); assert.equal(row.candidate, '<omitted>');
    assert.equal(row.inputEquivalent, false); assert.equal(row.rendererCauseProven, false);
    assert.equal(row.computedCandidateVerified, false); assert.equal(row.usedGapVerified, false);
    const original = inputs.join.rows.find(r => r.family === row.family && r.element === row.element && r.property === row.property);
    assert.equal(row.canonicalRowSha256, original.canonicalRowSha256);
    assert.deepEqual(row.observations.map(o => o.case), original.observations.map(o => o.case));
    assert.equal(row.observations.length, original.occurrences);
  }
  const pending = report.rows.filter(r => r.reviewDisposition === 'requires-review');
  assert.equal(pending.reduce((n, r) => n + r.observations.length, 0), 64);
  assert.ok(pending.every(r => r.observations.every(o => o.review.reasons.length > 0)));
});

test('review membership rejects altered provenance populations values dispositions and unsupported claims', () => {
  const motionRow = x => x.join.rows.find(r => r.family === x.motion.findings[0].family &&
    r.element === x.motion.findings[0].element && r.property === x.motion.findings[0].property);
  const mutations = [
    x => { x.motion.parent.sha256 = '0'.repeat(64); },
    x => { x.scalar.capture.sha256 = '0'.repeat(64); },
    x => { x.motion.findings.pop(); },
    x => { x.scalar.findings.pop(); },
    x => { x.motion.findings[1] = structuredClone(x.motion.findings[0]); },
    x => { x.motion.findings[0].proofSha256 = '0'.repeat(64); },
    x => { x.motion.findings[0].cases.pop(); },
    x => { x.motion.findings[0].cases.reverse(); },
    x => { x.motion.findings[0].patterns[0].cases.pop(); },
    x => { x.motion.findings.find(r => r.disposition === 'requires-review').disposition = 'captured-motion-does-not-name-gap'; },
    x => { x.motion.inputEquivalent = true; },
    x => { x.scalar.renderingEquivalent = true; },
    x => { motionRow(x).canonicalAttribution = 'equivalent'; },
    x => { motionRow(x).candidate = '0px'; },
    x => { motionRow(x).observations[0].candidateRawShorthand = '8px'; },
    x => { motionRow(x).canonicalSample.reverse(); },
    x => { motionRow(x).states.push('invented'); },
    x => { x.scalar.findings[0].observations[0].inputTrees.reference.sha256 = '0'.repeat(64); },
    x => { x.scalar.findings[0].observations[0].review.usedGapVerified = true; },
    x => { x.scalar.findings[0].observations[0].proof.generatedIdentity.missingRules = []; },
    x => { x.captures.pop(); },
    x => { x.captures[1] = structuredClone(x.captures[0]); },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const changed = structuredClone(inputs); mutate(changed);
    assert.throws(() => bindGapReviewMembership(changed.join, changed.motion, changed.scalar, changed.captures), `mutation ${index}`);
  }
});
