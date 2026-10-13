import assert from 'node:assert/strict';
import test from 'node:test';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { importFindings, queryFindings, verifyFindings, saveReviewProposal, loadFindingEvidence, loadCaseObligationReview, attachCaseObligationCoverage, assertCaseObligationCoverage } from '../../scripts/audit-findings-store.mjs';
import { createHash } from 'node:crypto';
import { encodeMaterialInputAuditStream } from './input-audit-report-stream.mjs';

test('case obligation integration authenticates exact scope and dependencies without acceptance claims', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const root = path.resolve('case-obligation-memory-proof');
  const bytes = Buffer.from('original evidence');
  const receipt = file => ({ file, sha256: hash(bytes) });
  const row = { case:'static:table@light/desktop',family:'table',inspection:'partial',currentRendering:'unverified',
    evidence:{report:'report.json',reportSha256:hash(bytes),
      pairedTrees:{reference:receipt('reference.json'),astylar:receipt('astylar.json')}},
    obligations:{semantics:{applicability:'applicable',disposition:'partial',evidence:receipt('report.json')}} };
  const review = { kind:'case-obligation-coverage-extension',status:'proposal-not-canonical',scope:'bounded proof',groups:[row] };
  const digest = hash(JSON.stringify(review));
  const envelope = {status:'proposal-not-canonical',sha256:digest,review};
  const files = new Map([['proposal.json',Buffer.from(JSON.stringify(envelope))],
    ...['report.json','reference.json','astylar.json'].map(file=>[file,bytes])]);
  const reads=[];
  const read = file => {const relative=path.relative(root,file);reads.push(relative);assert.ok(files.has(relative));return files.get(relative);};
  const configured=[row.case,'interaction:table@light/desktop-dpr1/hover'];
  const result=loadCaseObligationReview('proposal.json',digest,configured,{root,read});
  assert.deepEqual(result.cases,[row]);assert.deepEqual(result.unjoinedCases,[configured[1]]);
  assert.equal(result.inspectionComplete,false);assert.equal(result.currentRenderingAccepted,false);
  assert.equal(result.evidenceFingerprints.length,3);assert.equal(reads.filter(file=>file==='report.json').length,1);
  const coverage={complete:true,visualParityGreen:true,caseInventory:{static:[row.case],interaction:[configured[1]]}};
  const before=JSON.stringify(coverage);
  const attached=attachCaseObligationCoverage(coverage,'proposal.json',digest,{root,read});
  assert.equal(JSON.stringify(coverage),before);assertCaseObligationCoverage(attached);
  const stripped={...attached};delete stripped.inspectionEvidence;assert.deepEqual(stripped,coverage);
  assert.throws(()=>attachCaseObligationCoverage(attached,'proposal.json',digest,{root,read}));
  for(const mutate of [r=>r.inspectionEvidence.inspectionComplete=true,r=>r.inspectionEvidence.currentRenderingAccepted=true,
    r=>r.inspectionEvidence.unjoinedCases.pop(),r=>r.inspectionEvidence.cases[0].obligations.semantics.disposition='complete',
    r=>r.inspectionEvidence.cases[0].case='invented']){
    const forged=structuredClone(attached);mutate(forged);assert.throws(()=>assertCaseObligationCoverage(forged));
  }
  assert.throws(()=>loadCaseObligationReview('proposal.json','0'.repeat(64),configured,{root,read}));
  assert.throws(()=>loadCaseObligationReview('proposal.json',digest,[configured[1]],{root,read}));
  assert.throws(()=>loadCaseObligationReview('proposal.json',digest,[row.case,row.case],{root,read}));
  files.set('reference.json',Buffer.from('changed'));
  assert.throws(()=>loadCaseObligationReview('proposal.json',digest,configured,{root,read}));files.set('reference.json',bytes);
  for(const mutate of [r=>r.groups.push(structuredClone(r.groups[0])),r=>r.groups[0].inspection='complete',
    r=>r.groups[0].currentRendering='accepted',r=>r.groups[0].evidence.report='../outside.json',
    r=>delete r.groups[0].evidence.pairedTrees.reference]){
    const changed=structuredClone(review);mutate(changed);const changedDigest=hash(JSON.stringify(changed));
    files.set('proposal.json',Buffer.from(JSON.stringify({status:'proposal-not-canonical',sha256:changedDigest,review:changed})));
    assert.throws(()=>loadCaseObligationReview('proposal.json',changedDigest,configured,{root,read}));
  }
});

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
    const source = records.find(record => record.evidence.section === 'sourceFindings');
    assert.deepEqual(await loadFindingEvidence(destination, 'slider', [source.id, finding.id]), [audit.sourceFindings[0], row]);
    await assert.rejects(loadFindingEvidence(destination, 'slider', []));
    await assert.rejects(loadFindingEvidence(destination, 'slider', [finding.id, finding.id]));
    await assert.rejects(loadFindingEvidence(destination, 'slider', ['unknown']));
    const generation = path.join(destination, encoded.manifest.compressedSha256);
    const index = verifyFindings(generation); assert.ok(index.sections.includes('otherEvidence'));
    assert.deepEqual(fs.readFileSync(path.join(generation, encoded.manifest.payload)), encoded.payload);
    const proposal = saveReviewProposal(destination, { groups: [finding] });
    assert.equal(JSON.parse(fs.readFileSync(proposal.file)).status, 'proposal-not-canonical');
    const pointerFile = path.join(destination, 'current.json');
    const predecessor = JSON.parse(fs.readFileSync(pointerFile));
    const nextAudit = structuredClone(audit); nextAudit.discrepancies[0].attribution = 'reviewed';
    for (const family of ['list', 'grid-list']) {
      nextAudit.discrepancies.push({ ...row, family });
      nextAudit.sourceFindings.push({ family, id: `${family}-proof` });
      nextAudit.controlTypography.differences.push({ family, case: 'a', property: 'font-size' });
      nextAudit.retainedTypography.differences.push({ family, case: 'a', property: 'line-height' });
    }
    nextAudit.summary = { uniqueStyleDifferences: 3, totalStyleDifferenceOccurrences: 6, sourceFindings: 3 };
    const next = await encodeMaterialInputAuditStream(nextAudit);
    fs.writeFileSync(path.join(root, 'material-input-equivalence-audit.json'), JSON.stringify(next.manifest));
    fs.writeFileSync(path.join(root, next.manifest.payload), next.payload);
    await importFindings(root, destination);
    for (const family of ['list', 'grid-list']) {
      const exact = queryFindings(destination, family);
      assert.equal(exact.length, 4, `Exact-family query: ${family}`);
      assert.ok(exact.every(record => record.family === family));
      assert.deepEqual(exact.map(record => record.evidence.section).sort(),
        ['discrepancies', 'sourceFindings', 'controlTypography.differences', 'retainedTypography.differences'].sort());
      assert.deepEqual(queryFindings(destination, family, predecessor), []);
    }
    assert.equal(queryFindings(destination, 'slider').find(r => r.property === 'left').attribution, 'reviewed');
    assert.deepEqual(queryFindings(destination, 'slider', predecessor), records);
    assert.deepEqual(await loadFindingEvidence(destination, 'slider', finding.id, predecessor), row);
    assert.throws(() => queryFindings(destination, 'slider', { ...predecessor, indexSha256: 'forged' }));
    assert.throws(() => queryFindings(destination, 'slider', { ...predecessor, generation: '../escape' }));
    fs.writeFileSync(pointerFile, JSON.stringify(predecessor));
    fs.appendFileSync(path.join(generation, index.shards[0].file), '{}\n');
    assert.throws(() => verifyFindings(generation)); assert.throws(() => queryFindings(destination, 'slider'));
    fs.writeFileSync(path.join(root, encoded.manifest.payload), 'corrupted');
    await assert.rejects(importFindings(root, destination));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
