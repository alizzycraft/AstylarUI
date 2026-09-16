import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import Parser from 'jsonparse';
import { collectRootFlowHeightInputs, validateRootFlowHeightInputs, classifyRootFlowHeightInput,
  rootFlowHeightAttribution } from '../tests/material-parity/root-flow-height-source-binding.mjs';
import { collectButtonPillRadiusInputs, validateButtonPillRadiusInputs, classifyButtonPillRadiusInput,
  buttonPillRadiusAttribution } from '../tests/material-parity/button-pill-radius-source-binding.mjs';

const previousCommit = 'c391a6fb8002ac1d11ec8cbb2bb027d6d8fa80a3';
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
assert.equal(before.manifest.compressedSha256, '216ed2c105393ad0ddccb112f682ac672c7e7a9c9d9c1547fbe67e78c0e5698a');
const scalar = r => [r.family, r.element, r.property, r.reference, r.astylar, r.occurrences, r.cases, r.states];
assert.deepEqual(after.rows.map(scalar), before.rows.map(scalar));
const attributions = [rootFlowHeightAttribution, buttonPillRadiusAttribution];
const changed = after.rows.filter(r => attributions.includes(r.attribution)); assert.equal(changed.length, 117);
const keys = new Set(changed.map(r => JSON.stringify(scalar(r))));
const others = rows => rows.filter(r => !keys.has(JSON.stringify(scalar(r))));
assert.equal(others(after.rows).length, 8222);
assert.deepEqual(others(after.rows), others(before.rows), 'Unrelated complete discrepancy rows changed');
const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const original = JSON.parse(readFileSync(parityPath));
const flow = collectRootFlowHeightInputs(original, { parityPath });
const radius = collectButtonPillRadiusInputs(original, { parityPath });
assert.deepEqual(validateRootFlowHeightInputs(flow), []);
assert.deepEqual(validateButtonPillRadiusInputs(radius), []);
assert.equal(flow.captures.length, 164); assert.equal(flow.observations.length, 164);
assert.equal(flow.observations.filter(o => !o.proof.heightOverrides.length).length, 26);
assert.equal(radius.captures.length, 2311); assert.equal(radius.observations.length, 600);
for (const [attribution, observations, classify, count, occurrences] of [
  [rootFlowHeightAttribution, flow.observations.filter(o => o.proof.heightOverrides.length === 1), classifyRootFlowHeightInput, 9, 414],
  [buttonPillRadiusAttribution, radius.observations, classifyButtonPillRadiusInput, 108, 2400],
]) {
  const rows = changed.filter(r => r.attribution === attribution);
  assert.equal(rows.length, count); assert.equal(rows.reduce((n, r) => n + r.occurrences, 0), occurrences);
  for (const row of rows) {
    const matching = observations.filter(o => o.family === row.family && o.element === row.element &&
      o.proof.properties.some(p => p.property === row.property && p.reference === row.reference && p.candidate === row.astylar));
    assert.deepEqual(row.reviewedCases, matching.map(o => o.case));
    assert.equal(row.occurrences, matching.length);
    assert.deepEqual(row.cases, row.reviewedCases.slice(0, 12));
    assert.deepEqual(row.states, [...new Set(matching.map(o => o.state))]);
    const o = matching[0]; assert.ok(o);
    // Original proof values supply a scalar cross-check, not a replacement
    // production-normalizer claim. The integration spec exercises that path.
    const proofValues = input => Object.fromEntries(o.proof.properties.map(p =>
      [p.property, input === o.input.reference ? p.reference : p.candidate]));
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
expectedSummary.unresolvedAttributions -= 117;
expectedSummary.classifications['parity-harness-defect'] -= 117;
expectedSummary.classifications['application-plugin-authoring-defect'] += 117;
assert.deepEqual(after.summary, expectedSummary); assert.equal(after.summary.unresolvedAttributions, 2657);
const addedSources = ['root-flow-height-override-evidence.mjs', 'root-flow-height-source-binding.mjs',
  'root-flow-height-source-binding.spec.mjs', 'button-pill-radius-evidence.mjs', 'button-pill-radius-source-binding.mjs',
  'button-pill-radius-source-binding.spec.mjs', 'reviewed-authoring-canonical-integration.spec.mjs'].map(f => 'tests/material-parity/' + f);
assert.equal(after.sourceFingerprints.length, 173);
assert.deepEqual(after.sourceFingerprints.filter(s => !addedSources.includes(s.file)).map(s => s.file), before.sourceFingerprints.map(s => s.file));
assert.deepEqual(after.sourceFingerprints.filter(s => !before.sourceFingerprints.some(b => b.file === s.file)).map(s => s.file), addedSources);
const changedSources = before.sourceFingerprints.filter(b => after.sourceFingerprints.find(a => a.file === b.file).sha256 !== b.sha256).map(s => s.file);
assert.deepEqual(changedSources, ['tests/material-parity/input-equivalence-audit.mjs', 'tests/material-parity/input-equivalence-audit.spec.mjs',
  'tests/material-parity/root-shadow-canonical-integration.spec.mjs']);
for (const s of after.sourceFingerprints) assert.equal(s.sha256, hash(readFileSync(s.file, 'utf8').replaceAll('\r\n', '\n')));
console.log(JSON.stringify({ previousCommit, unchangedScalarRows: after.rows.length,
  unchangedCompleteRows: others(after.rows).length, unchangedCompleteRowsSha256: hash(JSON.stringify(others(after.rows))),
  attributedGroups: changed.length, attributedObservations: 2814,
  sourceBoundFlowOwners: flow.observations.length, sourceBoundButtonOwners: radius.observations.length,
  changedSources, addedSources, compressedSha256: after.manifest.compressedSha256,
  unresolved: after.summary.unresolvedAttributions, inputEquivalent: after.summary.inputEquivalent,
  limitation: 'Complete row/source/summary conservation and independent authoring source replay; not full canonical no-write validation or candidate used-layout/paint proof.' }));
