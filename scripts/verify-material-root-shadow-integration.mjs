import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import Parser from 'jsonparse';
import { collectRootShadowInputs, validateRootShadowInputs, rootShadowAttribution } from '../tests/material-parity/root-shadow-source-binding.mjs';

const previousCommit = '502ea44a064d49cd4c273bd93dfb5d51f6adbc87';
const hash = b => createHash('sha256').update(b).digest('hex');
const gitFile = file => execFileSync('git', ['show', `${previousCommit}:${file}`], { maxBuffer: 64 * 1024 * 1024 });
async function projection(read) {
  const manifest = JSON.parse(read('docs/material-input-equivalence-audit.json'));
  assert.match(manifest.payload, /^material-input-equivalence-audit[^/\\]*\.gz$/);
  const bytes = read('docs/' + manifest.payload); assert.equal(hash(bytes), manifest.compressedSha256);
  const parser = new Parser(), result = { rows: [] }; let done = false;
  const wanted = ['discrepancies', 'summary', 'sourceFingerprints'];
  parser.onValue = function(value) {
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
assert.equal(before.manifest.compressedSha256, '14de1c5cca7afb08f6295e38c735f7053676c1375d3842b43d79c3fec07b97ab');
const scalar = r => [r.family, r.element, r.property, r.reference, r.astylar, r.occurrences, r.cases, r.states];
assert.deepEqual(after.rows.map(scalar), before.rows.map(scalar));
const changed = after.rows.filter(r => r.attribution === rootShadowAttribution); assert.equal(changed.length, 36);
assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 2311);
const keys = new Set(changed.map(r => JSON.stringify(scalar(r))));
const others = rows => rows.filter(r => !keys.has(JSON.stringify(scalar(r))));
assert.equal(others(after.rows).length, 8303);
assert.deepEqual(others(after.rows), others(before.rows), 'Unrelated complete discrepancy rows changed');
const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const evidence = collectRootShadowInputs(JSON.parse(readFileSync(parityPath)), { parityPath });
assert.deepEqual(validateRootShadowInputs(evidence), []);
assert.equal(evidence.captures.length, 2311); assert.equal(evidence.observations.length, 2311);
for (const row of changed) {
  assert.deepEqual([row.element, row.property, row.reference, row.astylar],
    [row.family + '-root', 'boxShadow', 'rgba(0,0,0,0.133) 0 2px 8px 0', '0 2px 8px rgba(0,0,0,0.14)']);
  const old = before.rows.find(r => JSON.stringify(scalar(r)) === JSON.stringify(scalar(row)));
  assert.equal(old.attribution, 'unresolved'); assert.equal(old.classification, 'parity-harness-defect');
  assert.equal(row.classification, 'application-plugin-authoring-defect');
  assert.deepEqual(row.reviewedCases, evidence.observations.filter(o => o.family === row.family).map(o => o.case));
  assert.deepEqual(row.referenceAuthoredExamples, old.referenceAuthoredExamples);
  assert.deepEqual(row.astylarAuthoredExamples, old.astylarAuthoredExamples);
  for (const flag of ['inputEquivalent', 'originalRasterCauseProven', 'candidateUsedPaintVerified', 'renderingEquivalent'])
    assert.equal(row.reviewEvidence[flag], false);
}
const expectedSummary = structuredClone(before.summary);
expectedSummary.unresolvedAttributions -= 36;
expectedSummary.classifications['parity-harness-defect'] -= 36;
expectedSummary.classifications['application-plugin-authoring-defect'] += 36;
assert.deepEqual(after.summary, expectedSummary); assert.equal(after.summary.unresolvedAttributions, 2774);
const addedSources = ['root-shadow-input-evidence.mjs', 'root-shadow-source-binding.mjs',
  'root-shadow-source-binding.spec.mjs', 'root-shadow-canonical-integration.spec.mjs'].map(f => 'tests/material-parity/' + f);
assert.equal(after.sourceFingerprints.length, 166);
assert.deepEqual(after.sourceFingerprints.filter(s => !addedSources.includes(s.file)).map(s => s.file), before.sourceFingerprints.map(s => s.file));
assert.deepEqual(after.sourceFingerprints.filter(s => !before.sourceFingerprints.some(b => b.file === s.file)).map(s => s.file), addedSources);
const changedSources = before.sourceFingerprints.filter(b => after.sourceFingerprints.find(a => a.file === b.file).sha256 !== b.sha256).map(s => s.file);
assert.deepEqual(changedSources, ['tests/material-parity/input-equivalence-audit.mjs', 'tests/material-parity/input-equivalence-audit.spec.mjs']);
for (const s of after.sourceFingerprints) assert.equal(s.sha256, hash(readFileSync(s.file, 'utf8').replaceAll('\r\n', '\n')));
console.log(JSON.stringify({ previousCommit, unchangedScalarRows: after.rows.length,
  unchangedCompleteRows: others(after.rows).length, unchangedCompleteRowsSha256: hash(JSON.stringify(others(after.rows))),
  attributedGroups: changed.length, attributedObservations: 2311, sourceBoundOwners: evidence.observations.length,
  changedSources, addedSources, compressedSha256: after.manifest.compressedSha256,
  unresolved: after.summary.unresolvedAttributions, inputEquivalent: after.summary.inputEquivalent,
  limitation: 'Complete row/source/summary conservation and independent shadow source replay; not full canonical no-write validation or candidate shadow rendering proof.' }));
