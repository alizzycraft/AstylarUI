import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { loadCaseObligationReview } from '../../scripts/audit-findings-store.mjs';
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
  let cursorAliases=0;
  joined.review.groups.forEach((group,index)=>{
    assert.equal(group.inspection,'partial');assert.equal(group.currentRendering,'unverified');
    if(group===predecessor.groups[index])return;changed++;assert.equal(group.family,'divider');
    const child=group.obligations.inputStyleStructure.boundedOutsideScalarOwnerInputs;
    assert.equal(child.marginInputs.wrappers.length,2);assert.equal(child.retainedLeafTypography.length,2);
    assert.equal(child.marginInputs.title.fontSize,'32px');assert.equal(child.remainingDomains.length,4);
    assert.equal(child.retainedInkContext.case,group.case);assert.equal(child.propertyTriage.rows.length,5);
    assert.equal(child.blockAlignmentContext.rows.length,5);assert.equal(child.blockAlignmentContext.generalPublicFindings.length,2);
    assert.match(child.blockAlignmentContext.boundary,/NOT an observed center failure/);
    if(child.ownerCursorPoints){cursorAliases++;assert.equal(child.ownerCursorPoints.observations.length,2);for(const row of child.ownerCursorPoints.observations)assert.equal(row.points.length,5);}
    assert.ok(child.marginInputs.wrappers.every(r=>r.inputEquivalent===false));
    const remaining={...group.obligations.inputStyleStructure};delete remaining.boundedOutsideScalarOwnerInputs;
    assert.deepEqual(remaining,predecessor.groups[index].obligations.inputStyleStructure);
  });assert.equal(changed,24);assert.equal(cursorAliases,8);
  assert.throws(()=>joinDividerOutsideOwnerEvidence(joined.review));
  assert.throws(()=>joinDividerOutsideOwnerEvidence(predecessor,file=>file.endsWith('divider-outside-owner-border-attribution-20261025.log')?Buffer.from('forged'):readFileSync(file)));
  assert.throws(()=>joinDividerOutsideOwnerEvidence(predecessor,file=>file.endsWith('divider-wrapper-leaf-typography-inputs-20261025.log')?Buffer.from('forged'):readFileSync(file)));
  assert.throws(()=>joinDividerOutsideOwnerEvidence(predecessor,file=>file.endsWith('divider-owner-block-alignment-context-20261025.log')?Buffer.from('forged'):readFileSync(file)));
  assert.throws(()=>joinDividerOutsideOwnerEvidence(predecessor,file=>file.endsWith('divider-owner-cursors-20261025.log')?Buffer.from('forged'):readFileSync(file)));
  const file=`artifacts/material-parity/working-audit/proposals/${joined.sha256}.json`;
  const bytes=Buffer.from(JSON.stringify({status:'proposal-not-canonical',sha256:joined.sha256,review:joined.review}));
  const read=(name,options)=>{
    if(path.resolve(name)!==path.resolve(file))return reader.read(name,options);
    const encoding=typeof options==='string'?options:options?.encoding;
    return encoding?bytes.toString(encoding):Buffer.from(bytes);
  };
  const loaded=loadCaseObligationReview(file,joined.sha256,joined.review.groups.map(g=>g.case),{root:process.cwd(),read});
  assert.equal(loaded.cases.length,2311);assert.equal(loaded.inspectionComplete,false);assert.equal(loaded.currentRenderingAccepted,false);
  console.log(JSON.stringify({dependencies:loaded.evidenceFingerprints.length,inspectionComplete:loaded.inspectionComplete,currentRenderingAccepted:loaded.currentRenderingAccepted,physicalProposalSaved:false}));
  console.log(JSON.stringify({reviewSha256:joined.sha256,predecessor:menuSelectDisabledReview,cases:joined.cases,physicalAliases:joined.physicalAliases,canonicalPublished:false}));
});
