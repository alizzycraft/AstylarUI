
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import path from 'node:path';
import ts from 'typescript';
import {chromium} from 'playwright-core';
import {fingerprintDirectory} from './tests/material-parity/run-checkpoint.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex'),receipt=file=>({file,sha256:hash(readFileSync(file))});
const helperFile='tests/material-parity/sort-focus-structure.spec.mjs';
const ast=ts.createSourceFile(helperFile,readFileSync(helperFile,'utf8'),99,true);
const helper=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='withFrozenShowcase').getText(ast);
assert.equal(hash(helper),'603ac9ca88b9bf2e3443f8be65f125d39002e1ca4e5157487d9ac86ed7d2527f');
const withFrozen=new Function('assert','path','readFileSync','existsSync','createServer','chromium','fingerprintDirectory',helper+';return withFrozenShowcase;')(assert,path,readFileSync,existsSync,createServer,chromium,fingerprintDirectory);
const treeFile='artifacts/material-parity/current-full-20261005/button/light/desktop/reference-input-tree.json';
const tree=JSON.parse(readFileSync(treeFile)),host=tree.nodes.find(n=>n.attributes?.id==='button-primary');
const touch=tree.nodes.find(n=>n.parent===host.key&&n.attributes?.class==='mat-mdc-button-touch-target');
assert.ok(touch);assert.equal(tree.styles[host.style].height,'40px');assert.equal(tree.styles[touch.style].height,'48px');
let observation;
await withFrozen(async(browser,baseUrl)=>{
 const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 try{
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(baseUrl+'/reference/button?benchmark=1&profile=light');
 await page.waitForFunction(()=>typeof window.__MATERIAL_SHOWCASE_COMMAND__==='function');
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
 const initial=await page.locator('#button-primary').evaluate(button=>{
  const target=button.querySelector('.mat-mdc-button-touch-target'),box=button.getBoundingClientRect(),t=target.getBoundingClientRect();
  const keys=['display','position','height','top','left','right','transform','pointerEvents','visibility','overflowX','overflowY'];
  window.__TOUCH_AUDIT_CLICKS__=[];
  button.addEventListener('click',e=>window.__TOUCH_AUDIT_CLICKS__.push({x:e.clientX,y:e.clientY,targetClass:e.target.className}));
  return {box:{x:box.x,y:box.y,width:box.width,height:box.height,top:box.top,bottom:box.bottom},targetBox:{x:t.x,y:t.y,width:t.width,height:t.height,top:t.top,bottom:t.bottom},
   targetStyle:Object.fromEntries(keys.map(k=>[k,getComputedStyle(target)[k]])),originalStyle:target.getAttribute('style')};
 });
 for(const k of ['display','position','height','top','left','right','transform','pointerEvents','visibility','overflowX','overflowY'])
  assert.equal(initial.targetStyle[k],tree.styles[touch.style][k],k);
 assert.equal(initial.box.height,40);assert.equal(initial.targetBox.height,48);
 assert.equal(initial.targetBox.top,initial.box.top-4);assert.equal(initial.targetBox.bottom,initial.box.bottom+4);
 const x=initial.box.x+initial.box.width/2,points=[{name:'above',x,y:initial.box.top-2},{name:'below',x,y:initial.box.bottom+2}];
 const observations=[];
 async function probe(state,point,expectedButton){
  const before=await page.evaluate(()=>window.__TOUCH_AUDIT_CLICKS__.length);
  const hit=await page.evaluate(({x,y})=>{const e=document.elementFromPoint(x,y);return {tag:e?.tagName,class:e?.className,buttonId:e?.closest('button')?.id??null};},point);
  assert.equal(hit.buttonId==='button-primary',expectedButton);
  await page.mouse.click(point.x,point.y);
  const after=await page.evaluate(()=>window.__TOUCH_AUDIT_CLICKS__.length);
  assert.equal(after-before,expectedButton?1:0);
  observations.push({state,point,hit,buttonClickDelta:after-before});
 }
 for(const p of points)await probe('original-touch-target',p,true);
 await page.locator('#button-primary .mat-mdc-button-touch-target').evaluate(e=>e.style.pointerEvents='none');
 for(const p of points)await probe('touch-pointer-events-none',p,false);
 await probe('disabled-touch-center-positive',{name:'center',x,y:initial.box.top+20},true);
 await page.locator('#button-primary .mat-mdc-button-touch-target').evaluate((e,value)=>{e.style.cssText=value??'';e.getAttribute('style');if(value===null)e.removeAttribute('style');else e.setAttribute('style',value);},initial.originalStyle);
 assert.equal(await page.locator('#button-primary .mat-mdc-button-touch-target').getAttribute('style'),initial.originalStyle);
 for(const p of points)await probe('restored-touch-target',p,true);
 assert.deepEqual(errors,[]);
 observation={runtime:{actualBrowser:browser.version(),checkpointBrowser:'155.0.8059.40',historicalBrowserReplay:false},initial,observations,restoredExactInlineAttribute:true,runtimeErrors:errors};
 }finally{await context.close();}
});
console.log(JSON.stringify({producerArgs:process.execArgv,helper:{file:helperFile,functionSha256:hash(helper)},referenceTree:receipt(treeFile),checkpoint:receipt('artifacts/material-parity/divider-alignment-provenance-20261015/checkpoint/manifest.json'),observation,
 conclusion:'The fresh native primary button touch span extends4CSSpx above and below the40px host and receives trusted clicks2px outside both host edges. Disabling only its pointer events removes those outside hits while the center still activates;exact restoration restores outside hits.',
 boundary:'One native light/desktopDPR1 diagnostic on the retained served build with a newer browser patch,not historical replay,candidate hit testing,all shared button variants/states or whole-case closure. No fixture/source changes and no renderer diagnosis.'},null,2));
