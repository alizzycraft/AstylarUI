import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { materialInteractionCases,materialProfiles,materialViewports } from './benchmark.config.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
const ids=['tree-item-0','tree-item-1','tree-item-2'];
test('pending Tree findings keep authoring and public core failure scopes separate',async()=>{
  const {treeFocusFindings:findings}=await import('./tree-focus-findings.mjs');
  assert.equal(findings.length,2);assert.equal(new Set(findings.map(f=>f.id)).size,2);
  assert.deepEqual(findings.map(f=>f.classification),['application-plugin-authoring-defect','confirmed-core-renderer-defect']);
  assert.equal(findings[0].observation.cases,52);assert.equal(findings[0].observation.differingPointerCases,24);
  assert.equal(findings[1].observation.pairs,1);assert.match(findings[1].introducedBy,/not yet established/);
  for(const r of [findings[0].evidence.original,findings[0].evidence.oneActualDOMContext,findings[1].publicReproduction,findings[1].causalTrace])assert.equal(hash(readFileSync(r.file)),r.sha256);
  assert.match(findings[1].boundary,/not all Material cases,current-source equivalence/);
});
test('Tree partial evidence join conserves its exact predecessor and all remaining case work',async t=>{
  const path=await import('node:path');
  const {createTextHeldReviewReader,textHeldReview}=await import('./text-held-registration.mjs');
  const {joinTreeFocusEvidence,restoreTreeFocusEvidence,treeFocusPredecessor}=await import('../../scripts/join-material-tree-focus-evidence.mjs');
  assert.equal(treeFocusPredecessor,textHeldReview);const root=process.cwd();
  const reader=createTextHeldReviewReader({root,read:readFileSync,reviewSha256:textHeldReview});
  const parent=JSON.parse(reader.read(path.resolve(root,`artifacts/material-parity/working-audit/proposals/${textHeldReview}.json`))).review;
  const result=joinTreeFocusEvidence(parent);assert.equal(result.cases,52);assert.equal(result.addedChildren,53);
  assert.deepEqual(restoreTreeFocusEvidence(result.review),parent);
  assert.equal(result.review.groups.length,parent.groups.length);
  let changed=0,failures=0;
  for(let i=0;i<parent.groups.length;i++){
    const a=parent.groups[i],b=result.review.groups[i];assert.equal(b.inspection,a.inspection);assert.equal(b.currentRendering,a.currentRendering);
    if(a.family!=='tree'){assert.strictEqual(a,b);continue;}changed++;
    for(const k of Object.keys(a.obligations)){
      assert.equal(b.obligations[k].disposition,a.obligations[k].disposition);
      assert.deepEqual(b.obligations[k].remaining,a.obligations[k].remaining);
    }
    if(b.obligations.inputStyleStructure.supplementaryTreeTabStopInputs.finding)failures++;
  }
  assert.equal(changed,52);assert.equal(failures,24);
  t.diagnostic(JSON.stringify({predecessor:treeFocusPredecessor,review:result.sha256,cases:52,classifiedInputFailures:24,children:53,
    canonicalPublished:false,currentRenderingAccepted:false,boundary:'Partial input-property evidence only;all parent dispositions and remaining work preserve.'}));
});
test('one equal-input Tab-exit trace binds pointer-move canvas tab restoration and semantic refocus',()=>{
  const bytes=readFileSync('artifacts/material-parity/public-tree-tab-exit-trace-20261025/latest-report.json');
  assert.equal(hash(bytes),'6ec16965fabd291c2bda981beaecdab35beeb31e060b5ec82648d1dba8a0500f');
  const report=JSON.parse(bytes);assert.equal(hash(readFileSync('scripts/audit-public-tree-tab-exit-trace.mjs')),report.scriptSha256);
  for(const r of [report.inputSource,report.bundle,report.html,...report.inputs])assert.equal(hash(readFileSync(r.file)),r.sha256);
  assert.deepEqual(report.errors,[]);assert.equal(report.results.length,1);
  const row=report.results[0];assert.deepEqual(row.reference.site,row.astylar.site);
  const obs=row.astylar.observations;assert.deepEqual(obs.map(o=>o.canvasTabIndex),[-1,1,1,1]);
  const writes=obs[1].operations.filter(o=>o.operation==='canvas-tabindex');
  assert.deepEqual(writes.map(o=>[o.before,o.value,o.after]),[[-1,1,1],[1,-1,-1],[-1,1,1]]);
  assert.match(writes[0].stack,/WebDeviceInputSystem\._enableEvents/);
  assert.match(writes[1].stack,/_AstylarSemanticBridge\.connectInteractions/);
  assert.match(writes[2].stack,/_InputManager\._processPointerMove/);
  assert.equal(obs[2].operations.length,7);assert.equal(obs[3].operations.length,8);
  const last=obs[3].operations.at(-1);assert.equal(last.operation,'focus');
  assert.deepEqual([last.owner,last.before,last.after],['item-0','CANVAS','item-0']);
  assert.match(last.stack,/_AstylarSemanticBridge\.syncFocus/);
  const bundle=readFileSync(report.bundle.file,'utf8').split('\n');
  for(const op of [writes[1],writes[2],last]){
    const location=op.stack.split('\n')[2].match(/audit\.js:(\d+):\d+/);assert.ok(location);
    const line=bundle[Number(location[1])-1];
    assert.match(line,op===last?/node\.focus/:op===writes[1]?/canvas\.tabIndex = -1/:/canvas\.tabIndex = engine\.canvasTabIndex/);
  }
  assert.equal(row.reference.observations.at(-1).active,'BODY');assert.equal(obs.at(-1).active,'item-0');
  // Exact installed-package causal trace, corroborated by the uninstrumented pair below.
  // No library fix,all-context claim,current-source equivalence or full rendering acceptance.
});
test('equal-input public fixed-tabstop probe distinguishes forward traversal from backward canvas reentry',()=>{
  const file='artifacts/material-parity/public-tree-fixed-tabstop-corrected-20261025/latest-report.json',bytes=readFileSync(file);
  assert.equal(hash(bytes),'ca76ab4262dbca4cac62ff4d21cbca7fd5ddbd4d5af33d51f824bba66e3163e6');
  const report=JSON.parse(bytes);assert.equal(report.kind,'public-tree-fixed-tabstop');
  assert.equal(hash(readFileSync('scripts/audit-public-tree-fixed-tabstop.mjs')),report.scriptSha256);
  for(const receipt of [report.inputSource,report.bundle,report.html,...report.inputs])assert.equal(hash(readFileSync(receipt.file)),receipt.sha256);
  assert.deepEqual(report.errors,[]);assert.equal(report.results.length,1);
  const row=report.results[0];assert.deepEqual(row.reference.site,row.astylar.site);
  for(const side of ['reference','astylar']){
    const r=row[side];assert.equal(r.inputUnchanged,true);assert.deepEqual(r.diagnostics,[]);
    assert.deepEqual(r.observations.map(o=>o.boundary),['before','pointer','tab','shift-tab']);
    for(const o of r.observations)assert.deepEqual(o.tabStops.map(n=>[n.id,n.attribute,n.tabIndex]),[['item-0','0',0],['item-1','-1',-1],['item-2','-1',-1]]);
    assert.deepEqual(r.observations.slice(0,3).map(o=>o.active),['BODY','item-1','item-0']);
  }
  assert.equal(row.reference.observations[3].active,'BODY');assert.equal(row.astylar.observations[3].active,'item-0');
  const native=row.reference.observations[3].events,candidate=row.astylar.observations[3].events;
  assert.deepEqual(candidate.filter(e=>e.type==='keydown').map(e=>e.key),['Tab','Shift','Tab']);
  const lastTab=candidate.findLastIndex(e=>e.type==='keydown'&&e.key==='Tab');
  assert.deepEqual(candidate.slice(lastTab).filter(e=>e.type==='focusin').map(e=>e.target),['CANVAS','item-0']);
  assert.deepEqual(native.slice(native.findLastIndex(e=>e.type==='keydown'&&e.key==='Tab')).filter(e=>e.type==='focusin'),[]);
  // Pending core focus/tab-exit failure in this installed package,not proof of its causal mechanism,
  // all Material contexts,current source equivalence,paint or whole-case closure.
});
test('current semantic Tab routing leaves nonmodal browser defaults intact unless authored handling cancels',()=>{
  const file='src/lib/astylar-interaction-runtime.ts',source=readFileSync(file,'utf8');
  const tree=ts.createSourceFile(file,source,99,true,ts.ScriptKind.TS),methods=[];
  const names=['handleSemanticKeyDown','dispatchSemanticTabKey'];
  const visit=n=>{if(ts.isMethodDeclaration(n)&&names.includes(n.name.getText(tree)))methods.push(n);ts.forEachChild(n,visit);};visit(tree);
  assert.equal(methods.length,2);
  const code=ts.transpileModule('class Routing {'+methods.map(n=>n.getText(tree)).join('\n')+'}',{compilerOptions:{target:99,module:0}}).outputText;
  const Routing=new Function(code+';return Routing;')();
  for(const cancel of [false,true])for(const shiftKey of [false,true]){
    const owner=new Routing(),calls=[];
    Object.assign(owner,{disposed:false,getFocusedElementId:()=>ids[1],liveState:()=>({}),
      dispatcher:{dispatch:event=>{calls.push(event);return {defaultPrevented:cancel};}},
      handleKeyDown:()=>assert.fail('nonmodal semantic Tab must not enter canvas moveFocus pipeline')});
    const event={key:'Tab',code:'Tab',shiftKey,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};
    owner.handleSemanticKeyDown(event);
    assert.equal(event.defaultPrevented,cancel);assert.equal(calls.length,1);
    assert.equal(calls[0].targetId,ids[1]);assert.equal(calls[0].shiftKey,shiftKey);
  }
  const owner=new Routing(),event={key:'Tab'};let delegated;
  Object.assign(owner,{modalDialog:{},handleKeyDown:e=>{delegated=e;}});
  owner.handleSemanticKeyDown(event);assert.equal(delegated,event);
  // Executed current source methods only: not a browser traversal or retained-build proof.
});
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

