import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {chromium} from 'playwright-core';

// Read-only runtime instrumentation of the unchanged development showcase.
// Wrappers preserve arguments, return values, and the original promise identity.
const base=process.env.ASTYLAR_FOCUS_URL??'http://127.0.0.1:4435';
const sequences=process.argv.includes('--keyboard')
 ? [{name:'arrow-escape',keys:['ArrowDown','Escape']},{name:'tab-cycle',keys:['Tab','Tab','Tab','Shift+Tab','Escape']}]
 : [{name:'opening',keys:[]}];
const out=path.resolve(process.argv[2]??'artifacts/material-parity/overlay-focus-current');
assert.ok(!fs.existsSync(path.join(out,'result.json')),'Preserve the previous capture');
fs.mkdirSync(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const consumer=createRequire(path.resolve('examples/material-showcase/package.json'));
const packageRoot=path.dirname(consumer.resolve('astylarui'));
const builtCore='artifacts/material-parity/radius-source-build-f95a265';
const packageReceipts=fs.readdirSync(builtCore,{recursive:true}).filter(f=>f.endsWith('.js')).sort().map(file=>{
 const bytes=fs.readFileSync(path.join(builtCore,file));assert.deepEqual(fs.readFileSync(path.join(packageRoot,'..',file)),bytes);
 return {file,sha256:hash(bytes)};
});
assert.ok(packageReceipts.length);
const browser=await chromium.launch({channel:'chrome',headless:true});
const cases=[],errors=[],served=new Map(),pending=[],sourceMatches=new Map();
try {
 for(const sequence of sequences)for(const instrumented of [false,true])for(const family of ['menu','bottom-sheet','dialog'])for(const mode of ['reference','astylar']){
  const page=await browser.newPage({viewport:{width:900,height:700},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push({family,mode,message:e.message}));
  page.on('response',r=>{
   if(!new URL(r.url()).pathname.endsWith('.js'))return;
   pending.push((async()=>{
    const bytes=await r.body(),text=bytes.toString();served.set(r.url(),{url:r.url(),sha256:hash(bytes),bytes:bytes.length});
    if(!/AstylarShowcaseComponent|ReferenceComponent|ShowcaseStore/.test(text))return;
    const matches=[...text.matchAll(/sourceMappingURL=(\S+)/g)];const link=matches.at(-1)?.[1];if(!link)return;
    const map=link.startsWith('data:')?JSON.parse(Buffer.from(link.split(',')[1],'base64')):await (await page.request.get(new URL(link,r.url()).href)).json();
    for(let i=0;i<map.sources.length;i++)for(const file of ['astylar.component.ts','reference.component.ts','showcase.store.ts']){
     if(!map.sources[i].endsWith('/'+file))continue;
     const local='examples/material-showcase/src/app/'+file;
     assert.equal(map.sourcesContent[i].replaceAll('\r\n','\n'),fs.readFileSync(local,'utf8').replaceAll('\r\n','\n'),'served source mismatch: '+file);
     sourceMatches.set(file,{file:local,sha256:hash(fs.readFileSync(local)),servedUrl:r.url(),sourceMap:map.sources[i]});
    }
   })());
  });
  await page.goto(`${base}/${mode}/${family}?benchmark=1&profile=light&interaction=open`);
  await page.waitForFunction(()=>typeof window.__MATERIAL_SHOWCASE_COMMAND__==='function');
  if(mode==='astylar')await page.waitForFunction(()=>!!window.__ASTYLAR_MATERIAL_BENCHMARK__);
  await page.evaluate(async()=>{await document.fonts.ready;await window.__ASTYLAR_MATERIAL_BENCHMARK__?.waitForSettled();});
  await page.evaluate(({mode,instrumented,family})=>{
   const trace=[];window.__focusAudit={trace,phase:'setup'};
   const identity=()=>{const e=document.activeElement;return {tag:e?.tagName,id:e?.id,astylarId:e?.getAttribute('data-astylar-id'),parityId:e?.getAttribute('data-parity-id'),text:e?.textContent?.trim().slice(0,80)}};
   const record=(event,extra={})=>trace.push({event,phase:window.__focusAudit.phase,time:performance.now(),active:identity(),...extra});
   window.__focusAudit.record=record;
   for(const type of ['pointerdown','pointerup','click','focusin','focusout','keydown','keyup'])document.addEventListener(type,e=>record(type,{target:e.target?.id??'',text:e.target?.textContent?.trim().slice(0,50),key:e.key}),true);
   if(mode==='astylar'&&instrumented){
    const component=window.ng.getComponent(document.querySelector('app-astylar-showcase')),surface=component.surface;
    if(!surface)throw Error('Missing mounted surface');
    const ids=()=>{try{return surface.inspectResolvedStyles().elements.map(e=>e.id);}catch(e){return {unavailable:String(e)};}};
    for(const method of ['update','whenSettled','focus']){
     const original=surface[method].bind(surface);
     surface[method]=(...args)=>{record(method+'-call',{target:method==='focus'?args[0]:undefined,ids:ids()});const result=original(...args);
      if(method==='focus')record('focus-result',{target:args[0],ok:result,ids:ids()});
      else result?.then(()=>record(method+'-resolved',{ids:ids()}),e=>record(method+'-rejected',{error:String(e)}));
      return result;};
    }
    const patch=component.store.patchState.bind(component.store);component.store.patchState=(...args)=>{record('state-patch',{patch:args[0]});return patch(...args);};
   }
   window.__focusAudit.snapshot=label=>{
    window.__focusAudit.phase=label;
    const selector=mode==='astylar'?`[data-astylar-id="${family==='menu'?'menu-popup':family+'-overlay'}"]`
     :family==='menu'?'.mat-mdc-menu-panel':family==='dialog'?'mat-dialog-container':'mat-bottom-sheet-container';
    record('boundary',{label,overlayPresent:!!document.querySelector(selector),state:window.__ASTYLAR_MATERIAL_BENCHMARK__?.state()});
   };
  },{mode,instrumented,family});
  let box;
  if(mode==='reference')box=await page.locator('#'+family+'-primary').boundingBox();
  else {
   const local=await page.evaluate(id=>window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id],false).elements[id].borderBox,family+'-primary');
   const canvas=await page.locator('canvas').boundingBox();box={x:canvas.x+local.left,y:canvas.y+local.top,width:local.width,height:local.height};
  }
  assert.ok(box?.width>0);await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.evaluate(()=>window.__focusAudit.snapshot('before-down'));
  await page.mouse.down();await page.evaluate(()=>window.__focusAudit.snapshot('held'));
  await page.evaluate(()=>window.__focusAudit.snapshot('release-start'));
  await page.mouse.up();await page.evaluate(()=>window.__focusAudit.snapshot('released'));
  await page.evaluate(async()=>{await window.__ASTYLAR_MATERIAL_BENCHMARK__?.waitForSettled();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  // Material animation-driven focus may follow the immediate action boundary.
  await page.waitForTimeout(400);
  await page.evaluate(()=>window.__focusAudit.snapshot('settled'));
  for(const [index,key] of sequence.keys.entries()){
   await page.keyboard.press(key);
   await page.evaluate(async()=>{await window.__ASTYLAR_MATERIAL_BENCHMARK__?.waitForSettled();});
   if(key==='Escape'&&mode==='reference'){
    const selector=family==='menu'?'.mat-mdc-menu-panel':family==='dialog'?'mat-dialog-container':'mat-bottom-sheet-container';
    // Native sheet exit animation is 375ms plus scheduling; a 400ms sleep races
    // DOM removal and focus restoration. Observe completion, not a guessed delay.
    await page.locator(selector).waitFor({state:'detached',timeout:10000});
   }
   await page.waitForTimeout(400);
   await page.evaluate(label=>window.__focusAudit.snapshot(label),`key-${index}-${key}`);
  }
  const result=await page.evaluate(()=>({trace:window.__focusAudit.trace,state:window.__ASTYLAR_MATERIAL_BENCHMARK__?.state()}));
  cases.push({family,mode,instrumented,sequence:sequence.name,...result});
  await page.close();
 }
 await Promise.all(pending);
 const result={browser:browser.version(),viewport:{width:900,height:700,dpr:1},sequences,errors,cases,served:[...served.values()],sourceMatches:[...sourceMatches.values()],packageReceipts,probeSha256:hash(fs.readFileSync(new URL(import.meta.url))),limitations:['Development build, light profile, DPR1; only listed pointer/key sequences, not historical-bundle attribution or full interaction coverage.','Public-method wrappers observe calls without altering original results; internal autofocus is observed through DOM focus events.','Overlay presence is semantic DOM membership, not a visual/raster visibility assertion.']};
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));
 assert.equal(errors.length,0);assert.equal(sourceMatches.size,3,'Missing served app source receipts');
 for(const sequence of sequences)for(const family of ['menu','bottom-sheet','dialog'])for(const mode of ['reference','astylar']){
  const pair=cases.filter(c=>c.family===family&&c.mode===mode&&c.sequence===sequence.name);assert.equal(pair.length,2);
  assert.deepEqual(pair[0].trace.at(-1).active,pair[1].trace.at(-1).active,'Instrumentation changed final focus');
  assert.deepEqual(pair[0].state,pair[1].state,'Instrumentation changed final application state');
  const boundaries=c=>c.trace.filter(x=>x.event==='boundary'&&(x.label==='settled'||x.label.startsWith('key-'))).map(({label,active,overlayPresent,state})=>({label,active,overlayPresent,state}));
  assert.deepEqual(boundaries(pair[0]),boundaries(pair[1]),'Instrumentation changed a settled action boundary');
 }
 console.log(JSON.stringify({cases:cases.length,errors:errors.length,sourceMatches:sourceMatches.size,wrapperBoundaryControls:'pass'}));
}catch(error){fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:String(error),cases,errors},null,2));throw error;}
finally{await browser.close();}
