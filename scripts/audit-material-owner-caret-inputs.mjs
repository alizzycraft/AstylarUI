import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import Parser from 'jsonparse';
import ts from 'typescript';
import { inspectOwnerCaretInput } from '../tests/material-parity/owner-caret-input-evidence.mjs';
import { bindOwnerCaretMembership } from '../tests/material-parity/owner-caret-canonical-membership.mjs';

const args = process.argv.slice(2);
assert.ok(!args.length || args.length === 1 && args[0] === '--check', 'only --check is accepted');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canonicalFiles = ['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz',
  'docs/material-input-equivalence-audit.md'];
const before = canonicalFiles.map(f => hash(readFileSync(f)));
const auditModule = 'tests/material-parity/input-equivalence-audit.mjs';
const source = readFileSync(auditModule, 'utf8');
const parsed = ts.createSourceFile(auditModule, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const normalizationNames = ['canonicalStyle', 'expandQuad', 'expandPair', 'splitCssTerms', 'normalizeValue', 'normalizeColor', 'formatNumber'];
const normalizationSource = normalizationNames.map(name => {
  const matches = parsed.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.equal(matches.length, 1); return matches[0].getText(parsed);
}).join('\n');
const canonicalStyle = new Function(normalizationSource + '\nreturn canonicalStyle;')();
const baselineRevision = '852a06d1c8958d926a4eb9a0977b7847a3b16140';
const gitFile = file => execFileSync('git', ['show', `${baselineRevision}:${file}`], { maxBuffer: 64 * 1024 * 1024 });
const manifest = JSON.parse(gitFile(canonicalFiles[0]));
assert.equal(manifest.compressedSha256, 'e875ef307997ce7e8f61783d120585f4d8536376acd6db1a1afb2b68b5809fd7');
assert.equal(manifest.payload, 'material-input-equivalence-audit.json.gz');
const payload = gitFile('docs/' + manifest.payload);
assert.equal(payload.length, manifest.compressedBytes); assert.equal(hash(payload), manifest.compressedSha256);
const parser = new Parser(), rows = []; let done = false;
parser.onValue = function(value) {
  const top = this.stack[1]?.key ?? (this.stack.length === 1 ? this.key : undefined);
  if (this.stack.length === 2 && top === 'discrepancies') {
    if (value.attribution === 'unresolved' && value.property === 'caretColor') rows.push(value);
    delete this.value[this.key];
  } else if (this.stack.length === 1) { if (this.key === 'discrepancies') done = true; delete this.value[this.key]; }
  else if (this.value && top !== 'discrepancies') delete this.value[this.key];
};
for await (const chunk of Readable.from([payload]).pipe(createGunzip())) { parser.write(chunk); if (done) break; }
assert.ok(done); assert.equal(rows.length, 145);
const key = (family, element, reference, candidate) => JSON.stringify([family, element, reference, candidate]);
const groups = new Map(rows.map(r => [key(r.family, r.element, r.reference, r.astylar), {
  family: r.family, element: r.element, property: r.property, reference: r.reference, candidate: r.astylar ?? '<omitted>',
  canonicalRowSha256: hash(JSON.stringify(r)), canonicalOccurrences: r.occurrences,
  observations: [], reasonCounts: {}, witnesses: {},
}]));
assert.equal(groups.size, rows.length);
const capture = { file: 'artifacts/material-parity/current-ancestry-audit/latest-report.json',
  sha256: 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a' };
const bytes = readFileSync(capture.file); assert.equal(hash(bytes), capture.sha256);
const raw = JSON.parse(bytes), entries = [...raw.results.map(e => ({ ...e, kind: 'static' })),
  ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
const boundary = realpathSync('artifacts/material-parity') + path.sep;
const seen = new Set(), cases = [];
for (const entry of entries) {
  const caseId = `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
  assert.ok(!seen.has(caseId)); seen.add(caseId);
  const selected = entry.styleInputs.flatMap(input => {
    const group = groups.get(key(entry.family, input.id, canonicalStyle(input.reference ?? {}).caretColor,
      canonicalStyle(input.astylar ?? {}).caretColor));
    return group ? [{ input, group }] : [];
  });
  if (!selected.length) continue;
  const trees = {};
  for (const side of ['reference', 'astylar']) {
    const descriptor = entry.inputTrees[side], file = realpathSync(descriptor.file);
    assert.ok(file.startsWith(boundary), 'caret survey tree escapes artifact boundary');
    const b = readFileSync(file); assert.equal(hash(b), descriptor.sha256); trees[side] = JSON.parse(b);
  }
  cases.push({ case: caseId, inputTrees: entry.inputTrees });
  for (const { input, group } of selected) {
    assert.ok(!group.observations.some(o => o.case === caseId));
    const proof = inspectOwnerCaretInput(input, trees.reference, trees.astylar, { family: entry.family });
    const reasons = [...new Set(proof.issues.map(i => i.reason))];
    if (!reasons.length) reasons.push(proof.disposition);
    group.observations.push({ case: caseId, inputSha256: hash(JSON.stringify(input)),
      inputTrees: entry.inputTrees, referenceRaw: input.reference.caretColor,
      referenceColorRaw: input.reference.color, candidateRaw: input.astylar.caretColor ?? '<omitted>',
      disposition: proof.disposition, reasons, proofSha256: hash(JSON.stringify(proof)) });
    for (const reason of reasons) {
      group.reasonCounts[reason] = (group.reasonCounts[reason] ?? 0) + 1;
      group.witnesses[reason] ??= { case: caseId, proof };
    }
  }
}
const findings = [...groups.values()].map(g => ({ ...g,
  originalCountMatchesCanonical: g.observations.length === g.canonicalOccurrences,
  everyObservationHasCapturedLocalOmissionEvidence: g.observations.length > 0 &&
    g.observations.every(o => o.disposition === 'captured-caret-computed-versus-local-omission') }));
const { selectedCases, ...membership } = bindOwnerCaretMembership(findings, rows, raw, canonicalStyle);
assert.deepEqual(selectedCases, cases);
membership.selectedCaseCount = selectedCases.length;
membership.selectedCasesSha256 = hash(JSON.stringify(selectedCases));
assert.equal(membership.groups, 145); assert.equal(membership.originalCasesScanned, 2311);
assert.equal(membership.observations, 4050);
const sources = ['scripts/audit-material-owner-caret-inputs.mjs', 'tests/material-parity/owner-caret-input-evidence.mjs',
  'tests/material-parity/owner-caret-canonical-membership.mjs',
  'tests/material-parity/root-initial-style-evidence.mjs', 'tests/material-parity/border-initial-input-evidence.mjs',
  'tests/material-parity/origin-alias-mapping-evidence.mjs', 'tests/material-parity/generated-node-mapping-evidence.mjs',
  auditModule, 'tests/material-parity/run-material-parity.mjs'];
const report = { schemaVersion: 1, kind: 'remaining-owner-caret-original-input-survey', baselineRevision,
  baselineCompressedSha256: manifest.compressedSha256, capture,
  productionNormalization: { module: auditModule, functions: normalizationNames, sha256: hash(normalizationSource.replaceAll('\r\n', '\n')) },
  sourceFingerprints: sources.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
  counts: { groups: findings.length, originalCases: cases.length,
    observations: findings.reduce((n, g) => n + g.observations.length, 0),
    canonicalOccurrences: findings.reduce((n, g) => n + g.canonicalOccurrences, 0),
    exactCountGroups: findings.filter(g => g.originalCountMatchesCanonical).length,
    fullyReviewedLocalOmissionGroups: findings.filter(g => g.originalCountMatchesCanonical && g.everyObservationHasCapturedLocalOmissionEvidence).length },
  groups: findings, cases, membership, canonicalIntegration: false, inputEquivalent: false,
  computedCandidateVerified: false, descendantCaretVerified: false, rendererCauseProven: false,
  limitations: ['Survey only; canonical classification and original inputs are unchanged.',
    'Exact original membership is verified separately from tree/declaration interpretation and production classification.',
    'Shared IDs and reviewed aliases establish measurement identity, not structural or input equivalence.',
    'Editable/input owners, explicit caret/reset/motion requests, unknown selectors and capture gaps require specific review.',
    'Captured surface ancestry does not establish document-external inheritance, candidate computed values, visible caret paint or renderer causality.'] };
const target = 'docs/material-owner-caret-input-survey.json', output = JSON.stringify(report, null, 2) + '\n';
if (args[0] === '--check') assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output, 'owner caret survey is stale');
else writeFileSync(target, output);
assert.deepEqual(canonicalFiles.map(f => hash(readFileSync(f))), before);
console.log(JSON.stringify({ ...report.counts, canonicalIntegration: false, canonicalUnchanged: true }));
