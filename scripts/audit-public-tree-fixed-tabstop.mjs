import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';

// One equal-input reduction, reusing the existing package-root build/receipt driver.
const base='scripts/audit-public-role-focus-refresh.mjs',script='scripts/audit-public-tree-fixed-tabstop.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),bytes=readFileSync(base);
assert.equal(hash(bytes),'b0ffd7893972731130156efec261b44fb9e322b7b9f031891cdbdb18f2525ba6');
let source=bytes.toString();
const input=`import '@angular/compiler';
import {provideZonelessChangeDetection} from '@angular/core';
import {createApplication} from '@angular/platform-browser';
import {Astylar} from 'astylarui';
const mode=new URLSearchParams(location.search).get('mode');
const site={root:{children:[{type:'div',id:'tree',role:'tree',children:['Documents','Projects','Archive'].map((textContent,i)=>({type:'div',id:'item-'+i,role:'treeitem',tabindex:i===0?0:-1,textContent}))}]},styles:[
{selector:'*',margin:'0',padding:'0',boxSizing:'border-box'},
{selector:'#tree',width:'300px',height:'72px'},
{selector:'[role=treeitem]',display:'block',width:'300px',height:'24px',fontFamily:'Arial',fontSize:'16px'}]};
const authored=JSON.stringify(site),host=document.createElement(mode==='reference'?'div':'canvas');
host.style.cssText='display:block;width:390px;height:140px';document.body.append(host);
let app,surface;
if(mode==='reference'){
 const style=document.createElement('style');style.textContent=site.styles.map(({selector,...s})=>selector+'{'+Object.entries(s).map(([k,v])=>k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+v).join(';')+'}').join('');document.head.append(style);
 const parent=document.createElement('div');parent.id='tree';parent.setAttribute('role','tree');
 for(const item of site.root.children[0].children){const n=document.createElement('div');n.id=item.id;n.setAttribute('role',item.role);n.tabIndex=item.tabindex;n.textContent=item.textContent;parent.append(n);}host.append(parent);
}else{app=await createApplication({providers:[provideZonelessChangeDetection()]});surface=app.injector.get(Astylar).mount(host,site,{diagnostics:{logLevel:'silent'}});await surface.whenSettled();}
const events=[];for(const type of ['pointerdown','pointerup','keydown','keyup','focusin','focusout'])document.addEventListener(type,e=>events.push({type,key:e.key??null,trusted:e.isTrusted,target:e.target.dataset?.astylarId||e.target.id||e.target.tagName,defaultPrevented:e.defaultPrevented}),true);
const settle=async()=>{await document.fonts.ready;if(surface)await surface.whenSettled();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};
await settle();
window.roleFocusAudit={async sample(boundary){await settle();const a=document.activeElement;return{boundary,active:a?.dataset?.astylarId||a?.id||a?.tagName,tabStops:[...host.querySelectorAll('[role=treeitem]')].map(n=>({id:n.dataset.astylarId||n.id,attribute:n.getAttribute('tabindex'),tabIndex:n.tabIndex})),events:structuredClone(events)};},
run(){return{site,inputUnchanged:JSON.stringify(site)===authored,diagnostics:surface?surface.diagnostics.messages:[]};},dispose(){surface?.dispose();app?.destroy();}};`;
const verification=`function verify(report){
 assert.equal(report.kind,'public-tree-fixed-tabstop');assert.equal(report.scriptSha256,hash(readFileSync(script)));
 for(const r of [report.inputSource,report.bundle,report.html,...report.inputs])assert.equal(hash(readFileSync(r.file)),r.sha256);
 assert.deepEqual(report.errors,[]);assert.equal(report.results.length,1);const row=report.results[0];
 assert.equal(row.dpr,1);assert.equal(row.controlKind,'div');assert.deepEqual(row.reference.site,row.astylar.site);
 const outcomes={};for(const side of ['reference','astylar']){const r=row[side];assert.equal(r.inputUnchanged,true);assert.deepEqual(r.diagnostics,[]);
  for(const type of ['document','script'])assert.ok(r.assets.some(a=>a.type===type&&a.sha256===report[type==='document'?'html':'bundle'].sha256));
  assert.deepEqual(r.observations.map(o=>o.boundary),['before','pointer','tab','shift-tab']);
  for(const o of r.observations){assert.deepEqual(o.tabStops.map(n=>n.id),['item-0','item-1','item-2']);assert.deepEqual(o.tabStops.map(n=>n.tabIndex),[0,-1,-1]);assert.deepEqual(o.tabStops.map(n=>n.attribute),['0','-1','-1']);}
  assert.equal(r.observations[1].active,'item-1');
  const events=r.observations.at(-1).events;assert.equal(events.filter(e=>e.type==='pointerdown'&&e.trusted).length,1);assert.equal(events.filter(e=>e.type==='pointerup'&&e.trusted).length,1);
  assert.deepEqual(events.filter(e=>e.type==='keydown').map(e=>e.key),['Tab','Shift','Tab']);
  outcomes[side]=r.observations.map(o=>({boundary:o.boundary,active:o.active}));
 }
 return{pairs:1,inputEquivalent:true,outcomes,currentRenderingAccepted:false,scope:'One equal-input public fixed-tabstop pointer/Tab reduction;not Material case closure or general traversal acceptance.'};
}`;
const ast=ts.createSourceFile(base,source,99,true,ts.ScriptKind.JS),edits=[];
const visit=n=>{
 if(ts.isFunctionDeclaration(n)&&n.name?.text==='verify')edits.push([n.getStart(ast),n.end,verification]);
 if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='contents')edits.push([n.initializer.getStart(ast),n.initializer.end,JSON.stringify(input)]);
 ts.forEachChild(n,visit);
};visit(ast);assert.equal(edits.length,2);
for(const [start,end,replacement]of edits.sort((a,b)=>b[0]-a[0]))source=source.slice(0,start)+replacement+source.slice(end);
const replace=(before,after)=>{assert.equal(source.split(before).length,2,before);source=source.replace(before,after);};
replace(`const script = '${base}';`,`const script = '${script}';`);
replace("const kinds = ['div', 'span', 'input', 'button'];","const kinds = ['div'];");
replace("kind: 'public-role-focus-refresh'","kind: 'public-tree-fixed-tabstop'");
replace('for (const dpr of [1, 2]) for (const controlKind of kinds)', 'for (const dpr of [1]) for (const controlKind of kinds)');
replace("row[mode] = { ...await page.evaluate(() => window.roleFocusAudit.run()), assets: await Promise.all(assets) };",`const observations=[await page.evaluate(()=>window.roleFocusAudit.sample('before'))];
          await page.mouse.click(110,36);observations.push(await page.evaluate(()=>window.roleFocusAudit.sample('pointer')));
          await page.keyboard.press('Tab');observations.push(await page.evaluate(()=>window.roleFocusAudit.sample('tab')));
          await page.keyboard.press('Shift+Tab');observations.push(await page.evaluate(()=>window.roleFocusAudit.sample('shift-tab')));
          row[mode]={...await page.evaluate(()=>window.roleFocusAudit.run()),observations,assets:await Promise.all(assets)};`);
