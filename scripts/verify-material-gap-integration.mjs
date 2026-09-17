import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import { isDeepStrictEqual } from 'node:util';
import Parser from 'jsonparse';
import { validateOwnerGapInputs } from '../tests/material-parity/owner-gap-source-binding.mjs';
import { validateOwnerGapClassifications } from '../tests/material-parity/owner-gap-coverage.mjs';
import { ownerGapAttribution } from '../tests/material-parity/owner-gap-classification.mjs';

// Verify the actual saved canonical payloads, not an old builder running with
// new dependencies. Full no-write generation remains a separate required gate.
const previousCommit = 'cab0cc3cc53b3728bb4022b89e0fe47168c18bae';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const gitFile = file => execFileSync('git', ['show', `${previousCommit}:${file}`], { maxBuffer: 64 * 1024 * 1024 });
async function projection(read, wanted, stopAt) {
  const manifest = JSON.parse(read('docs/material-input-equivalence-audit.json'));
  assert.match(manifest.payload, /^material-input-equivalence-audit[^/\\]*\.gz$/);
  const bytes = read('docs/' + manifest.payload);
  assert.equal(bytes.length, manifest.compressedBytes); assert.equal(hash(bytes), manifest.compressedSha256);
  const parser = new Parser(), result = {}; let done = false;
  parser.onValue = function(value) {
    const top = this.stack[1]?.key ?? (this.stack.length === 1 ? this.key : undefined);
    if (this.stack.length === 1) {
      if (wanted.includes(this.key)) result[this.key] = value;
      if (this.key === stopAt) done = true;
      delete this.value[this.key];
    } else if (this.value && !wanted.includes(top)) delete this.value[this.key];
  };
  for await (const chunk of Readable.from([bytes]).pipe(createGunzip())) { parser.write(chunk); if (done) break; }
  assert.ok(done, `missing ${stopAt}`);
  for (const field of wanted) assert.ok(Object.hasOwn(result, field), `missing ${field}`);
  return { manifest, ...result };
}
const fields = ['coverage', 'summary', 'sourceFingerprints', 'discrepancies'];
const before = await projection(gitFile, fields, 'discrepancies');
const after = await projection(readFileSync, fields, 'discrepancies');
assert.equal(before.manifest.compressedSha256, '39ca1c9adbc05df351e72126e126ca722214556cfe5a8da23d4be86f8af0d992');
assert.deepEqual(after.coverage, before.coverage);
assert.equal(after.coverage.executedStatic, 436); assert.equal(after.coverage.executedInteractions, 1875);
const changed = after.discrepancies.filter(row => row.attribution === ownerGapAttribution);
assert.equal(changed.length, 108); assert.equal(changed.reduce((n, row) => n + row.occurrences, 0), 6320);
const scalar = row => [row.family, row.element, row.property, row.reference, row.astylar, row.occurrences, row.cases, row.states];
assert.equal(before.discrepancies.length, 8339); assert.equal(after.discrepancies.length, 8339);
assert.ok(isDeepStrictEqual(after.discrepancies.map(scalar), before.discrepancies.map(scalar)), 'all original scalar rows unchanged');
const keys = new Set(changed.map(row => JSON.stringify(scalar(row)))); assert.equal(keys.size, 108);
const other = rows => rows.filter(row => !keys.has(JSON.stringify(scalar(row))));
assert.equal(other(after.discrepancies).length, 8231);
assert.ok(isDeepStrictEqual(other(after.discrepancies), other(before.discrepancies)), 'all unrelated complete rows unchanged');
const oldRows = new Map(before.discrepancies.map(row => [JSON.stringify(scalar(row)), row]));
for (const row of changed) {
  const old = oldRows.get(JSON.stringify(scalar(row)));
  assert.equal(old.attribution, 'unresolved'); assert.equal(row.classification, 'parity-harness-defect');
  assert.deepEqual(row.referenceAuthoredExamples, old.referenceAuthoredExamples);
  assert.deepEqual(row.astylarAuthoredExamples, old.astylarAuthoredExamples);
  for (const flag of ['inputEquivalent', 'computedCandidateVerified', 'renderingEquivalent', 'wholeElementInputEquivalent', 'usedGapVerified'])
    assert.equal(row.reviewEvidence[flag], false);
}
const remainingGaps = rows => rows.filter(row => row.attribution === 'unresolved' && ['columnGap', 'rowGap'].includes(row.property));
assert.equal(remainingGaps(before.discrepancies).length, 162);
assert.equal(remainingGaps(after.discrepancies).length, 54);
assert.equal(remainingGaps(after.discrepancies).reduce((n, row) => n + row.occurrences, 0), 2934);
const summary = structuredClone(before.summary); summary.unresolvedAttributions -= 108;
assert.deepEqual(after.summary, summary); assert.equal(after.summary.unresolvedAttributions, 2330);
assert.equal(after.summary.inputEquivalent, false);
const addedSources = [
  'tests/material-parity/owner-gap-input-evidence.mjs',
  'tests/material-parity/owner-gap-input-evidence.spec.mjs',
  'tests/material-parity/owner-gap-classification.mjs',
  'tests/material-parity/owner-gap-source-binding.mjs',
  'tests/material-parity/owner-gap-source-binding.spec.mjs',
  'tests/material-parity/owner-gap-coverage.mjs',
  'tests/material-parity/owner-gap-coverage.spec.mjs',
  'tests/material-parity/owner-gap-integration-conservation.mjs',
  'tests/material-parity/owner-gap-canonical-integration.spec.mjs',
];
const changedSources = new Set([
  'tests/material-parity/input-equivalence-audit.mjs',
  'tests/material-parity/input-equivalence-audit.spec.mjs',
  'docs/material-field-host-initial-style-audit.json',
  'tests/material-parity/button-box-sizing-canonical-integration.spec.mjs',
  'tests/material-parity/owner-grid-initial-canonical-integration.spec.mjs',
  'tests/material-parity/field-host-layout-canonical-integration.spec.mjs',
  'tests/material-parity/tooltip-wrapping-canonical-integration.spec.mjs',
]);
const oldSources = new Map(before.sourceFingerprints.map(s => [s.file, s.sha256]));
assert.equal(oldSources.size, before.sourceFingerprints.length);
assert.equal(new Set(after.sourceFingerprints.map(s => s.file)).size, after.sourceFingerprints.length);
assert.deepEqual(after.sourceFingerprints.map(s => s.file).sort(), [...oldSources.keys(), ...addedSources].sort(),
  'the integration may add only the reviewed gap sources, without dropping prior source coverage');
