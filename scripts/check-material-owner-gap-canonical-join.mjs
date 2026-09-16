import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildGapJoinReport, joinOwnerGapInputs, loadGapJoinInputs } from './audit-material-owner-gap-canonical-join.mjs';

assert.equal(process.argv.length, 2);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canonicalFiles = ['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz',
  'docs/material-input-equivalence-audit.md'];
const before = canonicalFiles.map(file => hash(readFileSync(file)));
const inputs = await loadGapJoinInputs();
const report = buildGapJoinReport(inputs);
const saved = JSON.parse(readFileSync('docs/material-owner-gap-canonical-join.json')); delete saved.sourceFingerprint;
assert.deepEqual(report, saved);
assert.deepEqual(report.counts, { groups: 162, cases: 2311, observations: 9254, rawOmittedLonghandsWithPresentShorthand: 1032 });
assert.equal(report.canonicalIntegration, false); assert.equal(report.inputEquivalent, false);
for (const row of report.rows) {
  assert.equal(row.canonicalAttribution, 'unresolved');
  for (const flag of ['inputEquivalent', 'computedCandidateVerified', 'rendererCauseProven']) assert.equal(row[flag], false);
}
const mutations = [
  v => { v.survey.groups.pop(); },
  v => { v.rows.pop(); },
  v => { v.survey.groups[1] = structuredClone(v.survey.groups[0]); },
  v => { v.rows[1] = structuredClone(v.rows[0]); },
  v => { v.originalIndex.groups[1] = structuredClone(v.originalIndex.groups[0]); },
  v => { v.survey.groups[0].originalCases.pop(); },
  v => { const a = v.survey.groups[0].originalCases; [a[20], a[21]] = [a[21], a[20]]; },
  v => { v.rows[0].cases[0] = 'invented-case'; },
  v => { v.rows[0].states.push('invented-state'); },
  v => { v.rows[0].occurrences++; },
  v => { v.survey.groups[0].canonicalOccurrences++; },
  v => { v.survey.groups[0].candidate = '0'; },
  v => { v.survey.cases[0].inputTrees.reference.sha256 = '0'.repeat(64); },
  v => { v.survey.cases[1] = structuredClone(v.survey.cases[0]); },
  v => { v.originalIndex.cases.pop(); },
  v => { v.originalIndex.groups[0].observations[0].state = 'invented-state'; },
  v => { v.originalIndex.groups[0].observations[0].case = 'invented-case'; },
  v => { v.originalIndex.groups[0].observations[1] = structuredClone(v.originalIndex.groups[0].observations[0]); },
  v => { v.survey.inputEquivalent = true; },
  v => { v.survey.computedCandidateVerified = true; },
  v => { v.rows[0].attribution = 'equivalent'; },
];
for (const [index, mutation] of mutations.entries()) {
  const copy = { survey: structuredClone(inputs.survey), rows: structuredClone(inputs.rows), originalIndex: structuredClone(inputs.originalIndex) };
  mutation(copy);
  assert.throws(() => joinOwnerGapInputs(copy.survey, copy.rows, copy.originalIndex), `mutation ${index}`);
}
assert.deepEqual(canonicalFiles.map(file => hash(readFileSync(file))), before);
console.log(JSON.stringify({ ...report.counts, negativeControls: mutations.length,
  savedReportMatches: true, canonicalUnchanged: true }));
