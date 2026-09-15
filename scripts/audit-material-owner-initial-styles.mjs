import { readOwnerInitialBaseline } from '../tests/material-parity/owner-initial-style-baseline.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { inspectOwnerInitialStyle, ownerInitialValues } from '../tests/material-parity/owner-initial-style-survey.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const target = 'docs/material-owner-initial-style-survey.json';
const { manifest, rows: baselineRows } = await readOwnerInitialBaseline();
const groups = new Map();
const signature = (family, element, property, reference, astylar) => JSON.stringify([family, element, property, reference, astylar]);
for (const value of baselineRows) {
  if (value.attribution !== 'unresolved' || !Object.hasOwn(ownerInitialValues, value.property)) continue;
  const key = signature(value.family, value.element, value.property, value.reference, value.astylar);
  assert.ok(!groups.has(key));
  groups.set(key, { family: value.family, element: value.element, property: value.property,
    reference: value.reference, candidate: value.astylar ?? '<omitted>', canonicalOccurrences: value.occurrences,
    originalCases: [], reasons: {}, witnesses: {}, proofHasher: createHash('sha256') });
}
assert.equal(groups.size, 600, 'review baseline scope before changing the survey');
const capture = JSON.parse(readFileSync('docs/material-field-host-initial-style-audit.json')).capture;
const captureBytes = readFileSync(capture.file); assert.equal(hash(captureBytes), capture.sha256);
const raw = JSON.parse(captureBytes);
const entries = [...raw.results.map(e => ({ ...e, kind: 'static' })), ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
const cases = [], seen = new Set();
const scalar = (p, v) => p === 'wordSpacing' && v === '0px' ? '0' : v;
for (const entry of entries) {
  const caseKey = `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? `/${entry.state}` : ''}`;
  assert.ok(!seen.has(caseKey)); seen.add(caseKey);
  const matches = entry.styleInputs.flatMap(input => Object.keys(ownerInitialValues).flatMap(property => {
    const group = groups.get(signature(entry.family, input.id, property, scalar(property, input.reference?.[property]), scalar(property, input.astylar?.[property])));
    return group ? [{ input, property, group }] : [];
  }));
  if (!matches.length) continue;
  const trees = {};
  for (const side of ['reference', 'astylar']) {
    const descriptor = entry.inputTrees[side], file = path.resolve(descriptor.file);
    assert.ok(file.startsWith(path.resolve('artifacts/material-parity') + path.sep));
    const bytes = readFileSync(file); assert.equal(hash(bytes), descriptor.sha256);
    trees[side] = JSON.parse(bytes);
  }
  cases.push({ case: caseKey, inputTrees: entry.inputTrees });
  for (const { input, property, group } of matches) {
    assert.ok(!group.originalCases.includes(caseKey));
    const proof = inspectOwnerInitialStyle(input, property, trees.reference, trees.astylar);
    group.originalCases.push(caseKey); group.proofHasher.update(JSON.stringify({ case: caseKey, proof }) + '\n');
    const reasons = [...new Set(proof.issues.map(i => i.reason))];
    if (!reasons.length) reasons.push(proof.disposition);
    for (const reason of reasons) {
      (group.reasons[reason] ??= []).push(caseKey);
      group.witnesses[reason] ??= { case: caseKey, proof };
    }
  }
}
const rows = [...groups.values()].map(({ proofHasher, ...group }) => ({ ...group,
  originalOccurrenceCountMatchesCanonical: group.originalCases.length === group.canonicalOccurrences,
  allOriginalCasesHaveObservationStageEvidence: group.originalCases.length > 0 &&
    Object.keys(group.reasons).length === 1 && Object.hasOwn(group.reasons, 'captured-default-versus-local-omission'),
  proofSha256: proofHasher.digest('hex') }));
const sourceFiles = ['tests/material-parity/owner-initial-style-baseline.mjs', 'scripts/audit-material-owner-initial-styles.mjs', 'tests/material-parity/owner-initial-style-survey.mjs',
  'tests/material-parity/root-initial-style-evidence.mjs', 'tests/material-parity/border-initial-input-evidence.mjs'];
const result = { schemaVersion: 1, kind: 'mapped-owner-initial-style-triage', capture,
  canonicalCompressedSha256: manifest.compressedSha256,
  sourceFingerprints: sourceFiles.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
  groupCount: rows.length, caseCount: cases.length, observations: rows.reduce((n, g) => n + g.originalCases.length, 0),
  matchingOccurrenceCountGroups: rows.filter(g => g.originalOccurrenceCountMatchesCanonical).length,
  capturedObservationStageGroupsWithMatchingCount: rows.filter(g => g.originalOccurrenceCountMatchesCanonical && g.allOriginalCasesHaveObservationStageEvidence).length,
  canonicalIntegration: false, computedCandidateVerified: false, renderingEquivalent: false,
  groups: rows, cases,
  limits: ['A source-bound triage survey, not canonical attribution or accepted input/rendering equivalence.',
    'No group is qualified using only its first case. All observed cases and every remaining rejection reason are retained.',
    'Matching counts are not proof of identical canonical group membership. Raw local snapshots and canonical retained-consumer observations can select different cases; exact canonical membership must be replayed before attribution.',
    'Captured surface ancestry is not the full browser document inheritance chain; candidate computed consumers are not verified.',
    'Animation/transition declarations and unknown selectors are conservatively retained for specific review.',
    'Equal initial keywords do not prove equal wrapping, typography, visibility, hit testing or raster output.',
    'Overlay paths outside the captured main/page ancestry are deliberately not accepted by this reader.'] };
const output = JSON.stringify(result, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output, 'owner initial-style survey is stale');
else writeFileSync(target, output);
console.log(JSON.stringify(Object.fromEntries(Object.entries(result).filter(([k]) => ['groupCount', 'caseCount', 'observations', 'matchingOccurrenceCountGroups', 'capturedObservationStageGroupsWithMatchingCount', 'canonicalIntegration'].includes(k)))));
