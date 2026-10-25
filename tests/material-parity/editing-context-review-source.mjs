import assert from 'node:assert/strict';
import path from 'node:path';
import { createDividerOwnerContextReviewReader,dividerOwnerContextReview } from './divider-owner-context-review-source.mjs';
import { joinEditingContextEvidence } from '../../scripts/join-material-editing-context-evidence.mjs';
import { createEditingContextPriorRead } from './editing-context-registration.mjs';

export const editingContextReview='043361b010508502f4c2be7b7f2b9bf21059e8f2cb71c503d91b61a29b34dadd';
export function createEditingContextReviewReader({root,read,reviewSha256}){
  assert.equal(reviewSha256,editingContextReview,'Only exact editing-context successor selects this reader');
  const priorRead=createEditingContextPriorRead({root,read});
  const prior=createDividerOwnerContextReviewReader({root,read:priorRead,reviewSha256:dividerOwnerContextReview});
  const parent=JSON.parse(prior.read(path.resolve(root,`artifacts/material-parity/working-audit/proposals/${dividerOwnerContextReview}.json`))).review;
  const joined=joinEditingContextEvidence(parent,file=>read(path.resolve(root,file)));
  assert.equal(joined.sha256,editingContextReview);
  const file=path.resolve(root,`artifacts/material-parity/working-audit/proposals/${editingContextReview}.json`);
  const bytes=Buffer.from(JSON.stringify({status:'proposal-not-canonical',sha256:joined.sha256,review:joined.review}));
  return {
    read(name,options){
      if(path.resolve(root,name)!==file)return prior.read(name,options);
      const encoding=typeof options==='string'?options:options?.encoding;return encoding?bytes.toString(encoding):Buffer.from(bytes);
    },
    sourceApplicability:{mode:'exact-pending-editing-context',reviewSha256,addedChildren:56,
      predecessorApplicability:prior.sourceApplicability,
      boundary:'Explicit in-memory successor only;no producer/default exporter selection,canonical publication,current rendering or case closure.'},
  };
}
