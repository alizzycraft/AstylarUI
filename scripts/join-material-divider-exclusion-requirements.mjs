import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';

// Whole-case requirement review found missing receipt/conclusion fields on
// already-recorded exclusions. Reuse the existing actual classifier verbatim.
const base='artifacts/material-parity/working-audit';
const predecessor='7ed334d554be29f4f179922cc849d11a8db57e97d4964850c55ac1846b034440';
const hash=b=>createHash('sha256').update(b).digest('hex'),receipt=file=>({file,sha256:hash(readFileSync(file))});
const source='tests/material-parity/input-boundary-evidence.spec.mjs',text=readFileSync(source,'utf8'),ast=ts.createSourceFile(source,text,99,true,ts.ScriptKind.JS);
const tests=ast.statements.filter(n=>ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)&&n.expression.arguments[0]?.text==='passive state applicability joins exact cases without discarding progress focusability');
assert.equal(tests.length,1);const callback=tests[0].expression.arguments[1],found=[];
const visit=n=>{if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='inspect')found.push(n.initializer);ts.forEachChild(n,visit);};visit(callback);assert.equal(found.length,1);
const classifier=found[0].getText(ast),inspect=new Function('assert','return '+classifier)(assert);
for(const [type,attrs]of [['button',{}],['input',{}],['select',{}],['textarea',{}],['div',{tabindex:'0'}],['div',{contenteditable:'true'}],['div',{onclick:'activate()'}]])assert.throws(()=>inspect(type,attrs));
const review=JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`)).review;assert.equal(hash(JSON.stringify(review)),predecessor);
const names=['authoredActivation','authoredEditing','programmaticFocus'];
const conclusions={
  authoredActivation:'Recorded divider declarations contain passive paragraphs/spans and a separator,not an authored activation control. Ordinary DOM pointer-event delivery is not excluded or claimed absent.',
  authoredEditing:'Recorded divider declarations have no input,textarea,select or writable contenteditable owner. Text content is not an authored editable field.',
  programmaticFocus:'Recorded divider declarations contain no native focusable control,link target,tabindex owner or interactive callback attribute. Unlike determinate progress fixtures,no programmatic focus target is authored here.',
};
const modified=[];let nativeNodes=0,candidateNodes=0;
for(const group of review.groups.filter(g=>g.family==='divider')){
  const counts={};
  for(const side of ['reference','astylar']){
    const r=group.evidence.pairedTrees[side],b=readFileSync(r.file);assert.equal(hash(b),r.sha256);const tree=JSON.parse(b);assert.deepEqual(tree.errors,[]);
    counts[side]=tree.nodes.length;
    for(const node of tree.nodes){const attrs=side==='reference'?node.attributes:node.authored??{},type=side==='reference'?node.type:attrs.type;assert.equal(inspect(type,attrs),false);}
  }
  nativeNodes+=counts.reference;candidateNodes+=counts.astylar;
  for(const name of names){const obligation=group.obligations[name];assert.equal(obligation.applicability,'not-applicable');assert.equal(obligation.disposition,'inspected-authored-exclusion');
    assert.equal(obligation.evidence,undefined);assert.equal(obligation.conclusion,undefined);modified.push(obligation);
    obligation.conclusion=conclusions[name];
    obligation.evidence={pairedTrees:group.evidence.pairedTrees,classifierSource:receipt(source),producer:receipt('scripts/join-material-divider-exclusion-requirements.mjs')};
    obligation.recordedExclusionBoundary={nodeCounts:counts,classifierSha256:hash(classifier),
      scope:'Exact recorded authoring classifier only;not a rerun/pass claim for the combined original test,live events,current whole-source/runtime acceptance or complete case closure.'};
  }
}
assert.equal(modified.length,72);assert.equal(nativeNodes,216);assert.equal(candidateNodes,240);
const proposed=saveReviewProposal(base,review),loaded=loadCaseObligationReview(proposed.file,proposed.sha256,review.groups.map(g=>g.case));
for(const obligation of modified){delete obligation.conclusion;delete obligation.evidence;delete obligation.recordedExclusionBoundary;}
assert.equal(hash(JSON.stringify(review)),predecessor);
console.log(JSON.stringify({predecessor,proposed,cases:24,exclusionRecords:72,nativeNodes,candidateNodes,rejectedControls:7,
  classifierSha256:hash(classifier),dependencyCount:loaded.evidenceFingerprints.length,allCases:loaded.cases.length,predecessorRecovered:true,
  scope:'Receipt/conclusion linkage for existing exclusions only;five applicable obligation areas and all whole-case completion flags remain unchanged.'}));
