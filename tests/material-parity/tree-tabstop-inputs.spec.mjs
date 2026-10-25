import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { materialInteractionCases,materialProfiles,materialViewports } from './benchmark.config.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
const ids=['tree-item-0','tree-item-1','tree-item-2'];
test('all retained tree pointer contexts expose fixed candidate tab stops behind normalized focus',t=>{
  const file='artifacts/material-parity/current-full-20261005/latest-report.json',bytes=readFileSync(file);
  assert.equal(hash(bytes),'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const report=JSON.parse(bytes),statics=report.results.filter(r=>r.family==='tree'),actions=report.interactions.filter(r=>r.family==='tree');
  assert.equal(report.captureProvenance.harnessFiles.find(r=>r.file==='tests/material-parity/run-material-parity.mjs').sha256,
    'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0');
  assert.equal(statics.length,12);assert.equal(actions.length,40);
  const key=(kind,r)=>`${kind}:tree@${r.profile}/${r.viewport.id}${r.state?'/'+r.state:''}`;
  assert.deepEqual(actions.map(r=>key('interaction',r)).sort(),materialInteractionCases.filter(r=>r.family==='tree').map(r=>key('interaction',r)).sort());
  assert.deepEqual(statics.map(r=>`${r.profile}/${r.viewport.id}`).sort(),materialProfiles.flatMap(p=>materialViewports.map(v=>p+'/'+v.id)).sort());
  const observations=[];let failures=0,controls=0;
  for(const [kind,rows]of [['static',statics],['interaction',actions]])for(const row of rows){
    const pointer=['held','activate','activate-leave'].includes(row.state),vectors={};
    for(const side of ['reference','astylar']){
      const receipt=row.inputTrees[side],b=readFileSync(receipt.file);assert.equal(hash(b),receipt.sha256);
      const tree=JSON.parse(b),nodes=tree.nodes.filter(n=>side==='reference'?n.attributes?.role==='treeitem':n.authored?.role==='treeitem');
      assert.equal(nodes.length,3);assert.deepEqual(nodes.map(n=>side==='reference'?n.attributes.id:n.authored.id),ids);
      for(const n of nodes){
        assert.ok(!nodes.some(other=>other!==n&&n.key.startsWith(other.key+'/')),'No authored expandable/nested item in this fixture');
        assert.equal(side==='reference'?n.attributes['aria-expanded']:n.authored.ariaExpanded,undefined);
      }
      vectors[side]=nodes.map(n=>{
        if(side==='astylar'){assert.equal(typeof n.authored.tabindex,'number');return n.authored.tabindex;}
        assert.match(n.attributes.tabindex,/^-?\d+$/);return Number(n.attributes.tabindex);
      });
      assert.deepEqual(vectors[side],side==='reference'&&pointer?[-1,0,-1]:[0,-1,-1]);
      if(side==='astylar'&&pointer)assert.match(nodes[1].authored.class,/(?:^|\s)focused(?:\s|$)/);
    }
    if(pointer){
      assert.deepEqual(row.focus,{reference:'tree-primary',astylar:'tree-primary',matches:true});
      assert.notDeepEqual(vectors.reference,vectors.astylar);failures++;
    }else{assert.deepEqual(vectors.reference,vectors.astylar);controls++;}
    observations.push({case:key(kind,row),tabindex:vectors,pairedTrees:row.inputTrees,pointerState:!!pointer});
  }
  assert.equal(failures,24);assert.equal(controls,28);
  t.diagnostic(JSON.stringify({report:{file,sha256:hash(bytes)},cases:52,pairedTreesAuthenticated:104,
    finding:{id:'fixture-tree-tabstop-remains-first-after-pointer-focus',classification:'application-plugin-authoring-defect',
      owner:'showcase tree composite focus/tab-stop state translation',
      firstDivergence:'Native generated tab-stop state moves to Projects;candidate authored tabindex stays index===0 despite its focused class moving to Projects.',
      source:'examples/material-showcase/src/app/astylar.component.ts',sourceIntroduction:'2f440115 already authors fixed first index;not historical runtime bisect'},
    pointerTabstopDifferences:failures,initialFocusHoverControls:controls,observations,
    canonicalPublished:false,wholeCaseClosure:false,
    boundary:'Original native runtime DOM attributes versus candidate authored tab-stop inputs only;not candidate native-DOM property measurement. Held trees precede release but report focus follows release;normalized primary IDs do not identify the active leaf. No expansion contract,raw pointer-hit,all-key,paint,current-rendering or whole-case acceptance.'}));
});

test('current and initial tree authoring keep the first tab stop independently of focused leaf',()=>{
  const file='examples/material-showcase/src/app/astylar.component.ts';
  const versions=[readFileSync(file,'utf8'),execFileSync('git',['show','2f440115:'+file],{encoding:'utf8',maxBuffer:2e6})];
  for(const source of versions){
    const tree=ts.createSourceFile(file,source,99,true,ts.ScriptKind.TS),methods=[];
    const visit=n=>{if(ts.isMethodDeclaration(n)&&n.name.getText(tree)==='familyElements')methods.push(n);ts.forEachChild(n,visit);};visit(tree);assert.equal(methods.length,1);
    const branches=methods[0].body.statements.filter(n=>ts.isIfStatement(n)&&n.expression.getText(tree)==="family === 'tree'");assert.equal(branches.length,1);
    const statement=branches[0].thenStatement;assert.ok(ts.isReturnStatement(statement));
    const code=ts.transpileModule('function render(){return '+statement.expression.getText(tree)+';}',{compilerOptions:{target:99,module:0}}).outputText;
    const render=new Function(code+';return render;')();
    for(const focused of ids){
      const root=render.call({focusedId:()=>focused});assert.equal(root.length,1);assert.equal(root[0].role,'tree');
      const items=root[0].children;assert.deepEqual(items.map(n=>n.id),ids);
      assert.deepEqual(items.map(n=>n.tabindex),[0,-1,-1]);assert.match(items[ids.indexOf(focused)].class,/focused/);
    }
  }
  // Source introduction,not historical browser execution or a first-bad bisect.
});
