import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import { isDeepStrictEqual } from 'node:util';
import Parser from 'jsonparse';
import { validateButtonBoxSizingInputs } from '../tests/material-parity/button-box-sizing-source-binding.mjs';
import { validateButtonBoxSizingClassifications } from '../tests/material-parity/button-box-sizing-coverage.mjs';
import { buttonBoxSizingAttribution } from '../tests/material-parity/button-box-sizing-classification.mjs';

// Compare the actual saved report, not a reconstruction using today's helpers.
const previousCommit = '0165f76cc0f634482aeca21dd686ad745beddfc8';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const gitFile = file => execFileSync('git', ['show', `${previousCommit}:${file}`], { maxBuffer: 64 * 1024 * 1024 });
async function projection(read, wanted, stopAt) {
  const manifest = JSON.parse(read('docs/material-input-equivalence-audit.json'));
  assert.match(manifest.payload, /^material-input-equivalence-audit[^/\\]*\.gz$/);
  const bytes = read('docs/' + manifest.payload);
  assert.equal(bytes.length, manifest.compressedBytes);
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
assert.equal(before.manifest.compressedSha256, '179a46186cb9ab0d20fa0ac241c578e64f2754614ae0e47b19d7ec683d2b4258');
const changed = after.discrepancies.filter(r => r.attribution === buttonBoxSizingAttribution);
assert.equal(changed.length, 9);
assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 600);
const scalar = r => [r.family, r.element, r.property, r.reference, r.astylar, r.occurrences, r.cases, r.states];
assert.equal(before.discrepancies.length, 8339); assert.equal(after.discrepancies.length, 8339);
assert.ok(isDeepStrictEqual(after.discrepancies.map(scalar), before.discrepancies.map(scalar)), 'all original scalar rows remain unchanged');
const keys = new Set(changed.map(r => JSON.stringify(scalar(r))));
assert.equal(keys.size, 9);
const other = rows => rows.filter(r => !keys.has(JSON.stringify(scalar(r))));
assert.equal(other(after.discrepancies).length, 8330);
assert.ok(isDeepStrictEqual(other(after.discrepancies), other(before.discrepancies)), 'all unrelated complete rows remain unchanged');
for (const row of changed) {
  const old = before.discrepancies.find(r => JSON.stringify(scalar(r)) === JSON.stringify(scalar(row)));
  assert.equal(old.attribution, 'unresolved');
  assert.equal(old.classification, 'parity-harness-defect');
  assert.equal(row.classification, 'parity-harness-defect');
  assert.deepEqual(row.referenceAuthoredExamples, old.referenceAuthoredExamples);
  assert.deepEqual(row.astylarAuthoredExamples, old.astylarAuthoredExamples);
  for (const flag of ['computedCandidateVerified', 'interactionGeometryVerified', 'fullLayoutVerified',
    'wholeElementInputEquivalent', 'widthAuthoringEquivalent', 'inputEquivalent', 'renderingEquivalent'])
    assert.equal(row.reviewEvidence[flag], false);
}
const summary = structuredClone(before.summary); summary.unresolvedAttributions -= 9;
assert.deepEqual(after.summary, summary); assert.equal(after.summary.unresolvedAttributions, 2486);
assert.equal(after.summary.inputEquivalent, false);
const added = ['button-box-sizing-input-evidence.mjs', 'button-box-sizing-input-evidence.spec.mjs',
  'button-box-sizing-source-binding.mjs', 'button-box-sizing-source-binding.spec.mjs',
  'button-box-sizing-classification.mjs', 'button-box-sizing-classification.spec.mjs',
  'button-box-sizing-coverage.mjs', 'button-box-sizing-canonical-integration.spec.mjs']
  .map(f => 'tests/material-parity/' + f);
