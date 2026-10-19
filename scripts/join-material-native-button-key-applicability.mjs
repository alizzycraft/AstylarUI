import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';

const base='artifacts/material-parity/working-audit';
const predecessor='348b80b9476da74518e08dd4fe8b8da16c4a83981260e71838aacd59bfbed43b';
const hash=b=>createHash('sha256').update(b).digest('hex'),receipt=file=>({file,sha256:hash(readFileSync(file))});
const referenceFile='examples/material-showcase/src/app/reference.component.ts',candidateFile='examples/material-showcase/src/app/astylar.component.ts';
const reference=readFileSync(referenceFile,'utf8'),candidate=readFileSync(candidateFile,'utf8');
const ast=ts.createSourceFile(candidateFile,candidate,99,true,ts.ScriptKind.TS);assert.equal(ast.parseDiagnostics.length,0);
const controls={core:'core-primary',toolbar:'toolbar-action',card:'card-open'},authored={};
for(const [family,id]of Object.entries(controls)){
  const tags=[...reference.matchAll(/<button\b[^>]*>/g)].map(m=>m[0]).filter(tag=>tag.includes(`id="${id}"`));assert.equal(tags.length,1);
  assert.ok(!/\((?:keydown|keyup|keypress)\)/.test(tags[0]));
  const objects=[];const visit=n=>{
    if(ts.isObjectLiteralExpression(n)){
      const fields=Object.fromEntries(n.properties.filter(ts.isPropertyAssignment).filter(p=>ts.isStringLiteral(p.initializer))
        .map(p=>[p.name.getText(ast),p.initializer.text]));
      if(fields.id===id&&fields.type==='button')objects.push(n.getText(ast));
    }ts.forEachChild(n,visit);
  };visit(ast);assert.equal(objects.length,1);
  authored[family]={id,nativeOpeningTag:tags[0],candidateRecord:objects[0]};
}
const review=JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`)).review;assert.equal(hash(JSON.stringify(review)),predecessor);
const modified=[],task='other applicable keys/action boundaries and local paint';let rejectedControls=0;
function checkSteps(observations){
  for(const side of ['reference','astylar'])assert.deepEqual(observations[side].steps.map(s=>s.key),['Tab','Enter','Space']);
}
for(const group of review.groups.filter(g=>Object.hasOwn(controls,g.family)&&g.obligations.keyboardInteraction)){
  const keyboard=group.obligations.keyboardInteraction,evidence=keyboard.supplementaryKeyboard.evidence;
  assert.equal(receipt(evidence.log.file).sha256,evidence.log.sha256);checkSteps(evidence.observations);
  const altered=structuredClone(evidence.observations);altered.astylar.steps.pop();assert.throws(()=>checkSteps(altered));rejectedControls++;
  assert.equal(keyboard.nativeButtonKeyApplicability,undefined);assert.ok(keyboard.remaining.includes(task));
  modified.push({keyboard,remaining:structuredClone(keyboard.remaining),case:group.case});
  keyboard.nativeButtonKeyApplicability={disposition:'inspected-authored-control-applicability',authored:authored[group.family],
    relevantRecordedKeys:['Tab','Enter','Space'],
    conclusion:'The action target is the authored native button,not toolbar/card container or a composite navigation widget. Existing exact cohort already records Tab and Enter/Space activation. Do not invent composite arrow/Home/End navigation requirements for these fixtures.',
    evidence:{reference:receipt(referenceFile),candidate:receipt(candidateFile),retainedKeyboard:evidence.log,producer:receipt('scripts/join-material-native-button-key-applicability.mjs')},
    boundary:'Source/control applicability and retained key membership only. Does not certify full event order,release/held intermediate behavior,reverse traversal,focus/ripple paint,disabled variants or current rendering. Remaining action/input/semantic obligations survive.'};
  keyboard.remaining=keyboard.remaining.map(s=>s===task?'Action-boundary event/focus and local paint beyond retained native-button Tab/Enter/Space observations':s);
}
assert.equal(modified.length,24);assert.equal(rejectedControls,24);
const proposed=saveReviewProposal(base,review),loaded=loadCaseObligationReview(proposed.file,proposed.sha256,review.groups.map(g=>g.case));
for(const {keyboard,remaining}of modified){delete keyboard.nativeButtonKeyApplicability;keyboard.remaining=remaining;}
assert.equal(hash(JSON.stringify(review)),predecessor);
console.log(JSON.stringify({predecessor,proposed,cases:modified.map(m=>m.case),authored,rejectedControls,dependencyCount:loaded.evidenceFingerprints.length,
  allCases:loaded.cases.length,predecessorRecovered:true,scope:'Bound native-button applicability,not new key capture,scope reduction or whole-case closure.'}));
