import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';

const base='artifacts/material-parity/working-audit';
const predecessor='0889e9db2a685f69fd2ae64e809264437bf05f10565ba25b59448dba6543adfa';
const hash=b=>createHash('sha256').update(b).digest('hex'),receipt=file=>({file,sha256:hash(readFileSync(file))});
const reportFile='artifacts/material-parity/choice-ax-bound-20261019/latest-report.json';
assert.equal(receipt(reportFile).sha256,'c9e1279cd761d7ef299affe9f55b30cf2453f30be6efc470ce87ff26469958c6');
const report=JSON.parse(readFileSync(reportFile));
const verifyFile='artifacts/material-parity/choice-ax-bound-independent-verify-20261019.log',verification=JSON.parse(readFileSync(verifyFile));
assert.equal(verification.reportSha256,receipt(reportFile).sha256);assert.equal(verification.cases,16);assert.equal(verification.targetObservations,64);
assert.equal(receipt(report.sourcePredecessor.file).sha256,report.sourcePredecessor.sha256);
const manifest=JSON.parse(readFileSync(report.capture.checkpointManifest.file));
const build='artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser/';
const served=['chunk-JPEJK334.js','chunk-JPEJK334.js.map'].map(f=>receipt(build+f));
for(const item of served)assert.equal(manifest.provenance.browserFiles.find(r=>item.file.endsWith('/'+r.file))?.sha256,item.sha256);
const sourceFile='examples/material-showcase/src/app/astylar.component.ts',map=JSON.parse(readFileSync(served[1].file));
const indices=map.sources.flatMap((s,i)=>s==='src/app/astylar.component.ts'?[i]:[]);assert.equal(indices.length,1);
assert.equal(map.sourcesContent[indices[0]],readFileSync(sourceFile,'utf8'));
const main=t=>{const found=t.nodes.filter(n=>n.backendDOMNodeId===t.backendNodeId);assert.equal(found.length,1);return found[0];};
function signature(t){const n=main(t);return{ignored:n.ignored,role:n.role?.value,name:n.name?.value,
  properties:Object.fromEntries(['checked','focused','focusable','required'].map(key=>[key,n.properties?.find(p=>p.name===key)?.value.value??null]))};}
function check(row){
  for(const key of Object.keys(row.reference.ax)){
    const native=row.reference.ax[key],candidate=row.astylar.ax[key];
    assert.deepEqual(signature(candidate),signature(native));
    assert.equal(native.dom.focused,candidate.dom.focused);
    const expected=key==='group'?['radiogroup','']:key==='checkbox'?['checkbox','Include archived']:['radio',key==='solo'?'Solo':'Team'];
    assert.deepEqual([main(native).role.value,main(native).name.value],expected);
    if(key!=='group'){
      assert.equal(main(native).properties.find(p=>p.name==='checked').value.value,String(native.dom.checked));
      assert.equal(main(candidate).properties.find(p=>p.name==='checked').value.value,candidate.dom.ariaChecked);
      assert.ok(main(native).name.sources.some(s=>s.nativeSource==='labelfor'&&s.nativeSourceValue.relatedNodes.some(n=>n.backendDOMNodeId>0)));
      assert.ok(native.dom.labels.some(l=>l.text.trim()===expected[1]));
    }
  }
}
let rejectedControls=0;
for(const row of report.results){
  check(row);
  const changed=structuredClone(row),key=row.family==='radio'?'solo':'checkbox';
  main(changed.astylar.ax[key]).properties.find(p=>p.name==='checked').value.value='mixed';
  assert.throws(()=>check(changed));rejectedControls++;
  const renamed=structuredClone(row);main(renamed.astylar.ax[key]).name.value='wrong label';
  assert.throws(()=>check(renamed));rejectedControls++;
}
const review=JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`)).review;assert.equal(hash(JSON.stringify(review)),predecessor);
const modified=[],task='Actual AX/description/target associations and full semantic/currentness disposition beyond DOM comparator';
for(const row of report.results){
  const key=`interaction:${row.family}@${row.profile}/${row.viewport.id}/focus`,groups=review.groups.filter(g=>g.case===key);assert.equal(groups.length,1);
  const semantics=groups[0].obligations.semantics;assert.equal(semantics.disposition,'partial');assert.equal(semantics.actualChoiceFocusAX,undefined);
  assert.ok(semantics.remaining.includes(task));modified.push({semantics,remaining:structuredClone(semantics.remaining),case:key});
  semantics.actualChoiceFocusAX={disposition:'inspected-endpoint-exposure-agreement',
    conclusion:'Actual AX role,name,checked,focused,focusable and group-required properties agree at the exact settled configured focus endpoint. Native label-for naming versus candidate aria-label/content remains a distinct representation;native-input default actions and keyboard failure are not inferred equivalent.',
    observations:Object.fromEntries(['reference','astylar'].map(side=>[side,Object.fromEntries(Object.entries(row[side].ax).map(([key,t])=>[key,{signature:signature(t),dom:t.dom,nameSources:main(t).name.sources,properties:main(t).properties}]))])),
    evidence:{report:receipt(reportFile),verification:receipt(verifyFile),manifest:report.capture.checkpointManifest,pairedTrees:[row.reference.inputTree,row.astylar.inputTree],
      source:receipt(sourceFile),served,producer:receipt('scripts/join-material-choice-ax.mjs')},
    boundary:'Sixteen configured focus endpoints only. Full raw AX relatives and differing invalid/label associations remain in report. No AT behavior,post-activation/disabled exposure,whole semantic equivalence,current whole-package rendering or case closure.'};
  semantics.remaining=semantics.remaining.map(s=>s===task?'AX/description/target associations beyond the inspected configured choice-focus endpoints and full semantic/currentness disposition':s);
}
assert.equal(modified.length,16);
const proposed=saveReviewProposal(base,review),loaded=loadCaseObligationReview(proposed.file,proposed.sha256,review.groups.map(g=>g.case));
for(const {semantics,remaining}of modified){delete semantics.actualChoiceFocusAX;semantics.remaining=remaining;}
assert.equal(hash(JSON.stringify(review)),predecessor);
console.log(JSON.stringify({predecessor,proposed,cases:modified.map(m=>m.case),rejectedControls,dependencyCount:loaded.evidenceFingerprints.length,
  allCases:loaded.cases.length,predecessorRecovered:true,mappedAuthoringExact:true,
  scope:'Actual AX exposure gap bounded across16 focus endpoints;no rendering or whole-case closure.'}));
