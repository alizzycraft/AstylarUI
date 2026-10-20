import assert from 'node:assert/strict';
import test from 'node:test';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { importFindings, queryFindings, verifyFindings, saveReviewProposal, loadFindingEvidence, loadCaseObligationReview, attachCaseObligationCoverage, assertCaseObligationCoverage, caseInspectionObligations, describeCaseInspectionCoverage } from '../../scripts/audit-findings-store.mjs';
import { createTextBackingReviewReader, textBackingRetainedReview, createDividerReviewedBoundariesReader, dividerReviewedBoundariesReview, inactiveParagraphInputsReview, filledFieldStructureReview, chipPaintReview, chipGraphicReview } from './text-backing-case-review-source.mjs';

test('reviewed divider boundary reader validates exact queued cases and rejects source drift',()=>{
  const root=process.cwd(),file=`artifacts/material-parity/working-audit/proposals/${dividerReviewedBoundariesReview}.json`;
  const review=JSON.parse(fs.readFileSync(file)).review;
  const options={root,read:fs.readFileSync,reviewSha256:dividerReviewedBoundariesReview};
  const reader=createDividerReviewedBoundariesReader(options);
  assert.equal(reader.sourceApplicability.transitions.length,5);
  const result=loadCaseObligationReview(file,dividerReviewedBoundariesReview,review.groups.map(g=>g.case),{root,read:reader.read});
  assert.equal(result.cases.length,2311);
  assert.equal(result.currentRenderingAccepted,false);assert.equal(result.inspectionComplete,false);
  for(const transition of reader.sourceApplicability.transitions){
    const absolute=path.resolve(root,transition.logicalFile);
    assert.equal(createHash('sha256').update(reader.read(absolute)).digest('hex'),transition.historicalSha256);
    assert.throws(()=>createDividerReviewedBoundariesReader({...options,
      read(name,...args){const value=fs.readFileSync(name,...args);return path.resolve(name)===absolute?value.toString()+'\n// drift':value;}}));
  }
  assert.throws(()=>createDividerReviewedBoundariesReader({...options,reviewSha256:'0'.repeat(64)}));
  assert.throws(()=>createDividerReviewedBoundariesReader({...options,read(name,...args){
    const value=fs.readFileSync(name,...args);return name.endsWith('join-material-divider-paint-boundaries.mjs')?value+'\n// drift':value;
  }}));
  let drift=false;
  const tracked=createDividerReviewedBoundariesReader({...options,read(name,...args){
    const value=fs.readFileSync(name,...args);return drift&&name.endsWith('alignment-crop-provenance.spec.mjs')?value.toString()+'\n// drift':value;
  }});
  drift=true;assert.throws(()=>tracked.read(path.resolve(root,'tests/material-parity/alignment-crop-provenance.spec.mjs')));
  const descendantFile=`artifacts/material-parity/working-audit/proposals/${inactiveParagraphInputsReview}.json`;
  const descendant=JSON.parse(fs.readFileSync(descendantFile)).review;
  const descendantReader=createDividerReviewedBoundariesReader({...options,reviewSha256:inactiveParagraphInputsReview});
  const descendantResult=loadCaseObligationReview(descendantFile,inactiveParagraphInputsReview,
    descendant.groups.map(group=>group.case),{root,read:descendantReader.read});
  assert.equal(descendantResult.cases.length,2311);
  assert.equal(descendantResult.inspectionComplete,false);assert.equal(descendantResult.currentRenderingAccepted,false);
  let removed=0,slots=0;
  for(const group of descendant.groups.filter(group=>group.family==='divider')){
    const child=group.obligations.inputStyleStructure.retainedInactiveParagraphInputs;
    assert.equal(child.gridTracks.length,4);assert.equal(child.ownTransformOrigins.length,2);
    slots+=child.gridTracks.length+2*child.ownTransformOrigins.length;
    delete group.obligations.inputStyleStructure.retainedInactiveParagraphInputs;removed++;
  }
  assert.equal(removed,24);assert.equal(slots,192);
  assert.equal(createHash('sha256').update(JSON.stringify(descendant)).digest('hex'),dividerReviewedBoundariesReview);
  const fieldFile=`artifacts/material-parity/working-audit/proposals/${filledFieldStructureReview}.json`;
  const fieldReview=JSON.parse(fs.readFileSync(fieldFile)).review;
  const fieldReader=createDividerReviewedBoundariesReader({...options,reviewSha256:filledFieldStructureReview});
  assert.equal(fieldReader.sourceApplicability.transitions.length,5);
  const fieldResult=loadCaseObligationReview(fieldFile,filledFieldStructureReview,
    fieldReview.groups.map(group=>group.case),{root,read:fieldReader.read});
  assert.equal(fieldResult.cases.length,2311);assert.equal(fieldResult.evidenceFingerprints.length,15175);
  assert.equal(fieldResult.inspectionComplete,false);assert.equal(fieldResult.currentRenderingAccepted,false);
  let fields=0;
  for(const group of fieldReview.groups){
    const child=group.obligations.inputStyleStructure.retainedFilledFieldStructure;
    if(!child)continue;
    assert.equal(child.observation.case,group.case);
    assert.deepEqual(child.observation.inputTrees,group.evidence.pairedTrees);
    assert.equal(child.observation.classifications.corners,'application-plugin-authoring-defect');
    delete group.obligations.inputStyleStructure.retainedFilledFieldStructure;fields++;
  }
  assert.equal(fields,577);
  assert.equal(createHash('sha256').update(JSON.stringify(fieldReview)).digest('hex'),inactiveParagraphInputsReview);
  const chipFile=`artifacts/material-parity/working-audit/proposals/${chipPaintReview}.json`;
  const chipReview=JSON.parse(fs.readFileSync(chipFile)).review;
  const chipReader=createDividerReviewedBoundariesReader({...options,reviewSha256:chipPaintReview});
  assert.equal(chipReader.sourceApplicability.transitions.length,5);
  const chipResult=loadCaseObligationReview(chipFile,chipPaintReview,
    chipReview.groups.map(group=>group.case),{root,read:chipReader.read});
  assert.equal(chipResult.cases.length,2311);assert.equal(chipResult.evidenceFingerprints.length,15180);
  assert.equal(chipResult.inspectionComplete,false);assert.equal(chipResult.currentRenderingAccepted,false);
  let indicators=0,layers=0;
  for(const group of chipReview.groups){
    const owner=group.obligations.localPaint;
    if(owner.retainedChipFocusIndicatorRequests){
      assert.equal(group.family,'chips');assert.equal(owner.retainedChipFocusIndicatorRequests.observations.length,2);
      delete owner.retainedChipFocusIndicatorRequests;indicators++;
    }
    if(owner.retainedChipStateLayerRequests){
      const child=owner.retainedChipStateLayerRequests;
      assert.equal(group.family,'chips');assert.equal(child.classification,'application-plugin-authoring-defect');
      assert.deepEqual(child.observation.treeReceipts,group.evidence.pairedTrees);
      delete owner.retainedChipStateLayerRequests;layers++;
    }
  }
  assert.equal(indicators,76);assert.equal(layers,24);
  assert.equal(createHash('sha256').update(JSON.stringify(chipReview)).digest('hex'),filledFieldStructureReview);
});

