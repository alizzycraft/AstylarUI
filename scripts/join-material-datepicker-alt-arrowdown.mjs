import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { sourceAuditDefinitions } from '../tests/material-parity/input-equivalence-policy.mjs';

const base='artifacts/material-parity/working-audit',predecessor='a5f37bcdbc0266b5dfa06693aaa4e8e4dc6ce45821820b48508f23df1e261539';
const hash=b=>createHash('sha256').update(b).digest('hex'),receipt=file=>({file,sha256:hash(readFileSync(file))});
const reportFile='artifacts/material-parity/datepicker-alt-arrowdown-bound-20261019/latest-report.json';
assert.equal(receipt(reportFile).sha256,'b898770f469b813d937f4b1c6e4cd370f489d5b4e323aebebb548a99a85e534c');
const report=JSON.parse(readFileSync(reportFile)),verifyFile='artifacts/material-parity/datepicker-alt-arrowdown-independent-verify-20261019.log';
const verification=JSON.parse(readFileSync(verifyFile));assert.equal(verification.cases,8);assert.equal(verification.reportSha256,receipt(reportFile).sha256);
const manifest=JSON.parse(readFileSync(report.capture.checkpointManifest.file));
const build='artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser/';
const chunks=['chunk-JPEJK334.js','chunk-JPEJK334.js.map','chunk-7SL66K3U.js','chunk-7SL66K3U.js.map'].map(f=>receipt(build+f));
for(const r of chunks)assert.equal(manifest.provenance.browserFiles.find(a=>r.file.endsWith('/'+a.file))?.sha256,r.sha256);
const mapped=(mapFile,suffix)=>{const map=JSON.parse(readFileSync(mapFile)),indices=map.sources.flatMap((s,i)=>s.endsWith(suffix)?[i]:[]);assert.equal(indices.length,1);return map.sourcesContent[indices[0]];};
const appFile='examples/material-showcase/src/app/astylar.component.ts',app=readFileSync(appFile,'utf8');
assert.equal(mapped(chunks[1].file,'src/app/astylar.component.ts'),app);
const nativeFile='examples/material-showcase/node_modules/@angular/material/fesm2022/datepicker.mjs',native=readFileSync(nativeFile,'utf8');
function method(source,cls,name){const ast=ts.createSourceFile('owner',source,99,true,ts.ScriptKind.TS),found=[];
  const visit=n=>{if(ts.isClassDeclaration(n)&&n.name?.text===cls)for(const m of n.members)if(m.name?.getText(ast)===name)found.push(m.getText(ast));ts.forEachChild(n,visit);};
  visit(ast);assert.equal(found.length,1);return found[0];}
function tokens(source){const s=ts.createScanner(99,true,ts.LanguageVariant.Standard,source),out=[];for(let t=s.scan();t!==ts.SyntaxKind.EndOfFileToken;t=s.scan())out.push([t,s.getTokenText()]);return out;}
const nativeMethod=method(native,'MatDatepickerInputBase','_onKeydown'),mappedMethod=method(mapped(chunks[3].file,'node_modules/@angular/material/fesm2022/datepicker.mjs'),'MatDatepickerInputBase','_onKeydown');
// Captured source omits optional parentheses around the single untyped arrow
// parameter. Reverse only this exact syntax difference; all other tokens stay.
assert.equal(nativeMethod.split('.every((modifier) =>').length,2);
const normalizedNativeMethod=nativeMethod.replace('.every((modifier) =>','.every(modifier =>');
assert.deepEqual(tokens(normalizedNativeMethod),tokens(mappedMethod));
const appMethod=method(app,'AstylarShowcaseComponent','handleKeydown');
assert.match(appMethod,/event\.key !== 'Escape'/);assert.ok(!appMethod.includes('ArrowDown'));
const definition=sourceAuditDefinitions.find(d=>d.id==='fixture-composite-keyboard-handler-omits-activation-and-navigation');
assert.equal(definition.classification,'application-plugin-authoring-defect');
function check(row){
  for(const side of ['reference','astylar']){
    const obs=row[side].observations;assert.deepEqual(obs.map(o=>o.boundary),['before','after-focus','after-alt-arrowdown','settled']);
    assert.equal(obs[1].state.nativeCalendarContents,0);assert.equal(obs[1].state.candidateCalendarContents,0);
    const keys=obs.at(-1).events.filter(e=>e.type==='keydown'&&e.key==='ArrowDown');assert.equal(keys.length,1);
    assert.equal(keys[0].trusted,true);assert.equal(keys[0].altKey,true);assert.equal(keys[0].ctrlKey,false);assert.equal(keys[0].shiftKey,false);assert.equal(keys[0].metaKey,false);
    assert.equal(keys[0].target.tag,'INPUT');
    for(const o of obs.slice(2)){assert.equal(o.state.nativeCalendarContents,side==='reference'?1:0);assert.equal(o.state.candidateCalendarContents,0);}
  }
  const typed=row.astylar.observations.at(-1).retainedTypedEvents.filter(e=>e.type==='keydown');assert.equal(typed.length,2);
  assert.ok(typed.every(e=>e.targetId==='datepicker-control'));
}
let rejectedControls=0;for(const row of report.results){check(row);for(const change of [r=>{r.astylar.observations.at(-1).state.candidateCalendarContents=1;},r=>{r.reference.observations.at(-1).events.find(e=>e.key==='ArrowDown'&&e.type==='keydown').altKey=false;}]){
  const altered=structuredClone(row);change(altered);assert.throws(()=>check(altered));rejectedControls++;}}
