import assert from 'node:assert/strict';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createMenuSelectDisabledReviewReader,menuSelectDisabledReview } from './menu-select-disabled-review-source.mjs';
import { joinDividerOutsideOwnerEvidence } from '../../scripts/join-material-divider-outside-owner-evidence.mjs';
import { dividerOwnerRegistrationPrior,restoreDividerOwnerContextProducer,restoreDividerOwnerContextPolicy } from './divider-owner-context-registration.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
export const dividerOwnerContextReview='f812d8d9e169b51afd03ae43ea06f8b8ac69e6df5147f11589112919c6ef7083';
export function createDividerOwnerContextHistoricalRead({root,read}){
  const transitions=new Map([
    [path.resolve(root,'tests/material-parity/input-equivalence-audit.mjs'),{prior:dividerOwnerRegistrationPrior.producer,restore:b=>restoreDividerOwnerContextProducer(b,f=>read(path.resolve(root,f)))}],
    [path.resolve(root,'tests/material-parity/input-equivalence-policy.mjs'),{prior:dividerOwnerRegistrationPrior.policy,restore:restoreDividerOwnerContextPolicy}],
  ]);
  return (name,options)=>{
    const transition=transitions.get(path.resolve(root,name));if(!transition)return read(name,options);
    const bytes=read(name),normalized=bytes.toString().replaceAll('\r\n','\n');
    const restored=hash(normalized)===transition.prior?normalized:transition.restore(bytes);
    assert.equal(hash(restored),transition.prior);
    const encoding=typeof options==='string'?options:options?.encoding;
    return encoding?Buffer.from(restored).toString(encoding):Buffer.from(restored);
  };
}
export function createDividerOwnerContextReviewReader({root,read,reviewSha256}){
  assert.equal(reviewSha256,dividerOwnerContextReview,'Only exact pending owner-context review selects this reader');
  const historicalRead=createDividerOwnerContextHistoricalRead({root,read});
  const prior=createMenuSelectDisabledReviewReader({root,read:historicalRead,reviewSha256:menuSelectDisabledReview});
  const predecessor=JSON.parse(prior.read(`artifacts/material-parity/working-audit/proposals/${menuSelectDisabledReview}.json`)).review;
  const joined=joinDividerOutsideOwnerEvidence(predecessor,f=>historicalRead(path.resolve(root,f)));
  assert.equal(joined.sha256,dividerOwnerContextReview);
  const file=path.resolve(root,`artifacts/material-parity/working-audit/proposals/${dividerOwnerContextReview}.json`);
  const bytes=Buffer.from(JSON.stringify({status:'proposal-not-canonical',sha256:joined.sha256,review:joined.review}));
  return {
    read(name,options){
      if(path.resolve(root,name)!==file)return prior.read(name,options);
      const encoding=typeof options==='string'?options:options?.encoding;return encoding?bytes.toString(encoding):Buffer.from(bytes);
    },
    sourceApplicability:{mode:'exact-pending-divider-owner-context',reviewSha256,addedChildren:joined.addedChildren,
      predecessorApplicability:prior.sourceApplicability,
      boundary:'Only complete producer/policy registration reversal plus existing predecessor boundaries. No canonical publication,current rendering,case closure or changed criteria.'},
  };
}
