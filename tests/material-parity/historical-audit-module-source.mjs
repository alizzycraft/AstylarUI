import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

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
