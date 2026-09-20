import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import test from 'node:test';
import { collectOwnerInitialMotion, inspectOwnerInitialMotion } from '../../scripts/audit-material-owner-initial-motion.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const file = 'docs/material-owner-initial-motion-review.json';
const saved = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), report = JSON.parse(saved);
const original = JSON.parse(fs.readFileSync(report.capture.file));
const entry = original.results.find(e => e.family === 'button');
const fixture = () => ({ input: structuredClone(entry.styleInputs.find(i => i.id === 'button-primary')),
  reference: JSON.parse(fs.readFileSync(entry.inputTrees.reference.file)),
  candidate: JSON.parse(fs.readFileSync(entry.inputTrees.astylar.file)) });
const inspect = f => inspectOwnerInitialMotion(f.input, 'overflowWrap', f.reference, f.candidate, 'button');
const declarations = f => f.reference.rules.find(r => r.selector === '.mat-mdc-unelevated-button').declarations;

test('motion review replays all original members and retains the 35 unproven groups without writes', () => {
  const canonical = 'docs/material-input-equivalence-audit.json';
  const before = hash(fs.readFileSync(canonical)), write = fs.writeFileSync;
  let actual;
  try {
    fs.writeFileSync = () => { throw Error('CHECK_MODE_ATTEMPTED_WRITE'); }; syncBuiltinESMExports();
    actual = collectOwnerInitialMotion();
  } finally { fs.writeFileSync = write; syncBuiltinESMExports(); }
  assert.equal(hash(JSON.stringify(actual, null, 2) + '\n'), hash(saved));
  assert.equal(hash(fs.readFileSync(canonical)), before);
  assert.equal(actual.groups, 121); assert.equal(actual.observations, 7254);
  assert.equal(actual.disjointGroups, 86); assert.equal(actual.remainingReviewGroups, 35);
  assert.equal(actual.canonicalAttributionChanged, false);
  for (const p of actual.patterns) {
    assert.equal(hash(JSON.stringify(p.review)), p.sha256);
    assert.equal(p.review.inputEquivalent, false); assert.equal(p.review.computedCandidateVerified, false);
    assert.equal(p.review.renderingEquivalent, false);
  }
});

test('named disjoint targets do not imply inactive motion or computed equivalence', () => {
  const f = fixture(), result = inspect(f);
  assert.equal(result.disposition, 'captured-motion-targets-disjoint');
  assert.ok(result.proof.issues.length > 0); assert.deepEqual(result.reasons, []);
  assert.equal(result.computedCandidateVerified, false); assert.equal(result.renderingEquivalent, false);
  declarations(f)['transition-property'].value = 'opacity, transform';
  assert.equal(inspect(f).disposition, 'captured-motion-targets-disjoint');
  assert.throws(() => inspectOwnerInitialMotion(f.input, 'color', f.reference, f.candidate, 'button'));
});

test('unknown targets, resets, animations, source gaps and non-motion issues are never waived', () => {
  const changes = [
    ...['all', 'overflow-wrap', 'white-space', 'word-spacing', 'font', 'visibility', 'var(--motion)', '', 'inherit', 'opacity, overflow-wrap']
      .map(value => f => { declarations(f)['transition-property'].value = value; }),
    f => { delete declarations(f)['transition-property']; },
    f => { declarations(f)['transition-duration'].value = 'var(--duration)'; },
    f => { delete declarations(f)['transition-duration'].important; },
    f => { declarations(f).transition = { value: 'none', important: false }; },
    f => { declarations(f)['animation-name'] = { value: 'pulse', important: false }; },
    f => { declarations(f)['animation-duration'] = { value: '0s', important: false }; },
    f => { declarations(f).all = { value: 'initial', important: false }; },
    f => { declarations(f)['overflow-wrap'] = { value: 'normal', important: false }; },
    f => { f.candidate.resolvedStyleEvidenceVersion = 1; },
    f => { f.input.astylarNormalResolvedStyle.overflowWrap = 'normal'; },
    f => { const n = f.reference.nodes.find(n => n.attributes.id === 'button-primary'); n.inline['transition-duration'] = { value: '0s', important: false }; },
  ];
  for (const [index, change] of changes.entries()) {
    const f = fixture(); change(f);
    assert.equal(inspect(f).disposition, 'requires-specific-review', `mutation ${index}`);
  }
});
