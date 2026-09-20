import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { planOwnerMotionAttribution } from '../../scripts/audit-material-owner-motion-attribution.mjs';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';

const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const original = JSON.parse(readFileSync('docs/material-owner-initial-motion-review.json'));
const descriptor = JSON.parse(readFileSync('docs/material-font-ownership-attribution-plan.json')).productionNormalization;
const normalize = bindOwnerCaretNormalization(readFileSync(descriptor.module, 'utf8'), descriptor);

// A small pure-function fixture is sufficient for rejection controls. Only the
// separate full CLI check authenticates and replays original canonical rows.
function fixture() {
  const findings = [original.findings.find(g => g.disposition === 'captured-motion-targets-disjoint' && g.property === 'wordSpacing'),
    original.findings.find(g => g.disposition === 'requires-specific-review')].map(g => structuredClone(g));
  const patterns = [], indexes = new Map();
  for (const g of findings) for (const o of g.observations) {
    if (!indexes.has(o.pattern)) { indexes.set(o.pattern, patterns.length); patterns.push(structuredClone(original.patterns[o.pattern])); }
    o.pattern = indexes.get(o.pattern);
  }
  const motion = { ...original, findings, patterns, groups: 2,
    observations: findings.reduce((n, g) => n + g.observations.length, 0), disjointGroups: 1, remainingReviewGroups: 1 };
  const rows = findings.map(g => ({ family: g.family, element: g.element, property: g.property,
    reference: normalize({ [g.property]: g.reference })[g.property], occurrences: g.observations.length,
    cases: g.observations.slice(0, 12).map(o => o.case),
    states: [...new Set(g.observations.map(o => o.case.startsWith('static:') ? 'static' : o.case.split('/').slice(2).join('/')))],
    attribution: 'unresolved', untouchedEvidence: { retain: true } }));
  return { motion, rows };
}

test('motion proposal separates disjoint observation-stage findings from unresolved requests without changing inputs', () => {
  const f = fixture(), before = digest(f);
  const plan = planOwnerMotionAttribution(f.motion, f.rows, normalize);
  assert.equal(f.motion.patterns[0].review.proof.referenceComputed, '0px');
  assert.equal(plan.proposed[0].reference, '0');
  assert.equal(plan.proposedGroups, 1); assert.equal(plan.retainedGroups, 1);
  assert.equal(plan.otherCompleteRows, 1);
  assert.equal(plan.otherOrderedRowDigestsSha256, digest([digest(f.rows[1])]));
  assert.equal(plan.proposed[0].classification, 'parity-harness-defect');
  for (const flag of ['inputEquivalent', 'computedCandidateVerified', 'rendererCauseProven', 'renderingEquivalent'])
    assert.equal(plan.proposed[0][flag], false);
  assert.equal(plan.retained[0].disposition, 'requires-specific-review');
  assert.equal(digest(f), before);
  f.rows.push({ family: 'other', element: 'unrelated', property: 'width', attribution: 'prior-review', nested: { keep: true } });
  const extended = planOwnerMotionAttribution(f.motion, f.rows, normalize);
  assert.equal(extended.otherCompleteRows, 2);
  assert.equal(extended.otherOrderedRowDigestsSha256, digest(f.rows.slice(1).map(digest)));
});

test('motion proposal rejects missing membership, altered stages, motion proof tampering and inflated claims', () => {
  const mutations = [
    f => { f.rows.pop(); }, f => { f.rows.push(structuredClone(f.rows[0])); },
    f => { f.rows[0].attribution = 'previously-reviewed'; },
    f => { f.rows[0].reference = 'changed'; }, f => { f.rows[0].astylar = 'normal'; },
    f => { f.rows[0].occurrences++; }, f => { f.rows[0].cases.reverse(); },
    f => { f.rows[0].states.pop(); }, f => { f.motion.findings[0].candidateLocalDeclaration = 'normal'; },
    f => { f.motion.findings[0].observations.pop(); },
    f => { f.motion.findings[0].observations[1] = structuredClone(f.motion.findings[0].observations[0]); },
    f => { f.motion.findings[0].observations[0].pattern = -1; },
    f => { f.motion.findings[0].observations[0].revision = -1; },
    f => { f.motion.findings[0].observations[0].originalInputSha256 = 'changed'; },
    f => { f.motion.findings[0].observations[0].originalProofSha256 = 'changed'; },
    f => { f.motion.findings[1].disposition = 'captured-motion-targets-disjoint'; },
    f => { f.motion.patterns[0].review.reasons.push('unreviewed'); },
    f => { f.motion.inputEquivalent = true; }, f => { f.motion.computedCandidateVerified = true; },
    f => { f.motion.renderingEquivalent = true; }, f => { f.motion.canonicalAttributionChanged = true; },
    f => { f.motion.disjointGroups++; }, f => { f.motion.remainingReviewGroups--; },
    f => { f.motion.observations++; }, f => { f.motion.groups--; },
  ];
  const proofChanges = [p => { p.review.inputEquivalent = true; },
    p => { p.review.proof.computedCandidateVerified = true; },
    p => { p.review.proof.source = 'synthesized'; },
    p => { p.review.proof.candidateLocalDeclaration = 'normal'; },
    p => { p.review.proof.issues[0].reason = 'unreviewed-cascade'; },
    p => { p.review.proof.issues[0].side = 'candidate'; },
    p => { p.review.reasons.push('unresolved-motion-value'); }];
  for (const change of proofChanges) mutations.push(f => { const p = f.motion.patterns[0]; change(p); p.sha256 = digest(p.review); });
  for (const [i, mutate] of mutations.entries()) {
    const f = fixture(); mutate(f);
    assert.throws(() => planOwnerMotionAttribution(f.motion, f.rows, normalize), `mutation ${i}`);
  }
  assert.equal(mutations.length, 32);
});

test('full motion proposal freshly replays sources and authenticates the complete frozen canonical payload with writes prohibited', () => {
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const result = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/audit-material-owner-motion-attribution.mjs', '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.equal(result.proposedGroups, 86); assert.equal(result.proposedObservations, 4708);
  assert.equal(result.retainedGroups, 35); assert.equal(result.retainedObservations, 2546);
  assert.equal(result.otherCompleteRows, 8253); assert.equal(result.canonicalFilesChanged, false);
});
