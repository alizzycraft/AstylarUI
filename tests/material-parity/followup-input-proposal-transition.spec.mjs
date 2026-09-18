import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { stageFollowupInputTransitions } from './followup-input-proposal-transition.mjs';

const digest = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const file = 'docs/material-followup-input-transition-dry-run.json';
test('followup dry run replays all original sources and canonical rows with writes prohibited', () => {
  const before = readFileSync(file);
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const receipt = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/check-material-followup-input-transition.mjs', '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.deepEqual(readFileSync(file), before);
  assert.equal(receipt.changedGroups, 66); assert.equal(receipt.changedObservations, 2640);
  assert.equal(receipt.remainingUnresolved, 1960); assert.equal(receipt.otherCompleteRows, 8273);
  assert.equal(receipt.canonicalFilesChanged, false);
});

function fixture() {
  const binding = JSON.parse(readFileSync('docs/material-followup-input-proposal-binding.json'));
  const rows = binding.groups.map(g => structuredClone(g.originalCompleteRow));
  const sentinel = { family: 'unrelated', element: 'sentinel', property: 'width', reference: '1px', astylar: '2px',
    attribution: 'unresolved', occurrences: 1, cases: ['static:unrelated@light/desktop'], states: ['static'], retained: true };
  rows.push(sentinel);
  // Synthetic pure-function fixture only; the full CLI proof reopens every
  // source and authenticates the complete canonical payload independently.
  Object.assign(binding, { canonicalRows: rows.length, baselineUnresolved: rows.length, otherCompleteRows: 1,
    otherOrderedRowDigestsSha256: digest([digest(sentinel)]) });
  return { rows, binding };
}
const run = f => stageFollowupInputTransitions(f.rows, f.binding);

test('followup metadata projection preserves originals, omissions, row order and unresolved unrelated evidence', () => {
  const f = fixture(), before = structuredClone(f), r = run(f);
  assert.deepEqual(f, before); assert.equal(r.changedGroups, 66); assert.equal(r.changedObservations, 2640);
  assert.equal(r.remainingUnresolved, 1); assert.deepEqual(r.rows.at(-1), f.rows.at(-1));
  assert.equal(r.rows.filter(r => r.classification === 'parity-harness-defect').length, 55);
  assert.equal(r.rows.filter(r => r.classification === 'application-plugin-authoring-defect').length, 11);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = row => Object.fromEntries(Object.entries(row).filter(([k]) => !metadata.has(k)));
  assert.deepEqual(r.rows.map(raw), f.rows.map(raw));
  for (const row of r.rows.slice(0, -1)) {
    assert.equal(row.reviewedCases.length, row.occurrences);
    for (const k of ['inputEquivalent', 'wholeElementInputEquivalent', 'computedCandidateVerified', 'renderingEquivalent', 'rendererCauseProven'])
      assert.equal(row.reviewEvidence[k], false);
  }
  assert.throws(() => stageFollowupInputTransitions(r.rows, f.binding), 'cannot reapply to reviewed findings');
});

test('followup transition refuses changed sources, overwritten classifications and unsupported claims', () => {
  const changes = [
    f => { f.binding.kind = 'unverified'; }, f => { f.binding.sourceProofsReplayed = false; },
    f => { f.binding.originalCanonicalJoinsReplayed = false; }, f => { f.binding.canonicalIntegration = true; },
    f => { f.binding.canonicalAttributionChanged = true; }, f => { f.binding.completeAuditAccepted = true; },
    f => { f.binding.inputEquivalent = true; }, f => { f.binding.renderingEquivalent = true; },
    f => { f.binding.canonicalRows--; }, f => { f.binding.baselineUnresolved--; },
    f => { f.binding.proposedGroups--; }, f => { f.binding.proposedObservations--; },
    f => { f.binding.otherCompleteRows--; }, f => { f.binding.otherOrderedRowDigestsSha256 = '0'.repeat(64); },
    f => { f.rows[0].referenceAuthoredExamples.push({ invented: true }); },
    f => { f.rows[0].attribution = 'already-reviewed'; }, f => { f.rows.at(-1).retained = false; },
    f => { f.rows[1] = structuredClone(f.rows[0]); }, f => { f.rows.pop(); },
    f => { f.binding.groups[1] = structuredClone(f.binding.groups[0]); },
    f => { f.binding.groups[0].proposal.proposedClassification = 'application-plugin-authoring-defect'; },
    f => { f.binding.groups[0].proposal.proposedAttribution = 'unresolved'; },
    f => { f.binding.groups[0].proposal.astylar = 'invented'; },
    f => { f.binding.groups[0].proposal.canonicalRowSha256 = '0'.repeat(64); },
    f => { f.binding.groups[0].proposal.observations.pop(); },
    f => { f.binding.groups[0].proposal.cases.reverse(); },
    f => { f.binding.groups[0].proposal.states.push('invented'); },
    f => { f.binding.groups[0].proposal.inputEquivalent = true; },
    f => { f.binding.groups[0].proposal.justification = 'unproven'; },
    f => { f.binding.plans.leafFamily.sourceProofsReplayed = false; },
    f => { f.binding.plans.leafFamily.originalCanonicalJoinReplayed = false; },
    f => { delete f.binding.plans.controlFontStyle; },
    f => { f.binding.groups.find(g => g.kind === 'controlFontStyle').proposal.nonNormalAncestorBehaviorVerified = true; },
    f => { f.binding.groups.find(g => g.kind === 'expansionOwner').proposal.canonicalMappingChanged = true; },
  ];
  for (const [i, mutate] of changes.entries()) {
    const f = fixture(); mutate(f); assert.throws(() => run(f), `followup transition mutation ${i}`);
  }
  assert.equal(changes.length, 34);
});
