import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { joinFollowupInputProposals } from '../../scripts/bind-material-followup-input-proposals.mjs';
import { materialAuditHarnessPlan } from '../../scripts/run-material-audit-harness.mjs';

const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const file = 'docs/material-followup-input-proposal-binding.json';

test('four followup proposals replay original sources and complete historical/current canonical joins without writes', () => {
  const files = [file, 'docs/material-input-equivalence-audit.json',
    'docs/material-input-equivalence-audit.json.gz', 'docs/material-input-equivalence-audit.md'];
  const before = files.map(f => readFileSync(f));
  const guard = `import fs from 'node:fs'; import { syncBuiltinESMExports } from 'node:module';
    fs.writeFileSync = () => { throw new Error('CHECK_MODE_ATTEMPTED_WRITE'); }; syncBuiltinESMExports();`;
  const receipt = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/bind-material-followup-input-proposals.mjs', '--check'],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  files.forEach((f, i) => assert.deepEqual(readFileSync(f), before[i]));
  assert.equal(receipt.proposedGroups, 66); assert.equal(receipt.proposedObservations, 2640);
  assert.deepEqual(receipt.counts, { leafFamily: { groups: 4, observations: 96 },
    leafWeightTracking: { groups: 8, observations: 192 }, expansionOwner: { groups: 43, observations: 1596 },
    controlFontStyle: { groups: 11, observations: 756 } });
  assert.equal(receipt.otherCompleteRows, 8273); assert.equal(receipt.sourceProofsReplayed, true);
  assert.equal(receipt.canonicalIntegration, false);
  assert.ok(materialAuditHarnessPlan(process.cwd()).files.includes('tests/material-parity/followup-input-proposal-binding.spec.mjs'));
});

function fixture() {
  const saved = JSON.parse(readFileSync(file));
  const rows = saved.groups.map(g => structuredClone(g.originalCompleteRow));
  rows.push({ family: 'unrelated', element: 'sentinel', property: 'width', reference: '1px', astylar: '2px',
    occurrences: 1, cases: ['static:unrelated@light/desktop'], states: ['static'], attribution: 'unresolved',
    referenceAuthoredExamples: [{ original: true }], astylarAuthoredExamples: [{ original: true }] });
  const plans = Object.fromEntries(Object.entries(saved.plans).map(([kind, p]) => {
    const plan = JSON.parse(readFileSync(p.file));
    plan.canonicalRows = rows.length;
    if (kind !== 'leafFamily') plan.baselineUnresolved = rows.filter(r => r.attribution === 'unresolved').length;
    return [kind, plan];
  }));
  // Pure mutation fixtures are not authenticated source evidence. The first
  // test performs the independent full production-source replay.
  return { plans, rows };
}

test('cross-revision joining preserves every current row and all prior same-value reviews', () => {
  const f = fixture();
  const pending = f.rows.find(r => r.property === 'fontFamily');
  f.rows.push({ ...structuredClone(pending), attribution: 'reviewed-stage-mismatch',
    cases: ['static:badge@light/desktop'], states: ['static'], occurrences: 1 });
  Object.values(f.plans).forEach(p => p.canonicalRows++);
  const before = structuredClone(f), result = joinFollowupInputProposals(f.plans, f.rows);
  assert.deepEqual(f, before); assert.equal(result.proposedGroups, 66);
  assert.equal(result.proposedObservations, 2640); assert.equal(result.otherCompleteRows, 2);
  assert.equal(result.otherOrderedRowDigestsSha256, digest(f.rows.slice(-2).map(digest)));
  assert.equal(result.canonicalAttributionChanged, false);
  assert.equal(result.inputEquivalent, false); assert.equal(result.renderingEquivalent, false);
});

