import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// The 91-state capture predates tooltip wrapping classification. Its source
// receipt describes the producer then, not a promise that today's audit module
// has identical bytes. Never rewrite that receipt to a current-source digest.
export const originalOverlayAuditSourceCommit = '65487aeba6a26f9715f302f92b4ee454161a94ef';
export const originalOverlayAuditSourceFile = 'tests/material-parity/input-equivalence-audit.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function verifyHistoricalAuditModuleSource(recorded, currentBytes, { root = process.cwd(),
  readRevision = () => execFileSync('git', ['show', `${originalOverlayAuditSourceCommit}:${originalOverlayAuditSourceFile}`],
    { cwd: root, maxBuffer: 4 * 1024 * 1024 }) } = {}) {
  assert.equal(recorded.file, originalOverlayAuditSourceFile);
  assert.match(recorded.sha256, /^[a-f0-9]{64}$/);
  const historicalBytes = readRevision();
  assert.equal(hash(historicalBytes), recorded.sha256, 'Historical audit-module receipt does not match committed source');
  const currentSha256 = hash(currentBytes);
  return { file: recorded.file, recordedSha256: recorded.sha256,
    historicalSourceCommit: originalOverlayAuditSourceCommit, currentSha256,
    exactCurrentSourceMatch: currentSha256 === recorded.sha256,
    scope: 'Historical source receipt only; current mapping behavior requires complete owner-proof replay and negative controls.' };
}

export const originalOverlayMappingSourceCommit = 'cab0cc3cc53b3728bb4022b89e0fe47168c18bae';
export const originalOverlayMappingSourceFile = 'docs/material-overlay-owner-mapping-survey.json';

// A historical capture binds the mapping bytes used then. A metadata refresh
// must neither overwrite that receipt nor waive changed mapping observations.
export function verifyHistoricalOverlayMappingSource(recorded, currentBytes, { root = process.cwd(),
  readRevision = () => execFileSync('git', ['show', `${originalOverlayMappingSourceCommit}:${originalOverlayMappingSourceFile}`],
    { cwd: root, maxBuffer: 8 * 1024 * 1024 }),
  readCurrentSource = file => readFileSync(path.resolve(root, file)),
} = {}) {
  assert.equal(recorded.file, originalOverlayMappingSourceFile);
  assert.match(recorded.sha256, /^[a-f0-9]{64}$/);
  const historicalBytes = readRevision();
  assert.equal(hash(historicalBytes), recorded.sha256, 'Historical overlay mapping receipt does not match committed evidence');
  const historical = JSON.parse(historicalBytes), current = JSON.parse(currentBytes);
  const data = report => {
    const copy = structuredClone(report);
    delete copy.sourceFingerprints;
    delete copy.inputSurvey.sha256;
    return copy;
  };
  assert.deepEqual(data(current), data(historical), 'Current overlay mapping data differs from the recorded historical population');
  assert.deepEqual(current.sourceFingerprints.map(s => s.file), historical.sourceFingerprints.map(s => s.file),
    'Overlay mapping source inventory changed');
  for (const source of current.sourceFingerprints) {
    assert.deepEqual(Object.keys(source).sort(), ['file', 'sha256']);
    assert.equal(hash(readCurrentSource(source.file).toString('utf8').replaceAll('\r\n', '\n')), source.sha256,
      `Current mapping source changed: ${source.file}`);
  }
  assert.equal(hash(readCurrentSource(current.inputSurvey.file)), current.inputSurvey.sha256,
    'Current mapping parent binding changed');
  return { mapping: historical, evidence: {
    file: recorded.file, recordedSha256: recorded.sha256, historicalSourceCommit: originalOverlayMappingSourceCommit,
    currentSha256: hash(currentBytes), exactCurrentSourceMatch: hash(currentBytes) === recorded.sha256,
    mappingDataSha256: hash(JSON.stringify(data(historical))), exactMappingDataMatch: true,
    inputEquivalent: false, renderingEquivalent: false,
    scope: 'Historical mapping bytes are hash-bound to committed evidence. Every current field except source fingerprints and the parent-report digest must match exactly; current sources and parent bytes are separately hash-checked. Complete original/fresh owner-proof replay remains required. This does not assert parent-report semantic or rendering equivalence.',
  } };
}
