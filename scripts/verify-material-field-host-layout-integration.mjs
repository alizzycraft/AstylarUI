import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import { isDeepStrictEqual } from 'node:util';
import Parser from 'jsonparse';
import { collectFullTreeInventory } from '../tests/material-parity/input-equivalence-audit.mjs';
import { validateBoundFieldHostLayout, validateFieldHostLayoutClassifications,
  fieldHostLayoutAttribution, fieldHostWidthAttribution } from '../tests/material-parity/field-host-layout-source-binding.mjs';

// Compare actual saved bytes, not the old builder executed with new dependencies.
const previousCommit = '1834d32421378fcd575d74a68689906ece11b4ff';
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
  for (const field of wanted) assert.ok(Object.hasOwn(result, field), `missing ${field}`);
  return { manifest, ...result };
}
const fields = ['coverage', 'summary', 'sourceFingerprints', 'discrepancies'];
const before = await projection(gitFile, fields, 'discrepancies');
const after = await projection(readFileSync, fields, 'discrepancies');
assert.equal(before.manifest.compressedSha256, 'dc3a0681ddbbb85b256db9b3616280d80727c33c96ee016f3cd15b0c0b91e853');
assert.deepEqual(after.coverage, before.coverage);
assert.equal(after.coverage.executedStatic, 436); assert.equal(after.coverage.executedInteractions, 1875);
const changed = after.discrepancies.filter(r => [fieldHostLayoutAttribution, fieldHostWidthAttribution].includes(r.attribution));
assert.equal(changed.length, 72); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 4616);
assert.equal(changed.filter(r => r.attribution === fieldHostLayoutAttribution).length, 54);
assert.equal(changed.filter(r => r.attribution === fieldHostWidthAttribution).length, 18);
const scalar = r => [r.family, r.element, r.property, r.reference, r.astylar, r.occurrences, r.cases, r.states];
assert.equal(before.discrepancies.length, 8339); assert.equal(after.discrepancies.length, 8339);
assert.ok(isDeepStrictEqual(after.discrepancies.map(scalar), before.discrepancies.map(scalar)), 'every original scalar row must remain unchanged');
const keys = new Set(changed.map(r => JSON.stringify(scalar(r)))); assert.equal(keys.size, 72);
const other = rows => rows.filter(r => !keys.has(JSON.stringify(scalar(r))));
assert.equal(other(after.discrepancies).length, 8267);
assert.ok(isDeepStrictEqual(other(after.discrepancies), other(before.discrepancies)), 'every unrelated complete row must remain unchanged');
const oldRows = before.discrepancies.filter(r => keys.has(JSON.stringify(scalar(r))));
assert.equal(oldRows.filter(r => r.attribution === 'unresolved').length, 48);
assert.equal(oldRows.filter(r => r.classification === 'equivalent-representation').length, 6);
assert.ok(oldRows.filter(r => r.classification === 'equivalent-representation').every(r => r.property === 'minWidth'));
assert.equal(oldRows.filter(r => r.classification === 'parity-harness-defect').length, 66);
for (const row of changed) {
  const old = oldRows.find(r => JSON.stringify(scalar(r)) === JSON.stringify(scalar(row)));
  assert.equal(row.classification, row.property === 'width' ? 'parity-harness-defect' : 'application-plugin-authoring-defect');
  assert.deepEqual(row.referenceAuthoredExamples, old.referenceAuthoredExamples);
  assert.deepEqual(row.astylarAuthoredExamples, old.astylarAuthoredExamples);
  for (const flag of ['inputEquivalent', 'computedCandidateVerified', 'rendererCauseProven', 'wholeElementInputEquivalent', 'originalRendererCauseProven'])
    assert.equal(row.reviewEvidence[flag], false);
}
const summary = structuredClone(before.summary);
summary.unresolvedAttributions -= 48;
summary.classifications['application-plugin-authoring-defect'] += 54;
summary.classifications['equivalent-representation'] -= 6;
summary.classifications['parity-harness-defect'] -= 48;
assert.deepEqual(after.summary, summary); assert.equal(after.summary.unresolvedAttributions, 2438);
assert.equal(after.summary.inputEquivalent, false);
const added = ['field-host-layout-input-evidence.mjs', 'field-host-layout-input-evidence.spec.mjs',
  'field-host-layout-source-binding.mjs', 'field-host-layout-source-binding.spec.mjs',
  'field-host-layout-canonical-integration.spec.mjs'].map(f => 'tests/material-parity/' + f);
