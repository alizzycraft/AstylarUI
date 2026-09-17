import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { loadGapReviewMembership, recordGapReviewMembership } from './bind-material-gap-review-membership.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const membershipFile = 'docs/material-gap-review-membership.json';
const cssomFile = 'docs/material-motion-cssom-capture-proof.json';
const verifier = 'scripts/verify-material-motion-cssom-capture.mjs';
const sourceFile = 'scripts/bind-material-pending-motion-capture.mjs';
const target = 'docs/material-pending-motion-capture-binding.json';
const scenarios = ['literal-transform', 'variable-fallback', 'variable-duration', 'variable-gap', 'variable-adds-gap', 'override-none'];
const longhands = ['transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay', 'transition-behavior'];

// Join two existing independently replayed proofs. This does not parse CSS,
// resolve custom properties, compute motion or repair the original scalar data.
export function bindPendingMotionCapture(membership, cssom) {
  assert.equal(membership.kind, 'existing-gap-review-original-membership-binding');
  assert.equal(membership.canonicalIntegration, false); assert.equal(membership.inputEquivalent, false);
  assert.equal(cssom.kind, 'browser-cssom-motion-capture-proof'); assert.equal(cssom.assertionsPassed, true);
  assert.deepEqual(cssom.cases.map(c => c.scenario.id), scenarios);
  assert.equal(cssom.originalDialogCases.length, 32);
  assert.equal(new Set(cssom.originalDialogCases.map(c => c.case)).size, 32);
  const pending = membership.rows.filter(r => r.reviewDisposition === 'requires-review');
  assert.equal(pending.length, 2);
  assert.deepEqual(pending.map(r => r.property).sort(), ['columnGap', 'rowGap']);
  const rows = pending.map(group => {
    assert.equal(group.family, 'dialog'); assert.equal(group.element, 'dialog-panel'); assert.equal(group.kind, 'motion');
    assert.equal(group.priorAttribution, 'unresolved'); assert.equal(group.inputEquivalent, false);
    assert.equal(group.reference, 'normal'); assert.equal(group.candidate, '<omitted>');
    assert.equal(group.observations.length, 32);
    assert.deepEqual(group.observations.map(o => o.case), cssom.originalDialogCases.map(c => c.case));
    const observations = group.observations.map((observation, index) => {
      const original = cssom.originalDialogCases[index];
      assert.deepEqual(observation.inputTrees, original.inputTrees);
      assert.equal(observation.review.disposition, 'requires-review');
      assert.ok(observation.review.reasons.length > 0);
      assert.equal(observation.referenceRaw, 'normal'); assert.equal(observation.candidateRaw, '<omitted>');
      assert.equal(observation.candidateRawShorthand, '<omitted>');
      assert.equal(original.scalarRetainsCssText, false);
      assert.deepEqual(Object.keys(original.longhands).sort(), [...longhands].sort());
      assert.ok(Object.values(original.longhands).every(d => d.value === '' && d.important === false));
      assert.ok(original.cssText.includes('transition: transform var(--mat-dialog-transition-duration, 0ms) cubic-bezier(0, 0, 0.2, 1);'));
      assert.ok(original.owner && original.source);
      return { ...observation, capturedReferenceOwner: original.owner, capturedRuleSource: original.source,
        capturedFullRuleText: original.cssText, capturedEmptyLonghands: original.longhands, scalarRetainsCssText: false };
    });
    return { family: group.family, element: group.element, property: group.property,
      canonicalRevision: group.canonicalRevision, canonicalRowSha256: group.canonicalRowSha256,
      originalProofSha256: group.originalProofSha256, priorAttribution: group.priorAttribution,
      originalMotionDisposition: group.reviewDisposition, observations,
      classification: 'parity-harness-defect', attribution: 'original-pending-transition-shorthand-capture-loss',
      owner: 'Material scalar authored-rule capture and pending CSS shorthand interpretation',
      inputEquivalent: false, computedCandidateVerified: false, usedGapVerified: false,
      originalResolvedMotionVerified: false, renderingEquivalent: false, rendererCauseProven: false };
  });
  return rows;
}

export async function loadPendingMotionCapture() {
  const inputs = await loadGapReviewMembership(), membership = recordGapReviewMembership(inputs);
  assert.deepEqual(membership, JSON.parse(readFileSync(membershipFile)));
  const cssom = JSON.parse(readFileSync(cssomFile));
  const pinned = JSON.parse(execFileSync('git', ['show', `3ebcff3e8f7bdfe7ecd9e00a4c2acbd11fefdc4a:${cssomFile}`],
    { maxBuffer: 1024 * 1024 }));
  assert.deepEqual({ ...cssom, parent: { ...cssom.parent, sha256: pinned.parent.sha256 } }, pinned,
    'original CSSOM proof changed beyond replayed parent receipt');
  assert.deepEqual(cssom.parent, inputs.join.survey); assert.deepEqual(cssom.capture, inputs.join.capture);
  assert.equal(hash(readFileSync(cssom.parent.file)), cssom.parent.sha256);
  for (const s of cssom.source) assert.equal(hash(readFileSync(s.file, 'utf8').replaceAll('\r\n', '\n')), s.sha256);
  const replay = JSON.parse(execFileSync(process.execPath, [verifier, '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }).trim());
  assert.deepEqual(replay, { cases: 6, browser: cssom.browser, assertionsPassed: true, mode: '--check' });
  return { membership, cssom };
}

export function recordPendingMotionCapture({ membership, cssom }) {
  const rows = bindPendingMotionCapture(membership, cssom);
  return { schemaVersion: 1, kind: 'original-pending-motion-capture-membership-binding',
    sources: [membershipFile, cssomFile].map(file => ({ file, sha256: hash(readFileSync(file)) })),
    sourceFingerprint: { file: sourceFile, sha256: hash(readFileSync(sourceFile, 'utf8').replaceAll('\r\n', '\n')) },
    counts: { groups: rows.length, cases: 32, propertyObservations: 64, browserControls: 6 }, rows,
    canonicalIntegration: false, inputEquivalent: false, originalResolvedMotionVerified: false,
    candidateComputedGapVerified: false, rendererCauseProven: false,
    limitation: 'Confirmed original scalar capture loses pending transition shorthand text. This does not resolve original motion or custom properties, substitute fresh replay values, establish candidate computed/used gaps, or prove the cause of any layout or rendering defect.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const canonical = ['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz',
    'docs/material-input-equivalence-audit.md'];
  const before = canonical.map(f => hash(readFileSync(f)));
  const report = recordPendingMotionCapture(await loadPendingMotionCapture()), output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(target, output);
  assert.deepEqual(canonical.map(f => hash(readFileSync(f))), before);
  console.log(JSON.stringify({ ...report.counts, canonicalIntegration: false, canonicalUnchanged: true, originalResolvedMotionVerified: false }));
}
