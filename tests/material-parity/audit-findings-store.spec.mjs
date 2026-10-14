import assert from 'node:assert/strict';
import test from 'node:test';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { importFindings, queryFindings, verifyFindings, saveReviewProposal, loadFindingEvidence, loadCaseObligationReview, attachCaseObligationCoverage, assertCaseObligationCoverage, caseInspectionObligations, describeCaseInspectionCoverage } from '../../scripts/audit-findings-store.mjs';
import { createHash } from 'node:crypto';
import { encodeMaterialInputAuditStream } from './input-audit-report-stream.mjs';
import { withAuditEvidenceSession, auditReadFileSync } from './audit-evidence-session.mjs';
import { withAuditScratch } from './audit-scratch.mjs';

test('versioned case inspection closure requires every obligation and never accepts current rendering', () => {
  // Synthetic schema proof only: these labels do not promote a real audit case.
  const hash = value => createHash('sha256').update(value).digest('hex');
  const root = path.resolve('case-closure-memory-proof'), bytes = Buffer.from('synthetic requirement review');
  const receipt = file => ({ file, sha256: hash(bytes) });
  const row = { case: 'static:divider@light/desktop', family: 'divider', inspection: 'complete', currentRendering: 'unverified',
    evidence: { report: 'report.json', reportSha256: hash(bytes), pairedTrees: { reference: receipt('reference.json'), astylar: receipt('astylar.json') } },
    inspectionClosure: { outcome: 'inspected-failure', conclusion: 'Synthetic reviewed failure, not a rendering pass.', review: receipt('review.json'),
      findings: [{ id: 'synthetic-core-failure', classification: 'confirmed-core-defect', outcome: 'failure', owner: 'layout',
        firstDivergence: 'Synthetic CSS used-height stage.', conclusion: 'Synthetic first divergence and owning proof.',
        evidence: receipt('proof.json'), publicReproduction: receipt('proof.json') }] },
    obligations: Object.fromEntries(caseInspectionObligations.map(name => [name,
      { applicability: 'applicable', disposition: 'inspected', conclusion: 'Synthetic requirement reviewed.', evidence: receipt('proof.json'), remaining: [] }])) };
  const review = { kind: 'case-obligation-coverage-extension', status: 'proposal-not-canonical', inspectionSchemaVersion: 2, scope: 'synthetic closure proof', groups: [row] };
  const files = new Map(['report.json', 'reference.json', 'astylar.json', 'review.json', 'proof.json'].map(file => [file, bytes]));
  const load = (value, configured = [row.case]) => {
    const sha = hash(JSON.stringify(value));
    files.set('proposal.json', Buffer.from(JSON.stringify({ status: 'proposal-not-canonical', sha256: sha, review: value })));
    return attachCaseObligationCoverage({ caseInventory: { static: configured, interaction: [] } }, 'proposal.json', sha,
      { root, read: file => { const key = path.relative(root, file); assert.ok(files.has(key)); return files.get(key); } });
  };
  const failed = load(review);
  assert.equal(failed.inspectionEvidence.schemaVersion, 2);
  assert.equal(failed.inspectionEvidence.inspectionComplete, true);
  assert.equal(failed.inspectionEvidence.currentRenderingAccepted, false);
  assertCaseObligationCoverage(failed);
  assert.match(describeCaseInspectionCoverage(failed), /1 complete \(0 inspected-pass, 1 inspected-failure\); 0 partial; 0 unjoined/);
  assert.match(describeCaseInspectionCoverage(failed), /Current rendering acceptance remains unverified/);
  assert.equal(load(review, [row.case, 'static:divider@dark/desktop']).inspectionEvidence.inspectionComplete, false);
  const passed = structuredClone(review); passed.groups[0].inspectionClosure.outcome = 'inspected-pass'; passed.groups[0].inspectionClosure.findings = [];
  assert.equal(load(passed).inspectionEvidence.currentRenderingAccepted, false);
  assert.match(describeCaseInspectionCoverage(load(passed)), /1 inspected-pass, 0 inspected-failure/);
  const equivalent = structuredClone(passed);
  equivalent.groups[0].inspectionClosure.findings = [{ id: 'synthetic-equivalence', classification: 'equivalent-representation',
    outcome: 'equivalent', owner: 'cascade', firstDivergence: 'No divergence: synthetic equivalent serialization.',
    conclusion: 'Synthetic technical equivalence explanation.', evidence: receipt('proof.json') }];
  assert.equal(load(equivalent).inspectionEvidence.inspectionComplete, true);
  const excluded = structuredClone(review);
  Object.assign(excluded.groups[0].obligations.authoredActivation, { applicability: 'not-applicable', disposition: 'inspected-authored-exclusion' });
  assert.equal(load(excluded).inspectionEvidence.inspectionComplete, true);
  for (const mutate of [
    r => delete r.groups[0].obligations.localPaint,
    r => { r.groups[0].obligations.localPaint.disposition = 'partial'; },
    r => { r.groups[0].obligations.localPaint.remaining = ['uninspected edge']; },
    r => { r.groups[0].obligations.localPaint.applicability = 'unverified'; },
    r => delete r.groups[0].obligations.localPaint.evidence,
    r => { r.groups[0].obligations.localPaint.conclusion = ' '; },
    r => { r.groups[0].obligations.keyboardInteraction = { applicability: 'applicable', disposition: 'partial' }; },
    r => { r.groups[0].inspectionClosure.findings = []; },
    r => { r.groups[0].inspectionClosure.findings[0].classification = 'unexplained'; },
    r => delete r.groups[0].inspectionClosure.findings[0].evidence,
    r => delete r.groups[0].inspectionClosure.findings[0].publicReproduction,
    r => delete r.groups[0].inspectionClosure.findings[0].owner,
    r => { r.groups[0].inspectionClosure.findings[0].firstDivergence = ''; },
    r => { r.groups[0].inspectionClosure.findings[0].outcome = 'equivalent'; },
    r => delete r.groups[0].inspectionClosure.review,
    r => { r.groups[0].currentRendering = 'accepted'; },
    r => { r.inspectionSchemaVersion = 1; },
  ]) { const changed = structuredClone(review); mutate(changed); assert.throws(() => load(changed)); }
  for (const mutate of [
    r => { r.inspectionEvidence.inspectionComplete = false; },
    r => { r.inspectionEvidence.currentRenderingAccepted = true; },
    r => { r.inspectionEvidence.evidenceFingerprints = r.inspectionEvidence.evidenceFingerprints.filter(x => x.file !== 'proof.json'); },
  ]) { const changed = structuredClone(failed); mutate(changed); assert.throws(() => assertCaseObligationCoverage(changed)); }
  files.set('proof.json', Buffer.from('changed review dependency'));
  assert.throws(() => load(review));
});

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
  assert.equal(describeCaseInspectionCoverage(attached), 'Case-obligation evidence: 1 exact cases have partial evidence joins; 1 configured cases are not yet joined. Matrix completeness is not full inspection closure. Current rendering acceptance and full inspection completion are not certified by these records.');
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
  withAuditScratch('case-coverage-session-',scratch=>{
    for(const file of ['report.json','reference.json','astylar.json'])fs.writeFileSync(path.join(scratch,file),bytes);
    fs.writeFileSync(path.join(scratch,'proposal.json'),JSON.stringify(envelope));
    let metrics;
    const tracked=withAuditEvidenceSession(()=>attachCaseObligationCoverage(coverage,'proposal.json',digest,
      {root:scratch,read:auditReadFileSync}),{root:scratch,cold:true,onMetrics:value=>{metrics=value;}});
    assert.deepEqual(tracked.inspectionEvidence,result);
    assert.equal(metrics.filesRead,4);assert.ok(metrics.verificationBytes>0);assert.equal(metrics.collectors,0);
    assert.throws(()=>withAuditEvidenceSession(()=>{
      loadCaseObligationReview('proposal.json',digest,configured,{root:scratch,read:auditReadFileSync});
      fs.writeFileSync(path.join(scratch,'reference.json'),'changed after read');
    },{root:scratch,cold:true}),/Evidence changed during run/);
  });
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
