import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import ts from 'typescript';

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

export function createTimepickerProgrammaticFocusPriorRead({root,read}){
  const files=new Map([
    [path.resolve(root,'tests/material-parity/focus-action-scope.spec.mjs'),{old:'20b1abea5c4ec7b2bab6f2fad7fb3af6080fb2c1c05ff1106a2695ff716d7676',current:'4d79ebd4148d82ec8fb5a57bf546853e65c8b09278cb1e4d90fc31e871996660',kind:'focus'}],
    [path.resolve(root,'tests/material-parity/sort-arrow-geometry.spec.mjs'),{old:'8accd5980a5984603ed7256990ada1322d10b5040b34ff77829cc4715c5b34cb',current:'730fd78e51d52171e979150c0219552f37304c31f2baf0880602e236cdd46033',kind:'sort'}],
  ]);
  return(name,options)=>{
    const entry=files.get(path.resolve(root,name));if(!entry)return read(name,options);
    let source=read(name).toString().replaceAll('\r\n','\n');
    if(hash(source)!==entry.old){
      assert.equal(hash(source),entry.current,'Unrecognized post-package test source');
      if(entry.kind==='focus'){
        const tree=ts.createSourceFile('focus.mjs',source,99,true,ts.ScriptKind.JS);assert.equal(tree.parseDiagnostics.length,0);
        const additions=tree.statements.filter(n=>
          ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='node:child_process'||
          ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)&&n.expression.expression.getText(tree)==='test'&&
          ts.isStringLiteral(n.expression.arguments[0])&&n.expression.arguments[0].text.startsWith('supplementary Timepicker '));
        assert.equal(additions.length,4);
        for(const node of additions.toReversed())source=source.slice(0,node.getFullStart())+source.slice(node.end);
      }else{
        const current="  const base='artifacts/material-parity/working-audit',pointer={generation:'8848ae5b1ca0b18bc04116ebdd1eb2c360b7497a298e69fca9578df4a1b2b420',indexSha256:'3a73b61ec4e00539a62f17cf96f75c12bb29a74ae202a882ffdb2c55d73a118b'};\n  // Authenticate the retained predecessor, independently of the mutable current pointer.";
        const previous="  const base='artifacts/material-parity/working-audit',pointer=JSON.parse(readFileSync(base+'/current.json'));\n  assert.equal(pointer.generation,'8848ae5b1ca0b18bc04116ebdd1eb2c360b7497a298e69fca9578df4a1b2b420');";
        assert.equal(source.split(current).length,2);source=source.replace(current,previous);
      }
      assert.equal(hash(source),entry.old,'Complete frozen source must recover');
    }
    const encoding=typeof options==='string'?options:options?.encoding;return encoding?Buffer.from(source).toString(encoding):Buffer.from(source);
  };
}

export async function createTimepickerProgrammaticFocusReviewReader({root,read}){
  const {createSortArrowReviewReader,sortArrowReview}=await import('../tests/material-parity/sort-arrow-findings.mjs');
  assert.equal(sortArrowReview,timepickerProgrammaticFocusPredecessor);
  const priorRead=createTimepickerProgrammaticFocusPriorRead({root,read});
  const prior=createSortArrowReviewReader({root,read:priorRead,reviewSha256:sortArrowReview});
  const parentFile=path.resolve(root,`artifacts/material-parity/working-audit/proposals/${sortArrowReview}.json`);
  const parent=JSON.parse(prior.read(parentFile)).review,joined=joinTimepickerProgrammaticFocus(parent,read);
  const file=path.resolve(root,`artifacts/material-parity/working-audit/proposals/${joined.sha256}.json`);
  const bytes=Buffer.from(JSON.stringify({status:'proposal-not-canonical',sha256:joined.sha256,review:joined.review}));
  return {...joined,file,read(name,options){
    if(path.resolve(root,name)!==file)return prior.read(name,options);
    const encoding=typeof options==='string'?options:options?.encoding;return encoding?bytes.toString(encoding):Buffer.from(bytes);
  },sourceApplicability:{mode:'exact-supplementary-timepicker-dom-focus',restoredTestSources:2,
    predecessorApplicability:prior.sourceApplicability,boundary:'Exact complete historical test-source restoration only. Not current rendering,case closure or canonical publication.'}};
}