test('retained text backing review uses explicit tracked source applicability without changing receipts',()=>{
  const root=process.cwd(),file=`artifacts/material-parity/working-audit/proposals/${textBackingRetainedReview}.json`;
  const review=JSON.parse(fs.readFileSync(file)).review;
  const applicability=createTextBackingReviewReader({root,read:fs.readFileSync,reviewSha256:textBackingRetainedReview});
  assert.equal(applicability.sourceApplicability.transitions.length,4);
  const cases=review.groups.map(g=>g.case);
  // The base adapter must still reject the later alignment
  // extension. Replaying the full old review now requires its explicit
  // alignment boundary, not replacing receipts or weakening the strict loader.
  assert.throws(()=>loadCaseObligationReview(file,textBackingRetainedReview,cases,{root,read:applicability.read}),
    /Case obligation evidence changed: tests\/material-parity\/alignment-crop-provenance.spec.mjs/);
  const fullApplicability=createDividerReviewedBoundariesReader({root,read:fs.readFileSync,reviewSha256:textBackingRetainedReview});
  assert.equal(fullApplicability.sourceApplicability.transitions.length,5);
  assert.equal(fullApplicability.sourceApplicability.reviewSha256,textBackingRetainedReview);
  const result=loadCaseObligationReview(file,textBackingRetainedReview,cases,{root,read:fullApplicability.read});
  assert.equal(result.cases.length,2311);assert.equal(result.currentRenderingAccepted,false);assert.equal(result.inspectionComplete,false);
  for(const transition of applicability.sourceApplicability.transitions){
    assert.notEqual(transition.currentSha256,transition.historicalSha256);
    const absolute=path.resolve(root,transition.logicalFile);
    const original=fs.readFileSync(absolute);
    assert.equal(createHash('sha256').update(original).digest('hex'),transition.currentSha256);
    assert.equal(createHash('sha256').update(applicability.read(absolute)).digest('hex'),transition.historicalSha256);
    assert.throws(()=>createTextBackingReviewReader({root,reviewSha256:textBackingRetainedReview,
      read(name,...args){const value=fs.readFileSync(name,...args);return path.resolve(name)===absolute?value.toString()+'\n// drift':value;}}));
  }
  assert.throws(()=>createTextBackingReviewReader({root,read:fs.readFileSync,reviewSha256:'0'.repeat(64)}));
  let drift=false;
  const tracked=createTextBackingReviewReader({root,reviewSha256:textBackingRetainedReview,
    read(name,...args){const value=fs.readFileSync(name,...args);return drift?value.toString()+'\n// drift':value;}});
  drift=true;assert.throws(()=>tracked.read(path.resolve(root,applicability.sourceApplicability.transitions[0].logicalFile)));
});
import { createHash } from 'node:crypto';
import { encodeMaterialInputAuditStream } from './input-audit-report-stream.mjs';
import { withAuditEvidenceSession, auditReadFileSync } from './audit-evidence-session.mjs';
import { withAuditScratch } from './audit-scratch.mjs';
import { sourceAuditDefinitions } from './input-equivalence-policy.mjs';
import { restoreEvidenceReaderLookupSource } from './historical-audit-module-source.mjs';

