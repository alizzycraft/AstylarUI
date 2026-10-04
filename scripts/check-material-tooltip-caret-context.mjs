import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { collectTooltipCaretContext, tooltipCaretCaptureFile, tooltipCaretSurveyFile } from './audit-material-tooltip-caret-context.mjs';

assert.equal(process.argv.length, 2);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const cache = new Map(), read = file => {
  const key = path.resolve(file); if (!cache.has(key)) cache.set(key, readFileSync(key)); return cache.get(key);
};
const raw = JSON.parse(read(tooltipCaretCaptureFile));
const resultFile = raw.results[0].file, originalResult = JSON.parse(read(resultFile));
const baseline = collectTooltipCaretContext({ readBytes: read });
const saved = JSON.parse(read(tooltipCaretSurveyFile)); delete saved.sourceFingerprints;
const reconciled = structuredClone(saved);
for (const file of ['tests/material-parity/run-material-parity.mjs',
  'tests/material-parity/generated-node-mapping-evidence.mjs',
  'tests/material-parity/border-initial-input-evidence.mjs', 'tests/material-parity/input-equivalence-audit.mjs']) {
  const before = reconciled.parentSourceChecks.filter(s => s.file === file);
  const after = baseline.parentSourceChecks.filter(s => s.file === file);
  assert.equal(before.length, 1); assert.equal(after.length, 1);
  assert.equal(before[0].recorded, after[0].recorded);
  before[0].current = after[0].current; before[0].verification = after[0].verification;
}
assert.equal(reconciled.historicalAuditSource.recorded, baseline.historicalAuditSource.recorded);
reconciled.historicalAuditSource.current = baseline.historicalAuditSource.current;
const { normalizationRevalidation, ...replayed } = baseline;
assert.ok(isDeepStrictEqual(replayed, reconciled), 'tooltip review differs beyond authenticated source receipts');
assert.deepEqual([normalizationRevalidation.stylesChecked, normalizationRevalidation.caretValuesPreserved,
  normalizationRevalidation.wholeStyleEquivalent, normalizationRevalidation.differences.length], [351, true, false, 18]);
assert.equal(new Set(normalizationRevalidation.differences.map(d => d.case)).size, 18);
assert.ok(normalizationRevalidation.differences.every(d => d.property === 'backgroundColor' && d.historical !== d.current));
assert.equal(baseline.cases, 18); assert.equal(baseline.originalScalarChecks, 1602);
assert.equal(baseline.rootProperties, 3816);
function variant(change, top = false) {
  const capture = structuredClone(raw), result = structuredClone(originalResult);
  change(top ? capture : result);
  const bytes = Buffer.from(JSON.stringify(result)); if (!top) capture.results[0].sha256 = hash(bytes);
  const overrides = new Map([[path.resolve(tooltipCaretCaptureFile), Buffer.from(JSON.stringify(capture))]]);
  if (!top) overrides.set(path.resolve(resultFile), bytes);
  return () => collectTooltipCaretContext({ readBytes: file => overrides.get(path.resolve(file)) ?? read(file) });
}
const captureChanges = [
  r => { r.results.pop(); },
  r => { r.results[0] = structuredClone(r.results[1]); },
  r => { r.cases++; },
  r => { r.browser = 'different'; },
  r => { r.capture.sources.pop(); },
  r => { r.reusedFunctions[0].sha256 = '0'.repeat(64); },
  r => { r.motionProperties.pop(); },
  r => { r.capture.styleProperties.pop(); },
  r => { r.historicalExternalContextVerified = true; },
];
const resultChanges = [
  r => { r.state = 'hover'; }, // first retained case is held; original boundary must survive.
  r => { r.viewport.width++; },
  r => { r.originalObservation.proofSha256 = '0'.repeat(64); },
  r => { r.originalInputTrees.astylar.sha256 = '0'.repeat(64); },
  r => { r.freshCaret.referenceRoot.key = 'different'; },
  r => { r.freshAlias.referenceNode = 'different'; },
  r => { r.checkedOriginalScalarProperties--; },
  r => { r.heldDuringCapture = false; },
  r => { r.runtime.errors.push('error'); },
  r => { r.runtime.assets = r.runtime.assets.filter(a => a.type !== 'font'); },
  r => { r.runtime.assets[0].sha256 = '0'.repeat(64); },
  r => { const n = r.freshReferenceTree.nodes.find(n => n.key === r.freshAlias.referenceNode); r.freshReferenceTree.styles[n.style].fontSize = '99px'; },
  r => { r.context.errors.push('missing ancestor'); },
  r => { r.context.nodes.push(structuredClone(r.context.nodes[0])); },
  r => { r.context.viewport.deviceScaleFactor++; },
  r => { r.context.documentUrl = 'http://127.0.0.1:4431/reference/dialog'; },
  r => { r.context.sheets = []; },
  r => { r.context.roots.pop(); },
  r => { r.context.roots[1].ancestry.pop(); },
  r => { r.context.nodes.find(n => n.key === r.context.roots[1].node).parent = null; },
  r => { r.context.nodes.find(n => n.key === r.context.roots[1].node).computed['caret-color'] = 'red'; },
  r => { r.context.nodes.find(n => n.key === r.context.roots[1].node).attributes.class = 'wrong-root'; },
  r => { r.historicalMotionVerified = true; },
  r => { r.candidateReplayed = true; },
  r => { r.renderingEquivalent = true; },
];
assert.equal(originalResult.state, 'held');
for (const [i, change] of captureChanges.entries()) assert.throws(variant(change, true), `capture rejection ${i}`);
for (const [i, change] of resultChanges.entries()) assert.throws(variant(change), `result rejection ${i}`);
const normalization = baseline.parentSourceChecks.find(s => s.verification === 'historical-replay-and-current-caret-value-revalidation');
assert.ok(normalization); assert.notEqual(normalization.recorded, normalization.current);
for (const digest of ['0'.repeat(64), normalization.current])
  assert.throws(variant(r => { r.capture.sources.find(s => s.file === normalization.file).sha256 = digest; }, true),
    'a historical capture cannot substitute current source or a fabricated receipt');