assert.equal(after.sourceFingerprints.length, 204);
assert.deepEqual(after.sourceFingerprints.filter(s => !added.includes(s.file)).map(s => s.file), before.sourceFingerprints.map(s => s.file));
assert.deepEqual(after.sourceFingerprints.filter(s => !before.sourceFingerprints.some(b => b.file === s.file)).map(s => s.file), added);
const changedSources = before.sourceFingerprints.filter(b => after.sourceFingerprints.find(a => a.file === b.file).sha256 !== b.sha256).map(s => s.file);
const allowedChanges = ['tests/material-parity/input-equivalence-audit.mjs',
  'tests/material-parity/input-equivalence-audit.spec.mjs', 'docs/material-field-host-initial-style-audit.json',
  'tests/material-parity/button-fixed-width-canonical-integration.spec.mjs',
  'tests/material-parity/button-requests-canonical-integration.spec.mjs',
  'tests/material-parity/owner-grid-initial-canonical-integration.spec.mjs',
  'tests/material-parity/reviewed-authoring-canonical-integration.spec.mjs'];
assert.deepEqual([...changedSources].sort(), allowedChanges.sort());
for (const s of after.sourceFingerprints)
  assert.equal(s.sha256, hash(readFileSync(s.file, 'utf8').replaceAll('\r\n', '\n')), s.file);

const retainedFields = ['buttonFixedWidthInputs', 'ownerGridInitialInputs'];
const retained = await projection(readFileSync, [...retainedFields, 'buttonBoxSizingInputs'], 'buttonBoxSizingInputs');
const previous = await projection(gitFile, retainedFields, 'ownerGridInitialInputs');
for (const field of retainedFields)
  assert.ok(isDeepStrictEqual(retained[field], previous[field]), `${field} remains unchanged`);
const evidence = retained.buttonBoxSizingInputs;
assert.equal(evidence.captures.length, 2311); assert.equal(evidence.observations.length, 600);
assert.equal(evidence.observations.filter(o => o.proof.observedDeclaredBorderBox).length, 108);
assert.equal(evidence.observations.filter(o => !o.proof.observedDeclaredBorderBox).length, 492);
assert.deepEqual(validateButtonBoxSizingInputs(evidence), []);
assert.deepEqual(validateButtonBoxSizingClassifications(evidence, after.discrepancies), []);
const markdownFile = 'docs/material-input-equivalence-audit.md';
const normalizeLocations = text => text.replaceAll('\r\n', '\n')
  .replace(/\(((?:tests|examples|src)\/[^()\r\n]+):\d+\)/g, '($1:<source-line>)');
const previousMarkdown = normalizeLocations(gitFile(markdownFile).toString('utf8'))
  .replace('2495 signatures still require', '2486 signatures still require');
const currentMarkdown = normalizeLocations(readFileSync(markdownFile, 'utf8'));
const paragraph = 'Button box-sizing observation stages: 600 independently source-bound owners retain browser border-box and omitted candidate local declarations, with 108 measured static cases and 492 original interaction geometry gaps. 9 groups receive bounded observation-stage attribution. No candidate computed default, full layout, interaction geometry or rendering equivalence is inferred; fixed-width authoring remains independently unequal.';
assert.deepEqual(currentMarkdown.split('\n').filter(l => l.startsWith('Button box-sizing observation stages:')), [paragraph]);
assert.equal(currentMarkdown.split('\n').filter(l => l !== paragraph).join('\n'), previousMarkdown,
  'human report changes only the supported paragraph, unresolved count and source line locations');
console.log(JSON.stringify({ previousCommit, unchangedScalarRows: 8339, unchangedCompleteRows: 8330,
  unchangedCompleteRowsSha256: hash(JSON.stringify(other(after.discrepancies))),
  attributedGroups: 9, attributedObservations: 600, originalCases: 2311,
  staticMeasuredObservations: 108, interactionGeometryGaps: 492, changedSources, addedSources: added,
  compressedSha256: after.manifest.compressedSha256, unresolved: 2486, inputEquivalent: false,
  humanReportConservedExceptSupportedParagraphCountAndSourceLocations: true,
  limitation: 'Full discrepancy/source/summary conservation and original box-sizing ledger replay; not full no-write validation, candidate computed layout or rendering equivalence.' }));
