import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {chromium} from 'playwright-core';
import {PNG} from 'pngjs';

// Runtime instrumentation of the unchanged development showcase. The explicit
// --dialog-escape variant separately labels its temporary causal intervention.
// Wrappers preserve arguments, return values, and the original promise identity.
const base=process.env.ASTYLAR_FOCUS_URL??'http://127.0.0.1:4435';
const dialogEscape=process.argv.includes('--dialog-escape');
const hoverRetarget=process.argv.includes('--hover-retarget');
const inspectPicks=process.argv.includes('--public-hover-picks');
const publicHover=process.argv.includes('--public-hover')||inspectPicks;
assert.ok([dialogEscape,hoverRetarget,publicHover].filter(Boolean).length<=1,'Choose one diagnostic mode');
const families=dialogEscape||publicHover?['dialog']:hoverRetarget?['bottom-sheet','dialog']:['menu','bottom-sheet','dialog'];
const variants=publicHover?['passive-cover','hoverable-cover']:dialogEscape?['unchanged','without-app-escape']:['unchanged'];
const sequences=dialogEscape?[{name:'escape',keys:['Escape']}]:process.argv.includes('--keyboard')
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
 for(const dpr of publicHover?[1,2]:[1])for(const variant of variants)for(const sequence of sequences)for(const instrumented of publicHover&&!inspectPicks?[false]:[false,true])for(const family of families)for(const mode of ['reference','astylar']){
  const page=await browser.newPage({viewport:{width:900,height:700},deviceScaleFactor:dpr});
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
  // Startup can exceed 30s while the cold audit occupies memory/CPU. Readiness
  // below is still the app contract, font readiness and renderer settlement.
  await page.goto(`${base}/${mode}/${family}?benchmark=1&profile=light&interaction=open`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof window.__MATERIAL_SHOWCASE_COMMAND__==='function');
  if(mode==='astylar')await page.waitForFunction(()=>!!window.__ASTYLAR_MATERIAL_BENCHMARK__);
  await page.evaluate(async()=>{await document.fonts.ready;await window.__ASTYLAR_MATERIAL_BENCHMARK__?.waitForSettled();});
  if(publicHover){
   let captured;
   try{captured=await capturePublicHover(page,mode,dpr,variant,instrumented);}
   finally{
    const cleanup=await page.evaluate(async()=>{const p=window.__publicHover;if(!p?.observer)return null;const removed=p.surface.scene.onPointerObservable.remove(p.observer);await new Promise(r=>setTimeout(r,0));return {removed,before:p.observerCount,after:p.surface.scene.onPointerObservable.observers.length};});
    if(cleanup){assert.equal(cleanup.removed,true);assert.equal(cleanup.after,cleanup.before);if(captured)captured.observerCleanup=cleanup;}
    await page.close();
   }
   cases.push(captured);
   continue;
  }
  await page.evaluate(({mode,instrumented,family,variant,dialogEscape,hoverRetarget})=>{
   const trace=[];window.__focusAudit={trace,phase:'setup'};
   const identity=()=>{const e=document.activeElement;return {tag:e?.tagName,id:e?.id,astylarId:e?.getAttribute('data-astylar-id'),parityId:e?.getAttribute('data-parity-id'),text:e?.textContent?.trim().slice(0,80)}};
   const record=(event,extra={})=>trace.push({event,phase:window.__focusAudit.phase,time:performance.now(),active:identity(),...extra});
   window.__focusAudit.record=record;
   if(mode==='astylar'&&variant==='without-app-escape'){
    const component=window.ng.getComponent(document.querySelector('app-astylar-showcase'));
    const original=component.handleKeydown.bind(component);
    component.handleKeydown=(id,event)=>{
     if(event.key==='Escape'){record('diagnostic-bypass-app-escape',{id});return;}
     return original(id,event);
    };
   }
   for(const type of ['pointerdown','pointerup','click','focusin','focusout','keydown','keyup',...(hoverRetarget?['pointermove']:[])])document.addEventListener(type,e=>record(type,{target:e.target?.id??'',text:e.target?.textContent?.trim().slice(0,50),key:e.key,...(hoverRetarget?{x:e.clientX,y:e.clientY}:{})}),true);
   if(mode==='astylar'&&instrumented){
    const component=window.ng.getComponent(document.querySelector('app-astylar-showcase')),surface=component.surface;
    if(!surface)throw Error('Missing mounted surface');
    const ids=()=>{try{return surface.inspectResolvedStyles().elements.map(e=>e.id);}catch(e){return {unavailable:String(e)};}};
    for(const method of ['update','whenSettled','focus']){
     const original=surface[method].bind(surface);
     surface[method]=(...args)=>{record(method+'-call',{target:method==='focus'?args[0]:undefined,ids:ids(),...(dialogEscape?{interaction:surface.diagnostics.interaction,stack:new Error().stack}:{})});const result=original(...args);
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
    let hover;
    if(hoverRetarget){
     const point=window.__focusAudit.pointer,hit=point?document.elementFromPoint(point.x,point.y):undefined;
     if(mode==='reference'){
      const opener=document.getElementById(family+'-primary'),ripple=opener.querySelector('.mat-mdc-button-persistent-ripple');
      const style=getComputedStyle(opener),layer=ripple?getComputedStyle(ripple,'::before'):undefined;
      hover={point,openerHovered:opener.matches(':hover'),hit:{tag:hit?.tagName,id:hit?.id,class:hit?.className},background:style.backgroundColor,
       layer:layer?{background:layer.backgroundColor,opacity:layer.opacity}:undefined};
     }else{
      const surface=window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface;
      let opener;try{opener=surface.inspectResolvedStyles().elements.find(e=>e.id===family+'-primary');}catch(e){opener={unavailable:String(e)};}
      hover={point,interaction:surface.diagnostics.interaction,opener};
     }
    }
    record('boundary',{label,overlayPresent:!!document.querySelector(selector),state:window.__ASTYLAR_MATERIAL_BENCHMARK__?.state(),...(hoverRetarget?{hover}:{})});
   };
  },{mode,instrumented,family,variant,dialogEscape,hoverRetarget});
  let box;
  if(mode==='reference')box=await page.locator('#'+family+'-primary').boundingBox();
  else {
   const local=await page.evaluate(id=>window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id],false).elements[id].borderBox,family+'-primary');
   const canvas=await page.locator('canvas').boundingBox();box={x:canvas.x+local.left,y:canvas.y+local.top,width:local.width,height:local.height};
  }
  assert.ok(box?.width>0);
  const point={x:box.x+box.width/2,y:box.y+box.height/2};
  if(hoverRetarget)await page.evaluate(point=>{window.__focusAudit.pointer=point;},point);
  await page.mouse.move(point.x,point.y);
  await page.evaluate(()=>window.__focusAudit.snapshot('before-down'));
  await page.mouse.down();await page.evaluate(()=>window.__focusAudit.snapshot('held'));
  await page.evaluate(()=>window.__focusAudit.snapshot('release-start'));
  await page.mouse.up();await page.evaluate(()=>window.__focusAudit.snapshot('released'));
  await page.evaluate(async()=>{await window.__ASTYLAR_MATERIAL_BENCHMARK__?.waitForSettled();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  // Material animation-driven focus may follow the immediate action boundary.
  await page.waitForTimeout(400);
  await page.evaluate(()=>window.__focusAudit.snapshot('settled'));
  if(hoverRetarget){
   point.x+=1;await page.evaluate(point=>{window.__focusAudit.pointer=point;},point);
   await page.mouse.move(point.x,point.y);
   await page.evaluate(async()=>{await window.__ASTYLAR_MATERIAL_BENCHMARK__?.waitForSettled();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
   await page.waitForTimeout(400);
   await page.evaluate(()=>window.__focusAudit.snapshot('after-covered-move'));
  }
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
  cases.push({family,mode,instrumented,variant,sequence:sequence.name,...result});
  await page.close();
 }
 await Promise.all(pending);
 const result={browser:browser.version(),viewport:{width:900,height:700,dpr:publicHover?[1,2]:1},sequences,variants,errors,cases,served:[...served.values()],sourceMatches:[...sourceMatches.values()],packageReceipts,probeSha256:hash(fs.readFileSync(new URL(import.meta.url))),limitations:publicHover?[
  'Runtime-only public surface.update reduction in the existing development host; canonical fixtures are unchanged. Unknown IDs avoid Material-specific event branches, but the host retains its installed options.',
  'DPR1/2 pointer state and point raster evidence only; no full visual, keyboard, historical-capture or modal equivalence claim.',
  'Semantic DOM rectangles are diagnostic accessibility proxies, not candidate layout measurements.',
 ]:['Development build, light profile, DPR1; only listed pointer/key sequences, not historical-bundle attribution or full interaction coverage.','Public-method wrappers observe calls without altering original results; internal autofocus is observed through DOM focus events.','Overlay presence is semantic DOM membership, not a visual/raster visibility assertion.','without-app-escape deliberately removes one application handler at runtime; it is a causal control, never equivalent-input or output-parity evidence.']};
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));
 assert.equal(errors.length,0);assert.equal(sourceMatches.size,3,'Missing served app source receipts');
 if(inspectPicks)for(const c of cases.filter(c=>c.instrumented)){
  const baseline=cases.find(b=>!b.instrumented&&b.mode===c.mode&&b.dpr===c.dpr&&b.variant===c.variant);assert.ok(baseline);
  const observable=x=>Object.fromEntries(Object.entries(x.observations).map(([label,o])=>[label,{hover:o.interaction?.hoveredElementId??o.hit,pixel:o.raster.rgba,background:o.elements?.find(e=>e.id==='audit-target')?.effective.background??o.background}]));
  assert.deepEqual(observable(c),observable(baseline),'Read-only picking observer changed behavior');
 }
 if(!publicHover)for(const variant of variants)for(const sequence of sequences)for(const family of families)for(const mode of ['reference','astylar']){
  const pair=cases.filter(c=>c.family===family&&c.mode===mode&&c.sequence===sequence.name&&c.variant===variant);assert.equal(pair.length,2);
  assert.deepEqual(pair[0].trace.at(-1).active,pair[1].trace.at(-1).active,'Instrumentation changed final focus');
  assert.deepEqual(pair[0].state,pair[1].state,'Instrumentation changed final application state');
  const boundaries=c=>c.trace.filter(x=>x.event==='boundary'&&(x.label==='settled'||x.label==='after-covered-move'||x.label.startsWith('key-'))).map(({label,active,overlayPresent,state,hover})=>({label,active,overlayPresent,state,...(hoverRetarget?{hover}:{})}));
  assert.deepEqual(boundaries(pair[0]),boundaries(pair[1]),'Instrumentation changed a settled action boundary');
 }
 console.log(JSON.stringify({cases:cases.length,errors:errors.length,sourceMatches:sourceMatches.size,
  ...(publicHover?{unmatchedCandidateBoundaries:cases.filter(c=>c.mode==='astylar').flatMap(c=>[c.stationaryTargetMatches,c.movedTargetMatches]).filter(v=>!v).length}:{wrapperBoundaryControls:'pass'})}));
}catch(error){fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:String(error),cases,errors},null,2));throw error;}
finally{await browser.close();}

