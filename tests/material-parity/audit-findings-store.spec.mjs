import assert from 'node:assert/strict';
import test from 'node:test';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { importFindings, queryFindings, verifyFindings, saveReviewProposal, loadFindingEvidence } from '../../scripts/audit-findings-store.mjs';
import { encodeMaterialInputAuditStream } from './input-audit-report-stream.mjs';

test('compact findings preserve counts, missing values and evidence links; corruption is rejected', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-findings-'));
  try {
    const row = { family: 'slider', element: 'start', property: 'left', reference: '0px', occurrences: 2,
      classification: 'unresolved', attribution: 'unresolved', cases: ['a', 'b'], reviewEvidence: { largeTree: ['original'] } };
    const audit = { schemaVersion: 3, coverage: { executedStatic: 2 },
      summary: { uniqueStyleDifferences: 1, totalStyleDifferenceOccurrences: 2, sourceFindings: 1 },
      discrepancies: [row], sourceFindings: [{ id: 'source-proof', family: 'slider', classification: 'core-defect' }],
      controlTypography: { differences: [{ family: 'slider', case: 'a', property: 'font-size' }] },
      retainedTypography: { differences: [] }, otherEvidence: { original: true } };
    const encoded = await encodeMaterialInputAuditStream(audit);
    fs.writeFileSync(path.join(root, 'material-input-equivalence-audit.json'), JSON.stringify(encoded.manifest));
    fs.writeFileSync(path.join(root, encoded.manifest.payload), encoded.payload);
    const destination = path.join(root, 'working');
    const counts = await importFindings(root, destination);
    assert.equal(counts.discrepancies, 1); assert.equal(counts.sourceFindings, 1); assert.equal(counts.controls, 1);
    assert.equal(counts.unresolved, 1); assert.equal(counts.occurrences, 2);
    assert.equal((await importFindings(root, destination)).reused, true);
    const records = queryFindings(destination, 'slider'); assert.equal(records.length, 3);
    const finding = records.find(r => r.property === 'left'); assert.equal(Object.hasOwn(finding, 'astylar'), false);
    assert.equal(Object.hasOwn(finding, 'reviewEvidence'), false); assert.deepEqual(finding.cases, row.cases);
    assert.equal(finding.evidence.sourceSha256, encoded.manifest.uncompressedSha256);
    assert.deepEqual(await loadFindingEvidence(destination, 'slider', finding.id), row);
    const generation = path.join(destination, encoded.manifest.compressedSha256);
    const index = verifyFindings(generation); assert.ok(index.sections.includes('otherEvidence'));
    assert.deepEqual(fs.readFileSync(path.join(generation, encoded.manifest.payload)), encoded.payload);
    const proposal = saveReviewProposal(destination, { groups: [finding] });
    assert.equal(JSON.parse(fs.readFileSync(proposal.file)).status, 'proposal-not-canonical');
    fs.appendFileSync(path.join(generation, index.shards[0].file), '{}\n');
    assert.throws(() => verifyFindings(generation)); assert.throws(() => queryFindings(destination, 'slider'));
    fs.writeFileSync(path.join(root, encoded.manifest.payload), 'corrupted');
    await assert.rejects(importFindings(root, destination));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
