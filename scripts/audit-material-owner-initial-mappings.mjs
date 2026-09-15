import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { inspectOwnerInitialStyle } from '../tests/material-parity/owner-initial-style-survey.mjs';
import { originalCaseKey } from '../tests/material-parity/owner-initial-style-membership.mjs';

// Independently replay membership before using its exact lists. Its generator
// verifies the canonical digest, original capture and static retained evidence.
execFileSync(process.execPath, ['scripts/audit-material-owner-initial-membership.mjs', '--check'], { encoding: 'utf8' });
const hash = b => createHash('sha256').update(b).digest('hex');
const target = 'docs/material-owner-initial-style-mappings.json';
const bindingFile = 'docs/material-owner-initial-style-membership.json';
const binding = JSON.parse(readFileSync(bindingFile));
const rawBytes = readFileSync(binding.capture.file); assert.equal(hash(rawBytes), binding.capture.sha256);
const raw = JSON.parse(rawBytes), groups = binding.groups.map(g => ({ ...g, reasons: {}, witnesses: {},
  proofHasher: createHash('sha256'), reviewedCases: [] }));
const byCase = new Map();
for (const group of groups) for (const key of group.cases) {
  if (!byCase.has(key)) byCase.set(key, []);
  byCase.get(key).push(group);
}
const entries = [...raw.results.map(e => ({ ...e, kind: 'static' })), ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
const cases = [];
for (const entry of entries) {
  const key = originalCaseKey(entry), wanted = byCase.get(key);
  if (!wanted) continue;
  const trees = {};
  for (const side of ['reference', 'astylar']) {
    const descriptor = entry.inputTrees[side], file = path.resolve(descriptor.file);
    assert.ok(file.startsWith(path.resolve('artifacts/material-parity') + path.sep));
    const bytes = readFileSync(file); assert.equal(hash(bytes), descriptor.sha256);
    trees[side] = JSON.parse(bytes);
  }
  for (const g of wanted) {
    const inputs = entry.styleInputs.filter(i => i.id === g.element); assert.equal(inputs.length, 1);
    const proof = inspectOwnerInitialStyle(inputs[0], g.property, trees.reference, trees.astylar,
      { family: entry.family, reviewedGeneratedOwners: true });
    g.reviewedCases.push(key); g.proofHasher.update(JSON.stringify({ case: key, proof }) + '\n');
    const reasons = [...new Set(proof.issues.map(i => i.reason))];
    if (!reasons.length) reasons.push(proof.disposition);
    for (const reason of reasons) {
      (g.reasons[reason] ??= []).push(key);
      g.witnesses[reason] ??= { case: key, proof };
    }
  }
  cases.push({ case: key, inputTrees: entry.inputTrees });
}
const rows = groups.map(({ proofHasher, ...g }) => {
  assert.deepEqual(g.reviewedCases, g.cases);
  return { ...g, proofSha256: proofHasher.digest('hex'),
    allCasesHaveCapturedObservationStageEvidence: Object.keys(g.reasons).length === 1 &&
      Object.hasOwn(g.reasons, 'captured-default-versus-local-omission') };
});
const files = [bindingFile, 'scripts/audit-material-owner-initial-mappings.mjs',
  'tests/material-parity/owner-initial-style-survey.mjs', 'tests/material-parity/owner-initial-style-membership.mjs',
  'tests/material-parity/input-equivalence-audit.mjs', 'tests/material-parity/root-initial-style-evidence.mjs',
  'tests/material-parity/border-initial-input-evidence.mjs'];
const result = { schemaVersion: 1, kind: 'owner-initial-style-reviewed-mapping-survey', capture: binding.capture,
  canonicalCompressedSha256: binding.canonicalCompressedSha256,
  sourceFingerprints: files.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
  groupCount: rows.length, observations: rows.reduce((n, g) => n + g.occurrences, 0),
  capturedObservationStageGroups: rows.filter(g => g.allCasesHaveCapturedObservationStageEvidence).length,
  canonicalAttributionChanged: false, computedCandidateVerified: false, renderingEquivalent: false, groups: rows, cases,
  limits: ['Only exact unresolved original membership is considered; previously reviewed static classifications are preserved.',
    'Unique data-parity aliases and existing source-reviewed template mappings establish identity, not equal structure or rendering.',
    'Ambiguous aliases, mismatched scalar types, unreviewed generated owners and non-main overlay ancestry remain explicit gaps.',
    'All inherited/used-value consumers, motion/state requests and final rendering obligations remain independent.',
    'No authored tree is rewritten or assigned a synthetic ID to force a match.'] };
const output = JSON.stringify(result, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output, 'mapped owner report is stale');
else writeFileSync(target, output);
console.log(JSON.stringify({ groups: result.groupCount, observations: result.observations,
  capturedObservationStageGroups: result.capturedObservationStageGroups, canonicalAttributionChanged: false }));
