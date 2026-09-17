import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { collectOwnerCaretInputs } from '../tests/material-parity/owner-caret-source-binding.mjs';
import { bindOwnerCaretCaptureSubset, projectOwnerCaretAuditInputs, collectOwnerCaretAuditInputs,
  validateOwnerCaretAuditInputs, ownerCaretOriginalCapture } from '../tests/material-parity/owner-caret-audit-source-binding.mjs';
import { validateOwnerCaretAttributionRows } from '../tests/material-parity/owner-caret-attribution-coverage.mjs';

assert.equal(process.argv.length, 2);
const hash = x => createHash('sha256').update(x).digest('hex');
const raw = JSON.parse(readFileSync(ownerCaretOriginalCapture));
const files = ['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz',
  'docs/material-input-equivalence-audit.md'];
const before = files.map(f => hash(readFileSync(f)));
const full = collectOwnerCaretInputs(raw, { parityPath: ownerCaretOriginalCapture });
assert.equal(full.binding.status, 'bound', full.binding.error);
const complete = projectOwnerCaretAuditInputs(full, raw, raw);
assert.equal(complete.coverage.complete, true); assert.equal(complete.coverage.suppliedObservations, 4050);
assert.ok(isDeepStrictEqual(complete.observations, full.observations));
assert.deepEqual(validateOwnerCaretAttributionRows(full.plannedCoverage, complete.plannedCoverage.rows), []);
const local = full.plannedCoverage.rows.find(r => r.attribution === 'reviewed-owner-caret-observation-stage' && r.reviewedCases.length > 13);
const motion = full.plannedCoverage.rows.find(r => r.attribution === 'reviewed-motion-caret-observation-stage');
const range = full.plannedCoverage.pending.find(r => r.family === 'slider');
const tooltip = full.plannedCoverage.pending.find(r => r.family === 'tooltip');
assert.ok(local && motion && range && tooltip);
const wanted = new Set([[local.reviewedCases[13], local.element], [motion.reviewedCases[0], motion.element],
  [range.reviewedCases[0], range.element], [tooltip.reviewedCases[0], tooltip.element]].map(x => JSON.stringify(x)));
const select = (xs, kind) => xs.flatMap(e => {
  const key = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
  const styleInputs = e.styleInputs.filter(i => wanted.has(JSON.stringify([key, i.id])));
  return styleInputs.length ? [{ ...e, styleInputs }] : [];
});
const subset = { ...raw, results: select(raw.results, 'static'), interactions: select(raw.interactions, 'interaction') };
const subsetBefore = hash(JSON.stringify(subset));
const projected = projectOwnerCaretAuditInputs(full, subset, raw);
assert.equal(projected.coverage.complete, false);
assert.equal(projected.observations.length, 4); assert.equal(projected.coverage.missingObservations.length, 4046);
assert.equal(projected.plannedCoverage.reviewedObservations, 2); assert.equal(projected.plannedCoverage.pendingObservations, 2);
const selectedLocal = projected.plannedCoverage.rows.find(r => r.element === local.element && r.family === local.family);
assert.equal(selectedLocal.reviewEvidence.case, local.reviewedCases[13]);
assert.notEqual(selectedLocal.reviewEvidence.case, local.reviewEvidence.case, 'subset must use its own first observation');
let negativeControls = 0;
const first = r => r.results[0] ?? r.interactions[0];
for (const mutate of [
  r => { first(r).profile = 'unknown'; }, r => { first(r).viewport.width++; },
  r => { first(r).inputTrees.reference.sha256 = '0'.repeat(64); },
  r => { first(r).styleInputs[0].reference.caretColor = 'red'; },
  r => { first(r).styleInputs[0].astylar.caretColor = 'auto'; },
  r => { first(r).styleInputs[0].astylarNormalResolvedStyle.caretColor = 'auto'; },
  r => { first(r).styleInputs[0].referenceAuthored = []; },
  r => { first(r).styleInputs[0].id = 'unknown'; },
  r => { first(r).styleInputs.push(structuredClone(first(r).styleInputs[0])); },
  r => { r.results.push(structuredClone(r.results[0])); },
]) {
  const changed = structuredClone(subset); mutate(changed);
  assert.throws(() => bindOwnerCaretCaptureSubset(changed, raw)); negativeControls++;
}
const reverse = { ...raw, results: [...raw.results].reverse() };
assert.throws(() => bindOwnerCaretCaptureSubset(reverse, raw), /case order/); negativeControls++;
const ownerReverse = { ...raw, results: [...raw.results] };
ownerReverse.results[0] = { ...raw.results[0], styleInputs: [...raw.results[0].styleInputs].reverse() };
assert.throws(() => bindOwnerCaretCaptureSubset(ownerReverse, raw), /owner order/); negativeControls++;
const absent = projectOwnerCaretAuditInputs(full, { results: [], interactions: [] }, raw);
assert.equal(absent.coverage.complete, false); assert.equal(absent.coverage.missingObservations.length, 4050);
assert.equal(absent.observations.length, 0);
const reduced = { ...subset, results: subset.results.slice(1) };
const reducedEvidence = projectOwnerCaretAuditInputs(full, reduced, raw);
assert.ok(reducedEvidence.coverage.missingObservations.length > projected.coverage.missingObservations.length);
assert.equal(hash(JSON.stringify(subset)), subsetBefore);

