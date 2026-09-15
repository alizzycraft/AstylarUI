import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { collectOriginalOverlayContextSurvey } from '../tests/material-parity/original-overlay-context-survey.mjs';
import { inspectOverlayOwnerDeclarations } from '../tests/material-parity/overlay-owner-declaration-review.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const mappingFile = 'docs/material-overlay-owner-mapping-survey.json';
const mappingBytes = readFileSync(mappingFile), mapping = JSON.parse(mappingBytes);
const contextFile = 'artifacts/material-parity/original-overlay-context-current-ancestry-audit/latest-report.json';
const verified = collectOriginalOverlayContextSurvey(contextFile);
const contextBytes = readFileSync(contextFile), capture = JSON.parse(contextBytes);
assert.equal(capture.mappingSurvey.sha256, hash(mappingBytes));
const byCase = new Map();
for (const descriptor of capture.results) {
  const bytes = readFileSync(descriptor.file); assert.equal(hash(bytes), descriptor.sha256);
  const record = JSON.parse(bytes), trees = {};
  for (const [side, item] of Object.entries(record.originalInputTrees)) {
    const bytes = readFileSync(item.file); assert.equal(hash(bytes), item.sha256); trees[side] = JSON.parse(bytes);
  }
  byCase.set(record.case, { record, trees });
}
const patterns = [], patternIndex = new Map(), rows = [];
let observations = 0;
for (const group of mapping.groups) {
  const variants = new Map();
  for (const key of group.cases) {
    const { record, trees } = byCase.get(key);
    const owners = record.proofs.filter(p => p.element === group.element); assert.equal(owners.length, 1);
    const proof = inspectOverlayOwnerDeclarations(group.property, owners[0].proof, trees.reference, trees.astylar);
    // One known scalar serialization only; the raw value is retained in proof.
    const raw = proof.referencePath[0].computed;
    assert.equal(group.property === 'wordSpacing' && raw === '0px' ? '0' : raw, group.reference);
    assert.deepEqual(Object.values(proof.candidatePath[0].localValues), ['<omitted>', '<omitted>', '<omitted>']);
    const bytes = JSON.stringify(proof), digest = hash(bytes);
    if (!patternIndex.has(digest)) { patternIndex.set(digest, patterns.length); patterns.push({ sha256: digest, proof }); }
    const index = patternIndex.get(digest);
    if (!variants.has(index)) variants.set(index, []); variants.get(index).push(key); observations++;
  }
  assert.equal(group.occurrences, group.cases.length);
  rows.push({ family: group.family, element: group.element, property: group.property,
    reference: group.reference, candidateLocalDeclaration: '<omitted>', occurrences: group.occurrences,
    variants: [...variants].map(([pattern, cases]) => ({ pattern, cases })) });
}
assert.equal(rows.length, 54); assert.equal(observations, 1532);
const result = { schemaVersion: 1, kind: 'overlay-owner-declaration-review',
  mapping: { file: mappingFile, sha256: hash(mappingBytes) },
  originalStateContext: { file: contextFile, sha256: hash(contextBytes), verifiedCases: verified.cases },
  groups: rows, observations, patterns,
  sourceFingerprints: ['scripts/audit-material-overlay-owner-declarations.mjs',
    'tests/material-parity/overlay-owner-declaration-review.mjs',
    'tests/material-parity/original-overlay-context-survey.mjs',
    'tests/material-parity/root-initial-style-evidence.mjs',
    'tests/material-parity/border-initial-input-evidence.mjs'].map(file => ({ file,
    sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
  canonicalAttributionChanged: false, candidateComputedVerified: false, renderingEquivalent: false };
const output = JSON.stringify(result, null, 2) + '\n', file = 'docs/material-overlay-owner-declaration-review.json';
if (process.argv.includes('--check')) assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output);
else writeFileSync(file, output);
const buckets = {};
for (const g of rows) {
  const labels = [...new Set(g.variants.map(v => {
    const p = patterns[v.pattern].proof;
    return [p.hasRelevantRequest ? 'explicit-or-possible-request' : '', p.hasMotionRequest ? 'motion-request' : ''].filter(Boolean).join('+') || 'no-captured-request';
  }))].sort().join('/');
  buckets[labels] ??= { groups: 0, observations: 0 }; buckets[labels].groups++; buckets[labels].observations += g.occurrences;
}
console.log(JSON.stringify({ groups: rows.length, observations, patterns: patterns.length, buckets, canonicalAttributionChanged: false }));
