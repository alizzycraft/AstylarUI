import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import test from 'node:test';
import { collectOwnerInitialMotion, inspectOwnerInitialMotion } from '../../scripts/audit-material-owner-initial-motion.mjs';
import { verifyMotionSourceConservation } from './motion-source-conservation.mjs';
import { inspectMotionDelayTargets } from '../../scripts/audit-material-motion-delay-targets.mjs';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';

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

test('appearance opt-in proves five motion groups while preserving chips and panel exclusions', () => {
  const snapshot = { generation: '65c72350ed907939fbbbdae030f4aebcb7e83f1039de66fb4b3cb2c747a30c56',
    indexSha256: '2e1e8bbf6b89cd1d640a0c1bf2aca86f723d19e13f864cd5b6d753d05769c44e' };
  // Pin the accepted population rather than changing it when later batches land.
  const rows = ['badge', 'progress-bar', 'progress-spinner', 'tabs', 'chips']
    .flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, snapshot))
    .filter(r => r.property === 'appearance' && r.reference === 'none' && r.attribution === 'unresolved');
  assert.equal(rows.length, 8);
  assert.equal(hash(fs.readFileSync(report.capture.file)), report.capture.sha256);
  const entries = [...original.results.map(e => ({ ...e, kind: 'static' })),
    ...original.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const load = descriptor => { const bytes = fs.readFileSync(descriptor.file);
    assert.equal(hash(bytes), descriptor.sha256); return JSON.parse(bytes); };
  let proved = 0, retained = 0, mutations = 0;
  for (const row of rows) {
    const members = entries.filter(e => e.family === row.family && row.states.includes(e.state ?? 'static'))
      .flatMap(e => e.styleInputs.filter(i => i.id === row.element && i.reference?.appearance === 'none' &&
        i.astylar?.appearance === undefined).map(input => ({ e, input })));
    assert.equal(members.length, row.occurrences);
    assert.deepEqual(members.slice(0, 12).map(({e}) => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`), row.cases);
    const eligible = ['badge-count', 'progress-bar-primary', 'progress-spinner-primary', 'tab-activity', 'tab-overview'].includes(row.element);
    for (const {e,input} of members) {
      const reference = load(e.inputTrees.reference), candidate = load(e.inputTrees.astylar);
      assert.throws(() => inspectOwnerInitialMotion(input, 'appearance', reference, candidate, e.family));
      const review = inspectOwnerInitialMotion(input, 'appearance', reference, candidate, e.family, { reviewedAppearance: true });
      const delay = inspectMotionDelayTargets(review, { reviewedAppearance: true });
      const passes = review.disposition === 'captured-motion-targets-disjoint' || delay.disposition === 'captured-owner-target-set-disjoint';
      assert.equal(passes, eligible, `${row.element} ${e.profile}/${e.viewport.id}/${e.state}`);
      assert.equal(review.computedCandidateVerified, false); assert.equal(review.renderingEquivalent, false);
      if (passes) {
        const changed = structuredClone(reference);
        for (const rule of changed.rules) if (rule.declarations['transition-property'])
          rule.declarations['transition-property'].value = 'appearance';
        const negative = inspectOwnerInitialMotion(input, 'appearance', changed, candidate, e.family, { reviewedAppearance: true });
        assert.equal(negative.disposition, 'requires-specific-review');
        assert.equal(inspectMotionDelayTargets(negative, { reviewedAppearance: true }).disposition, 'requires-specific-review');
        mutations++;
      }
    }
    if (eligible) proved += members.length; else retained += members.length;
  }
  assert.equal(proved, 232); assert.equal(retained, 222); assert.equal(mutations, 232);
});

test('motion review replays all original members and retains the 35 unproven groups without writes', () => {
  const canonical = 'docs/material-input-equivalence-audit.json';
  const before = hash(fs.readFileSync(canonical)), write = fs.writeFileSync;
  let actual;
  try {
    fs.writeFileSync = () => { throw Error('CHECK_MODE_ATTEMPTED_WRITE'); }; syncBuiltinESMExports();
    actual = collectOwnerInitialMotion();
  } finally { fs.writeFileSync = write; syncBuiltinESMExports(); }
  const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';
  const historical = execFileSync('git', ['show', `4650791a7208b841dd29f1ced015f98234949623:${moduleFile}`],
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const conservation = verifyMotionSourceConservation(report, actual, historical, fs.readFileSync(moduleFile, 'utf8'));
  assert.equal(conservation.allNonReceiptEvidenceFreshlyReplayed, true);
  assert.equal(conservation.historicalReceiptsRewritten, false);
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
