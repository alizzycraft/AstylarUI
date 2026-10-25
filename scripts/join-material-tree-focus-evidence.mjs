import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const hash=b=>createHash('sha256').update(b).digest('hex');
export const treeFocusPredecessor='45d3fb0779cfa4d53137cfbc47225791634874026936b1abb5135222dee75588';
const key='supplementaryTreeTabStopInputs',rawKey='supplementaryTreeNativeOwners';
export function restoreTreeFocusEvidence(review){
  return {...review,groups:review.groups.map(g=>{
    if(!g.obligations.inputStyleStructure[key])return g;
    const inputStyleStructure={...g.obligations.inputStyleStructure},authoredActivation={...g.obligations.authoredActivation};
    delete inputStyleStructure[key];delete authoredActivation[rawKey];
    return {...g,obligations:{...g.obligations,inputStyleStructure,authoredActivation}};
  })};
}
export function joinTreeFocusEvidence(parent,read=readFileSync){
  assert.equal(hash(JSON.stringify(parent)),treeFocusPredecessor);
  const load=(file,sha256)=>{const bytes=read(file);assert.equal(hash(bytes),sha256);return{receipt:{file,sha256},data:JSON.parse(bytes)};};
  const original=load('artifacts/material-parity/current-full-20261005/latest-report.json','ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const raw=load('artifacts/material-parity/tree-pointer-tabstop-20261025/latest-report.json','117f3f9e1813a5b83bc1d545eb3e5dc69262cc58eaafac9d116402fe00f722a9');
  assert.equal(raw.data.results.length,1);
  assert.equal(hash(read(raw.data.capture.checkpointManifest.file)),raw.data.capture.checkpointManifest.sha256);
  const rows=new Map();
  for(const [kind,results]of [['static',original.data.results],['interaction',original.data.interactions]])for(const r of results.filter(r=>r.family==='tree')){
    const id=`${kind}:tree@${r.profile}/${r.viewport.id}${r.state?'/'+r.state:''}`,pointer=['held','activate','activate-leave'].includes(r.state),vectors={};
    for(const side of ['reference','astylar']){
      const receipt=r.inputTrees[side],bytes=read(receipt.file);assert.equal(hash(bytes),receipt.sha256);
      const nodes=JSON.parse(bytes).nodes.filter(n=>side==='reference'?n.attributes?.role==='treeitem':n.authored?.role==='treeitem');
      assert.equal(nodes.length,3);vectors[side]=nodes.map(n=>Number(side==='reference'?n.attributes.tabindex:n.authored.tabindex));
      assert.deepEqual(vectors[side],side==='reference'&&pointer?[-1,0,-1]:[0,-1,-1]);
    }
    assert.ok(!rows.has(id));rows.set(id,{row:r,pointer,vectors});
  }
  assert.equal(rows.size,52);let cases=0,rawCases=0;
  const groups=parent.groups.map(g=>{
    const o=rows.get(g.case);if(!o)return g;cases++;
    assert.equal(g.inspection,'partial');assert.equal(g.currentRendering,'unverified');
    assert.equal(g.obligations.inputStyleStructure[key],undefined);
    let authoredActivation=g.obligations.authoredActivation;
    if(g.case==='interaction:tree@light/desktop-dpr1/activate'){
      rawCases++;assert.equal(authoredActivation[rawKey],undefined);const r=raw.data.results[0];
      assert.equal(r.family,'tree');assert.equal(r.profile,'light');assert.equal(r.state,'activate');assert.equal(r.viewport.deviceScaleFactor,1);
      for(const side of ['reference','astylar']){
        assert.deepEqual(r[side].runtime.errors,[]);
        for(const receipt of [r[side].inputTree,r[side].screenshot])assert.equal(hash(read(receipt.file)),receipt.sha256);
        for(const b of r[side].observations.slice(1,3))assert.equal(b.active.logicalId,'tree-item-1');
      }
      authoredActivation={...authoredActivation,[rawKey]:{disposition:'inspected-supplementary-pointer-focus-only',
        evidence:{report:raw.receipt,manifest:raw.data.capture.checkpointManifest},
        conclusion:'Both actual pointer-focus owners are Projects;candidate DOM preserves its fixed authored tab indices. Supplementary traversal is under unequal inputs.',
        boundary:'One retained-build context,not held timing,all keys,paint,current source or case closure.'}};
    }
    return {...g,obligations:{...g.obligations,authoredActivation,inputStyleStructure:{...g.obligations.inputStyleStructure,
      [key]:{disposition:'inspected-tabstop-input-property-only',tabindex:o.vectors,
        classification:o.pointer?'application-plugin-authoring-defect':'equivalent-representation',
        finding:o.pointer?'fixture-tree-tabstop-remains-first-after-pointer-focus':null,
        evidence:{report:original.receipt,pairedTrees:o.row.inputTrees},
        boundary:'Original native runtime DOM attributes versus candidate authored input. Not all styles,raw held owner,current source,paint or whole-case acceptance.'}}}};
  });
  assert.equal(cases,52);assert.equal(rawCases,1);const review={...parent,groups};
  assert.equal(hash(JSON.stringify(restoreTreeFocusEvidence(review))),treeFocusPredecessor);
  return{review,sha256:hash(JSON.stringify(review)),cases,addedChildren:53};
}
