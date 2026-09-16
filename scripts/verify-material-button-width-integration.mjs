import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import Parser from 'jsonparse';
import { collectButtonFixedWidthInputs, validateButtonFixedWidthInputs } from '../tests/material-parity/button-fixed-width-source-binding.mjs';
import { buttonFixedWidthAttribution, classifyButtonFixedWidthInput } from '../tests/material-parity/button-fixed-width-classification.mjs';
import { selectedButtonInputs } from '../tests/material-parity/button-pill-radius-evidence.mjs';

const previousCommit = '30357b9f8c7b95da668914032557c5f7416c81db';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const gitFile = file => execFileSync('git', ['show', `${previousCommit}:${file}`], { maxBuffer: 64 * 1024 * 1024 });
async function projection(read, wanted, stopAt) {
  const manifest = JSON.parse(read('docs/material-input-equivalence-audit.json'));
  assert.match(manifest.payload, /^material-input-equivalence-audit[^/\\]*\.gz$/);
  const bytes = read('docs/' + manifest.payload); assert.equal(hash(bytes), manifest.compressedSha256);
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
  assert.ok(done, `missing ${stopAt}`); return { manifest, ...result };
}
const fields = ['discrepancies', 'summary', 'sourceFingerprints'];
const before = await projection(gitFile, fields, 'discrepancies');
const after = await projection(readFileSync, fields, 'discrepancies');
assert.equal(before.manifest.compressedSha256, '54c169f55862984ab80e77ba47d8a0361c9da207f38ff061f54bb9064507b126');
assert.equal(before.discrepancies.length, 8339); assert.equal(after.discrepancies.length, 8339);
const scalar = r => [r.family, r.element, r.property, r.reference, r.astylar, r.occurrences, r.cases, r.states];
assert.deepEqual(after.discrepancies.map(scalar), before.discrepancies.map(scalar));
const changed = after.discrepancies.filter(r => r.attribution === buttonFixedWidthAttribution);
assert.equal(changed.length, 8);
assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 548);
const keys = new Set(changed.map(r => JSON.stringify(scalar(r))));
const others = rows => rows.filter(r => !keys.has(JSON.stringify(scalar(r))));
assert.equal(others(after.discrepancies).length, 8331);
assert.deepEqual(others(after.discrepancies), others(before.discrepancies), 'unrelated complete discrepancy rows changed');

const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const original = JSON.parse(readFileSync(parityPath));
const evidence = collectButtonFixedWidthInputs(original, { parityPath });
assert.deepEqual(validateButtonFixedWidthInputs(evidence), []);
assert.equal(evidence.captures.length, 2311); assert.equal(evidence.observations.length, 600);
assert.equal(evidence.captures.filter(c => !c.selectedOwners.length).length, 1831);
assert.equal(evidence.groups.length, 9);
const retained = await projection(readFileSync, ['buttonFixedWidthInputs'], 'buttonFixedWidthInputs');
assert.deepEqual(retained.buttonFixedWidthInputs, evidence, 'complete authoring ledger differs from original replay');
assert.equal(evidence.groups.find(g => g.element === 'core-primary').occurrences, 52);
assert.equal(after.discrepancies.filter(r => r.element === 'core-primary' && r.property === 'width').length, 0);
const inputs = new Map();
for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]])
  for (const entry of entries) for (const input of selectedButtonInputs(entry)) {
    const key = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    inputs.set(JSON.stringify([key, input.id]), input);
  }
for (const row of changed) {
  const matching = evidence.observations.filter(o => o.family === row.family && o.element === row.element &&
    o.proof.referenceComputedWidth === row.reference && o.proof.candidateLocalWidth === row.astylar);
  assert.deepEqual(row.reviewedCases, matching.map(o => o.case)); assert.equal(row.occurrences, matching.length);
  assert.deepEqual(row.cases, row.reviewedCases.slice(0, 12));
  assert.deepEqual(row.states, [...new Set(matching.map(o => o.state))]);
  const o = matching[0], input = inputs.get(JSON.stringify([o.case, o.element]));
  // All eight unequal groups already have the captured scalar spellings.
  // This is a source-value cross-check; the production test owns normalization.
  const classified = classifyButtonFixedWidthInput(input, 'width', row.reference, row.astylar, o, value => value);
  assert.ok(classified); assert.equal(row.classification, classified.classification);
  assert.equal(row.recommendedOwner, classified.owner); assert.equal(row.justification, classified.justification);
  assert.deepEqual(row.reviewEvidence, classified.reviewEvidence);
  const old = before.discrepancies.find(r => JSON.stringify(scalar(r)) === JSON.stringify(scalar(row)));
  assert.equal(old.attribution, 'unresolved'); assert.equal(old.classification, 'parity-harness-defect');
  assert.deepEqual(row.referenceAuthoredExamples, old.referenceAuthoredExamples);
  assert.deepEqual(row.astylarAuthoredExamples, old.astylarAuthoredExamples);
}
const summary = structuredClone(before.summary);
summary.unresolvedAttributions -= 8;
summary.classifications['parity-harness-defect'] -= 8;
summary.classifications['application-plugin-authoring-defect'] += 8;
assert.deepEqual(after.summary, summary); assert.equal(after.summary.unresolvedAttributions, 2595);
const added = ['button-fixed-width-evidence.mjs', 'button-fixed-width-evidence.spec.mjs',
  'button-fixed-width-source-binding.mjs', 'button-fixed-width-source-binding.spec.mjs',
  'button-fixed-width-classification.mjs', 'button-fixed-width-classification.spec.mjs',
  'button-fixed-width-canonical-integration.spec.mjs'].map(f => 'tests/material-parity/' + f);
assert.equal(after.sourceFingerprints.length, 187);
assert.deepEqual(after.sourceFingerprints.filter(s => !added.includes(s.file)).map(s => s.file), before.sourceFingerprints.map(s => s.file));
assert.deepEqual(after.sourceFingerprints.filter(s => !before.sourceFingerprints.some(b => b.file === s.file)).map(s => s.file), added);
const changedSources = before.sourceFingerprints.filter(b => after.sourceFingerprints.find(a => a.file === b.file).sha256 !== b.sha256).map(s => s.file);
assert.deepEqual(changedSources, ['tests/material-parity/input-equivalence-audit.mjs', 'tests/material-parity/input-equivalence-audit.spec.mjs',
  'tests/material-parity/reviewed-authoring-canonical-integration.spec.mjs', 'tests/material-parity/button-requests-canonical-integration.spec.mjs']);
for (const s of after.sourceFingerprints) assert.equal(s.sha256, hash(readFileSync(s.file, 'utf8').replaceAll('\r\n', '\n')));
console.log(JSON.stringify({ previousCommit, unchangedScalarRows: 8339, unchangedCompleteRows: 8331,
  unchangedCompleteRowsSha256: hash(JSON.stringify(others(after.discrepancies))), attributedGroups: 8,
  attributedObservations: 548, authoringGroups: 9, sourceBoundOwners: 600, scalarMatchingOwnersRetained: 52,
  changedSources, addedSources: added, compressedSha256: after.manifest.compressedSha256,
  unresolved: 2595, inputEquivalent: false,
  limitation: 'Full row/source/summary conservation and original width ledger replay, not full no-write validation or used-layout/raster proof.' }));
