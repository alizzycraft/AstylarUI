import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { dividerOwnerContextReview } from './divider-owner-context-review-source.mjs';
import { createEditingContextReviewReader,editingContextReview } from './editing-context-review-source.mjs';
import { joinEditingContextEvidence,restoreEditingContextEvidence } from '../../scripts/join-material-editing-context-evidence.mjs';
import { loadCaseObligationReview } from '../../scripts/audit-findings-store.mjs';

test('Editing context join conserves complete parent and limits new evidence to 56 exact cases',t=>{
  assert.throws(()=>createEditingContextReviewReader({root:process.cwd(),read:readFileSync,reviewSha256:'0'.repeat(64)}));
  const reader=createEditingContextReviewReader({root:process.cwd(),read:readFileSync,reviewSha256:editingContextReview});
  const selected=JSON.parse(reader.read(path.resolve(`artifacts/material-parity/working-audit/proposals/${editingContextReview}.json`))).review;
  const parent=restoreEditingContextEvidence(selected);
  const joined=joinEditingContextEvidence(parent);assert.equal(joined.addedChildren,56);
  assert.equal(joined.sha256,editingContextReview);assert.deepEqual(joined.review,selected);
  assert.deepEqual(restoreEditingContextEvidence(joined.review),parent);
  const changed=joined.review.groups.filter(g=>g.obligations.authoredEditing.supplementaryEditingContextCoverage);
  assert.equal(changed.filter(g=>g.obligations.authoredEditing.supplementaryEditingContextCoverage.kind==='readonly-select-mutation').length,8);
  for(const g of changed){const p=parent.groups.find(p=>p.case===g.case);assert.equal(g.inspection,p.inspection);assert.equal(g.currentRendering,p.currentRendering);assert.deepEqual(g.obligations.authoredEditing.remaining,p.obligations.authoredEditing.remaining);}
  assert.throws(()=>joinEditingContextEvidence(joined.review));
  const corrupt=(file,...args)=>file.endsWith('disabled-control-remaining-contexts-20261025/latest-report.json')?Buffer.from('{}'):readFileSync(file,...args);
  assert.throws(()=>joinEditingContextEvidence(parent,corrupt));
  const file=`artifacts/material-parity/working-audit/proposals/${joined.sha256}.json`;
  const bytes=Buffer.from(JSON.stringify({status:'proposal-not-canonical',sha256:joined.sha256,review:joined.review}));
  const read=(name,options)=>{
    if(path.resolve(name)!==path.resolve(file))return reader.read(name,options);
    const encoding=typeof options==='string'?options:options?.encoding;return encoding?bytes.toString(encoding):Buffer.from(bytes);
  };
  const loaded=loadCaseObligationReview(file,joined.sha256,parent.groups.map(g=>g.case),{root:process.cwd(),read});
  assert.deepEqual(reader.read('docs/evidence/material-original-runner-e01.mjs.gz.b64'),readFileSync('docs/evidence/material-original-runner-e01.mjs.gz.b64'));
  assert.equal(reader.sourceApplicability.addedChildren,56);
  assert.equal(loaded.inspectionComplete,false);assert.equal(loaded.currentRenderingAccepted,false);assert.equal(loaded.cases.length,2311);
  t.diagnostic(JSON.stringify({dependencyReceipts:loaded.evidenceFingerprints.length,physicalProposalWritten:false}));
  t.diagnostic(JSON.stringify({reviewSha256:joined.sha256,parentSha256:createHash('sha256').update(JSON.stringify(parent)).digest('hex'),addedChildren:56,caseClosure:false,currentRenderingAccepted:false}));
});
