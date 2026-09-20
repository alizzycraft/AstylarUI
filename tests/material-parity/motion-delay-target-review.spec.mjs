import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { inspectMotionDelayTargets } from '../../scripts/audit-material-motion-delay-targets.mjs';

const parent = JSON.parse(readFileSync('docs/material-owner-initial-motion-review.json'));
const original = parent.patterns.find(p => p.review.proof.element === 'tab-overview' &&
  p.review.reasons.length === 1 && p.review.reasons[0] === 'transition-target-not-proven-disjoint').review;
const fixture = () => structuredClone(original);
const delay = f => f.requests.find(r => Object.keys(r.declarations).length === 1);
const targets = f => f.requests.filter(r => r.node === delay(f).node && r.declarations['transition-property']);
function syncIssues(f) {
  f.proof.issues = f.requests.flatMap(r => Object.entries(r.declarations).map(([key, value]) =>
    ({ reason: 'motion-request-needs-review', side: 'reference', node: r.node, source: r.selector, key, value })));
}

test('delay-only requests bind to same-owner disjoint targets without equating inputs or resolving cascade', () => {
  const f = fixture(), before = JSON.stringify(f), result = inspectMotionDelayTargets(f);
  assert.equal(result.disposition, 'captured-owner-target-set-disjoint');
  assert.equal(result.delayWitnesses.length, 1);
  assert.deepEqual(result.delayWitnesses[0].targets.map(w => w.declaration.value), ['color', 'none']);
  for (const k of ['inputEquivalent', 'computedCandidateVerified', 'renderingEquivalent',
    'inactiveMotionProven', 'cascadeWinnerProven']) assert.equal(result[k], false);
  assert.equal(JSON.stringify(f), before);
  delay(f).declarations['transition-delay'].value = '-0.1s'; syncIssues(f);
  assert.equal(inspectMotionDelayTargets(f).disposition, 'captured-owner-target-set-disjoint');
});

test('missing, foreign, conditional, overlapping and malformed targets remain review cases', () => {
  const changes = [
    f => { f.proof.property = 'color'; },
    f => { f.proof.source = 'invented'; },
    f => { f.proof.candidateLocalDeclaration = 'normal'; },
    f => { f.inputEquivalent = true; },
    f => { f.proof.computedCandidateVerified = true; },
    f => { f.reasons.push('other-uncertainty'); },
    ...['all', 'font', 'visibility', '', 'var(--target)', 'color, white-space'].map(value =>
      f => { targets(f)[0].declarations['transition-property'].value = value; }),
    f => { for (const r of targets(f)) r.node = f.proof.referencePath[0]; },
    f => { f.requests = f.requests.filter(r => !targets(f).includes(r)); },
    f => { targets(f)[0].active = false; },
    f => { targets(f)[0].conditions = ['@media unknown']; },
    f => { delay(f).declarations['transition-duration'] = { value: '1ms', important: false }; },
    f => { delay(f).declarations['animation-duration'] = { value: '1ms', important: false }; },
    f => { delay(f).declarations.transition = { value: 'none', important: false }; },
    f => { delay(f).declarations['transition-delay'].value = 'var(--delay)'; },
    f => { delay(f).declarations['transition-delay'].value = 'invalid'; },
    f => { delay(f).declarations['transition-delay'].value = 'inherit'; },
    f => { delete delay(f).declarations['transition-delay'].important; },
    f => { delay(f).node = 'foreign-owner'; },
  ];
  for (const [i, change] of changes.entries()) {
    const f = fixture(); change(f); syncIssues(f);
    assert.equal(inspectMotionDelayTargets(f).disposition, 'requires-specific-review', `mutation ${i}`);
  }
  assert.equal(changes.length, 24);
  const f = fixture(); f.proof.issues.pop();
  assert.equal(inspectMotionDelayTargets(f).disposition, 'requires-specific-review');
  const g = fixture(); g.proof.issues.push({ reason: 'explicit-relevant-request', side: 'reference' });
  assert.equal(inspectMotionDelayTargets(g).disposition, 'requires-specific-review');
});

test('complete delay-target review replays its conserved historical parent with writes prohibited', () => {
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const result = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    '--input-type=module', '-e', `import { replayReviewedBatchMotion } from './tests/material-parity/reviewed-batch-motion-replay.mjs';
      const {delay, conservation} = replayReviewedBatchMotion();
      console.log(JSON.stringify({...delay, conservation}));`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));
  assert.equal(result.groups, 35); assert.equal(result.reviewedGroups, 12);
  assert.equal(result.reviewedObservations, 840); assert.equal(result.retainedGroups, 23);
  assert.equal(result.conservation.delayReexecutedAgainstConservedHistoricalParent, true);
  assert.equal(result.conservation.historicalReceiptsRewritten, false);
});
