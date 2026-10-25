import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const hash=b=>createHash('sha256').update(b).digest('hex');
export const timepickerProgrammaticFocusPredecessor='8554f8ef7d18ee02a80a409eddb7f96a1aad188983d124d49f9c9d556799f71e';
const key='supplementaryTimepickerDOMProgrammaticFocus';
export function restoreTimepickerProgrammaticFocus(review){return {...review,groups:review.groups.map(g=>{
  if(!g.obligations.programmaticFocus[key])return g;
  const focus={...g.obligations.programmaticFocus};delete focus[key];
  return {...g,obligations:{...g.obligations,programmaticFocus:focus}};
})};}
export function joinTimepickerProgrammaticFocus(parent,read=readFileSync){
  assert.equal(hash(JSON.stringify(parent)),timepickerProgrammaticFocusPredecessor);
  const receipt={file:'artifacts/material-parity/timepicker-programmatic-focus-20261025/latest-report.json',sha256:'4d4a445de38fa7f562a05f3ed35cd014deee8afd39d260d9fc738c99b38a123f'};
  const bytes=read(receipt.file);assert.equal(hash(bytes),receipt.sha256);const report=JSON.parse(bytes);
  const manifest=report.capture.checkpointManifest;
  const manifestBytes=read(manifest.file);assert.equal(hash(manifestBytes),manifest.sha256);
  const provenance=JSON.parse(manifestBytes).provenance;
  for(const r of [...provenance.harnessFiles,...provenance.diagnosticFiles])assert.equal(hash(read(r.file)),r.sha256);
  const action=report.actionSource.executedAction;
  assert.equal(action.kind,'supplementary-dom-programmatic-focus');assert.equal(hash(action.source),action.sha256);
  assert.equal(action.sha256,'a4fb089d153ebe5da08af46aaaa31a8bdbd91bd62dad64dba73a0b2bf3390ed1');
  assert.equal(hash(read(action.baseFile)),action.baseSha256);
  assert.deepEqual(report.results.map(r=>`${r.profile}/${r.viewport.id}`),
    ['light','dark','contrast','custom'].flatMap(p=>['desktop-dpr1','desktop-dpr2'].map(v=>`${p}/${v}`)));
  const rows=new Map();for(const row of report.results){
    assert.equal(row.family,'timepicker');assert.equal(row.state,'focus');
    const caseId=`interaction:timepicker@${row.profile}/${row.viewport.id}/focus`;
    assert.ok(!rows.has(caseId));rows.set(caseId,row);
    for(const side of ['reference','astylar']){
      const evidence=row[side];assert.deepEqual(evidence.runtime.errors,[]);
      for(const r of [evidence.inputTree,evidence.screenshot])assert.equal(hash(read(r.file)),r.sha256);
      assert.deepEqual(evidence.observations.map(o=>o.boundary),['before','after-action','settled']);
      assert.deepEqual(evidence.observations.map(o=>o.action),Array(3).fill(action.kind));
      assert.deepEqual(evidence.observations.map(o=>o.activeEqualsTarget),[false,true,true]);
      assert.deepEqual(evidence.observations.map(o=>o.popupCount),side==='reference'?[0,0,0]:[0,1,1]);
      for(const o of evidence.observations.slice(1))assert.equal(o.active.logicalId,'timepicker-control');
    }
  }
  const producer='scripts/join-material-timepicker-programmatic-focus.mjs',producerReceipt={file:producer,sha256:hash(read(producer))};
  let cases=0;const groups=parent.groups.map(g=>{
    const row=rows.get(g.case);if(!row)return g;cases++;
    assert.equal(g.inspection,'partial');assert.equal(g.currentRendering,'unverified');
    const focus=g.obligations.programmaticFocus;assert.equal(focus.disposition,'partial');assert.equal(focus[key],undefined);
    return {...g,obligations:{...g.obligations,programmaticFocus:{...focus,[key]:{
      disposition:'inspected-supplementary-programmatic-focus-failure',action:action.kind,
      observations:{reference:row.reference.observations,astylar:row.astylar.observations},
      finding:'fixture-tooltip-timepicker-focus-popup-state-mismatch',
      evidence:{report:receipt,manifest,producer:producerReceipt,actionRecipe:action,
        pairedTrees:{reference:row.reference.inputTree,astylar:row.astylar.inputTree},
        screenshots:{reference:row.reference.screenshot,astylar:row.astylar.screenshot}},
      boundary:'Eight supplementary initiating DOM focus() observations in retained served build. Not configured pointer action,Tab,public scene.focus(),Datepicker,mobile,paint,current-library or whole-case acceptance. Parent dispositions and all remaining tasks preserve.'
    }}}};
  });
  assert.equal(cases,8);const review={...parent,groups};
  assert.equal(hash(JSON.stringify(restoreTimepickerProgrammaticFocus(review))),timepickerProgrammaticFocusPredecessor);
  return {review,sha256:hash(JSON.stringify(review)),cases,addedChildren:8};
}