const review=JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`)).review;assert.equal(hash(JSON.stringify(review)),predecessor);
const modified=[],task='other applicable keys/action boundaries and local paint';
for(const row of report.results){const key=`interaction:datepicker@${row.profile}/${row.viewport.id}/focus`,groups=review.groups.filter(g=>g.case===key);assert.equal(groups.length,1);
  const keyboard=groups[0].obligations.keyboardInteraction;assert.ok(keyboard.remaining.includes(task));assert.equal(keyboard.altArrowDownOpening,undefined);
  modified.push({keyboard,remaining:structuredClone(keyboard.remaining),case:key});
  keyboard.altArrowDownOpening={disposition:'inspected-failure',classification:definition.classification,definition:definition.id,owner:definition.owner,
    conclusion:'Focus leaves both calendars closed. Trusted Alt+ArrowDown opens reference calendar only;candidate DOM receives exact keys and application callback records two keydowns on datepicker-control. Current/mapped authored handler routes only Escape,omitting native shortcut intent. This extends existing authoring finding,not proven core modifier-payload failure.',
    evidence:{report:receipt(reportFile),verification:receipt(verifyFile),manifest:report.capture.checkpointManifest,pairedTrees:[row.reference.inputTree,row.astylar.inputTree],
      appSource:receipt(appFile),nativeSource:receipt(nativeFile),served:chunks,producer:receipt('scripts/join-material-datepicker-alt-arrowdown.mjs')},
    nativeMethodTokenSha256:hash(JSON.stringify(tokens(normalizedNativeMethod))),nativeMethodNormalization:'Only exact .every((modifier) => to .every(modifier => single untyped parameter parentheses removal;all other method tokens agree.',appMethodSha256:hash(appMethod),
    boundary:'Eight enabled desktop focus-plus-shortcut contexts. Native complete owning method tokens agree after one explicit syntax-only arrow-parameter normalization,not whole module bytes. App whole source matches captured map;typed callback does not retain key/modifier payload. No timepicker/date pointer behavior,calendar navigation,paint,current rendering or whole-case closure.'};
  keyboard.remaining=keyboard.remaining.map(s=>s===task?'Other applicable calendar keys/action boundaries and local paint beyond inspected Alt+ArrowDown opening':s);
}
assert.equal(modified.length,8);assert.equal(rejectedControls,16);
const proposed=saveReviewProposal(base,review),loaded=loadCaseObligationReview(proposed.file,proposed.sha256,review.groups.map(g=>g.case));
for(const {keyboard,remaining}of modified){delete keyboard.altArrowDownOpening;keyboard.remaining=remaining;}
assert.equal(hash(JSON.stringify(review)),predecessor);
console.log(JSON.stringify({predecessor,proposed,cases:modified.map(m=>m.case),rejectedControls,dependencyCount:loaded.evidenceFingerprints.length,allCases:loaded.cases.length,
  predecessorRecovered:true,nativeOwnerTokensAgree:true,appMappedSourceExact:true,scope:'Existing authoring finding gains8 date keyboard-opening failures;no core transport or rendering acceptance claim.'}));