for (const source of after.sourceFingerprints) {
  if (oldSources.has(source.file) && !changedSources.has(source.file))
    assert.equal(source.sha256, oldSources.get(source.file), `unrelated source changed: ${source.file}`);
}
for (const source of after.sourceFingerprints)
  assert.equal(source.sha256, hash(readFileSync(source.file, 'utf8').replaceAll('\r\n', '\n')), source.file);
const retainedFields = ['buttonFixedWidthInputs', 'ownerGridInitialInputs', 'buttonBoxSizingInputs', 'fieldHostLayoutInputs'];
const previous = await projection(gitFile, retainedFields, 'fieldHostLayoutInputs');
const retained = await projection(readFileSync, [...retainedFields, 'ownerGapInputs'], 'ownerGapInputs');
for (const field of retainedFields) assert.ok(isDeepStrictEqual(retained[field], previous[field]), `${field} unchanged`);
const evidence = retained.ownerGapInputs;
assert.equal(evidence.captures.length, 2311); assert.equal(evidence.observations.length, 13876);
assert.equal(evidence.groups.length, 234);
assert.equal(evidence.observations.filter(o => !o.proof.issues.length).length, 6320);
assert.equal(evidence.observations.filter(o => o.proof.issues.length).length, 7556);
assert.deepEqual(validateOwnerGapInputs(evidence), []);
assert.deepEqual(validateOwnerGapClassifications(evidence, after.discrepancies), []);
console.log(JSON.stringify({ previousCommit, unchangedScalarRows: 8339, unchangedCompleteRows: 8231,
  unchangedCompleteRowsSha256: hash(JSON.stringify(other(after.discrepancies))),
  attributedGroups: 108, attributedObservations: 6320, remainingGapGroups: 54, remainingGapObservations: 2934,
  originalCases: 2311, completeGapObservations: 13876, retainedReviewObservations: 7556,
  compressedSha256: after.manifest.compressedSha256, unresolved: 2330, inputEquivalent: false,
  limitation: 'Saved discrepancy/summary/coverage conservation and independent original gap replay; not full no-write validation, candidate computed values or rendering equivalence.' }));