test('followup join rejects changed original evidence, overlapping memberships and equivalence overclaims', () => {
  const mutations = [
    f => { delete f.plans.leafFamily; },
    f => { f.plans.extra = structuredClone(f.plans.leafFamily); },
    f => { f.plans.leafFamily.canonicalRevision = '957774a'; },
    f => { f.plans.leafWeightTracking.canonicalRevision = 'changed'; },
    f => { f.plans.leafFamily.canonicalAttributionChanged = true; },
    f => { f.plans.leafFamily.inputEquivalent = true; },
    f => { f.plans.leafFamily.renderingEquivalent = true; },
    f => { f.plans.leafFamily.canonicalRows--; },
    f => { f.plans.expansionOwner.baselineUnresolved--; },
    f => { f.plans.leafFamily.proposedGroups--; },
    f => { f.plans.leafFamily.proposedObservations--; },
    f => { f.plans.leafFamily.proposed.pop(); },
    f => { f.plans.leafFamily.proposed[1] = structuredClone(f.plans.leafFamily.proposed[0]); },
    f => { f.plans.leafFamily.proposed[0].canonicalRowSha256 = '0'.repeat(64); },
    f => { f.plans.leafFamily.proposed[0].previousAttribution = 'reviewed'; },
    f => { f.plans.leafFamily.proposed[0].family = 'changed'; },
    f => { f.plans.leafFamily.proposed[0].reference = 'changed'; },
    f => { f.plans.leafFamily.proposed[0].astylar = 'invented'; },
    f => { f.plans.leafFamily.proposed[0].cases.reverse(); },
    f => { f.plans.leafFamily.proposed[0].states.push('invented'); },
    f => { f.plans.leafFamily.proposed[0].occurrences--; },
    f => { f.plans.leafFamily.proposed[0].proposedClassification = 'equivalent-representation'; },
    f => { f.plans.leafFamily.proposed[0].proposedAttribution = 'unresolved'; },
    f => { f.plans.leafFamily.proposed[0].inputEquivalent = true; },
    f => { delete f.plans.leafFamily.proposed[0].inputEquivalent; },
    f => { f.plans.leafFamily.proposed[0].wholeElementInputEquivalent = true; },
    f => { f.plans.leafFamily.proposed[0].physicalFontSelectionVerified = true; },
    f => { f.plans.leafFamily.proposed[0].renderingEquivalent = true; },
    f => { f.plans.expansionOwner.proposed[0].rendererCauseProven = true; },
    f => { f.plans.expansionOwner.proposed[0].canonicalMappingChanged = true; },
    f => { f.plans.leafFamily.proposed[0].observations.pop(); },
    f => { f.plans.leafFamily.proposed[0].observations.reverse(); },
    f => { const p = f.plans.leafFamily.proposed[0]; p.observations[1] = structuredClone(p.observations[0]); },
    f => { f.plans.leafFamily.proposed[0].observations[0].originalInputSha256 = 'invalid'; },
    f => { f.plans.leafFamily.proposed[0].observations[0].proofSha256 = 'invalid'; },
    f => { f.rows.shift(); },
    f => { f.rows.push(structuredClone(f.rows[0])); },
    f => { f.rows[0].referenceAuthoredExamples.push({ selector: '.invented', declarations: { color: 'red' } }); },
    f => { f.rows[0].attribution = 'prior-reviewed'; },
    f => { delete f.plans.controlFontStyle; },
    f => { f.plans.controlFontStyle.proposed[0].proposedClassification = 'parity-harness-defect'; },
    f => { f.plans.controlFontStyle.proposed[0].proposedAttribution = 'reviewed-leaf-font-family-observation-stage'; },
    f => { f.plans.controlFontStyle.proposed[0].candidateComputedVerified = true; },
    f => { f.plans.controlFontStyle.proposed[0].nonNormalAncestorBehaviorVerified = true; },
    f => { f.plans.controlFontStyle.canonicalRevision = '06e50dbcd3594c5987d63a4ec38e792b87b08dde'; },
  ];
  for (const [i, mutate] of mutations.entries()) {
    const f = fixture(); mutate(f);
    assert.throws(() => joinFollowupInputProposals(f.plans, f.rows), `followup mutation ${i}`);
  }
  assert.equal(mutations.length, 45);
});
