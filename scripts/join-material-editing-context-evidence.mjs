import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { materialInteractionCases } from '../tests/material-parity/benchmark.config.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
export const editingContextPredecessor='f812d8d9e169b51afd03ae43ea06f8b8ac69e6df5147f11589112919c6ef7083';
const child='supplementaryEditingContextCoverage';
export function restoreEditingContextEvidence(review){
  return {...review,groups:review.groups.map(g=>{
    if(!g.obligations.authoredEditing[child])return g;
    const authoredEditing={...g.obligations.authoredEditing};delete authoredEditing[child];
    return {...g,obligations:{...g.obligations,authoredEditing}};
  })};
}
export function joinEditingContextEvidence(predecessor,read=readFileSync){
  assert.equal(hash(JSON.stringify(predecessor)),editingContextPredecessor);
  const load=(directory,sha256)=>{
    const receipt={file:`artifacts/material-parity/${directory}/latest-report.json`,sha256};
    const bytes=read(receipt.file);assert.equal(hash(bytes),sha256);const data=JSON.parse(bytes);
    for(const row of data.results)for(const side of ['reference','astylar']){
      const r=row[side];assert.deepEqual(r.runtime.errors,[]);
      for(const q of [r.inputTree,r.screenshot].filter(Boolean))assert.equal(hash(read(q.file)),q.sha256);
    }
    assert.equal(hash(read(data.capture.checkpointManifest.file)),data.capture.checkpointManifest.sha256);
    return {receipt,data};
  };
  const original=load('disabled-control-boundaries-20261025','654ef78a448876e3ac4ad84673017e49ed0ea1eff527d4c5230f3c515dc2d6bc');
  const remaining=load('disabled-control-remaining-contexts-20261025','b59849e11047041d992617520323dd4b2fc7a02f537d511d4911d75024162006');
  const select=load('disabled-select-focused-contexts-20261025','436dd9625e30a42ef4bd49c3e6ce5c22524a6d2fa74017ea56275ef1c06a29c2');
  const readonly=load('select-readonly-focus-contexts-unique-outputs-20261025','06ff959a06ad3f85d0e9014079f4de98db904cd58039175d00187da82937d35f');
  const observations=new Map(),key=r=>`interaction:${r.family}@${r.profile}/${r.viewport.id}/${r.state}`;
  const add=(row,report,kind)=>{const k=key(row);assert.ok(!observations.has(k));observations.set(k,{row,report,kind});};
  for(const row of original.data.results.filter(r=>r.family!=='select'))add(row,original,'disabled-focus-pointer-key');
  for(const row of remaining.data.results)add(row,remaining,'disabled-focus-pointer-key');
  for(const row of select.data.results)add(row,select,'disabled-select-focused-key');
  for(const row of readonly.data.results)add(row,readonly,'readonly-select-mutation');
  const expected=materialInteractionCases.filter(r=>(['form-field','input','autocomplete','select','datepicker','timepicker'].includes(r.family)&&r.state==='disabled')||(r.family==='select'&&r.state==='focus')).map(key).sort();
  assert.equal(expected.length,56);assert.deepEqual([...observations.keys()].sort(),expected);
  let cases=0;
  const groups=predecessor.groups.map(g=>{
    const o=observations.get(g.case);if(!o)return g;cases++;
    assert.equal(g.obligations.authoredEditing[child],undefined);
    return {...g,obligations:{...g.obligations,authoredEditing:{...g.obligations.authoredEditing,
      [child]:{disposition:'inspected-supplementary-boundaries-only',case:g.case,kind:o.kind,
        physicalContext:{profile:o.row.profile,viewport:o.row.viewport},
        outcome:o.kind==='readonly-select-mutation'?'Native retains Team;candidate emits input(xTeam) before application selects Solo.':o.kind==='disabled-select-focused-key'?'Native accepts focus/trusted key but retains Team;candidate disabled input rejects focus and retains Team.':'Both controls reject observed focus and retain values through pointer/x with no input/change.',
        evidence:{report:o.report.receipt,manifest:o.report.data.capture.checkpointManifest,
          pairedTrees:{reference:o.row.reference.inputTree,astylar:o.row.astylar.inputTree}},
        boundary:'Exact supplementary context only,not original action replay,equal inputs,other keys,dynamic disable,paint,current package or whole-case closure. Every parent status and remaining task preserves.'}
    }}};
  });
  assert.equal(cases,56);const review={...predecessor,groups};
  assert.equal(hash(JSON.stringify(restoreEditingContextEvidence(review))),editingContextPredecessor);
  return {review,sha256:hash(JSON.stringify(review)),cases,addedChildren:cases};
}