// Minimal runtime-only SiteData/DOM pair. No Material element, click action,
// animation, transform, modal semantics or private renderer mutation is used.
async function capturePublicHover(page,mode,dpr,variant,instrumented){
 const styles=[
  {selector:'#audit-root',position:'relative',width:'900px',height:'700px',margin:'0px',padding:'0px',background:'#ffffff'},
  {selector:'#audit-target',position:'absolute',left:'100px',top:'100px',width:'160px',height:'60px',margin:'0px',padding:'0px',background:'#123456'},
  {selector:'#audit-target:hover',background:'#abcdef'},
  {selector:'#audit-cover',position:'absolute',left:'80px',top:'80px',width:'200px',height:'100px',margin:'0px',padding:'0px',background:'#555555',zIndex:'2'},
 ];
 if(variant==='hoverable-cover')styles.push({selector:'#audit-cover:hover',background:'#777777'});
 const data=covered=>({root:{children:[{type:'div',id:'audit-root',children:[{type:'div',id:'audit-target'},...(covered?[{type:'div',id:'audit-cover'}]:[])]}]},styles});
 await page.evaluate(async({mode,initial,instrumented})=>{
  if(mode==='astylar'){
   const surface=window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface;
   window.__publicHover={surface};await surface.update(initial);await surface.whenSettled();
   if(instrumented){
    const p=window.__publicHover;p.picks=[];p.observerCount=surface.scene.onPointerObservable.observers.length;
    p.observer=surface.scene.onPointerObservable.add(info=>p.picks.push({phase:p.phase,type:info.type,pickedMesh:info.pickInfo?.pickedMesh?.name??null,x:info.event?.offsetX,y:info.event?.offsetY}));
   }
  }else{
   const host=document.createElement('div');Object.assign(host.style,{position:'fixed',inset:'0',zIndex:'2147483647'});
   document.body.append(host);const shadow=host.attachShadow({mode:'open'}),style=document.createElement('style');
   style.textContent=initial.styles.map(({selector,...props})=>`${selector}{${Object.entries(props).map(([k,v])=>`${k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}:${v}`).join(';')}}`).join('\n');
   shadow.append(style);const root=document.createElement('div');root.id='audit-root';const target=document.createElement('div');target.id='audit-target';root.append(target);shadow.append(root);
   window.__publicHover={shadow,root,target};
  }
 },{mode,initial:data(false),instrumented});
 const host=mode==='astylar'?await page.locator('canvas').boundingBox():{x:0,y:0,width:900,height:700};
 assert.deepEqual(host,{x:0,y:0,width:900,height:700},'Reduction requires matching CSS-space hosts');
 const settle=async()=>{await page.evaluate(async()=>{await window.__publicHover.surface?.whenSettled();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});await page.waitForTimeout(100);};
 const snapshot=async label=>{const observation=await page.evaluate(({mode,label})=>{
  const p=window.__publicHover;p.phase=label;
  if(mode==='astylar')return {label,interaction:p.surface.diagnostics.interaction,messages:p.surface.diagnostics.messages,
   elements:p.surface.inspectResolvedStyles().elements.filter(e=>e.id?.startsWith('audit-')),
   boxes:[...document.querySelectorAll('[data-astylar-id]')].filter(e=>e.getAttribute('data-astylar-id')?.startsWith('audit-')).map(e=>{const r=e.getBoundingClientRect();return {id:e.getAttribute('data-astylar-id'),x:r.x,y:r.y,width:r.width,height:r.height};}),
   ...(p.picks?{picking:{events:[...p.picks],predicate:String(p.surface.scene.pointerMovePredicate),constantlyUpdateMeshUnderPointer:p.surface.scene.constantlyUpdateMeshUnderPointer,meshes:p.surface.scene.meshes.filter(m=>['audit-target','audit-cover'].includes(m.name)).map(m=>({name:m.name,isPickable:m.isPickable,isVisible:m.isVisible,enabled:m.isEnabled(),ready:m.isReady(),enablePointerMoveEvents:m.enablePointerMoveEvents,actionManager:!!m.actionManager,predicateEligible:p.surface.scene.pointerMovePredicate?.(m)}))}}:{})};
  const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
  return {label,hovered:p.target.matches(':hover'),background:getComputedStyle(p.target).backgroundColor,
   targetBox:box(p.target),coverBox:p.root.querySelector('#audit-cover')?box(p.root.querySelector('#audit-cover')):null,
   hit:p.shadow.elementFromPoint(180,130)?.id};
 },{mode,label});
  const file=`public-hover-${variant}-${mode}-dpr${dpr}-${instrumented?'observed':'plain'}-${label}.png`,bytes=await page.screenshot({path:path.join(out,file)}),png=PNG.sync.read(bytes);
  const offset=(130*dpr*png.width+180*dpr)*4;
  return {...observation,raster:{file,sha256:hash(bytes),point:{x:180,y:130},rgba:[...png.data.subarray(offset,offset+4)]}};
 };
 await page.mouse.move(180,130);await settle();const before=await snapshot('before-update');
 await page.evaluate(async({mode,next})=>{
  const p=window.__publicHover;if(mode==='astylar'){await p.surface.update(next);await p.surface.whenSettled();}
  else{const cover=document.createElement('div');cover.id='audit-cover';p.root.append(cover);}
 },{mode,next:data(true)});
 await settle();const stationary=await snapshot('covered-stationary');
 await page.mouse.move(181,130);await settle();const moved=await snapshot('covered-moved');
 await page.mouse.move(400,300);await settle();await page.mouse.move(180,130);await settle();const reentered=await snapshot('covered-reentered');
 const observations={before,stationary,moved,reentered};
 if(mode==='reference'){
  assert.equal(before.hovered,true);assert.equal(stationary.hovered,false);assert.equal(moved.hovered,false);
  assert.equal(stationary.hit,'audit-cover');assert.deepEqual(before.targetBox,{x:100,y:100,width:160,height:60});
  assert.deepEqual(stationary.coverBox,{x:80,y:80,width:200,height:100});
 }else{
  for(const boundary of Object.values(observations))assert.deepEqual(boundary.messages,[],'Invalid public reproduction');
  assert.equal(before.interaction.hoveredElementId,'audit-target');
  // Record a mismatched moving-pointer hit too; it is a separate diagnostic
  // failure, not grounds for silently treating occlusion as established.
 }
 return {mode,dpr,variant,instrumented,host,inputs:{before:data(false),after:data(true)},observations,
  expectations:{stationaryTarget:'audit-cover',movedTarget:'audit-cover'},
  ...(mode==='astylar'?{stationaryTargetMatches:stationary.interaction.hoveredElementId==='audit-cover',movedTargetMatches:moved.interaction.hoveredElementId==='audit-cover'}:{})};
}