test('evidence reader source boundary permits only the authenticated lookup transition', () => {
  const current = fs.readFileSync('scripts/audit-findings-store.mjs', 'utf8');
  const restored = restoreEvidenceReaderLookupSource(current);
  assert.equal(createHash('sha256').update(restored).digest('hex'), '7e3611a870eee1c81e857a946781f8669aff8d6189d348d4b872ae9a7919648d');
  for (const changed of [current + '\n// unrelated drift', current.replace('ordinals.get(this.key)', 'ordinals.get(0)'),
    current.replace('Evidence row differs from compact finding', 'Evidence row accepted')]) {
    assert.notEqual(changed, current); assert.throws(() => restoreEvidenceReaderLookupSource(changed));
  }
});

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
  // Preserve the actual canonical source vocabulary rather than relabel findings.
  for (const classification of new Set(sourceAuditDefinitions.map(row => row.classification))) {
    const canonical = structuredClone(review);
    canonical.groups[0].inspectionClosure.findings[0].classification = classification;
    if (classification === 'equivalent-representation') {
      canonical.groups[0].inspectionClosure.outcome = 'inspected-pass';
      canonical.groups[0].inspectionClosure.findings[0].outcome = 'equivalent';
    }
    const coverage = load(canonical); assertCaseObligationCoverage(coverage);
    assert.equal(coverage.inspectionEvidence.cases[0].inspectionClosure.findings[0].classification, classification);
    assert.equal(coverage.inspectionEvidence.currentRenderingAccepted, false);
  }
  for (const classification of ['confirmed-core-defect', 'suspected-core-defect',
    'confirmed-core-renderer-defect', 'suspected-core-renderer-defect']) {
    const missingPublicProof = structuredClone(review);
    missingPublicProof.groups[0].inspectionClosure.findings[0].classification = classification;
    delete missingPublicProof.groups[0].inspectionClosure.findings[0].publicReproduction;
    assert.throws(() => load(missingPublicProof), /public reproduction/);
    const falseEquivalence = structuredClone(review);
    falseEquivalence.groups[0].inspectionClosure.findings[0].classification = classification;
    falseEquivalence.groups[0].inspectionClosure.findings[0].outcome = 'equivalent';
    falseEquivalence.groups[0].inspectionClosure.outcome = 'inspected-pass';
    assert.throws(() => load(falseEquivalence));
  }
  const retainedFailure = structuredClone(review);
  retainedFailure.groups[0].obligations.programmaticFocus.disposition = 'inspected-failure';
  const retainedCoverage = load(retainedFailure);
  assertCaseObligationCoverage(retainedCoverage);
  assert.equal(retainedCoverage.inspectionEvidence.cases[0].obligations.programmaticFocus.disposition, 'inspected-failure');
  const concealedFailure = structuredClone(passed);
  concealedFailure.groups[0].obligations.programmaticFocus.disposition = 'inspected-failure';
  assert.throws(() => load(concealedFailure), /passing closure with a failed obligation/);
  for (const mutate of [
    r => delete r.groups[0].obligations.localPaint,
    r => { r.groups[0].obligations.localPaint.disposition = 'partial'; },
    r => { r.groups[0].obligations.localPaint.disposition = 'inspected-pass'; },
    r => { r.groups[0].obligations.localPaint.applicability = 'not-applicable'; r.groups[0].obligations.localPaint.disposition = 'inspected-failure'; },
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

test('compact findings preserve counts, missing values and evidence links; corruption is rejected', async t => {
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
    // Exercise the real49-row mixed-section extraction that exposed repeated
    // per-value scans,without relying on wall-clock timing or a new reader API.
    const batchAudit = structuredClone(nextAudit);
    for (const [section, count] of [['discrepancies', 17], ['sourceFindings', 16], ['controlTypography', 8], ['retainedTypography', 8]]) {
      const target = Array.isArray(batchAudit[section]) ? batchAudit[section] : batchAudit[section].differences;
      for (let ordinal = 0; ordinal < count; ordinal++) target.push({ family: 'batch', element: section + ordinal,
        property: 'width', reference: `${ordinal}px`, occurrences: 1,
        reviewEvidence: { nested: Array.from({ length: 20 }, (_, i) => ({ value: i,
          controlTypography: { differences: ['not a top-level row', ordinal] } })) } });
    }
    batchAudit.summary = { uniqueStyleDifferences: 20, totalStyleDifferenceOccurrences: 23, sourceFindings: 19 };
    const batchEncoded = await encodeMaterialInputAuditStream(batchAudit);
    fs.writeFileSync(path.join(root, 'material-input-equivalence-audit.json'), JSON.stringify(batchEncoded.manifest));
    fs.writeFileSync(path.join(root, batchEncoded.manifest.payload), batchEncoded.payload);
    await importFindings(root, destination);
    const batchRows = queryFindings(destination, 'batch').toReversed();
    assert.equal(batchRows.length, 49);
    const expectedBatch = batchRows.map(record => record.evidence.section.split('.').reduce((v, key) => v[key], batchAudit)[record.evidence.ordinal]);
    const originalSplit = String.prototype.split; let sectionSplits = 0;
    try {
      String.prototype.split = function(separator, ...args) {
        if (separator === '.') sectionSplits++;
        return originalSplit.call(this, separator, ...args);
      };
      assert.deepEqual(await loadFindingEvidence(destination, 'batch', batchRows.map(record => record.id)), expectedBatch);
    } finally { String.prototype.split = originalSplit; }
    assert.ok(sectionSplits <= batchRows.length, `Section parsing must be bounded by requested rows,not JSON values: ${sectionSplits}`);
    assert.equal(sectionSplits, 49);
    const batchPointerBytes = fs.readFileSync(pointerFile), batchPointer = JSON.parse(batchPointerBytes);
    const batchGeneration = path.join(destination, batchPointer.generation), batchIndexFile = path.join(batchGeneration, 'index.json');
    const batchIndexBytes = fs.readFileSync(batchIndexFile), batchIndex = JSON.parse(batchIndexBytes);
    const digest = bytes => createHash('sha256').update(bytes).digest('hex');
    const batchShard = batchIndex.shards.find(shard => shard.file === batchRows[0].evidence.section.replaceAll('.', '-') + '-batch.jsonl');
    const batchShardFile = path.join(batchGeneration, batchShard.file), batchShardBytes = fs.readFileSync(batchShardFile);
    async function forgedBatchRow(mutate, expected) {
      const shardRows = batchShardBytes.toString().trim().split('\n').map(JSON.parse);
      const target = shardRows.find(row => row.id === batchRows[0].id); mutate(target);
      const changedBytes = Buffer.from(shardRows.map(row => JSON.stringify(row)).join('\n') + '\n');
      const changedIndex = structuredClone(batchIndex), receipt = changedIndex.shards.find(shard => shard.file === batchShard.file);
      receipt.sha256 = digest(changedBytes); receipt.bytes = changedBytes.length;
      const indexBytes = Buffer.from(JSON.stringify(changedIndex));
      try {
        fs.writeFileSync(batchShardFile, changedBytes); fs.writeFileSync(batchIndexFile, indexBytes);
        fs.writeFileSync(pointerFile, JSON.stringify({ ...batchPointer, indexSha256: digest(indexBytes) }));
        await assert.rejects(loadFindingEvidence(destination, 'batch', target.id), expected);
      } finally {
        fs.writeFileSync(batchShardFile, batchShardBytes); fs.writeFileSync(batchIndexFile, batchIndexBytes); fs.writeFileSync(pointerFile, batchPointerBytes);
      }
    }
    await forgedBatchRow(row => { row.evidence.completeRowSha256 = '0'.repeat(64); }, /Evidence row differs from compact finding/);
    await forgedBatchRow(row => {
      row.evidence.ordinal = 99999;
      row.id = digest(JSON.stringify([row.evidence.sourceSha256, row.evidence.section, row.evidence.ordinal]));
    }, /Evidence row missing/);
    const batchPayloadFile = path.join(batchGeneration, batchIndex.manifest.payload), batchPayloadBytes = fs.readFileSync(batchPayloadFile);
    try {
      fs.writeFileSync(batchPayloadFile, 'corrupted');
      await assert.rejects(loadFindingEvidence(destination, 'batch', batchRows[0].id));
    } finally { fs.writeFileSync(batchPayloadFile, batchPayloadBytes); }
    t.diagnostic(JSON.stringify({ batchRows: 49, sectionSplits, exactMixedSectionRowsAndReturnOrder: true,
      forgedCompleteRowRejected: true, missingOrdinalRejected: true, corruptedPayloadRejected: true }));
    assert.throws(() => queryFindings(destination, 'slider', { ...predecessor, indexSha256: 'forged' }));
    assert.throws(() => queryFindings(destination, 'slider', { ...predecessor, generation: '../escape' }));
    fs.writeFileSync(pointerFile, JSON.stringify(predecessor));
    fs.appendFileSync(path.join(generation, index.shards[0].file), '{}\n');
    assert.throws(() => verifyFindings(generation)); assert.throws(() => queryFindings(destination, 'slider'));
    fs.writeFileSync(path.join(root, encoded.manifest.payload), 'corrupted');
    await assert.rejects(importFindings(root, destination));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('reviewed chip graphics reader preserves exact predecessor and all partial dispositions', () => {
  const root=process.cwd(),file=`artifacts/material-parity/working-audit/proposals/${chipGraphicReview}.json`;
  const review=JSON.parse(fs.readFileSync(file)).review;
  const reader=createDividerReviewedBoundariesReader({root,read:fs.readFileSync,reviewSha256:chipGraphicReview});
  assert.equal(reader.sourceApplicability.transitions.length,5);
  const result=loadCaseObligationReview(file,chipGraphicReview,review.groups.map(g=>g.case),{root,read:reader.read});
  assert.equal(result.evidenceFingerprints.length,15185);assert.equal(result.cases.length,2311);
  assert.equal(result.inspectionComplete,false);assert.equal(result.currentRenderingAccepted,false);
  let children=0,selected=0,unselected=0;
  for(const group of review.groups){
    assert.equal(group.inspection,'partial');assert.equal(group.currentRendering,'unverified');
    const child=group.obligations.inputStyleStructure.retainedChipGraphicInputs;if(!child)continue;
    assert.equal(group.family,'chips');assert.equal(child.observations.length,2);
    assert.equal(child.selectedClassification,'application-plugin-authoring-defect');
    assert.match(child.currentSourceGeometry.scope,/not actual historical mesh vertices or current pixels/);
    for(const row of child.observations){
      assert.equal(row.reference.svg.viewBox,'-2 -3 30 30');
      if(row.selected){selected++;assert.equal(row.candidate.authored.type,'showcase.material:check-mark');}
      else{unselected++;assert.equal(row.candidate,null);assert.equal(row.reference.check.opacity,'0');
        assert.equal(row.reference.graphic.paddingLeft,'6px');assert.equal(row.reference.graphic.flexGrow,'1');}
    }
    delete group.obligations.inputStyleStructure.retainedChipGraphicInputs;children++;
  }
  assert.deepEqual({children,selected,unselected},{children:76,selected:120,unselected:32});
  assert.equal(createHash('sha256').update(JSON.stringify(review)).digest('hex'),chipPaintReview);
});

test('readonly proof append restoration preserves complete predecessor and rejects drift', async () => {
  const { restoreInputBoundaryReadonlyAppend } = await import('./text-backing-case-review-source.mjs');
  const { execFileSync } = await import('node:child_process');
  const file = 'tests/material-parity/input-boundary-evidence.spec.mjs';
  const current = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const previous = execFileSync('git', ['show', `3c7cd2cc:${file}`],
    { encoding: 'utf8', maxBuffer: 2_000_000 }).replaceAll('\r\n', '\n');
  assert.equal(restoreInputBoundaryReadonlyAppend(current), previous);
  assert.equal(restoreInputBoundaryReadonlyAppend(previous), previous);
  for (const drift of [current + '\n// unrelated drift',
    current.replace('readonlyFailingPairs: 2', 'readonlyFailingPairs: 0'),
    current.replace('typed-x', 'changed-key'), previous + '\n// previous drift'])
    assert.throws(() => restoreInputBoundaryReadonlyAppend(drift));
});

test('readonly source finding proposal preserves every prior definition and receipt', async () => {
  const { sourceAuditDefinitions } = await import('./input-equivalence-policy.mjs');
  const sha256 = '30bd233e3e9f40c07b0e2e3f1bb7476a63ce775ffad4070c7f92cbcf3df5c8bd';
  const proposal = JSON.parse(fs.readFileSync(`artifacts/material-parity/working-audit/proposals/${sha256}.json`));
  assert.equal(proposal.status, 'proposal-not-canonical');
  assert.equal(proposal.sha256, sha256);
  assert.equal(createHash('sha256').update(JSON.stringify(proposal.review)).digest('hex'), sha256);
  assert.equal(proposal.review.kind, 'material-source-finding-review');
  assert.equal(proposal.review.registrationPending, true);
  assert.equal(proposal.review.groups.length, 166);
  const finding = proposal.review.groups.at(-1);
  assert.equal(finding.id, 'core-readonly-text-keyboard-defaults-mutate-value');
  assert.deepEqual(proposal.review.groups.slice(0, -1), sourceAuditDefinitions.filter(r => r.id !== finding.id));
  const registered = sourceAuditDefinitions.find(r => r.id === finding.id);
  if (registered) assert.deepEqual(registered, finding);
  assert.equal(finding.classification, 'confirmed-core-renderer-defect');
  assert.equal([...fs.readFileSync(finding.file, 'utf8').matchAll(new RegExp(finding.pattern, 'g'))].length, 1);
  for (const receipt of finding.evidence)
    assert.equal(createHash('sha256').update(fs.readFileSync(receipt.file)).digest('hex'), receipt.sha256);
  assert.deepEqual(finding.publicReproduction, {
    command: 'node scripts/audit-public-readonly-editing.mjs --verify artifacts/material-parity/public-readonly-editing-recovered-20261020',
    pairs: 6, readonlyFailures: 2, writableControls: 4, disabledControls: 4,
    negativeControls: 6, currentRenderingAccepted: false,
  });
  assert.match(finding.boundary, /Clipboard,paste\/cut/);
  assert.match(finding.boundary, /Does not close all94 Material readonly cases/);
});

test('readonly registration recovers complete prior policy and producer without weakening guards', async () => {
  const { restoreReadonlyPolicy, restoreReadonlyProducer } = await import('./semantic-text-transform-registration.mjs');
  const { execFileSync } = await import('node:child_process');
  for (const [file, restore, marker] of [
    ['tests/material-parity/input-equivalence-policy.mjs', restoreReadonlyPolicy, 'core-readonly-text-keyboard-defaults-mutate-value'],
    ['tests/material-parity/input-equivalence-audit.mjs', restoreReadonlyProducer, 'public readonly text keyboard mutation with writable and disabled controls'],
  ]) {
    const current = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
    const prior = execFileSync('git', ['show', `820d6180:${file}`],
      { encoding: 'utf8', maxBuffer: 4_000_000 }).replaceAll('\r\n', '\n');
    assert.equal(restore(current), prior);
    assert.equal(restore(prior), prior);
    assert.throws(() => restore(current + '\n// unrelated source drift'));
    assert.throws(() => restore(current.replace(marker, 'unreviewed-readonly-registration')));
    const previousMarker=file.includes('policy')?'core-text-backing-ceil-rescales-logical-line-height':'equal-input explicit line-height backing allocation and logical mapping';
    assert.ok(current.includes(previousMarker));
    assert.throws(() => restore(current.replace(previousMarker, 'unreviewed-predecessor')));
  }
});

test('queued control proof append conserves complete accepted sources and rejects drift', async () => {
  const { execFileSync } = await import('node:child_process');
  const { default: ts } = await import('typescript');
  const { restoreInputBoundaryReadonlyAppend, restoreQueuedControlHelperSource } = await import('./text-backing-case-review-source.mjs');
  const hash = value => createHash('sha256').update(value).digest('hex');
  const suite = 'tests/material-parity/input-boundary-evidence.spec.mjs';
  const current = fs.readFileSync(suite, 'utf8').replaceAll('\r\n', '\n');
  const accepted = execFileSync('git', ['show', `437a4535:${suite}`], { encoding: 'utf8', maxBuffer: 2_000_000 }).replaceAll('\r\n', '\n');
  const start = current.indexOf('\n// Append-only queued batch:'); assert.ok(start > 0);
  assert.equal(current.slice(0, start), accepted);
  assert.equal(hash(accepted), 'cdcfd338d0823fefaa780efbba5e500a78f952e745f1c0d6039f0c59a2e8cc50');
  const tree = ts.createSourceFile('append.mjs', current.slice(start), ts.ScriptTarget.Latest, true);
  assert.equal(tree.parseDiagnostics.length, 0); assert.equal(tree.statements.length, 4);
  assert.deepEqual(tree.statements.map(node => node.expression.arguments[0].text), [
    'retained checkbox checkmark requests bind SVG units and disabled ink before projection',
    'retained select listbox naming omission precedes the queried browser AX targets',
    'disabled checkbox native role control isolates focusability from the renderer',
    'public readonly update preserves the flag while trusted typing mutates the value',
  ]);
  assert.equal(restoreInputBoundaryReadonlyAppend(current), restoreInputBoundaryReadonlyAppend(accepted));
  for (const changed of [current + '\n// unrelated drift', current.replace('disabledInkDifferences: 6', 'disabledInkDifferences: 0'),
    current.replace('public readonly update preserves the flag while trusted typing mutates the value', 'unreviewed dynamic readonly test'),
    current.replace('strokeCssAfterViewBox', 'wrong-units')]) {
    assert.notEqual(changed, current, 'The rejection control must actually mutate the source');
    assert.throws(() => restoreInputBoundaryReadonlyAppend(changed));
  }
  const benchmark = 'tests/material-parity/benchmark-config.spec.mjs';
  const benchmarkNow = fs.readFileSync(benchmark, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(benchmarkNow.split(hash(current)).length, 3);
  const benchmarkBefore = execFileSync('git', ['show', `437a4535:${benchmark}`], { encoding: 'utf8', maxBuffer: 2_000_000 }).replaceAll('\r\n', '\n');
  assert.equal(benchmarkNow.replaceAll(hash(current), hash(accepted)), benchmarkBefore);
  const helper = 'tests/material-parity/semantic-text-transform-registration.mjs';
  const helperNow = restoreQueuedControlHelperSource(fs.readFileSync(helper, 'utf8'));
  const begin = helperNow.indexOf('    // QUEUED_CONTROL_OWNER_RECEIPT_BEGIN\n');
  const marker = '    // QUEUED_CONTROL_OWNER_RECEIPT_END\n', end = helperNow.indexOf(marker, begin) + marker.length;
  assert.ok(begin > 0 && end > begin);
  const helperBefore = execFileSync('git', ['show', `437a4535:${helper}`], { encoding: 'utf8', maxBuffer: 2_000_000 }).replaceAll('\r\n', '\n');
  assert.equal(helperNow.slice(0, begin) + helperNow.slice(end), helperBefore);
});

test('queued control source proposal preserves all prior definitions and binds distinct authoring causes', async () => {
  const { execFileSync } = await import('node:child_process');
  const { sourceAuditDefinitions } = await import('./input-equivalence-policy.mjs');
  const hash = value => createHash('sha256').update(value).digest('hex');
  const sha = '430dada4b7b57b0e54f8d41ba3524f2031c285f516bc846b3b5a5f8d17684aa4';
  const envelope = JSON.parse(fs.readFileSync(`artifacts/material-parity/working-audit/proposals/${sha}.json`));
  assert.equal(envelope.status, 'proposal-not-canonical'); assert.equal(envelope.sha256, sha);
  const review = envelope.review; assert.equal(hash(JSON.stringify(review)), sha);
  assert.equal(review.kind, 'material-source-finding-review'); assert.equal(review.status, 'reviewed-not-integrated');
  assert.equal(review.registrationPending, true);
  const source = execFileSync('git', ['show', '437a4535:tests/material-parity/input-equivalence-policy.mjs'],
    { encoding: 'utf8', maxBuffer: 2_000_000 }).replaceAll('\r\n', '\n');
  assert.equal(hash(source), '7875b717fe7693f5bdad8158f99461f09512b7bdbcdda4465a0478c4bc24566c');
  const prior = new Function(source.replace(/^export const /gm, 'const ') + '\nreturn sourceAuditDefinitions;')();
  assert.equal(prior.length, 166); assert.deepEqual(review.groups.slice(0, 166), prior);
  assert.equal(review.groups.length, 170);
  if (sourceAuditDefinitions.length === 166) assert.deepEqual(sourceAuditDefinitions, prior);
  else assert.deepEqual(sourceAuditDefinitions, review.groups, 'Only this exact complete registered successor is allowed');
  const added = review.groups.slice(166);
  assert.deepEqual(added.map(row => row.id), [
    'fixture-checkbox-checkmark-path-substitution', 'fixture-checkbox-disabled-checkmark-ink-substitution',
    'fixture-checkbox-disabled-native-primitive-substitution', 'fixture-select-listbox-name-omission',
  ]);
  for (const receipt of review.evidenceSources) assert.equal(hash(fs.readFileSync(receipt.file)), receipt.sha256);
  for (const finding of added) {
    assert.equal(finding.classification, 'application-plugin-authoring-defect');
    assert.equal([...fs.readFileSync(finding.file, 'utf8').matchAll(new RegExp(finding.pattern, 'g'))].length, 1);
    assert.ok(finding.owner && finding.justification && finding.recommendation && finding.boundary);
    assert.match(finding.introducedBy, /first-bad runtime not established/);
    for (const receipt of finding.evidence) assert.equal(hash(fs.readFileSync(receipt.file)), receipt.sha256);
    const [file, title] = finding.focusedProof.split(': ');
    assert.equal(fs.readFileSync(file, 'utf8').split(`test('${title}'`).length, 2);
  }
  const historyReceipt = review.evidenceSources.find(row => row.file.endsWith('queued-control-source-history-20261020.log'));
  assert.ok(historyReceipt); const history = JSON.parse(fs.readFileSync(historyReceipt.file));
  for (const row of history.history) {
    const bytes = execFileSync('git', ['show', `${row.commit}:${row.file}`], { maxBuffer: 4_000_000 });
    assert.equal(hash(bytes), row.moduleSha256); assert.equal(hash(row.excerpt), row.excerptSha256);
    assert.ok(bytes.toString().includes(row.excerpt));
  }
  assert.match(history.history.find(row => row.kind === 'checkmark-coordinate-rework').excerpt, /Vector3\[\]/);
  assert.match(history.history.find(row => row.kind === 'checkmark-css-helper').excerpt, /CssPoint\[\]/);
  assert.deepEqual(review.supplementalFindingEvidence.map(row => row.id), ['core-readonly-text-keyboard-defaults-mutate-value']);
  assert.equal(review.groups.filter(row => row.id === 'core-readonly-text-keyboard-defaults-mutate-value').length, 1);
  const changed = structuredClone(review); changed.groups[0].classification = 'equivalent-representation';
  assert.notEqual(hash(JSON.stringify(changed)), sha);
});

test('queued control registration restores exact predecessors and rejects unrelated source changes', async () => {
  const { execFileSync } = await import('node:child_process');
  const { restoreQueuedControlPolicy, restoreQueuedControlProducer } = await import('./semantic-text-transform-registration.mjs');
  const { restoreQueuedControlHelperSource } = await import('./text-backing-case-review-source.mjs');
  const previous = file => execFileSync('git', ['show', `b01e3fc5:${file}`],
    { encoding: 'utf8', maxBuffer: 4_000_000 }).replaceAll('\r\n', '\n');
  for (const [file, restore, marker, oldMarker] of [
    ['tests/material-parity/input-equivalence-policy.mjs', restoreQueuedControlPolicy, 'fixture-checkbox-checkmark-path-substitution', 'core-readonly-text-keyboard-defaults-mutate-value'],
    ['tests/material-parity/input-equivalence-audit.mjs', restoreQueuedControlProducer, 'retained checkbox SVG path units and disabled ink inputs', 'public readonly text keyboard mutation with writable and disabled controls'],
  ]) {
    const current = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), prior = previous(file);
    assert.equal(restore(current), prior); assert.equal(restore(prior), prior);
    assert.ok(current.includes(marker)); assert.ok(current.includes(oldMarker));
    for (const changed of [current + '\n// unrelated drift', current.replace(marker, 'unreviewed-control-registration'),
      current.replace(oldMarker, 'unreviewed-old-finding')]) {
      assert.notEqual(changed, current);
      assert.throws(() => restore(changed));
    }
  }
  const helper = 'tests/material-parity/semantic-text-transform-registration.mjs';
  const currentHelper = fs.readFileSync(helper, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(restoreQueuedControlHelperSource(currentHelper), previous(helper));
  for (const changed of [currentHelper + '\n// unrelated drift', currentHelper.replace('const controlIds =', 'const renamedIds =')])
    assert.throws(() => restoreQueuedControlHelperSource(changed));
  for (const [file, changes] of [
    ['tests/material-parity/semantic-text-transform-input.spec.mjs', [
      ['currentSourceAuditDefinitions.length, 170', 'currentSourceAuditDefinitions.length, 166', 2],
      ['currentSourceAuditDefinitions.slice(3, 166)', 'currentSourceAuditDefinitions.slice(3)', 1],
      ['currentDefinitions: 170', 'currentDefinitions: 166', 1],
    ]],
    ['tests/material-parity/legacy-clip-support-input.spec.mjs', [
      ['currentSourceAuditDefinitions.slice(2,166)', 'currentSourceAuditDefinitions.slice(2)', 1],
      ['currentSourceAuditDefinitions.length,170', 'currentSourceAuditDefinitions.length,166', 1],
    ]],
  ]) {
    let restored = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
    for (const [from, to, count] of changes) {
      assert.equal(restored.split(from).length, count + 1); restored = restored.replaceAll(from, to);
    }
    assert.equal(restored, previous(file), 'Older suite may change only explicit current-population metadata');
  }
});