const inspector = baseline.parentSourceChecks.find(s => s.file.endsWith('/owner-caret-input-evidence.mjs'));
assert.ok(inspector);
for (const source of [normalization, inspector]) {
  const absolute = path.resolve(source.file), original = read(absolute).toString('utf8');
  const changed = source === normalization ? original.replace('function canonicalStyle(', 'function missingCanonicalStyle(')
    : original + '\n// changed complete dependency\n';
  assert.notEqual(changed, original);
  assert.throws(() => collectTooltipCaretContext({ readBytes: file => path.resolve(file) === absolute
    ? Buffer.from(changed) : read(file) }), 'changed executed normalization or complete dependency must fail');
}
for (const file of ['tests/material-parity/run-material-parity.mjs',
  'tests/material-parity/generated-node-mapping-evidence.mjs']) {
  const absolute = path.resolve(file), original = read(absolute);
  assert.throws(() => collectTooltipCaretContext({ readBytes: candidate => path.resolve(candidate) === absolute
    ? Buffer.concat([original, Buffer.from('\n// unauthenticated transition\n')]) : read(candidate) }),
  'historical source restoration must reject unrelated changes');
}
// New motion/context values are measurements to retain, not constants to force
// back to the original expectation. These controls do not edit evidence files.
const changedMotion = variant(r => {
  const n = r.freshReferenceTree.nodes.find(n => n.key === r.freshAlias.referenceNode);
  r.freshReferenceTree.styles[n.style].animationName = 'diagnostic-motion';
})();
assert.ok(changedMotion.observations[0].freshOwnerPath.some(n => n.motion.animationName === 'diagnostic-motion'));
const changedAncestor = variant(r => {
  r.context.nodes.find(n => n.type === 'body').computed['caret-color'] = 'rgb(255, 0, 0)';
})();
assert.ok(changedAncestor.observations[0].freshExternalContext.some(n => n.type === 'body' && n.caretColor === 'rgb(255, 0, 0)'));
for (const r of [baseline, changedMotion, changedAncestor])
  for (const f of ['canonicalAttributionChanged', 'candidateReplayed', 'historicalExternalContextVerified', 'historicalMotionVerified', 'renderingEquivalent'])
    assert.equal(r[f], false);
console.log(JSON.stringify({ cases: baseline.cases, originalScalarChecks: baseline.originalScalarChecks,
  rootProperties: baseline.rootProperties, negativeControls: captureChanges.length + resultChanges.length,
  parentSourceRejectionControls: 4,
  sourceTransitionRejectionControls: 2, normalizationDifferencesRetained: normalizationRevalidation.differences.length,
  changedObservationControls: 2, savedReportMatches: true, evidenceFilesWritten: false }));