const updated=ts.createSourceFile(base,source,99,true,ts.ScriptKind.JS),branch=updated.statements.find(n=>ts.isIfStatement(n)&&n.expression.getText(updated)==='verifyOnly');assert.ok(branch);
source=source.slice(0,branch.thenStatement.getStart(updated))+`{
 const report=JSON.parse(readFileSync(path.join(output,'latest-report.json'))),summary=verify(report);
 for(const mutate of [r=>r.results.pop(),r=>r.results[0].astylar.observations[1].tabStops[0].tabIndex=-1]){const forged=structuredClone(report);mutate(forged);assert.throws(()=>verify(forged));}
 console.log(JSON.stringify({...summary,negativeControlsRejected:2}));
}`+source.slice(branch.thenStatement.end);
const final=ts.createSourceFile(base,source,99,true,ts.ScriptKind.JS);assert.equal(final.parseDiagnostics.length,0);
for(const node of final.statements.filter(ts.isImportDeclaration).toReversed()){
 const name=node.moduleSpecifier.text;if(name.startsWith('node:'))continue;
 const url=name.startsWith('.')?pathToFileURL(path.resolve(path.dirname(base),name)).href:import.meta.resolve(name);
 source=source.slice(0,node.moduleSpecifier.getStart(final))+JSON.stringify(url)+source.slice(node.moduleSpecifier.end);
}
if(process.argv[2]==='--dry-run')console.log(JSON.stringify({script,baseSha256:hash(bytes),adaptedSha256:hash(source),pairs:1,browserStarted:false}));
else await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