assert.equal(after.sourceFingerprints.length, 209);
assert.deepEqual(after.sourceFingerprints.filter(s => !added.includes(s.file)).map(s => s.file), before.sourceFingerprints.map(s => s.file));
assert.deepEqual(after.sourceFingerprints.filter(s => !before.sourceFingerprints.some(b => b.file === s.file)).map(s => s.file), added);
const changedSources = before.sourceFingerprints.filter(b => after.sourceFingerprints.find(a => a.file === b.file).sha256 !== b.sha256).map(s => s.file);
assert.deepEqual([...changedSources].sort(), ['tests/material-parity/input-equivalence-audit.mjs',
  'tests/material-parity/input-equivalence-audit.spec.mjs', 'docs/material-field-host-initial-style-audit.json',
  'tests/material-parity/button-box-sizing-canonical-integration.spec.mjs',
  'tests/material-parity/owner-grid-initial-canonical-integration.spec.mjs'].sort());
for (const source of after.sourceFingerprints)
  assert.equal(source.sha256, hash(readFileSync(source.file, 'utf8').replaceAll('\r\n', '\n')), source.file);

const retainedFields = ['buttonFixedWidthInputs', 'ownerGridInitialInputs', 'buttonBoxSizingInputs'];
const previous = await projection(gitFile, retainedFields, 'buttonBoxSizingInputs');
const retained = await projection(readFileSync, [...retainedFields, 'fieldHostLayoutInputs'], 'fieldHostLayoutInputs');
for (const field of retainedFields) assert.ok(isDeepStrictEqual(retained[field], previous[field]), `${field} remains unchanged`);
const evidence = retained.fieldHostLayoutInputs;
assert.equal(evidence.captures.length, 2311); assert.equal(evidence.observations.length, 577);
assert.equal(evidence.observations.filter(o => o.proof.geometry.status === 'measured-original-static-box').length, 72);
assert.equal(evidence.observations.filter(o => o.proof.geometry.status === 'original-capture-host-geometry-gap').length, 505);
assert.deepEqual(validateBoundFieldHostLayout(evidence, { collectInventory: collectFullTreeInventory }), []);
// Only the eight selected scalar properties are consumed by this replay. The
// actual production normalizer/precedence is tested separately; all saved old/new
// scalar values above must also agree, so this cannot erase meaningful changes.
const fieldStyle = style => Object.fromEntries(Object.entries(style).map(([key, value]) => [key, value === '0px' ? '0' : value]));
assert.deepEqual(validateFieldHostLayoutClassifications(evidence, after.discrepancies, fieldStyle), []);
const markdownFile = 'docs/material-input-equivalence-audit.md';
const normalizeLocations = text => text.replaceAll('\r\n', '\n')
  .replace(/\(((?:tests|examples|src)\/[^()\r\n]+):\d+\)/g, '($1:<source-line>)');
const previousMarkdown = normalizeLocations(gitFile(markdownFile).toString('utf8'))
  .replace('2486 signatures still require', '2438 signatures still require')
  .replace('| application-plugin-authoring-defect | 805 |', '| application-plugin-authoring-defect | 859 |')
  .replace('| equivalent-representation | 2088 |', '| equivalent-representation | 2082 |')
  .replace('| parity-harness-defect | 5110 |', '| parity-harness-defect | 5062 |');
const currentMarkdown = normalizeLocations(readFileSync(markdownFile, 'utf8'));
const paragraph = 'Field-host layout requests: 577 independently source-bound hosts retain reference automatic inline-flex column composition versus candidate fixed-height block/absolute-child authoring. 54 groups receive authored-request attribution, including explicit minimum-width requests previously obscured by a generic omission shortcut; 18 width groups retain identical percentage requests at different observation stages. Static geometry and interaction measurement gaps remain separate; no candidate computed values, whole-input equivalence or original renderer cause is inferred.';
assert.deepEqual(currentMarkdown.split('\n').filter(l => l.startsWith('Field-host layout requests:')), [paragraph]);
assert.equal(currentMarkdown.split('\n').filter(l => l !== paragraph).join('\n'), previousMarkdown,
  'human report changes only the supported paragraph, classification/unresolved counts and source locations');
console.log(JSON.stringify({ previousCommit, unchangedScalarRows: 8339, unchangedCompleteRows: 8267,
  unchangedCompleteRowsSha256: hash(JSON.stringify(other(after.discrepancies))),
  attributedGroups: 72, attributedObservations: 4616, correctedEquivalenceGroups: 6,
  originalCases: 2311, originalHosts: 577, staticMeasuredObservations: 72, interactionGeometryGaps: 505,
  changedSources, addedSources: added, compressedSha256: after.manifest.compressedSha256,
  unresolved: 2438, inputEquivalent: false,
  humanReportConservedExceptSupportedParagraphCountsAndSourceLocations: true,
  limitation: 'Full discrepancy/source/summary/coverage conservation and original field-host replay; not full no-write validation, candidate computed layout, original renderer causality or rendering equivalence.' }));
