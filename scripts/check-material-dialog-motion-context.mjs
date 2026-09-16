import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { collectDialogMotionContext, dialogMotionCaptureFile } from './audit-material-dialog-motion-context.mjs';

assert.equal(process.argv.length, 2);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const cache = new Map();
const read = file => {
  const absolute = path.resolve(file);
  if (!cache.has(absolute)) cache.set(absolute, readFileSync(absolute));
  return cache.get(absolute);
};
const capture = JSON.parse(read(dialogMotionCaptureFile));
const baseline = collectDialogMotionContext({ readBytes: read });
assert.equal(baseline.cases, 32); assert.equal(baseline.checkedOriginalScalarProperties, 2848);
for (const field of ['noTransitionTargetCases', 'noAnimationNameCases', 'noActiveOwnerAnimationCases']) assert.equal(baseline[field], 32);
const saved = JSON.parse(read('docs/material-dialog-motion-context-survey.json')); delete saved.sourceFingerprints;
assert.deepEqual(baseline, saved);
const resultFile = capture.results[0].file, result = JSON.parse(read(resultFile));
function variant(change, top = false) {
  const modifiedCapture = structuredClone(capture), modifiedResult = structuredClone(result);
  if (top) change(modifiedCapture); else change(modifiedResult);
  const bytes = Buffer.from(JSON.stringify(modifiedResult));
  if (!top) modifiedCapture.results[0].sha256 = hash(bytes);
  const overrides = new Map([[path.resolve(dialogMotionCaptureFile), Buffer.from(JSON.stringify(modifiedCapture))]]);
  if (!top) overrides.set(path.resolve(resultFile), bytes);
  return () => collectDialogMotionContext({ readBytes: file => overrides.get(path.resolve(file)) ?? read(file) });
}
const rootMutations = [
  r => { r.results.pop(); },
  r => { r.results[0] = structuredClone(r.results[1]); },
  r => { r.browser = 'different-browser'; },
  r => { r.capture.sources.pop(); },
  r => { r.reusedFunctions[0].sha256 = '0'.repeat(64); },
  r => { r.motionProperties.pop(); },
  r => { r.capture.styleProperties.pop(); },
  r => { r.historicalMotionVerified = true; },
];
const resultMutations = [
  r => { r.state = 'unreviewed-state'; },
  r => { r.viewport.deviceScaleFactor = 9; },
  r => { r.runtime.errors.push('runtime failure'); },
  r => { r.runtime.assets = r.runtime.assets.filter(a => a.type !== 'font'); },
  r => { r.runtime.assets[0].sha256 = '0'.repeat(64); },
  r => { r.freshProof.referenceNode = 'different-owner'; },
  r => { const owner = r.freshReferenceTree.nodes.find(n => n.key === r.freshProof.referenceNode); r.freshReferenceTree.styles[owner.style].fontSize = '99px'; },
  r => { r.motion.transitionProperty = 'gap'; },
  r => { r.context.ancestors[0].attributes.class = 'wrong-owner'; },
  r => { r.context.ancestors.pop(); },
  r => { r.renderingEquivalent = true; },
  r => { r.candidateReplayed = true; },
  r => { r.historicalMotionVerified = true; },
];
for (const [index, change] of rootMutations.entries()) assert.throws(variant(change, true), `capture rejection ${index}`);
for (const [index, change] of resultMutations.entries()) assert.throws(variant(change), `result rejection ${index}`);
// A self-consistent different fresh observation must be reported, not normalized
// to the expected reference result. These controls modify memory, never evidence.
const changedTarget = variant(r => {
  const owner = r.freshReferenceTree.nodes.find(n => n.key === r.freshProof.referenceNode);
  r.motion.transitionProperty = 'gap'; r.freshReferenceTree.styles[owner.style].transitionProperty = 'gap';
})();
assert.equal(changedTarget.noTransitionTargetCases, 31);
assert.equal(changedTarget.historicalMotionVerified, false);
const active = variant(r => { r.context.activeOwnerAnimations.push({ playState: 'running' }); })();
assert.equal(active.noActiveOwnerAnimationCases, 31);
assert.equal(active.renderingEquivalent, false);
console.log(JSON.stringify({ originalCases: baseline.cases, originalScalarChecks: baseline.checkedOriginalScalarProperties,
  negativeControls: rootMutations.length + resultMutations.length, changedObservationControls: 2,
  savedReportMatches: true, evidenceFilesWritten: false }));
