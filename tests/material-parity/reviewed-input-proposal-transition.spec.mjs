import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { stageReviewedInputTransitions } from './reviewed-input-proposal-transition.mjs';
import { materialAuditHarnessPlan } from '../../scripts/run-material-audit-harness.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const file = 'docs/material-reviewed-input-transition-dry-run.json';

test('complete source-bound transition dry run preserves canonical files and all unrelated rows', () => {
  const before = readFileSync(file);
  const guard = `import fs from 'node:fs'; import { syncBuiltinESMExports } from 'node:module';
    fs.writeFileSync = () => { throw new Error('CHECK_MODE_ATTEMPTED_WRITE'); }; syncBuiltinESMExports();`;
  const receipt = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/check-material-reviewed-input-transition.mjs', '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.deepEqual(readFileSync(file), before);
  assert.equal(receipt.changedGroups, 134); assert.equal(receipt.changedObservations, 3325);
  assert.equal(receipt.remainingUnresolved, 2026); assert.equal(receipt.otherCompleteRows, 8205);
  assert.equal(receipt.canonicalFilesChanged, false);
  assert.ok(materialAuditHarnessPlan(process.cwd()).files.includes('tests/material-parity/reviewed-input-proposal-transition.spec.mjs'));
});

function fixture() {
  const binding = JSON.parse(readFileSync('docs/material-reviewed-input-proposal-binding.json'));
  const rows = binding.groups.map(g => structuredClone(g.originalCompleteRow));
  const sentinel = { family: 'fixture', element: 'unrelated', property: 'width', reference: '1px', astylar: '2px',
    attribution: 'unresolved', occurrences: 1, cases: ['static:fixture@light/desktop'], states: ['static'], preserved: { value: true } };
  rows.push(sentinel);
  // Synthetic pure-transition projection only. The full test above obtains
  // its binding and 8,339 rows through fresh independent source/payload replay.
  Object.assign(binding, { canonicalRows: rows.length, baselineUnresolved: rows.length, otherCompleteRows: 1,
    otherOrderedRowDigestsSha256: digest([digest(sentinel)]) });
  return { rows, binding };
}

test('metadata transition preserves source objects, raw fields, row order, and unrelated records', () => {
  const f = fixture(), before = structuredClone(f), result = stageReviewedInputTransitions(f.rows, f.binding);
  assert.deepEqual(f, before); assert.equal(result.changedGroups, 134); assert.equal(result.remainingUnresolved, 1);
  assert.deepEqual(result.rows.at(-1), f.rows.at(-1)); assert.equal(result.canonicalFilesChanged, false);
  assert.equal(result.rows.filter(r => r.classification === 'parity-harness-defect').length, 98);
  assert.equal(result.rows.filter(r => r.classification === 'application-plugin-authoring-defect').length, 36);
  const fields = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !fields.has(key)));
  assert.deepEqual(result.rows.map(raw), f.rows.map(raw));
  for (const row of result.rows.slice(0, -1)) {
    assert.equal(row.reviewedCases.length, row.occurrences);
    for (const flag of ['inputEquivalent', 'wholeElementInputEquivalent', 'computedCandidateVerified', 'renderingEquivalent', 'rendererCauseProven'])
      assert.equal(row.reviewEvidence[flag], false);
    assert.ok(row.justification.length > 50); assert.ok(row.recommendedOwner.startsWith('Material'));
  }
  assert.throws(() => stageReviewedInputTransitions(result.rows, f.binding), 'reapplying a review must not overwrite prior classifications');
});

test('transition rejects changed originals, missing memberships, invalid ownership and parity claims', () => {
  const mutations = [
    f => { f.binding.kind = 'unverified'; },
    f => { f.binding.sourceProofsReplayed = false; },
    f => { f.binding.canonicalIntegration = true; },
    f => { f.binding.inputEquivalent = true; },
    f => { f.binding.renderingEquivalent = true; },
    f => { f.binding.canonicalAttributionChanged = true; },
    f => { f.binding.completeAuditAccepted = true; },
    f => { f.binding.canonicalRows--; },
    f => { f.binding.baselineUnresolved--; },
    f => { f.binding.proposedGroups--; },
    f => { f.binding.proposedObservations--; },
    f => { f.binding.otherCompleteRows--; },
    f => { f.binding.otherOrderedRowDigestsSha256 = '0'.repeat(64); },
    f => { f.rows.pop(); },
    f => { f.rows[0].reference = 'changed'; },
    f => { f.rows[0].referenceAuthoredExamples = []; },
    f => { f.rows[0].attribution = 'already-reviewed'; },
    f => { f.rows.at(-1).preserved.value = false; },
    f => { f.rows[1] = structuredClone(f.rows[0]); },
    f => { f.binding.groups[1] = structuredClone(f.binding.groups[0]); },
    f => { f.binding.groups[0].originalCompleteRow.cases.reverse(); },
    f => { f.binding.groups[0].proposal.canonicalRowSha256 = '0'.repeat(64); },
    f => { f.binding.groups[0].proposal.family = 'wrong'; },
    f => { f.binding.groups[0].proposal.property = 'wrong'; },
    f => { f.binding.groups[0].proposal.reference = 'wrong'; },
    f => { f.binding.groups[0].proposal.occurrences--; },
    f => { f.binding.groups[0].proposal.proposedAttribution = 'reviewed-component-host-font-token-omission'; },
    f => { f.binding.groups[0].proposal.proposedClassification = 'application-plugin-authoring-defect'; },
    f => { f.binding.groups[0].proposal.rendererCauseProven = true; },
    f => { f.binding.groups[0].proposal.inputEquivalent = true; },
    f => { f.binding.groups[0].proposal.observations.pop(); },
    f => { f.binding.groups[0].proposal.states.reverse(); },
    f => { f.binding.plans.containerSize.sourceProofsReplayed = false; },
    f => { delete f.binding.plans.containerSize; },
  ];
  for (const [i, mutate] of mutations.entries()) {
    const f = fixture(); mutate(f);
    assert.throws(() => stageReviewedInputTransitions(f.rows, f.binding), `transition mutation ${i}`);
  }
  assert.equal(mutations.length, 34);
});
