import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { collectCaseIndexConservation } from '../../scripts/audit-material-case-index-conservation.mjs';
import { caseIndexReceiptFiles } from '../../scripts/refresh-material-case-index-receipts.mjs';

// Authenticate the historical receipt as historical, with a separately proven
// current-source projection. Never rewrite the index or pretend its old hash
// describes today's complete module. All caller membership assertions remain.
export function assertHistoricalCaseIndexSources(file, index, { read = readFileSync } = {}) {
  assert.ok(caseIndexReceiptFiles.includes(file), 'unknown historical case index');
  const conserved = collectCaseIndexConservation({ read });
  const saved = JSON.parse(read(file));
  assert.deepEqual(index, saved, 'caller index differs from authenticated saved evidence');
  const receipt = conserved.report.reports.find(row => row.file === file);
  assert.ok(receipt);
  assert.equal(conserved.report.allNonReceiptFieldsConserved, true);
  assert.equal(conserved.report.historicalReceiptsRewritten, false);
  return { file, recordedSourceRevision: receipt.recordedSourceRevision,
    recordedSourceSha256: receipt.recordedSourceSha256, currentSourceSha256: receipt.currentSourceSha256,
    savedSha256: receipt.savedSha256, currentProjectionVerified: true,
    historicalReceiptsRewritten: false, canonicalClassificationVerified: false };
}