const directory = mkdtempSync(path.resolve('artifacts/material-parity/caret-subset-binding-'));
try {
  const file = path.join(directory, 'capture.json'); writeFileSync(file, JSON.stringify(subset));
  const bound = collectOwnerCaretAuditInputs(subset, { parityPath: file });
  assert.equal(bound.binding.status, 'bound', bound.binding.error);
  const { schemaVersion, binding, ...actual } = bound;
  assert.ok(isDeepStrictEqual(actual, projected));
  assert.ok(validateOwnerCaretAuditInputs(bound).some(e => e.includes('complete original population missing'))); negativeControls++;
  assert.deepEqual(validateOwnerCaretAuditInputs(bound, { requireComplete: false }), []);
  const forged = { ...bound, coverage: { ...bound.coverage, complete: true, missingObservations: [], missingCases: [], missingInputs: [] } };
  assert.ok(validateOwnerCaretAuditInputs(forged).some(e => e.includes('differs from authenticated source replay'))); negativeControls++;
  const changed = structuredClone(subset); first(changed).styleInputs[0].reference.caretColor = 'red';
  const badFile = path.join(directory, 'altered.json'); writeFileSync(badFile, JSON.stringify(changed));
  const rejected = collectOwnerCaretAuditInputs(changed, { parityPath: badFile });
  assert.equal(rejected.binding.status, 'invalid'); assert.match(rejected.binding.error, /original scalar input changed/); negativeControls++;
  const completeBound = collectOwnerCaretAuditInputs(raw, { parityPath: ownerCaretOriginalCapture });
  assert.equal(completeBound.binding.status, 'bound', completeBound.binding.error);
  assert.equal(completeBound.coverage.complete, true);
  assert.deepEqual(validateOwnerCaretAttributionRows(full.plannedCoverage, completeBound.plannedCoverage.rows), []);
  console.log(JSON.stringify({ originalCases: complete.coverage.sourceCases, originalInputs: complete.coverage.sourceInputs,
    originalObservations: 4050, subsetCases: bound.coverage.suppliedCases, subsetInputs: bound.coverage.suppliedInputs,
    subsetObservations: 4, reviewedSubsetObservations: 2, pendingSubsetObservations: 2,
    missingCases: bound.coverage.missingCases.length, missingInputs: bound.coverage.missingInputs.length,
    missingObservations: 4046, negativeControls, partialReplayMatches: true, completeCoveragePreserved: true,
    subsetCoverageSha256: hash(JSON.stringify(bound.coverage)), fullCoverageSha256: hash(JSON.stringify(completeBound.coverage)),
    canonicalIntegration: false, inputEquivalent: false, renderingEquivalent: false }));
} finally {
  const boundary = path.resolve('artifacts/material-parity'), resolved = path.resolve(directory), relative = path.relative(boundary, resolved);
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
  rmSync(resolved, { recursive: true, force: true });
}
assert.deepEqual(files.map(f => hash(readFileSync(f))), before);