test('one actual Tree DOM context preserves fixed requested tab stops and divergent traversal',t=>{
  const file='artifacts/material-parity/tree-pointer-tabstop-20261025/latest-report.json',bytes=readFileSync(file);
  assert.equal(hash(bytes),'117f3f9e1813a5b83bc1d545eb3e5dc69262cc58eaafac9d116402fe00f722a9');
  const report=JSON.parse(bytes);assert.equal(report.results.length,1);const row=report.results[0];
  assert.equal(row.family,'tree');assert.equal(row.profile,'light');assert.equal(row.viewport.deviceScaleFactor,1);assert.equal(row.state,'activate');
  const manifest=report.capture.checkpointManifest;assert.equal(hash(readFileSync(manifest.file)),manifest.sha256);
  const verifyBytes=readFileSync('artifacts/material-parity/tree-pointer-tabstop-verify-20261025.log');
  const verification=JSON.parse(verifyBytes.toString(verifyBytes[0]===255?'utf16le':'utf8').replace(/^\ufeff/,''));
  assert.equal(verification.reportSha256,hash(bytes));assert.equal(verification.cases,1);assert.equal(verification.pairedBoundaries,5);
  const observations={};
  for(const side of ['reference','astylar']){
    const data=row[side];assert.deepEqual(data.runtime.errors,[]);
    assert.deepEqual(data.observations.map(o=>o.boundary),['before','after-action','settled','tab-out','shift-tab-return']);
    for(const [index,o]of data.observations.entries()){
      assert.deepEqual(o.tabStops.map(n=>n.id),ids);
      for(const n of o.tabStops)assert.equal(String(n.tabIndex),n.attribute);
      assert.deepEqual(o.tabStops.map(n=>n.tabIndex),side==='reference'&&index>0?[-1,0,-1]:[0,-1,-1]);
    }
    for(const o of data.observations.slice(1,3))assert.equal(o.active.logicalId,'tree-item-1');
    const last=data.observations.at(-1),keys=last.events.filter(e=>e.type==='keydown');
    assert.deepEqual(keys.map(e=>e.key),['Tab','Shift','Tab']);assert.ok(keys.every(e=>e.trusted));
    assert.equal(last.events.filter(e=>e.type==='pointerdown'&&e.trusted).length,1);
    assert.equal(last.events.filter(e=>e.type==='pointerup'&&e.trusted).length,1);
    observations[side]=data.observations.map(o=>({boundary:o.boundary,active:o.active,tabStops:o.tabStops}));
  }
  assert.equal(row.reference.observations[3].active.tag,'BODY');
  assert.equal(row.reference.observations[4].active.logicalId,'tree-item-1');
  assert.equal(row.astylar.observations[3].active.logicalId,'tree-item-0');
  assert.equal(row.astylar.observations[4].active.logicalId,'tree-item-0');
  assert.equal(report.inputEquivalent,false);assert.equal(report.renderingEquivalent,false);
  t.diagnostic(JSON.stringify({report:{file,sha256:hash(bytes)},observations,
    boundary:'One actual retained-build light/DPR1 native-DOM context. Pointer focuses Projects on both;candidate DOM matches fixed authored tab stops,not native roving state. Tab/Shift+Tab differ under unequal inputs;not proof of a general core traversal defect,all24 actual-DOM contexts,held focus,paint,current full library or case closure. tab-out is a recorded action label,not evidence that candidate actually left.'}));
});
