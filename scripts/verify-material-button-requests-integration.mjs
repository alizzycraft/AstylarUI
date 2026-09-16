import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import Parser from 'jsonparse';
import { collectButtonFlexInputs, validateButtonFlexInputs, classifyButtonFlexInput,
  buttonFlexAttribution } from '../tests/material-parity/button-flex-source-binding.mjs';
import { collectButtonHostRequestInputs, validateButtonHostRequestInputs, classifyButtonHostRequestInput,
  buttonHostRequestAttribution } from '../tests/material-parity/button-host-request-source-binding.mjs';

const previousCommit = '61659474f71dbf5eb02cae07243adb8fef8aec03';
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
assert.equal(before.manifest.compressedSha256, '6afd29eb890f8d2912530d5497182b9ac37749b29e9552bf119a0642c2cf3bbe');
const scalar = r => [r.family, r.element, r.property, r.reference, r.astylar, r.occurrences, r.cases, r.states];
assert.deepEqual(after.rows.map(scalar), before.rows.map(scalar));
const attributions = [buttonFlexAttribution, buttonHostRequestAttribution];
const changed = after.rows.filter(r => attributions.includes(r.attribution)); assert.equal(changed.length, 54);
const keys = new Set(changed.map(r => JSON.stringify(scalar(r))));
const others = rows => rows.filter(r => !keys.has(JSON.stringify(scalar(r))));
assert.equal(others(after.rows).length, 8285);
assert.deepEqual(others(after.rows), others(before.rows), 'Unrelated complete discrepancy rows changed');
const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const original = JSON.parse(readFileSync(parityPath));
const flex = collectButtonFlexInputs(original, { parityPath });
const host = collectButtonHostRequestInputs(original, { parityPath });
assert.deepEqual(validateButtonFlexInputs(flex), []);
assert.deepEqual(validateButtonHostRequestInputs(host), []);
for (const evidence of [flex, host]) {
  assert.equal(evidence.captures.length, 2311); assert.equal(evidence.observations.length, 600);
  assert.equal(evidence.captures.filter(c => !c.styleInputs.length).length, 1831);
}
for (const [attribution, observations, classify, count, occurrences] of [
  [buttonFlexAttribution, flex.observations, classifyButtonFlexInput, 27, 1800],
  [buttonHostRequestAttribution, host.observations, classifyButtonHostRequestInput, 27, 1800],
]) {
  const rows = changed.filter(r => r.attribution === attribution);
  assert.equal(rows.length, count); assert.equal(rows.reduce((n, r) => n + r.occurrences, 0), occurrences);
  for (const row of rows) {
    const matching = observations.filter(o => o.family === row.family && o.element === row.element &&
      o.proof.properties.some(p => p.property === row.property && p.reference === row.reference && (p.candidateLocal ?? undefined) === row.astylar));
    assert.deepEqual(row.reviewedCases, matching.map(o => o.case));
    assert.equal(row.occurrences, matching.length);
    assert.deepEqual(row.cases, row.reviewedCases.slice(0, 12));
    assert.deepEqual(row.states, [...new Set(matching.map(o => o.state))]);
    const o = matching[0]; assert.ok(o);
    // Original proof values supply a scalar cross-check, not a replacement
    // production-normalizer claim. The integration spec exercises that path.
    const proofValues = input => input;
    const classified = classify(o.input, row.property, row.reference, row.astylar, o, proofValues);
    assert.ok(classified);
    assert.equal(row.classification, classified.classification);
    assert.equal(row.recommendedOwner, classified.owner);
    assert.equal(row.justification, classified.justification);
    assert.deepEqual(row.reviewEvidence, classified.reviewEvidence);
    const old = before.rows.find(r => JSON.stringify(scalar(r)) === JSON.stringify(scalar(row)));
    assert.equal(old.attribution, 'unresolved'); assert.equal(old.classification, 'parity-harness-defect');
    assert.deepEqual(row.referenceAuthoredExamples, old.referenceAuthoredExamples);
    assert.deepEqual(row.astylarAuthoredExamples, old.astylarAuthoredExamples);
  }
}
const expectedSummary = structuredClone(before.summary);
expectedSummary.unresolvedAttributions -= 54;
expectedSummary.classifications['parity-harness-defect'] -= 54;
expectedSummary.classifications['application-plugin-authoring-defect'] += 54;
assert.deepEqual(after.summary, expectedSummary); assert.equal(after.summary.unresolvedAttributions, 2603);
const addedSources = ['button-flex-input-evidence.mjs', 'button-flex-source-binding.mjs',
  'button-flex-source-binding.spec.mjs', 'button-host-request-evidence.mjs',
  'button-host-request-source-binding.mjs', 'button-host-request-source-binding.spec.mjs',
  'button-requests-canonical-integration.spec.mjs'].map(f => 'tests/material-parity/' + f);
assert.equal(after.sourceFingerprints.length, 180);
assert.deepEqual(after.sourceFingerprints.filter(s => !addedSources.includes(s.file)).map(s => s.file), before.sourceFingerprints.map(s => s.file));
assert.deepEqual(after.sourceFingerprints.filter(s => !before.sourceFingerprints.some(b => b.file === s.file)).map(s => s.file), addedSources);
const changedSources = before.sourceFingerprints.filter(b => after.sourceFingerprints.find(a => a.file === b.file).sha256 !== b.sha256).map(s => s.file);
assert.deepEqual(changedSources, ['tests/material-parity/input-equivalence-audit.mjs', 'tests/material-parity/input-equivalence-audit.spec.mjs',
  'tests/material-parity/reviewed-authoring-canonical-integration.spec.mjs']);
for (const s of after.sourceFingerprints) assert.equal(s.sha256, hash(readFileSync(s.file, 'utf8').replaceAll('\r\n', '\n')));
console.log(JSON.stringify({ previousCommit, unchangedScalarRows: after.rows.length,
  unchangedCompleteRows: others(after.rows).length, unchangedCompleteRowsSha256: hash(JSON.stringify(others(after.rows))),
  attributedGroups: changed.length, attributedObservations: 3600,
  sourceBoundFlexOwners: flex.observations.length, sourceBoundHostOwners: host.observations.length,
  changedSources, addedSources, compressedSha256: after.manifest.compressedSha256,
  unresolved: after.summary.unresolvedAttributions, inputEquivalent: after.summary.inputEquivalent,
  limitation: 'Complete row/source/summary conservation and independent authoring source replay; not full canonical no-write validation or candidate used-layout/paint proof.' }));
