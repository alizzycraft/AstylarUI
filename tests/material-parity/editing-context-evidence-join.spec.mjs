import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createDividerOwnerContextReviewReader,dividerOwnerContextReview } from './divider-owner-context-review-source.mjs';
import { joinEditingContextEvidence,restoreEditingContextEvidence } from '../../scripts/join-material-editing-context-evidence.mjs';

test('Editing context join conserves complete parent and limits new evidence to 56 exact cases',t=>{
  const reader=createDividerOwnerContextReviewReader({root:process.cwd(),read:readFileSync,reviewSha256:dividerOwnerContextReview});
  const parent=JSON.parse(reader.read(path.resolve(`artifacts/material-parity/working-audit/proposals/${dividerOwnerContextReview}.json`))).review;
  const joined=joinEditingContextEvidence(parent);assert.equal(joined.addedChildren,56);
  assert.deepEqual(restoreEditingContextEvidence(joined.review),parent);
  const changed=joined.review.groups.filter(g=>g.obligations.authoredEditing.supplementaryEditingContextCoverage);
  assert.equal(changed.filter(g=>g.obligations.authoredEditing.supplementaryEditingContextCoverage.kind==='readonly-select-mutation').length,8);
  for(const g of changed){const p=parent.groups.find(p=>p.case===g.case);assert.equal(g.inspection,p.inspection);assert.equal(g.currentRendering,p.currentRendering);assert.deepEqual(g.obligations.authoredEditing.remaining,p.obligations.authoredEditing.remaining);}
  assert.throws(()=>joinEditingContextEvidence(joined.review));
  const corrupt=(file,...args)=>file.endsWith('disabled-control-remaining-contexts-20261025/latest-report.json')?Buffer.from('{}'):readFileSync(file,...args);
  assert.throws(()=>joinEditingContextEvidence(parent,corrupt));
  t.diagnostic(JSON.stringify({reviewSha256:joined.sha256,parentSha256:createHash('sha256').update(JSON.stringify(parent)).digest('hex'),addedChildren:56,caseClosure:false,currentRenderingAccepted:false}));
});
