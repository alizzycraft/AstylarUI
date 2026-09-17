import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { buildGapJoinReport, loadGapJoinInputs } from './audit-material-owner-gap-canonical-join.mjs';
import { reviewGapScalarRuleLoss } from './audit-material-gap-scalar-rule-loss.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const key = row => JSON.stringify([row.family, row.element, row.property]);
const files = {
  join: 'docs/material-owner-gap-canonical-join.json',
  motion: 'docs/material-owner-gap-motion-review.json',
  scalar: 'docs/material-gap-scalar-rule-loss.json',
};
const target = 'docs/material-gap-review-membership.json';

// Consume the already independently replayed original-tree reviews and exact
// canonical join. This is membership evidence, not a new motion/cascade engine.
export function bindGapReviewMembership(join, motion, scalar, captures) {
  assert.equal(join.kind, 'owner-gap-canonical-membership-join');
  assert.equal(motion.kind, 'owner-gap-motion-declaration-review');
  assert.equal(scalar.kind, 'owner-gap-scalar-layer-rule-loss-review');
  assert.deepEqual(motion.parent, join.survey); assert.deepEqual(scalar.parent, join.survey);
  assert.deepEqual(motion.capture, join.capture); assert.deepEqual(scalar.capture, join.capture);
  for (const report of [join, motion, scalar]) {
    assert.equal(report.canonicalIntegration, false); assert.equal(report.inputEquivalent, false);
  }
  assert.equal(motion.renderingEquivalent, false); assert.equal(scalar.renderingEquivalent, false);
  assert.equal(motion.groups, 34); assert.equal(motion.findings.length, 34);
  assert.equal(motion.observations, 1784); assert.equal(motion.directGapTargetsNotNamedGroups, 32);
  assert.equal(motion.remainingReviewGroups, 2); assert.deepEqual(motion.controls, { positive: 2, negative: 21 });
  assert.equal(scalar.groups, 4); assert.equal(scalar.findings.length, 4);
  assert.equal(scalar.cases, 59); assert.equal(scalar.observations, 118); assert.equal(scalar.negativeControls, 17);
  const owners = new Map(join.rows.map(row => [key(row), row]));
  assert.equal(owners.size, join.rows.length); assert.equal(owners.size, 162);
  const byCase = new Map(captures.map(c => [c.case, c]));
  assert.equal(byCase.size, captures.length); assert.equal(byCase.size, 2311);
  const seen = new Set(), rows = [];
  for (const [kind, findings] of [['motion', motion.findings], ['scalar-layer-loss', scalar.findings]]) {
    for (const finding of findings) {
      const identity = key(finding); assert.ok(!seen.has(identity), 'duplicate review group'); seen.add(identity);
      const row = owners.get(identity); assert.ok(row, 'review group missing from original canonical join');
      assert.equal(row.canonicalAttribution, 'unresolved');
      assert.match(row.canonicalRowSha256, /^[a-f0-9]{64}$/);
      assert.equal(row.reference, 'normal'); assert.equal(row.candidate, '<omitted>');
      assert.equal(finding.reference, row.reference); assert.equal(finding.candidate, row.candidate);
      assert.equal(finding.proofSha256, row.originalProofSha256, 'review must retain complete original proof digest');
      const records = kind === 'motion' ? finding.cases : finding.observations;
      assert.equal(new Set(records.map(r => r.case)).size, records.length);
      assert.deepEqual(records.map(r => r.case), row.observations.map(o => o.case), 'complete ordered membership changed');
      assert.equal(records.length, row.occurrences);
      assert.deepEqual(row.canonicalSample, records.slice(0, 12).map(r => r.case));
      assert.deepEqual(row.states, [...new Set(row.observations.map(o => o.state))]);
      let disposition;
      if (kind === 'motion') {
        assert.equal(finding.observations, records.length);
        const patterns = finding.patterns.flatMap(p => p.cases.map(caseId => ({ caseId, review: p.review })));
        assert.equal(new Set(patterns.map(p => p.caseId)).size, patterns.length);
        assert.deepEqual(patterns.map(p => p.caseId).sort(), records.map(r => r.case).sort());
        for (const record of records) {
          const { case: caseId, ...review } = record;
          assert.deepEqual(review, patterns.find(p => p.caseId === caseId).review);
          assert.ok(['captured-motion-does-not-name-gap', 'requires-review'].includes(review.disposition));
          assert.equal(review.disposition === 'requires-review', review.reasons.length > 0);
        }
        disposition = records.every(r => r.disposition === 'captured-motion-does-not-name-gap')
          ? 'captured-motion-does-not-name-gap' : 'requires-review';
        assert.equal(finding.disposition, disposition);
      } else {
        for (const record of records) {
          assert.deepEqual(record.review, reviewGapScalarRuleLoss(record.proof));
          assert.deepEqual(record.inputTrees, byCase.get(record.case)?.inputTrees);
        }
        disposition = 'original-overlay-scalar-layer-rule-loss';
      }
      const observations = row.observations.map((o, index) => {
        assert.equal(o.referenceRaw, 'normal'); assert.equal(o.candidateRaw, '<omitted>');
        assert.equal(o.candidateRawShorthand, '<omitted>');
        const capture = byCase.get(o.case); assert.ok(capture, 'missing original capture descriptor');
        return { ...o, inputTrees: capture.inputTrees, review: kind === 'motion'
          ? { disposition: records[index].disposition, reasons: records[index].reasons }
          : records[index].review };
      });
      rows.push({ family: row.family, element: row.element, property: row.property, kind,
        reference: row.reference, candidate: row.candidate, canonicalRevision: join.canonicalRevision,
        priorClassification: row.canonicalClassification, priorAttribution: row.canonicalAttribution,
        canonicalRowSha256: row.canonicalRowSha256, originalProofSha256: row.originalProofSha256,
        reviewDisposition: disposition, observations, inputEquivalent: false, computedCandidateVerified: false,
        usedGapVerified: false, rendererCauseProven: false });
    }
  }
  assert.equal(rows.length, 38); assert.equal(rows.reduce((n, r) => n + r.observations.length, 0), 1902);
  assert.equal(rows.filter(r => r.reviewDisposition === 'captured-motion-does-not-name-gap').length, 32);
  const pending = rows.filter(r => r.reviewDisposition === 'requires-review');
  assert.equal(pending.length, 2);
  assert.ok(pending.every(r => r.family === 'dialog' && r.element === 'dialog-panel'));
  assert.equal(pending.reduce((n, r) => n + r.observations.length, 0), 64);
  return rows;
}

