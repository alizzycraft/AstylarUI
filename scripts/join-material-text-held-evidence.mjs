import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const hash=b=>createHash('sha256').update(b).digest('hex');
export const textHeldPredecessor='043361b010508502f4c2be7b7f2b9bf21059e8f2cb71c503d91b61a29b34dadd';
const rawKey='supplementaryTextHeldOwners',focusKey='supplementaryTextHeldFocus',causeKey='supplementaryTextHeldReleaseCause';
export function restoreTextHeldEvidence(review){
  return {...review,groups:review.groups.map(g=>{
    if(!g.obligations.authoredActivation[rawKey])return g;
    const activation={...g.obligations.authoredActivation},focus={...g.obligations.programmaticFocus};
    assert.equal(activation.disposition,'partial');assert.equal(focus.disposition,'partial');
    delete activation[rawKey];delete activation[causeKey];delete focus[focusKey];
    activation.disposition='evidence-join-pending';focus.disposition='evidence-join-pending';
    return {...g,obligations:{...g.obligations,authoredActivation:activation,programmaticFocus:focus}};
  })};
}
export function joinTextHeldEvidence(parent,read=readFileSync){
  assert.equal(hash(JSON.stringify(parent)),textHeldPredecessor);
  const load=(directory,sha256)=>{
    const receipt={file:`artifacts/material-parity/${directory}/latest-report.json`,sha256};
    const bytes=read(receipt.file);assert.equal(hash(bytes),sha256);const data=JSON.parse(bytes);
    assert.equal(hash(read(data.capture.checkpointManifest.file)),data.capture.checkpointManifest.sha256);
    for(const row of data.results)for(const side of ['reference','astylar']){
      assert.deepEqual(row[side].runtime.errors,[]);
      for(const r of [row[side].inputTree,row[side].screenshot])assert.equal(hash(read(r.file)),r.sha256);
    }
    return {receipt,data};
  };
  const raw=load('text-control-held-focus-20261025','b4899d94b58f2aed5d7a51557b6461778e6a6a1a32749b6a616817c3618b3e2e');
  const trace=load('text-held-event-order-20261025','7a1ec887eb360d636a43585e739155d41b011cb7e73589da902df7725a8e222c');
  assert.equal(raw.data.results.length,16);assert.equal(trace.data.results.length,1);
  const key=r=>`interaction:${r.family}@${r.profile}/${r.viewport.id}/${r.state}`;
  const rows=new Map(raw.data.results.map(r=>[key(r),r]));assert.equal(rows.size,16);
  const cause=trace.data.results[0],causeCase=key(cause);assert.equal(causeCase,'interaction:input@light/desktop-dpr1/held');
  const producer='scripts/join-material-text-held-evidence.mjs',producerReceipt={file:producer,sha256:hash(read(producer))};
  let changed=0;
  const groups=parent.groups.map(g=>{
    const r=rows.get(g.case);if(!r)return g;changed++;
    assert.match(g.case,/^interaction:(input|form-field)@(light|dark|contrast|custom)\/desktop-dpr[12]\/held$/);
    assert.equal(g.inspection,'partial');assert.equal(g.currentRendering,'unverified');
    const a=g.obligations.authoredActivation,f=g.obligations.programmaticFocus;
    assert.equal(a.disposition,'evidence-join-pending');assert.equal(f.disposition,'evidence-join-pending');
    assert.equal(a[rawKey],undefined);assert.equal(f[focusKey],undefined);
    for(const side of ['reference','astylar'])for(const o of r[side].observations.slice(1)){
      assert.equal(o.active.tag,'INPUT');assert.equal(o.active.logicalId,r.family+'-control');
      assert.equal(o.activeEqualsTarget,true);assert.equal(o.activeWithinHost,true);
      assert.equal(o.events.filter(e=>e.type==='pointerdown'&&e.trusted&&e.buttons===1).length,1);
      assert.equal(o.events.filter(e=>['pointerup','pointercancel'].includes(e.type)).length,0);
    }
    const activation={...a,disposition:'partial',[rawKey]:{
      disposition:'inspected-supplementary-held-endpoints-only',case:g.case,
      observations:{reference:r.reference.observations,astylar:r.astylar.observations},
      evidence:{report:raw.receipt,manifest:raw.data.capture.checkpointManifest,producer:producerReceipt},
      boundary:'Raw input owners at pointerdown/held-settled only;post-release trees/screenshots are not held paint. Not complete events,original timing,current rendering or whole-case acceptance.'}};
    if(g.case===causeCase){
      for(const o of cause.astylar.observations.slice(1)){
        assert.equal(o.events.filter(e=>['pointerup','pointercancel'].includes(e.type)).length,0);
        assert.deepEqual(o.publicEvents.filter(e=>['pointerdown','pointerup','click'].includes(e.type)).map(e=>e.type),['pointerdown','pointerup','click']);
      }
      activation[causeKey]={disposition:'inspected-one-supplementary-core-mechanism',case:g.case,
        firstDivergence:'Semantic INPUT focus blurs canvas;Babylon device blur generates public release/click before native release.',
        evidence:{report:trace.receipt,manifest:trace.data.capture.checkpointManifest,producer:producerReceipt},
        boundary:'One instrumented retained-build action;not original October5 cause,all16 mechanisms,equal-input whole-case,current-library or held-paint acceptance.'};
    }
    return {...g,obligations:{...g.obligations,authoredActivation:activation,programmaticFocus:{...f,disposition:'partial',
      [focusKey]:{disposition:'inspected-pointer-held-focus-only',case:g.case,sourceObligation:`authoredActivation.${rawKey}`,
        evidence:{report:raw.receipt,producer:producerReceipt},
        boundary:'Pointer-held input endpoints only;programmatic/keyboard focus and continuity need their own evidence. All parent remaining work preserves.'}}}};
  });
  assert.equal(changed,16);const review={...parent,groups};
  assert.equal(hash(JSON.stringify(restoreTextHeldEvidence(review))),textHeldPredecessor);
  return {review,sha256:hash(JSON.stringify(review)),cases:16,addedChildren:33};
}
