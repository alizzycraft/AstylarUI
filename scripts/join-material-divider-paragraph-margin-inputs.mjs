import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';

// Reuse captured property observations; do not promote isolated parser or flex
// reductions to a causal explanation for absolutely positioned paragraphs.
const base='artifacts/material-parity/working-audit';
const predecessor='98a56bda14164544899d20ee424c9440b985143e1fd42376239c3f9002ea819a';
const hash=b=>createHash('sha256').update(b).digest('hex'),receipt=file=>({file,sha256:hash(readFileSync(file))});
const read=r=>{const b=readFileSync(r.file);assert.equal(hash(b),r.sha256);return JSON.parse(b);};
const diagnostic='artifacts/material-parity/margin-relative-unit-owner-diagnostic-20261015.log';
assert.equal(receipt(diagnostic).sha256,'b11fc16b679a8758a71f52f6a42fd5865c839a34768dea7b7b4fa210051d74e7');
const review=JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`)).review;assert.equal(hash(JSON.stringify(review)),predecessor);
function observe(native,candidate,id){
  const leaves=native.nodes.filter(n=>n.attributes?.id===id);assert.equal(leaves.length,1);
  const paragraphs=native.nodes.filter(n=>n.key===leaves[0].parent);assert.equal(paragraphs.length,1);assert.equal(paragraphs[0].type,'p');
  const candidates=candidate.nodes.filter(n=>n.authored.id===id+'-row');assert.equal(candidates.length,1);assert.equal(candidates[0].authored.type,'p');
  const style=native.styles[paragraphs[0].style];assert.ok(style);
  const stages=['resolvedStyle','normalResolvedStyle','interactionResolvedStyle'].map(k=>({stage:k,margin:candidates[0][k]?.margin,position:candidates[0][k]?.position}));
  for(const s of stages){assert.equal(s.margin,'1em 0');assert.equal(s.position,'absolute');}
  assert.equal(style.position,'static');assert.equal(style.marginTop,style.fontSize);assert.equal(style.marginBottom,style.fontSize);
  assert.equal(style.marginLeft,'0px');assert.equal(style.marginRight,'0px');
  return {target:id,referenceKey:paragraphs[0].key,candidateKey:candidates[0].key,
    referenceUsed:{fontSize:style.fontSize,marginTop:style.marginTop,marginRight:style.marginRight,marginBottom:style.marginBottom,marginLeft:style.marginLeft,position:style.position},
    candidateRequests:stages,
    boundary:'Browser used margins versus candidate pre-layout requests are distinct stages. Numeric coincidence,UA rule authorship,actual positioned used margins and placement causality are not established.'};
}
const modified=[];let rejectedControls=0,pairs=0;
for(const group of review.groups.filter(g=>g.family==='divider')){
  const native=read(group.evidence.pairedTrees.reference),candidate=read(group.evidence.pairedTrees.astylar);
  const observations=['divider-above','divider-below'].map(id=>observe(native,candidate,id));pairs+=observations.length;
  const changed=structuredClone(candidate);changed.nodes.find(n=>n.authored.id==='divider-above-row').resolvedStyle.margin='16px 0';
  assert.throws(()=>observe(native,changed,'divider-above'));rejectedControls++;
  const altered=structuredClone(native),leaf=altered.nodes.find(n=>n.attributes?.id==='divider-below'),parent=altered.nodes.find(n=>n.key===leaf.parent);
  altered.styles[parent.style].marginTop='999px';assert.throws(()=>observe(altered,candidate,'divider-below'));rejectedControls++;
  const input=group.obligations.inputStyleStructure;assert.equal(input.disposition,'partial');assert.equal(input.retainedParagraphMarginInputs,undefined);
  modified.push({input,case:group.case});
  input.retainedParagraphMarginInputs={disposition:'inspected-recorded-stage-correspondence',observations,
    evidence:{pairedTrees:group.evidence.pairedTrees,historicalParserDiagnostic:receipt(diagnostic),producer:receipt('scripts/join-material-divider-paragraph-margin-inputs.mjs')},
    conclusion:'Both recorded paragraph owners request1em0 through all candidate stages;reference top/bottom used margins equal computed font size. Input stages are explicitly mapped,not assumed equivalent. Existing font-relative and positioned-margin findings require their own scope before causal attribution.',
    boundary:'All48 retained paragraph pairs only. No original UA margin rule,actual historical used-margin execution,public positioned-em reproduction,complete property/paint/currentness or case closure.'};
}
assert.equal(modified.length,24);assert.equal(pairs,48);assert.equal(rejectedControls,48);
const proposed=saveReviewProposal(base,review),loaded=loadCaseObligationReview(proposed.file,proposed.sha256,review.groups.map(g=>g.case));
for(const {input}of modified)delete input.retainedParagraphMarginInputs;
assert.equal(hash(JSON.stringify(review)),predecessor);
console.log(JSON.stringify({predecessor,proposed,cases:modified.map(m=>m.case),paragraphPairs:pairs,rejectedControls,
  dependencyCount:loaded.evidenceFingerprints.length,allCases:loaded.cases.length,predecessorRecovered:true,
  scope:'Recorded margin-stage evidence joined without parser/public recapture or false equivalence/causal attribution.'}));
