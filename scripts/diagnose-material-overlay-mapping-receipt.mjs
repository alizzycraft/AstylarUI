import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectOriginalOverlayContextSurvey } from '../tests/material-parity/original-overlay-context-survey.mjs';
import { originalOverlayMappingSourceFile } from '../tests/material-parity/historical-audit-module-source.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const originalOverlayCaptureFile = 'artifacts/material-parity/original-overlay-context-current-ancestry-audit/latest-report.json';

// A counterfactual receipt refresh, not a waiver or an on-disk correction. The
// unchanged reader must first fail at the exact stale source; its complete
// historical mapping and original/fresh owner checks then run against the
// metadata-only proposal. Keep this explicit until the live harness terminates.
export function diagnoseOverlayMappingReceipt() {
  const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';
  assert.throws(() => collectOriginalOverlayContextSurvey(originalOverlayCaptureFile), error =>
    error.code === 'ERR_ASSERTION' && error.message.startsWith(`Current mapping source changed: ${moduleFile}`));
  const bytes = readFileSync(originalOverlayMappingSourceFile), original = JSON.parse(bytes);
  const proposed = structuredClone(original), changes = [];
  for (const s of proposed.sourceFingerprints) {
    const digest = hash(readFileSync(s.file, 'utf8').replaceAll('\r\n', '\n'));
    if (digest !== s.sha256) { changes.push({ file: s.file, recorded: s.sha256, current: digest }); s.sha256 = digest; }
  }
  assert.deepEqual(changes, [{ file: moduleFile,
    recorded: 'c57c725b10a0b94bf9c21ccf85e3764f47bccd9d629d004010429fd239c820c1',
    current: '252754869d5683cc76ba0784a96fc55d5c50aa8eeeb8a0441c131ec0a62eb6d4' }]);
  const data = value => { const copy = structuredClone(value); delete copy.sourceFingerprints; return copy; };
  assert.deepEqual(data(proposed), data(original));
  const proposedBytes = Buffer.from(JSON.stringify(proposed));
  const mappingPath = path.resolve(originalOverlayMappingSourceFile);
  const readWithProposal = file => path.resolve(file) === mappingPath ? proposedBytes : readFileSync(file);
  const replay = collectOriginalOverlayContextSurvey(originalOverlayCaptureFile, { readBytes: readWithProposal });
  assert.equal(replay.cases, 91); assert.equal(replay.matchedOriginalOwners, 200); assert.equal(replay.rootProperties, 17654);
  assert.equal(replay.historicalMappingSource.exactMappingDataMatch, true);
  assert.equal(hash(readFileSync(originalOverlayMappingSourceFile)), hash(bytes));
  return { replay, diagnostic: {
    kind: 'metadata-only-overlay-mapping-receipt-proposal', onDiskReaderPasses: false,
    filesWritten: false, changedReceipts: changes,
    originalMapping: { file: originalOverlayMappingSourceFile, sha256: hash(bytes) },
    proposedMappingSha256: hash(proposedBytes),
    completeNonReceiptMappingSha256: hash(JSON.stringify(data(original))),
    cases: replay.cases, originalOwners: replay.matchedOriginalOwners, rootProperties: replay.rootProperties,
    candidateReplayed: false, inputEquivalent: false, renderingEquivalent: false,
    limitation: 'The unchanged production reader still fails with on-disk metadata. Complete replay succeeds only with one explicitly proposed source receipt in memory. Historical capture/mapping bytes and every non-receipt field remain unchanged.' } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert.equal(process.argv.length, 2);
  console.log(JSON.stringify(diagnoseOverlayMappingReceipt().diagnostic));
  // Deliberately retain failure status: this is not a passing production test.
  process.exitCode = 1;
}
