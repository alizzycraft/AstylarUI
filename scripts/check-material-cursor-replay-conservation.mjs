import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { collectExplicitCursors } from './audit-material-explicit-cursors.mjs';
import { verifyAlignmentAuditProjection, verifyAlignmentCollectorProjection } from '../tests/material-parity/alignment-survey-conservation.mjs';
import { validateCursorEvidence, cursorArtifactRoot } from '../tests/material-parity/public-cursor-defaults-evidence.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const lf = value => value.toString().replaceAll('\r\n', '\n');
const historical = file => execFileSync('git', ['show', `67db724e5f258c84cfdc70e9da2ccb6ee6353ad0:${file}`], { maxBuffer: 8 * 1024 * 1024 });
const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';
const helper = 'scripts/audit-material-vertical-align-population.mjs';
verifyAlignmentAuditProjection(historical(moduleFile), readFileSync(moduleFile));
verifyAlignmentCollectorProjection('docs/material-vertical-align-population.json', historical(helper), readFileSync(helper));
const saved = JSON.parse(readFileSync('docs/material-explicit-cursor-inputs.json'));
const replay = collectExplicitCursors(), sourceChanges = [];
for (const file of [moduleFile, helper]) {
  const before = saved.sourceFingerprints.find(row => row.file === file);
  const after = replay.sourceFingerprints.find(row => row.file === file);
  assert.equal(hash(lf(historical(file))), before.sha256);
  sourceChanges.push({ file, historical: before.sha256, current: after.sha256 });
  after.sha256 = before.sha256;
}
assert.ok(isDeepStrictEqual(replay, saved), 'cursor census differs beyond authenticated source projections');

const publicSaved = JSON.parse(readFileSync('docs/material-public-cursor-defaults-audit.json'));
const publicReplay = validateCursorEvidence(JSON.parse(readFileSync(`${cursorArtifactRoot}/latest-report.json`)));
const lineEndingChanges = [];
assert.equal(publicSaved.sourceProof.witnesses.length, 4);
for (const before of publicSaved.sourceProof.witnesses) {
  const originals = publicReplay.sourceProof.witnesses.filter(row => row.file === before.file);
  assert.equal(originals.length, 1);
  const after = originals[0], current = readFileSync(before.file);
  const frozen = readFileSync(`D:/dev/github/AstylarUI-material/${before.file}`);
  assert.equal(hash(frozen), before.sha256, 'saved raw bytes unavailable');
  assert.equal(hash(current), after.sha256);
  assert.equal(lf(frozen), lf(current), 'source changed beyond CRLF/LF encoding');
  lineEndingChanges.push({ file: before.file, historical: before.sha256, current: after.sha256,
    lfSha256: hash(lf(current)) });
  after.sha256 = before.sha256;
}
assert.ok(isDeepStrictEqual(publicReplay, publicSaved), 'public cursor evidence changed beyond four raw source hashes');
console.log(JSON.stringify({ census: { groups: replay.groupCount, observations: replay.observations, sourceChanges },
  publicProof: { cases: publicReplay.cases, boundaries: publicReplay.boundaries,
    screenshots: publicReplay.screenshots, lineEndingChanges },
  allOtherEvidenceConserved: true, savedReportsRewritten: false,
  canonicalAttributionChanged: false, originalMaterialCursorCauseProven: false }, null, 2));
