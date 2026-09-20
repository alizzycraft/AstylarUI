import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import Parser from 'jsonparse';
import ts from 'typescript';
import { readGapSurveySource, bindGapSurveyNormalizer } from '../tests/material-parity/gap-survey-source-replay.mjs';
import { inspectOwnerGapInput, ownerGapProperties } from '../tests/material-parity/owner-gap-input-evidence.mjs';

const args = process.argv.slice(2);
assert.ok(args.length === 0 || args.length === 1 && args[0] === '--check', 'only --check is accepted');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
// Replay the historical survey with its exact production normalizer, and
// independently check current gap outputs before retaining any historical join.
const auditModule = 'tests/material-parity/input-equivalence-audit.mjs';
const auditDescriptor = { file: auditModule, sha256: '82854bccdaa6ff23fc5f9df987f6ec5cf3e22d0da5dbe64357109d5a03035f3b' };
const auditSource = readGapSurveySource(auditDescriptor);
const parsedAudit = ts.createSourceFile(auditModule, auditSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const normalizationNames = ['canonicalStyle', 'expandQuad', 'expandPair', 'splitCssTerms', 'normalizeValue', 'normalizeColor', 'formatNumber'];
const normalizationSource = normalizationNames.map(name => {
  const matches = parsedAudit.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.equal(matches.length, 1, `missing/ambiguous production ${name}`);
  return matches[0].getText(parsedAudit);
}).join('\n');
const canonicalStyle = bindGapSurveyNormalizer({ sourceFingerprints: [auditDescriptor],
  productionNormalization: { module: auditModule, functions: normalizationNames,
    sha256: hash(normalizationSource.replaceAll('\r\n', '\n')) } });
const baselineRevision = '2408285b0a3cff2a6366825bb9dee214758bf91d';
const gitFile = file => execFileSync('git', ['show', `${baselineRevision}:${file}`], { maxBuffer: 64 * 1024 * 1024 });
const manifest = JSON.parse(gitFile('docs/material-input-equivalence-audit.json'));
assert.equal(manifest.compressedSha256, '39ca1c9adbc05df351e72126e126ca722214556cfe5a8da23d4be86f8af0d992');
assert.match(manifest.payload, /^material-input-equivalence-audit[^/\\]*\.gz$/);
const payload = gitFile('docs/' + manifest.payload);
assert.equal(payload.length, manifest.compressedBytes); assert.equal(hash(payload), manifest.compressedSha256);
const parser = new Parser(), rows = []; let done = false;
parser.onValue = function(value) {
  const top = this.stack[1]?.key ?? (this.stack.length === 1 ? this.key : undefined);
  if (this.stack.length === 2 && top === 'discrepancies') {
    if (value.attribution === 'unresolved' && ownerGapProperties.includes(value.property)) rows.push(value);
    delete this.value[this.key];
  } else if (this.stack.length === 1) { if (this.key === 'discrepancies') done = true; delete this.value[this.key]; }
  else if (this.value && top !== 'discrepancies') delete this.value[this.key];
};
for await (const chunk of Readable.from([payload]).pipe(createGunzip())) { parser.write(chunk); if (done) break; }
assert.ok(done); assert.equal(rows.length, 162);
const key = (family, element, property, reference, candidate) => JSON.stringify([family, element, property, reference, candidate]);
const groups = new Map(rows.map(r => [key(r.family, r.element, r.property, r.reference, r.astylar), {
  family: r.family, element: r.element, property: r.property, reference: r.reference, candidate: r.astylar ?? '<omitted>',
  canonicalOccurrences: r.occurrences, originalCases: [], reasons: {}, witnesses: {}, proofHasher: createHash('sha256'),
}]));
assert.equal(groups.size, rows.length);
const capture = { file: 'artifacts/material-parity/current-ancestry-audit/latest-report.json',
  sha256: 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a' };
const captureBytes = readFileSync(capture.file); assert.equal(hash(captureBytes), capture.sha256);
const raw = JSON.parse(captureBytes), cases = [], seen = new Set();
const entries = [...raw.results.map(e => ({ ...e, kind: 'static' })), ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
const boundary = realpathSync('artifacts/material-parity') + path.sep;
for (const e of entries) {
  const caseKey = `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
  assert.ok(!seen.has(caseKey)); seen.add(caseKey);
  const matches = e.styleInputs.flatMap(input => ownerGapProperties.flatMap(property => {
    const group = groups.get(key(e.family, input.id, property, canonicalStyle(input.reference ?? {})[property], canonicalStyle(input.astylar ?? {})[property]));
    return group ? [{ input, property, group }] : [];
  }));
  if (!matches.length) continue;
  const trees = {};
  for (const side of ['reference', 'astylar']) {
    const descriptor = e.inputTrees[side], file = realpathSync(descriptor.file);
    assert.ok(file.startsWith(boundary), 'capture tree escapes artifact boundary');
    const bytes = readFileSync(file); assert.equal(hash(bytes), descriptor.sha256);
    trees[side] = JSON.parse(bytes);
  }
  cases.push({ case: caseKey, inputTrees: e.inputTrees });
  for (const { input, property, group } of matches) {
    assert.ok(!group.originalCases.includes(caseKey));
    const proof = inspectOwnerGapInput(input, property, trees.reference, trees.astylar, { family: e.family });
    group.originalCases.push(caseKey); group.proofHasher.update(JSON.stringify({ case: caseKey, proof }) + '\n');
    const reasons = [...new Set(proof.issues.map(i => i.reason))];
    if (!reasons.length) reasons.push(proof.disposition);
    for (const reason of reasons) {
      (group.reasons[reason] ??= []).push(caseKey); group.witnesses[reason] ??= { case: caseKey, proof };
    }
  }
}
const findings = [...groups.values()].map(({ proofHasher, ...g }) => ({ ...g,
  originalCountMatchesCanonical: g.originalCases.length === g.canonicalOccurrences,
  allOriginalCasesHaveLocalOmissionEvidence: g.originalCases.length > 0 &&
    Object.keys(g.reasons).length === 1 && Object.hasOwn(g.reasons, 'captured-normal-versus-local-omission'),
  proofSha256: proofHasher.digest('hex') }));
const sources = ['scripts/audit-material-owner-gap-inputs.mjs', 'tests/material-parity/owner-gap-input-evidence.mjs',
  'tests/material-parity/root-initial-style-evidence.mjs', 'tests/material-parity/border-initial-input-evidence.mjs', auditModule,
  'tests/material-parity/origin-alias-mapping-evidence.mjs', 'tests/material-parity/generated-node-mapping-evidence.mjs',
  'tests/material-parity/run-material-parity.mjs'];
const result = { schemaVersion: 1, kind: 'owner-gap-local-input-survey', baselineRevision,
  baselineCompressedSha256: manifest.compressedSha256, capture,
  productionNormalization: { module: auditModule, functions: normalizationNames, sha256: hash(normalizationSource.replaceAll('\r\n', '\n')) },
  sourceFingerprints: sources.map(file => ({ file, sha256: hash((file === auditModule
    ? auditSource : readFileSync(file, 'utf8')).replaceAll('\r\n', '\n')) })),
  groupCount: findings.length, originalCaseCount: cases.length,
  canonicalOccurrences: findings.reduce((n, g) => n + g.canonicalOccurrences, 0),
  observations: findings.reduce((n, g) => n + g.originalCases.length, 0),
  exactCountGroups: findings.filter(g => g.originalCountMatchesCanonical).length,
  localOmissionGroupsWithMatchingCount: findings.filter(g => g.originalCountMatchesCanonical && g.allOriginalCasesHaveLocalOmissionEvidence).length,
  canonicalIntegration: false, inputEquivalent: false, computedCandidateVerified: false, renderingEquivalent: false,
  groups: findings, cases,
  limits: ['Survey only; the canonical classifications and their raw values are unchanged.',
    'Every selected original case is reviewed; aggregate count agreement alone does not prove exact canonical membership.',
    'Unique shared IDs, captured aliases and existing component-owner proofs map diagnostic owners, not equivalent formatting structure or child composition.',
    'Generated-owner proofs validate all 89 original reference scalar fields and all three candidate stages; scalar authored-rule gaps remain explicit.',
    'Explicit shorthand/longhand/reset/motion declarations, unknown selectors and incomplete mappings remain review cases.',
    'The local inspection neither invents candidate computed defaults nor proves used gaps or renderer causality.'] };
const target = 'docs/material-owner-gap-input-survey.json';
const output = JSON.stringify(result, null, 2) + '\n';
if (args[0] === '--check') assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output, 'owner gap survey is stale');
else writeFileSync(target, output);
console.log(JSON.stringify(Object.fromEntries(Object.entries(result).filter(([k]) => ['groupCount', 'originalCaseCount', 'canonicalOccurrences', 'observations', 'exactCountGroups', 'localOmissionGroupsWithMatchingCount', 'canonicalIntegration'].includes(k)))));