export async function loadGapReviewMembership() {
  // Reuse the original join's canonical reader/normalizer; do not reconstruct
  // canonical values or take saved membership counts on trust.
  const inputs = await loadGapJoinInputs(), join = buildGapJoinReport(inputs);
  const savedJoin = JSON.parse(readFileSync(files.join));
  const source = savedJoin.sourceFingerprint;
  assert.equal(hash(readFileSync(source.file, 'utf8').replaceAll('\r\n', '\n')), source.sha256);
  delete savedJoin.sourceFingerprint; assert.deepEqual(join, savedJoin);
  const results = [];
  for (const script of ['scripts/audit-material-gap-motion-requests.mjs', 'scripts/audit-material-gap-scalar-rule-loss.mjs']) {
    results.push(JSON.parse(execFileSync(process.execPath, [script, '--check'],
      { encoding: 'utf8', maxBuffer: 1024 * 1024 }).trim()));
  }
  assert.deepEqual(results, [
    { groups: 34, observations: 1784, directGapTargetsNotNamedGroups: 32, remainingReviewGroups: 2,
      controls: { positive: 2, negative: 21 }, canonicalUnchanged: true },
    { groups: 4, cases: 59, observations: 118, negativeControls: 17, canonicalUnchanged: true },
  ]);
  return { join, motion: JSON.parse(readFileSync(files.motion)), scalar: JSON.parse(readFileSync(files.scalar)),
    captures: inputs.originalIndex.cases };
}

export function recordGapReviewMembership(inputs) {
  const rows = bindGapReviewMembership(inputs.join, inputs.motion, inputs.scalar, inputs.captures);
  return { schemaVersion: 1, kind: 'existing-gap-review-original-membership-binding',
    sources: Object.entries(files).map(([kind, file]) => ({ kind, file, sha256: hash(readFileSync(file)) })),
    sourceFingerprint: { file: 'scripts/bind-material-gap-review-membership.mjs',
      sha256: hash(readFileSync('scripts/bind-material-gap-review-membership.mjs', 'utf8').replaceAll('\r\n', '\n')) },
    counts: { groups: rows.length, observations: rows.reduce((n, r) => n + r.observations.length, 0),
      cases: new Set(rows.flatMap(r => r.observations.map(o => o.case))).size,
      motionNonGapGroups: 32, scalarLayerLossGroups: 4, unresolvedMotionGroups: 2 },
    rows, canonicalIntegration: false, inputEquivalent: false,
    limits: ['Original canonical membership only; current production classification/precedence and conservation remain separate.',
      'Local motion targets are not resolved motion or candidate computed gaps; indirect geometry/paint changes remain possible.',
      'The two empty-longhand dialog groups retain requires-review. Separate fresh CSSOM/motion evidence is not substituted for original values.',
      'The layered z-index capture loss is not evidence of a gap-layout defect or an overlay rendering fix.'] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const canonicalFiles = ['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz',
    'docs/material-input-equivalence-audit.md'];
  const before = canonicalFiles.map(file => hash(readFileSync(file)));
  const report = recordGapReviewMembership(await loadGapReviewMembership());
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(target, output);
  assert.deepEqual(canonicalFiles.map(file => hash(readFileSync(file))), before);
  console.log(JSON.stringify({ ...report.counts, canonicalUnchanged: true, canonicalIntegration: false }));
}
