import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { collectCaretMotionContext, caretMotionCaptureFile } from './audit-material-caret-motion-context.mjs';

assert.equal(process.argv.length, 2);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const cache = new Map();
const read = file => {
  const absolute = path.resolve(file);
  if (!cache.has(absolute)) cache.set(absolute, readFileSync(absolute));
  return cache.get(absolute);
};
const capture = JSON.parse(read(caretMotionCaptureFile)), baseline = collectCaretMotionContext({ readBytes: read });
assert.equal(baseline.cases, 146); assert.equal(baseline.observations, 362);
assert.equal(baseline.checkedOriginalScalarProperties, 32218);
const saved = JSON.parse(read('docs/material-caret-motion-context-survey.json')); delete saved.sourceFingerprints;
assert.deepEqual(baseline, saved);
const resultFile = capture.results[0].file, result = JSON.parse(read(resultFile));
function variant(change, top = false) {
  const modifiedCapture = structuredClone(capture), modifiedResult = structuredClone(result);
  if (top) change(modifiedCapture); else change(modifiedResult);
  const bytes = Buffer.from(JSON.stringify(modifiedResult));
  if (!top) modifiedCapture.results[0].sha256 = hash(bytes);
  const overrides = new Map([[path.resolve(caretMotionCaptureFile), Buffer.from(JSON.stringify(modifiedCapture))]]);
  if (!top) overrides.set(path.resolve(resultFile), bytes);
  return () => collectCaretMotionContext({ readBytes: file => overrides.get(path.resolve(file)) ?? read(file) });
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
  r => { r.observations--; },
];
const resultMutations = [
  r => { r.kind = 'invented'; },
  r => { r.state = 'unreviewed-state'; },
  r => { r.viewport.deviceScaleFactor = 9; },
  r => { r.runtime.errors.push('runtime failure'); },
  r => { r.runtime.assets = r.runtime.assets.filter(a => a.type !== 'font'); },
  r => { r.runtime.assets[0].sha256 = '0'.repeat(64); },
  r => { r.owners.pop(); },
  r => { r.owners[0].originalObservation.proofSha256 = '0'.repeat(64); },
  r => { r.owners[0].freshProof.referenceNode = 'different-owner'; },
  r => { r.owners[0].originalProof.candidatePath[0].type = null; },
  r => { r.owners[0].freshProof.candidatePath[0].type = 'div'; },
  r => { const n = r.freshReferenceTree.nodes.find(n => n.key === r.owners[0].freshProof.referenceNode); r.freshReferenceTree.styles[n.style].fontSize = '99px'; },
  r => { r.owners[0].motion.transitionProperty = 'color'; },
  r => { r.owners[0].context.ancestors[0].attributes.class = 'wrong-owner'; },
  r => { r.owners[0].context.ancestors.pop(); },
  r => { r.owners[0].context.ancestors[1].motion.transitionProperty = 'color'; },
  r => { r.renderingEquivalent = true; },
  r => { r.candidateReplayed = true; },
  r => { r.historicalMotionVerified = true; },
  r => { r.heldDuringCapture = !r.heldDuringCapture; },
];
for (const [index, change] of rootMutations.entries()) assert.throws(variant(change, true), `capture rejection ${index}`);
for (const [index, change] of resultMutations.entries()) assert.throws(variant(change), `result rejection ${index}`);
// A consistent different fresh measurement remains reportable, not normalized
// to the captured expectation. Shared style rows require updating every owner
// and ancestry reference to that same row in this in-memory control.
const changed = variant(r => {
  const n = r.freshReferenceTree.nodes.find(n => n.key === r.owners[0].freshProof.referenceNode), style = n.style;
  r.freshReferenceTree.styles[style].transitionProperty = 'color';
  for (const owner of r.owners) {
    const ownerNode = r.freshReferenceTree.nodes.find(n => n.key === owner.freshProof.referenceNode);
    if (ownerNode.style === style) owner.motion.transitionProperty = 'color';
    const chain = [...owner.freshProof.referencePath].reverse();
    chain.forEach((p, i) => {
      if (r.freshReferenceTree.nodes.find(n => n.key === p.key).style === style)
        owner.context.ancestors[i].motion.transitionProperty = 'color';
    });
  }
})();
assert.ok(changed.observationsByCase.some(r => r.motion.transitionProperty === 'color'));
assert.equal(changed.historicalMotionVerified, false);
const active = variant(r => { r.owners[0].context.activeOwnerAnimations.push({ playState: 'running' }); })();
assert.equal(active.noActiveOwnerAnimationObservations, baseline.noActiveOwnerAnimationObservations - 1);
assert.equal(active.renderingEquivalent, false);
console.log(JSON.stringify({ cases: baseline.cases, observations: baseline.observations,
  originalScalarChecks: baseline.checkedOriginalScalarProperties,
  negativeControls: rootMutations.length + resultMutations.length, changedObservationControls: 2,
  savedReportMatches: true, evidenceFilesWritten: false }));
