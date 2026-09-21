import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { bindVisibilityObservationStages } from './visibility-observation-binding.mjs';
const prepared = () => JSON.parse(readFileSync('docs/material-visibility-observation-stages.json'));

test('bound visibility classification covers original members and does not expose mutable trust contexts', () => {
  const report = prepared(), bound = bindVisibilityObservationStages(report);
  assert.deepEqual(bound.counts, { reviewedGroups: 15, reviewedObservations: 530, pendingGroups: 2, pendingObservations: 138 });
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes), actual = [], expected = report.reviewed.flatMap(g => g.observations.map(o => `${o.case}/${g.element}`));
  let first;
  for (const [kind, cases] of [['static', capture.results], ['interaction', capture.interactions]]) for (const entry of cases) {
    const caseId = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    for (const input of entry.styleInputs) {
      const result = bound.classify(caseId, input, 'visibility', input.reference?.visibility, input.astylar?.visibility);
      if (!result) continue;
      actual.push(`${caseId}/${input.id}`); first ??= { caseId, input, result };
    }
  }
  assert.deepEqual(actual.sort(), expected.sort());
  assert.equal(new Set(actual).size, 530);
  assert.equal(bound.classify('unreviewed', first.input, 'visibility', 'visible', undefined), undefined);
  // Mutations to the original preparation, returned metadata and a prior result
  // cannot contaminate the already-authenticated private context.
  report.reviewed.length = 0; bound.counts.reviewedObservations = 0;
  const before = structuredClone(first.result);
  first.result.reviewEvidence.proof.referenceChain.length = 0;
  assert.deepEqual(bound.classify(first.caseId, first.input, 'visibility', 'visible', undefined), before);
});

test('binding rejects edited proofs, incomplete membership and changed scope', () => {
  for (const mutate of [
    r => { r.reviewed.pop(); },
    r => { r.reviewed[0].observations.pop(); },
    r => { r.reviewed[0].observations.reverse(); },
    r => { r.reviewed[0].observations[1] = r.reviewed[0].observations[0]; },
    r => { r.reviewed[0].observations[0].proof.referenceChain.length = 0; },
    r => { r.reviewed[0].observations[0].proof.candidateStages[0].stages.normalResolvedStyle.visibilityPresent = true; },
    r => { r.reviewed[0].observations[0].proof.computedCandidateVerified = true; },
    r => { r.reviewed[0].observations[0].inputSha256 = '0'.repeat(64); },
    r => { r.reviewed[0].classification = 'equivalent-representation'; },
    r => { r.pending.length = 0; },
    r => { r.canonicalIntegrationApplied = true; },
  ]) {
    const changed = prepared(); mutate(changed);
    assert.throws(() => bindVisibilityObservationStages(changed), /differs from authenticated source replay/);
  }
});
