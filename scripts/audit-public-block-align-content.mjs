import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { materialBrowserLaunchOptions, inspectMaterialBrowserLaunch } from '../tests/material-parity/run-checkpoint.mjs';

// Reuse the public-relative-margins package-root mount/build/projection workflow.
// Positioned parents deliberately exclude parent/child margin collapse here:
// omission/default and positive block alignment are separate questions.
const output = path.resolve(process.argv[2] ?? '');
assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep));
assert.ok(!existsSync(output), 'Never overwrite prior evidence');
const hash = b => createHash('sha256').update(b).digest('hex');
const require = createRequire(path.resolve('examples/material-showcase/package.json'));
const contents = `import '@angular/compiler';
import {provideZonelessChangeDetection} from '@angular/core';
import {createApplication} from '@angular/platform-browser';
import {Astylar} from 'astylarui';
import {Matrix,Vector3} from '@babylonjs/core';
const q=new URLSearchParams(location.search),mode=q.get('mode'),value=q.get('value');
document.body.style.cssText='margin:0;padding:0';
const site={root:{children:[{type:'div',id:'parent',children:[{type:'div',id:'child'}]}]},styles:[
{selector:'*',boxSizing:'border-box',margin:'0',padding:'0',borderWidth:'0',borderStyle:'none'},
{selector:'#parent',position:'absolute',left:'20px',top:'20px',width:'100px',height:'100px',display:'block',background:'#eeeeee',...(value==='omitted'?{}:{alignContent:value})},
{selector:'#child',display:'block',width:'10px',height:'10px',margin:'20px 0 0',background:'#123456'}]};
const original=JSON.stringify(site),host=document.createElement(mode==='reference'?'div':'canvas');
host.style.cssText='position:relative;display:block;width:200px;height:180px';document.body.append(host);
let app,surface;
if(mode==='reference'){
 const css=document.createElement('style');css.textContent=site.styles.map(({selector,...s})=>selector+'{'+Object.entries(s).map(([k,v])=>k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+v).join(';')+'}').join('');document.head.append(css);
 const parent=document.createElement('div'),child=document.createElement('div');parent.id='parent';child.id='child';parent.append(child);host.append(parent);
}else{app=await createApplication({providers:[provideZonelessChangeDetection()]});surface=app.injector.get(Astylar).mount(host,site,{diagnostics:{logLevel:'silent'}});await surface.whenSettled();}
await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
window.blockAlignmentAudit={snapshot:()=>{
 const bounds={};for(const id of ['parent','child']){
  if(mode==='reference'){const b=document.getElementById(id).getBoundingClientRect(),o=host.getBoundingClientRect();bounds[id]={left:b.left-o.left,top:b.top-o.top,width:b.width,height:b.height};}
  else{const mesh=surface.scene.getMeshByName(id);if(!mesh)throw Error('Missing '+id);mesh.computeWorldMatrix(true);const engine=surface.scene.getEngine(),viewport=surface.scene.activeCamera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight());
   const points=mesh.getBoundingInfo().boundingBox.vectorsWorld.map(p=>Vector3.Project(p,Matrix.IdentityReadOnly,surface.scene.getTransformMatrix(),viewport));
   const xs=points.map(p=>p.x*host.clientWidth/engine.getRenderWidth()),ys=points.map(p=>p.y*host.clientHeight/engine.getRenderHeight());bounds[id]={left:Math.min(...xs),top:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};}
 }
 return {site,inputUnchanged:JSON.stringify(site)===original,bounds,alignContent:mode==='reference'?getComputedStyle(document.getElementById('parent')).alignContent:surface.inspectResolvedStyles().elements.find(e=>e.id==='parent').effective.alignContent,errors:surface?.diagnostics.messages.filter(m=>m.severity==='error')??[]};
},dispose:()=>{surface?.dispose();app?.destroy();}};`;
const built = await require('esbuild').build({ absWorkingDir:process.cwd(),stdin:{contents,resolveDir:path.resolve('examples/material-showcase'),sourcefile:'block-align-content-public-diagnostic.mjs'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',metafile:true });
const bundle = built.outputFiles[0].contents;
const inputs = Object.keys(built.metafile.inputs).filter(f=>existsSync(f)).sort().map(file=>({file,sha256:hash(readFileSync(file))}));
const html = '<!doctype html><script type="module" src="/audit.js"></script>';
mkdirSync(output); writeFileSync(path.join(output,'audit.js'),bundle); writeFileSync(path.join(output,'input.mjs'),contents);
const server=createServer((req,res)=>{res.setHeader('content-type',req.url==='/audit.js'?'text/javascript':'text/html');res.end(req.url==='/audit.js'?bundle:html);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;const results=[],errors=[];
try{
 const launch=materialBrowserLaunchOptions();browser=await chromium.launch(launch);
 for(const dpr of [1,2])for(const value of ['omitted','normal','stretch','center']){
  const row={dpr,value};for(const mode of ['reference','astylar']){
   const page=await browser.newPage({viewport:{width:200,height:180},deviceScaleFactor:dpr}),pending=[],assets=[];
   page.on('pageerror',e=>errors.push(String(e)));page.on('response',res=>{if(['document','script'].includes(res.request().resourceType()))pending.push(res.body().then(b=>assets.push({type:res.request().resourceType(),sha256:hash(b)})));});
   try{await page.goto('http://127.0.0.1:'+server.address().port+'/?mode='+mode+'&value='+value);await page.waitForFunction(()=>!!window.blockAlignmentAudit);
    row[mode]=await page.evaluate(()=>window.blockAlignmentAudit.snapshot());await Promise.all(pending);row[mode].assets=assets;
    assert.ok(assets.some(a=>a.sha256===hash(bundle)));assert.equal(row[mode].inputUnchanged,true);assert.deepEqual(row[mode].errors,[]);
    await page.evaluate(()=>window.blockAlignmentAudit.dispose());
   }finally{await page.close();}
  }assert.deepEqual(row.reference.site,row.astylar.site);results.push(row);
 }
 assert.deepEqual(errors,[]);for(const q of inputs)assert.equal(hash(readFileSync(q.file)),q.sha256);
 const report={kind:'public-block-align-content-diagnostic',producer:{file:'scripts/audit-public-block-align-content.mjs',sha256:hash(readFileSync('scripts/audit-public-block-align-content.mjs'))},inputs,browser:browser.version(),launch:await inspectMaterialBrowserLaunch(browser,launch),bundleSha256:hash(bundle),inputSha256:hash(contents),errors,results,
 boundary:'Equal package-root inputs and projected CSS bounds;projection is measurement only,not layout calculation. Positioned parent excludes collapse. Not local pixel/raster,all block formatting contexts,Material cause,historical replay or aggregate acceptance.'};
 writeFileSync(path.join(output,'latest-report.json'),JSON.stringify(report));
 console.log(JSON.stringify({pairs:results.length,bundleBytes:bundle.length,results:results.map(r=>({dpr:r.dpr,value:r.value,reference:{align:r.reference.alignContent,offset:r.reference.bounds.child.top-r.reference.bounds.parent.top},astylar:{align:r.astylar.alignContent,offset:r.astylar.bounds.child.top-r.astylar.bounds.parent.top}}))}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
