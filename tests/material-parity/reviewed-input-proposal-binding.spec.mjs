import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { joinReviewedInputProposals } from '../../scripts/bind-material-reviewed-input-proposals.mjs';
import { materialAuditHarnessPlan } from '../../scripts/run-material-audit-harness.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const file = 'docs/material-reviewed-input-proposal-binding.json';

test('all seven proposal sets independently replay their source proofs and full canonical parent', () => {
  const guard = `import fs from 'node:fs'; import { syncBuiltinESMExports } from 'node:module';
    fs.writeFileSync = () => { throw new Error('CHECK_MODE_ATTEMPTED_WRITE'); }; syncBuiltinESMExports();`;
  const before = readFileSync(file);
  const receipt = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/bind-material-reviewed-input-proposals.mjs', '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.deepEqual(readFileSync(file), before);
  assert.equal(receipt.proposedGroups, 134); assert.equal(receipt.proposedObservations, 3325);
  assert.equal(receipt.otherCompleteRows, 8205); assert.equal(receipt.sourceProofsReplayed, true);
  assert.equal(receipt.canonicalIntegration, false);
  assert.ok(materialAuditHarnessPlan(process.cwd()).files.includes('tests/material-parity/reviewed-input-proposal-binding.spec.mjs'));
});

function fixture() {
  const saved = JSON.parse(readFileSync(file)), plans = {};
  // This is a deliberately small projection for pure rejection tests. It is
  // not an authenticated canonical snapshot; the preceding child replays the
  // actual 8,339-row payload and all original source collectors independently.
  const rows = saved.groups.map(g => structuredClone(g.originalCompleteRow));
  rows.push({ family: 'unrelated-fixture', element: 'sentinel', property: 'width', reference: '1px',
    astylar: '2px', occurrences: 1, cases: ['static:fixture@light/desktop'], states: ['static'], attribution: 'unresolved',
    referenceAuthoredExamples: [{ retained: true }], astylarAuthoredExamples: [{ retained: true }] });
  for (const [kind, descriptor] of Object.entries(saved.plans)) {
    const p = JSON.parse(readFileSync(descriptor.file));
    p.canonicalRows = rows.length; p.baselineUnresolved = rows.filter(r => r.attribution === 'unresolved').length;
    plans[kind] = p;
  }
  return { plans, rows };
}
const proposals = plan => plan.proposed ?? plan.findings;

test('combined join accounts for every proposed row and leaves unrelated complete rows untouched', () => {
  const f = fixture(), before = structuredClone(f), result = joinReviewedInputProposals(f.plans, f.rows);
  assert.equal(result.proposedGroups, 134); assert.equal(result.proposedObservations, 3325);
  assert.equal(result.otherCompleteRows, 1);
  assert.equal(result.otherOrderedRowDigestsSha256, digest([digest(f.rows.at(-1))]));
  assert.deepEqual(f, before);
  assert.equal(result.inputEquivalent, false); assert.equal(result.renderingEquivalent, false);
  assert.equal(result.canonicalAttributionChanged, false);
});

test('same scalar tuple with a prior static review is preserved, not mistaken for a pending row', () => {
  const f = fixture(), pending = f.rows.find(r => r.family === 'badge' && r.element === 'badge-label' && r.property === 'fontSize');
  assert.ok(pending);
  const prior = { ...structuredClone(pending), attribution: 'reviewed-stage-mismatch', cases: ['static:badge@light/desktop'],
    states: ['static'], occurrences: 1 };
  f.rows.push(prior);
  for (const p of Object.values(f.plans)) p.canonicalRows++;
  const before = structuredClone(f);
  const result = joinReviewedInputProposals(f.plans, f.rows);
  assert.equal(result.otherCompleteRows, 2); assert.equal(result.proposedGroups, 134);
  assert.equal(result.otherOrderedRowDigestsSha256, digest(f.rows.slice(-2).map(digest)));
  assert.deepEqual(f, before);
});

test('combined join rejects missing overlapping changed and overclaimed memberships', () => {
  const mutations = [
    f => { delete f.plans.leafSize; },
    f => { f.plans.extra = structuredClone(f.plans.leafSize); },
    f => { f.plans.containerSize.canonicalRevision = 'changed'; },
    f => { f.plans.containerSize.canonicalAttributionChanged = true; },
    f => { f.plans.containerSize.renderingEquivalent = true; },
    f => { f.plans.containerSize.canonicalRows--; },
    f => { f.plans.containerSize.baselineUnresolved--; },
    f => { f.plans.containerSize.proposedGroups--; },
    f => { f.plans.containerSize.proposedObservations--; },
    f => { proposals(f.plans.containerSize).pop(); },
    f => { proposals(f.plans.containerSize)[1] = structuredClone(proposals(f.plans.containerSize)[0]); },
    f => {
      const duplicate = structuredClone(proposals(f.plans.containerSize)[0]);
      proposals(f.plans.leafSize).push(duplicate); f.plans.leafSize.proposedGroups++;
      f.plans.leafSize.proposedObservations += duplicate.occurrences;
    },
    f => { proposals(f.plans.containerSize)[0].canonicalRowSha256 = '0'.repeat(64); },
    f => { proposals(f.plans.containerSize)[0].proposedClassification = 'equivalent-representation'; },
    f => { proposals(f.plans.containerSize)[0].proposedClassification = 'application-plugin-authoring-defect'; },
    f => { proposals(f.plans.containerSize)[0].proposedAttribution = 'unresolved'; },
    f => { proposals(f.plans.containerSize)[0].inputEquivalent = true; },
    f => { proposals(f.plans.containerSize)[0].wholeElementInputEquivalent = true; },
    f => { proposals(f.plans.containerSize)[0].renderingEquivalent = true; },
    f => { proposals(f.plans.containerSize)[0].rendererCauseProven = true; },
    f => { proposals(f.plans.containerSize)[0].computedCandidateVerified = true; },
    f => { proposals(f.plans.buttonPaint)[0].renderedCompositeVerified = true; },
    f => { proposals(f.plans.containerSize)[0].occurrences--; },
    f => { proposals(f.plans.containerSize)[0].cases.reverse(); },
    f => { proposals(f.plans.containerSize)[0].states.reverse(); },
    f => { proposals(f.plans.containerSize)[0].observations.pop(); },
    f => { proposals(f.plans.containerSize)[0].observations.reverse(); },
    f => { const p = proposals(f.plans.containerSize)[0]; p.observations[1] = structuredClone(p.observations[0]); },
    f => { proposals(f.plans.containerSize)[0].observations[0].inputSha256 = 'invalid'; },
    f => { proposals(f.plans.containerSize)[0].observations[0].proofSha256 = 'invalid'; },
    f => { f.rows.shift(); },
    f => { f.rows.push(structuredClone(f.rows[0])); },
    f => { f.rows[0].reference = 'changed'; },
    f => { f.rows[0].attribution = 'already-reviewed'; },
    f => { f.rows[0].referenceAuthoredExamples = []; },
  ];
  for (const [i, mutate] of mutations.entries()) {
    const f = fixture(); mutate(f);
    assert.throws(() => joinReviewedInputProposals(f.plans, f.rows), `combined join mutation ${i}`);
  }
  assert.equal(mutations.length, 35);
});
