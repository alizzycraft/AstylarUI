import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import Parser from 'jsonparse';
import { collectTooltipWrappingInputs, validateTooltipWrappingInputs,
  tooltipWrappingAttribution } from '../tests/material-parity/tooltip-wrapping-source-binding.mjs';

const previousCommit = '65487aeba6a26f9715f302f92b4ee454161a94ef';
const hash = b => createHash('sha256').update(b).digest('hex');
const gitFile = file => execFileSync('git', ['show', `${previousCommit}:${file}`], { maxBuffer: 64 * 1024 * 1024 });
async function projection(read) {
  const manifest = JSON.parse(read('docs/material-input-equivalence-audit.json'));
  assert.match(manifest.payload, /^material-input-equivalence-audit[^/\\]*\.gz$/);
  const bytes = read('docs/' + manifest.payload); assert.equal(hash(bytes), manifest.compressedSha256);
  const parser = new Parser(), result = { rows: [] }; let done = false;
  const wanted = ['discrepancies', 'summary', 'sourceFingerprints'];
  parser.onValue = function (value) {
    const top = this.stack[1]?.key ?? (this.stack.length === 1 ? this.key : undefined);
    if (this.stack.length === 2 && top === 'discrepancies') { result.rows.push(value); delete this.value[this.key]; }
    else if (this.stack.length === 1) {
      if (this.key === 'discrepancies') done = true;
      else if (wanted.includes(this.key)) result[this.key] = value;
      delete this.value[this.key];
    } else if (this.value && !wanted.includes(top)) delete this.value[this.key];
  };
  for await (const chunk of Readable.from([bytes]).pipe(createGunzip())) { parser.write(chunk); if (done) break; }
  assert.ok(done); assert.equal(result.rows.length, 8339); return { manifest, ...result };
}
const before = await projection(gitFile), after = await projection(readFileSync);
assert.equal(before.manifest.compressedSha256, '41e9c7c896086ef0b50f3872e9af509b3171c9d0dac6e82f62c550bff9c264af');
const scalar = r => [r.family, r.element, r.property, r.reference, r.astylar, r.occurrences, r.cases, r.states];
assert.deepEqual(after.rows.map(scalar), before.rows.map(scalar), 'All scalar values and case/state coverage must survive');
const changed = after.rows.filter(r => r.attribution === tooltipWrappingAttribution);
assert.equal(changed.length, 2);
assert.deepEqual(changed.map(r => [r.family, r.element, r.property, r.reference, r.astylar, r.occurrences]), [
  ['tooltip', 'tooltip-popup', 'overflowWrap', 'anywhere', undefined, 18],
  ['tooltip', 'tooltip-popup', 'whiteSpace', 'normal', 'nowrap', 18]]);
const keys = new Set(changed.map(r => JSON.stringify(scalar(r))));
const others = rows => rows.filter(r => !keys.has(JSON.stringify(scalar(r))));
assert.deepEqual(others(after.rows), others(before.rows), 'Unrelated complete discrepancy rows changed');
const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const evidence = collectTooltipWrappingInputs(JSON.parse(readFileSync(parityPath)), { parityPath });
assert.deepEqual(validateTooltipWrappingInputs(evidence), []);
assert.equal(evidence.observations.length, 18);
for (const row of changed) {
  const old = before.rows.find(r => JSON.stringify(scalar(r)) === JSON.stringify(scalar(row)));
  assert.equal(old.attribution, 'unresolved'); assert.equal(old.classification, 'parity-harness-defect');
  assert.equal(row.classification, 'application-plugin-authoring-defect');
  assert.deepEqual(row.reviewedCases, evidence.observations.filter(o => o.proof.properties.some(p => p.property === row.property)).map(o => o.case));
  assert.deepEqual(row.referenceAuthoredExamples, old.referenceAuthoredExamples);
  assert.deepEqual(row.astylarAuthoredExamples, old.astylarAuthoredExamples);
  for (const flag of ['inputEquivalent', 'candidateComputedVerified', 'originalVisualSymptomCauseProven', 'finalRasterVerified'])
    assert.equal(row.reviewEvidence[flag], false);
}
const expectedSummary = structuredClone(before.summary);
expectedSummary.unresolvedAttributions -= 2;
expectedSummary.classifications['parity-harness-defect'] -= 2;
expectedSummary.classifications['application-plugin-authoring-defect'] += 2;
assert.deepEqual(after.summary, expectedSummary); assert.equal(after.summary.unresolvedAttributions, 2810);
const addedSources = ['tooltip-wrapping-input-evidence.mjs', 'tooltip-wrapping-source-binding.mjs',
  'tooltip-wrapping-source-binding.spec.mjs', 'tooltip-wrapping-canonical-integration.spec.mjs',
  'overlay-owner-declaration-review.mjs', 'generated-node-mapping-evidence.mjs'].map(f => 'tests/material-parity/' + f);
assert.equal(after.sourceFingerprints.length, 162);
assert.deepEqual(after.sourceFingerprints.filter(s => !addedSources.includes(s.file)).map(s => s.file), before.sourceFingerprints.map(s => s.file));
assert.deepEqual(after.sourceFingerprints.filter(s => !before.sourceFingerprints.some(b => b.file === s.file)).map(s => s.file), addedSources);
const changedSources = before.sourceFingerprints.filter(b => after.sourceFingerprints.find(a => a.file === b.file).sha256 !== b.sha256).map(s => s.file);
assert.deepEqual(changedSources, ['tests/material-parity/input-equivalence-audit.mjs', 'tests/material-parity/input-equivalence-audit.spec.mjs']);
for (const s of after.sourceFingerprints) assert.equal(s.sha256, hash(readFileSync(s.file, 'utf8').replaceAll('\r\n', '\n')));
console.log(JSON.stringify({ previousCommit, unchangedScalarRows: after.rows.length,
  unchangedCompleteRows: others(after.rows).length, unchangedCompleteRowsSha256: hash(JSON.stringify(others(after.rows))),
  attributedGroups: changed.length, attributedObservations: 36, sourceBoundOwners: evidence.observations.length,
  changedSources, addedSources, compressedSha256: after.manifest.compressedSha256,
  unresolved: after.summary.unresolvedAttributions, inputEquivalent: after.summary.inputEquivalent,
  limitation: 'Complete row/source/summary conservation and independent wrapping source replay. Does not replace complete canonical no-write validation or prove candidate rendering.' }));
