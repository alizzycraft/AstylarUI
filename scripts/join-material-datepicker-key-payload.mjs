import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';

const base='artifacts/material-parity/working-audit';
const predecessor='23f01644f5662334094778ef0111f3ace85987eb0c5553701f3f3d67e019c091';
const hash=b=>createHash('sha256').update(b).digest('hex'),receipt=file=>({file,sha256:hash(readFileSync(file))});
const file='artifacts/material-parity/datepicker-key-payload-20261019/latest-report.json';
assert.equal(receipt(file).sha256,'6d905fb31ba815cc532240354ecb8544da7aaa65922aea8164de741893bcc066');
const report=JSON.parse(readFileSync(file)),verifyFile='artifacts/material-parity/datepicker-key-payload-bound-verify-20261019.log';
const verification=JSON.parse(readFileSync(verifyFile));assert.equal(verification.reportSha256,receipt(file).sha256);assert.equal(verification.cases,8);
const manifest=JSON.parse(readFileSync(report.capture.checkpointManifest.file));
assert.equal(receipt(report.capture.checkpointManifest.file).sha256,report.capture.checkpointManifest.sha256);
const build='artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser/';
const served=['chunk-JPEJK334.js','chunk-JPEJK334.js.map'].map(f=>receipt(build+f));
for(const item of served)assert.equal(manifest.provenance.browserFiles.find(r=>item.file.endsWith('/'+r.file))?.sha256,item.sha256);
const sourceFile='examples/material-showcase/src/app/astylar.component.ts',map=JSON.parse(readFileSync(served[1].file));
const indices=map.sources.flatMap((s,i)=>s==='src/app/astylar.component.ts'?[i]:[]);assert.equal(indices.length,1);
assert.equal(map.sourcesContent[indices[0]],readFileSync(sourceFile,'utf8'));
const owners=['datepicker-control','datepicker-input-region','datepicker-primary','datepicker-root','page'];
function check(row){
  for(const side of ['reference','astylar']){
    const obs=row[side].observations;assert.deepEqual(obs.map(o=>o.boundary),['before','after-focus','after-shortcut','settled']);
    assert.equal(obs[1].nativeCalendarContents,0);assert.equal(obs[1].candidateCalendarContents,0);
    for(const o of obs.slice(2)){assert.equal(o.nativeCalendarContents,side==='reference'?1:0);assert.equal(o.candidateCalendarContents,0);}
    const keys=obs.at(-1).events.filter(e=>e.type==='keydown'&&e.key==='ArrowDown');assert.equal(keys.length,1);
    assert.equal(keys[0].trusted,true);assert.equal(keys[0].altKey,true);
  }
  const ps=row.astylar.observations.at(-1).applicationKeyPayloads;
  assert.deepEqual(ps.map(p=>[p.id,p.key]),['Alt','ArrowDown'].flatMap(key=>owners.map(id=>[id,key])));
  for(const p of ps){assert.equal(p.targetId,'datepicker-control');assert.equal(p.type,'keydown');assert.equal(p.altKey,true);
    assert.equal(p.ctrlKey,false);assert.equal(p.shiftKey,false);assert.equal(p.metaKey,false);assert.equal(p.code,p.key==='Alt'?'AltLeft':'ArrowDown');}
}
let rejectedControls=0;
for(const row of report.results){check(row);for(const change of [
  r=>{r.astylar.observations.at(-1).applicationKeyPayloads[5].altKey=false;},
  r=>{r.astylar.observations.at(-1).applicationKeyPayloads[5].code='ArrowUp';},
  r=>{r.astylar.observations.at(-1).applicationKeyPayloads[5].id='wrong-owner';},
  r=>{r.astylar.observations.at(-1).candidateCalendarContents=1;},
  r=>{r.astylar.observations.at(-1).applicationKeyPayloads[6].ctrlKey=true;},
]){const altered=structuredClone(row);change(altered);assert.throws(()=>check(altered));rejectedControls++;}}
const review=JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`)).review;assert.equal(hash(JSON.stringify(review)),predecessor);
const modified=[];
for(const row of report.results){const key=`interaction:datepicker@${row.profile}/${row.viewport.id}/focus`,groups=review.groups.filter(g=>g.case===key);assert.equal(groups.length,1);
  const opening=groups[0].obligations.keyboardInteraction.altArrowDownOpening;assert.equal(opening.classification,'application-plugin-authoring-defect');assert.equal(opening.actualCallbackPayload,undefined);
  modified.push({opening,case:key});opening.actualCallbackPayload={disposition:'inspected-payload-delivery',
    conclusion:'Direct application callback arguments contain correct Alt/ArrowDown key/code/modifiers,targetId and five-handler bubbling sequence in these8 contexts. Native opens and candidate stays closed. This closes the prior recorder payload gap here and strengthens the mapped Escape-only application-route diagnosis,not a core key/modifier-loss diagnosis.',
    observations:{payloads:row.astylar.observations.at(-1).applicationKeyPayloads,referenceOpen:row.reference.observations.at(-1).nativeCalendarContents,candidateOpen:row.astylar.observations.at(-1).candidateCalendarContents},
    evidence:{report:receipt(file),verification:receipt(verifyFile),manifest:report.capture.checkpointManifest,source:receipt(sourceFile),served,
      pairedTrees:[row.reference.inputTree,row.astylar.inputTree],producer:receipt('scripts/join-material-datepicker-key-payload.mjs')},
    boundary:'Instrumented entry to existing authored key callback only;wrapper preserves original receiver,args and return but can affect timing. Earlier recorder limitations remain historical. No universal keyboard,disabled/calendar-navigation/paint/current-rendering or case closure claim.'};
}
assert.equal(modified.length,8);assert.equal(rejectedControls,40);
const proposed=saveReviewProposal(base,review),loaded=loadCaseObligationReview(proposed.file,proposed.sha256,review.groups.map(g=>g.case));
for(const {opening}of modified)delete opening.actualCallbackPayload;
assert.equal(hash(JSON.stringify(review)),predecessor);
console.log(JSON.stringify({predecessor,proposed,cases:modified.map(m=>m.case),rejectedControls,dependencyCount:loaded.evidenceFingerprints.length,allCases:loaded.cases.length,
  predecessorRecovered:true,appMappedSourceExact:true,scope:'Direct payload uncertainty closed for8 previously inspected shortcut contexts;no duplicate case credit or full rendering acceptance.'}));
