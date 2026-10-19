import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';

const base='artifacts/material-parity/working-audit',file='examples/material-showcase/src/app/astylar.component.ts';
const predecessor='968a619813530c5f5be9e6edf1257265dc4bf8578cf887d1c1df5b8fd8c3adc2';
const hash=b=>createHash('sha256').update(b).digest('hex'),receipt=file=>({file,sha256:hash(readFileSync(file))});
const names=['MATERIAL_REFERENCE_HEIGHTS','MATERIAL_COMPACT_REFERENCE_HEIGHTS','MATERIAL_CONTRAST_REFERENCE_HEIGHTS'];
function inspect(bytes){
  const source=bytes.toString().replaceAll('\r\n','\n'),ast=ts.createSourceFile(file,source,99,true,ts.ScriptKind.TS);
  assert.equal(ast.parseDiagnostics.length,0);
  const helper=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='materialReferenceHeight');assert.equal(helper.length,1);
  const variables=new Map(),heightBindings=[];
  const visit=n=>{
    if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name))variables.set(n.name.text,n);
    if(ts.isPropertyAssignment(n)&&n.name.getText(ast)==='height'&&n.initializer.getText(ast)==='`${referenceHeight}px`')heightBindings.push(n);
    ts.forEachChild(n,visit);
  };visit(ast);assert.equal(heightBindings.length,1);
  const tables=names.map(name=>{
    const declaration=variables.get(name);assert.ok(declaration);
    const object=declaration.initializer.arguments?.[0];assert.ok(object&&ts.isObjectLiteralExpression(object));
    const found=object.properties.filter(p=>p.name?.getText(ast)==='divider');assert.equal(found.length,1);
    assert.equal(found[0].initializer.getText(ast),String([161,176.5625,152.5625][names.indexOf(name)]));
    return {name,declaration,divider:Number(found[0].initializer.getText(ast))};
  });
  const js=ts.transpileModule(helper[0].getText(ast)+'\n'+tables.map(t=>'const '+t.declaration.getText(ast)+';').join('\n'),
    {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const resolve=new Function(js+';return materialReferenceHeight;')();
  const binding=variables.get('referenceHeight');assert.ok(binding?.initializer);
  const derive=new Function('family','theme','state','densityHeight','materialReferenceHeight','return '+binding.initializer.getText(ast));
  const outputs=[];
  for(const density of [0,-2,-5,-1,-6])for(const open of [false,true]){
    const height=derive('divider',{density},{open},40,resolve);assert.equal(height,resolve('divider',density));outputs.push({density,open,height});
  }
  return {sourceLFSha256:hash(source),helperSha256:hash(helper[0].getText(ast)),
    tables:tables.map(t=>({name:t.name,divider:t.divider})),rootBinding:heightBindings[0].getText(ast),
    referenceHeightExpression:binding.initializer.getText(ast),outputs};
}
const revisions=execFileSync('git',['log','--format=%H','--',file],{encoding:'utf8'}).trim().split('\n');
assert.equal(revisions.length,103);
const current=inspect(readFileSync(file)),history=revisions.map(revision=>({revision,...inspect(execFileSync('git',['show',revision+':'+file],{maxBuffer:2**22}))}));
assert.equal(history.at(-1).revision,'2f440115740ff76fa9e55b3f4a11568207b2af5a');
for(const row of history){assert.equal(row.helperSha256,current.helperSha256);assert.deepEqual(row.tables,current.tables);assert.equal(row.rootBinding,current.rootBinding);assert.deepEqual(row.outputs,current.outputs);}
const review=JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`)).review;assert.equal(hash(JSON.stringify(review)),predecessor);
const modified=[],task='Remaining root-height history and renderer-causality attribution beyond the classified coordinate/theme/DPR/density/mobile branches';
for(const group of review.groups.filter(g=>g.family==='divider')){
  const owner=group.obligations.historyOwnership;assert.ok(owner.remaining.includes(task));assert.equal(owner.dividerRootHeightLineage,undefined);
  modified.push({owner,remaining:structuredClone(owner.remaining),case:group.case});
  owner.dividerRootHeightLineage={disposition:'inspected-history-only',classification:'application-plugin-authoring-defect',definition:'fixture-fixed-reference-heights',
    conclusion:'All103 reachable file-change revisions retain identical divider height-table values,helper and explicit pixel root binding. Executing each actual referenceHeight initializer yields unchanged divider heights across five density branches and open/closed states. No later divider root-height retuning is observed;initial fixed-height substitution remains.',
    evidence:{current:receipt(file),producer:receipt('scripts/join-material-divider-root-height-history.mjs'),historicalSources:history.map(r=>({revision:r.revision,sourceLFSha256:r.sourceLFSha256}))},
    helperSha256:current.helperSha256,tables:current.tables,rootBinding:current.rootBinding,outputs:current.outputs,
    boundary:'Reachable current-branch file history only;not all branches,renderer history or causal proof. Existing native-auto/candidate-fixed inequality remains. This does not establish full input/paint/lifetime/current rendering or case closure.'};
  owner.remaining=owner.remaining.map(s=>s===task?'Renderer-causality attribution beyond classified coordinate branches and inspected unchanged divider root-height lineage':s);
}
assert.equal(modified.length,24);
const proposed=saveReviewProposal(base,review),loaded=loadCaseObligationReview(proposed.file,proposed.sha256,review.groups.map(g=>g.case));
for(const {owner,remaining}of modified){delete owner.dividerRootHeightLineage;owner.remaining=remaining;}
assert.equal(hash(JSON.stringify(review)),predecessor);
console.log(JSON.stringify({predecessor,proposed,cases:modified.map(m=>m.case),revisions:history.length,initial:history.at(-1).revision,current,
  dependencyCount:loaded.evidenceFingerprints.length,allCases:loaded.cases.length,predecessorRecovered:true,
  scope:'Previously missing divider root-height lineage,not repeated node/paint survey or renderer diagnosis.'}));
