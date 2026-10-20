import assert from 'node:assert/strict';import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';import {createServer} from 'node:http';import path from 'node:path';import ts from 'typescript';import {chromium} from 'playwright-core';import {PNG} from 'pngjs';import {fingerprintDirectory} from './tests/material-parity/run-checkpoint.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),helperFile='tests/material-parity/sort-focus-structure.spec.mjs';
const ast=ts.createSourceFile(helperFile,readFileSync(helperFile,'utf8'),99,true),helper=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='withFrozenShowcase').getText(ast);
assert.equal(hash(helper),'603ac9ca88b9bf2e3443f8be65f125d39002e1ca4e5157487d9ac86ed7d2527f');
const withFrozen=new Function('assert','path','readFileSync','existsSync','createServer','chromium','fingerprintDirectory',helper+';return withFrozenShowcase;')(assert,path,readFileSync,existsSync,createServer,chromium,fingerprintDirectory);
const checkpointFile='artifacts/material-parity/divider-alignment-provenance-20261015/checkpoint/manifest.json',checkpoint=JSON.parse(readFileSync(checkpointFile));
const directory='artifacts/material-parity/divider-native-property-domain-20261020';assert.equal(existsSync(directory),false);mkdirSync(directory);
const images=[],observations=[];let actualBrowser;
const record=(name,bytes)=>{const file=directory+'/'+name+'.png';writeFileSync(file,bytes,{flag:'wx'});const r={file,sha256:hash(bytes)};images.push(r);return r};
const difference=(a,b)=>{const x=PNG.sync.read(a),y=PNG.sync.read(b);assert.equal(x.width,y.width);assert.equal(x.height,y.height);let changed=0;for(let i=0;i<x.data.length;i+=4)if([0,1,2,3].some(c=>x.data[i+c]!==y.data[i+c]))changed++;return changed};
await withFrozen(async(browser,baseUrl)=>{
 actualBrowser=browser.version();assert.equal(actualBrowser,'155.0.8059.80');
 const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 try{
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto(baseUrl+'/reference/divider?benchmark=1&profile=light');await page.waitForFunction(()=>typeof window.__MATERIAL_SHOWCASE_COMMAND__==='function');
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});
  for(const id of ['divider-above','divider-below']){
   const before=await page.locator('#'+id).evaluate(e=>({html:e.parentElement.outerHTML,parentStyle:e.parentElement.getAttribute('style'),leafStyle:e.getAttribute('style'),
    clip:e.parentElement.getBoundingClientRect().toJSON(),parentNamespace:e.parentElement.namespaceURI,leafNamespace:e.namespaceURI}));
   assert.equal(before.parentNamespace,'http://www.w3.org/1999/xhtml');assert.equal(before.leafNamespace,'http://www.w3.org/1999/xhtml');
   const clip={x:before.clip.x,y:before.clip.y,width:before.clip.width,height:before.clip.height};
   const base=await page.screenshot({clip});record(id+'-base',base);
   for(const [name,values,target]of [['fill',{fill:'#ff0000'},'parent'],['stroke',{stroke:'#0000ff',strokeWidth:'8px'},'parent'],
    ['object-fit',{objectFit:'contain'},'parent'],['color-positive',{color:'#ff00ff'},'leaf']]){
    await page.locator('#'+id).evaluate((e,{before,values,target})=>{
     for(const[node,value]of [[e.parentElement,before.parentStyle],[e,before.leafStyle]]){if(value===null)node.removeAttribute('style');else node.setAttribute('style',value)}
     Object.assign((target==='parent'?e.parentElement:e).style,values);
    },{before,values,target});
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
    const styles=await page.locator('#'+id).evaluate(e=>{const p=getComputedStyle(e.parentElement),s=getComputedStyle(e);return {parent:{fill:p.fill,stroke:p.stroke,strokeWidth:p.strokeWidth,objectFit:p.objectFit},leaf:{fill:s.fill,stroke:s.stroke,strokeWidth:s.strokeWidth,color:s.color}}});
    const bytes=await page.screenshot({clip}),changedPixels=difference(base,bytes);record(id+'-'+name,bytes);
    if(name==='color-positive')assert.ok(changedPixels>0,'positive color control must alter visible glyphs');else assert.equal(changedPixels,0,'proposed inactive property changed native paragraph pixels');
    observations.push({id,state:name,requested:values,styles,changedPixels});
   }
   await page.locator('#'+id).evaluate((e,before)=>{for(const[node,value]of [[e.parentElement,before.parentStyle],[e,before.leafStyle]]){if(value===null)node.removeAttribute('style');else node.setAttribute('style',value)}},before);
   assert.equal(await page.locator('#'+id).evaluate(e=>e.parentElement.outerHTML),before.html);
   const restored=await page.screenshot({clip});assert.equal(difference(base,restored),0);record(id+'-restored',restored);
  }
  await page.evaluate(()=>{
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.id='domain-svg';svg.setAttribute('width','120');svg.setAttribute('height','50');
   svg.style.cssText='position:fixed;left:0;top:0;width:120px;height:50px;background:white;fill:black;stroke:none;stroke-width:1px;font:16px Arial;z-index:99999';
   const text=document.createElementNS(svg.namespaceURI,'text');text.setAttribute('x','4');text.setAttribute('y','28');text.textContent='Above';svg.append(text);document.body.append(svg);
   const img=document.createElement('img');img.id='domain-img';img.style.cssText='position:fixed;left:0;top:60px;width:120px;height:50px;object-fit:fill;background:white;margin:0;padding:0;border:0;z-index:99999';
   img.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="red"/></svg>');document.body.append(img);
  });
  await page.locator('#domain-img').evaluate(e=>e.decode());
  const svgClip={x:0,y:0,width:120,height:50},imageClip={x:0,y:60,width:120,height:50};
  const svgBase=await page.screenshot({clip:svgClip});record('svg-base',svgBase);
  for(const[name,css]of [['fill',{fill:'#ff0000',stroke:'none'}],['stroke',{fill:'black',stroke:'#0000ff',strokeWidth:'8px'}]]){
   await page.locator('#domain-svg').evaluate((e,css)=>Object.assign(e.style,css),css);
   const b=await page.screenshot({clip:svgClip}),changedPixels=difference(svgBase,b);assert.ok(changedPixels>0);record('svg-'+name,b);
   observations.push({id:'domain-svg',state:name,changedPixels});
  }
  const imageBase=await page.screenshot({clip:imageClip});record('image-fill',imageBase);
  await page.locator('#domain-img').evaluate(e=>e.style.objectFit='contain');
  const imageContain=await page.screenshot({clip:imageClip}),changedPixels=difference(imageBase,imageContain);assert.ok(changedPixels>0);record('image-contain',imageContain);
  observations.push({id:'domain-img',state:'object-fit-positive',changedPixels});
  await page.evaluate(()=>{document.getElementById('domain-svg').remove();document.getElementById('domain-img').remove()});
  assert.deepEqual(errors,[]);
 }finally{await context.close()}
},{},{checkpointFile});
assert.equal(observations.length,11);assert.equal(images.length,17);
console.log(JSON.stringify({producerArgs:process.execArgv,checkpoint:{file:checkpointFile,sha256:hash(readFileSync(checkpointFile))},
 runtime:{actualBrowser,checkpointBrowser:checkpoint.provenance.browser,historicalBrowserReplay:false},observations,images,
 conclusion:'In this fresh frozen-build light/desktop browser,fill/stroke/object-fit interventions on both real paragraph branches leave pixels unchanged,while text color,SVG fill/stroke and replaced-image fitting controls visibly respond. Original paragraph markup and pixels restore exactly.',
 boundary:'Native-only transient diagnostic variants,not canonical fixture edits or older-browser replay. Does not demonstrate candidate rendering,all contexts,new draft support globally,or complete case closure.'}));
