import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createMenuSelectDisabledReviewReader, menuSelectDisabledReview } from './menu-select-disabled-review-source.mjs';
import { joinDividerOutsideOwnerEvidence, restoreDividerOutsideOwnerEvidence } from '../../scripts/join-material-divider-outside-owner-evidence.mjs';

test('outside-scalar Divider owner evidence joins only exact property/context records and conserves all parent gaps',()=>{
  const reader=createMenuSelectDisabledReviewReader({root:process.cwd(),read:readFileSync,reviewSha256:menuSelectDisabledReview});
  const predecessor=JSON.parse(reader.read(`artifacts/material-parity/working-audit/proposals/${menuSelectDisabledReview}.json`)).review;
  const hash=r=>createHash('sha256').update(JSON.stringify(r)).digest('hex');
  const joined=joinDividerOutsideOwnerEvidence(predecessor);
  assert.equal(joined.review.groups.length,2311);assert.equal(joined.cases,24);assert.equal(joined.physicalAliases,8);
  assert.equal(hash(predecessor),menuSelectDisabledReview);assert.equal(hash(restoreDividerOutsideOwnerEvidence(joined.review)),menuSelectDisabledReview);
  let changed=0;
  joined.review.groups.forEach((group,index)=>{
    assert.equal(group.inspection,'partial');assert.equal(group.currentRendering,'unverified');
    if(group===predecessor.groups[index])return;changed++;assert.equal(group.family,'divider');
    const child=group.obligations.inputStyleStructure.boundedOutsideScalarOwnerInputs;
    assert.equal(child.marginInputs.wrappers.length,2);assert.equal(child.retainedLeafTypography.length,2);
    assert.equal(child.marginInputs.title.fontSize,'32px');assert.equal(child.remainingDomains.length,4);
    assert.ok(child.marginInputs.wrappers.every(r=>r.inputEquivalent===false));
    const remaining={...group.obligations.inputStyleStructure};delete remaining.boundedOutsideScalarOwnerInputs;
    assert.deepEqual(remaining,predecessor.groups[index].obligations.inputStyleStructure);
  });assert.equal(changed,24);
  assert.throws(()=>joinDividerOutsideOwnerEvidence(joined.review));
  assert.throws(()=>joinDividerOutsideOwnerEvidence(predecessor,file=>file.endsWith('divider-outside-owner-border-attribution-20261025.log')?Buffer.from('forged'):readFileSync(file)));
  assert.throws(()=>joinDividerOutsideOwnerEvidence(predecessor,file=>file.endsWith('divider-wrapper-leaf-typography-inputs-20261025.log')?Buffer.from('forged'):readFileSync(file)));
  console.log(JSON.stringify({reviewSha256:joined.sha256,predecessor:menuSelectDisabledReview,cases:joined.cases,physicalAliases:joined.physicalAliases,canonicalPublished:false}));
});
