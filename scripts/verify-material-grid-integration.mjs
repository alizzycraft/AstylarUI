import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import { isDeepStrictEqual } from 'node:util';
import Parser from 'jsonparse';
import { validateOwnerGridInitialInputs } from '../tests/material-parity/owner-grid-initial-source-binding.mjs';
import { validateOwnerGridInitialClassifications } from '../tests/material-parity/owner-grid-initial-coverage.mjs';
import { ownerGridInitialAttribution } from '../tests/material-parity/owner-grid-initial-classification.mjs';

const previousCommit = '9a60909';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const gitFile = file => execFileSync('git', ['show', `${previousCommit}:${file}`], { maxBuffer: 64 * 1024 * 1024 });
async function projection(read, wanted, stopAt) {
  const manifest = JSON.parse(read('docs/material-input-equivalence-audit.json'));
  assert.match(manifest.payload, /^material-input-equivalence-audit[^/\\]*\.gz$/);
  const bytes = read('docs/' + manifest.payload);
  assert.equal(hash(bytes), manifest.compressedSha256);
  const parser = new Parser(), result = {}; let done = false;
  parser.onValue = function(value) {
    const top = this.stack[1]?.key ?? (this.stack.length === 1 ? this.key : undefined);
    if (this.stack.length === 1) {
      if (wanted.includes(this.key)) result[this.key] = value;
      if (this.key === stopAt) done = true;
      delete this.value[this.key];
    } else if (this.value && !wanted.includes(top)) delete this.value[this.key];
  };
  for await (const chunk of Readable.from([bytes]).pipe(createGunzip())) {
    parser.write(chunk); if (done) break;
  }
  assert.ok(done, `missing ${stopAt}`);
  return { manifest, ...result };
}
const fields = ['summary', 'sourceFingerprints', 'discrepancies'];
const before = await projection(gitFile, fields, 'discrepancies');
const after = await projection(readFileSync, fields, 'discrepancies');
assert.equal(before.manifest.compressedSha256, 'de4473ec4d60f3707a8d71c802efd7e0bf612565f9a73e75acd017944d91b221');
const changed = after.discrepancies.filter(r => r.attribution === ownerGridInitialAttribution);
assert.equal(changed.length, 100, 'full report must contain all newly reviewed grid groups');
assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 6226);
const scalar = r => [r.family, r.element, r.property, r.reference, r.astylar, r.occurrences, r.cases, r.states];
assert.equal(before.discrepancies.length, 8339); assert.equal(after.discrepancies.length, 8339);
assert.ok(isDeepStrictEqual(after.discrepancies.map(scalar), before.discrepancies.map(scalar)), 'all original scalar rows must remain unchanged');
const keys = new Set(changed.map(r => JSON.stringify(scalar(r))));
assert.equal(keys.size, 100);
const other = rows => rows.filter(r => !keys.has(JSON.stringify(scalar(r))));
assert.equal(other(after.discrepancies).length, 8239);
assert.ok(isDeepStrictEqual(other(after.discrepancies), other(before.discrepancies)), 'all unrelated complete discrepancy rows must remain unchanged');
for (const row of changed) {
  const old = before.discrepancies.find(r => JSON.stringify(scalar(r)) === JSON.stringify(scalar(row)));
  assert.equal(old.attribution, 'unresolved');
  assert.equal(old.classification, 'parity-harness-defect');
  assert.equal(row.classification, 'parity-harness-defect');
  assert.deepEqual(row.referenceAuthoredExamples, old.referenceAuthoredExamples);
  assert.deepEqual(row.astylarAuthoredExamples, old.astylarAuthoredExamples);
  for (const flag of ['computedCandidateVerified', 'gridLayoutEquivalent', 'renderingEquivalent', 'wholeElementInputEquivalent'])
    assert.equal(row.reviewEvidence[flag], false);
}
const summary = structuredClone(before.summary); summary.unresolvedAttributions -= 100;
assert.deepEqual(after.summary, summary); assert.equal(after.summary.unresolvedAttributions, 2495);
assert.equal(after.summary.inputEquivalent, false);
const added = ['owner-grid-initial-evidence.mjs', 'owner-grid-initial-evidence.spec.mjs',
  'owner-grid-initial-source-binding.mjs', 'owner-grid-initial-source-binding.spec.mjs',
  'owner-grid-initial-classification.mjs', 'owner-grid-initial-classification.spec.mjs',
  'owner-grid-initial-coverage.mjs', 'owner-grid-initial-coverage.spec.mjs',
  'owner-grid-initial-canonical-integration.spec.mjs'].map(f => 'tests/material-parity/' + f);
assert.equal(after.sourceFingerprints.length, 196);
assert.deepEqual(after.sourceFingerprints.filter(s => !added.includes(s.file)).map(s => s.file), before.sourceFingerprints.map(s => s.file));
assert.deepEqual(after.sourceFingerprints.filter(s => !before.sourceFingerprints.some(b => b.file === s.file)).map(s => s.file), added);
const changedSources = before.sourceFingerprints.filter(b => after.sourceFingerprints.find(a => a.file === b.file).sha256 !== b.sha256).map(s => s.file);
assert.deepEqual(changedSources, ['tests/material-parity/input-equivalence-audit.mjs',
  'tests/material-parity/input-equivalence-audit.spec.mjs', 'docs/material-field-host-initial-style-audit.json',
  'tests/material-parity/slider-border-canonical-integration.spec.mjs']);
for (const s of after.sourceFingerprints)
  assert.equal(s.sha256, hash(readFileSync(s.file, 'utf8').replaceAll('\r\n', '\n')), s.file);

const retained = await projection(readFileSync, ['nonGridTemplateInputs', 'ownerGridInitialInputs'], 'ownerGridInitialInputs');
const evidence = retained.ownerGridInitialInputs;
assert.equal(evidence.captures.length, 2311); assert.equal(evidence.observations.length, 13824);
assert.equal(evidence.observations.filter(o => o.proof.issues.length).length, 2856);
assert.deepEqual(validateOwnerGridInitialInputs(evidence), []);
assert.deepEqual(validateOwnerGridInitialClassifications(evidence, after.discrepancies, retained.nonGridTemplateInputs), []);
// Earlier non-grid declarations have an independent original-tree proof. Keep
// the exact saved evidence, not merely its classified row count.
const earlier = await projection(gitFile, ['nonGridTemplateInputs'], 'nonGridTemplateInputs');
assert.ok(isDeepStrictEqual(retained.nonGridTemplateInputs, earlier.nonGridTemplateInputs), 'earlier non-grid evidence changed');
console.log(JSON.stringify({ previousCommit, unchangedScalarRows: 8339, unchangedCompleteRows: 8239,
  unchangedCompleteRowsSha256: hash(JSON.stringify(other(after.discrepancies))),
  attributedGroups: 100, attributedObservations: 6226, originalCases: 2311,
  eligibleObservations: 13824, retainedReviewGaps: 2856, changedSources, addedSources: added,
  compressedSha256: after.manifest.compressedSha256, unresolved: 2495, inputEquivalent: false,
  limitation: 'Full discrepancy/source/summary conservation and original grid ledger replay; not full no-write validation, candidate computed layout or rendering equivalence.' }));
