import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { fingerprintDirectory, materialBrowserLaunchOptions, inspectMaterialBrowserLaunch } from '../tests/material-parity/run-checkpoint.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
const root=path.resolve('examples/material-showcase/dist/material-showcase/browser');
const baselineFile='artifacts/material-parity/divider-alignment-provenance-20261015/latest-report.json';
const bytes=readFileSync(baselineFile);assert.equal(hash(bytes),'4be9c6d199952f35203f31d08def08d0d936071f4eb313b75ad3bbf72dd46f11');
const baseline=JSON.parse(bytes),files=fingerprintDirectory(root);assert.deepEqual(files,baseline.captureProvenance.browserFiles);
const expected=new Map(files.map(x=>[x.file,x.sha256]));
const server=createServer((req,res)=>{
  const file=path.resolve(root,new URL(req.url,'http://localhost').pathname.slice(1));
  const target=file.startsWith(root+path.sep)&&path.extname(file)&&existsSync(file)?file:path.join(root,'index.csr.html');
  res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'})[path.extname(target)]??'text/html');res.end(readFileSync(target));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;const results=[],errors=[];
try{
  const launch=materialBrowserLaunchOptions();browser=await chromium.launch(launch);
  for(const profile of ['light','dark','contrast','custom'])for(const side of ['reference','astylar']){
    const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'});
    const pending=[],assets=[];page.on('pageerror',e=>errors.push(String(e)));
    page.on('response',response=>{if(!['document','script','stylesheet','font'].includes(response.request().resourceType()))return;
      pending.push((async()=>{const url=new URL(response.url());assert.equal(url.origin,`http://127.0.0.1:${server.address().port}`);
        const file=response.request().resourceType()==='document'?'index.csr.html':decodeURIComponent(url.pathname).slice(1);
        const sha256=hash(await response.body());assert.equal(response.status(),200);assert.equal(sha256,expected.get(file));assets.push({file,sha256});})());});
    await page.addInitScript(()=>{window.baselineDraws=[];const original=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(...args){if(['Above','Below'].includes(args[0]))window.baselineDraws.push({text:args[0],x:args[1],y:args[2],baseline:this.textBaseline,font:this.font,transform:this.getTransform().toJSON(),height:this.canvas.height});return Reflect.apply(original,this,args);};});
    try{
      await page.goto(`http://127.0.0.1:${server.address().port}/${side}/divider?benchmark=1&profile=${profile}`);
      if(side==='astylar')await page.waitForFunction(()=>!!window.__ASTYLAR_MATERIAL_BENCHMARK__);
      else await page.waitForSelector('#divider-above');
      await page.evaluate(async()=>{await document.fonts.ready;await window.__ASTYLAR_MATERIAL_BENCHMARK__?.waitForSettled();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
      const observation=await page.evaluate(side=>{
        const native=[];
        if(side==='reference')for(const id of ['divider-above','divider-below']){
          const leaf=document.getElementById(id),parent=leaf.parentElement,before=parent.getBoundingClientRect();
          const range=document.createRange();range.selectNodeContents(leaf);const ink=range.getBoundingClientRect();
          const marker=document.createElement('span');marker.style.cssText='display:inline-block;width:0;height:0;margin:0;padding:0;border:0;vertical-align:baseline';parent.append(marker);
          const box=marker.getBoundingClientRect(),after=parent.getBoundingClientRect(),inkAfter=range.getBoundingClientRect();marker.remove();
          const cs=getComputedStyle(leaf);native.push({id,paragraphHeight:before.height,baselineOffset:box.top-before.top,
            textTop:ink.top-before.top,textHeight:ink.height,font:cs.font,fontFamily:cs.fontFamily,
            stable:before.height===after.height&&ink.top===inkAfter.top&&ink.height===inkAfter.height});
        }
        return {native,draws:window.baselineDraws};
      },side);
      if(side==='reference'){assert.equal(observation.native.length,2);assert.ok(observation.native.every(x=>x.stable));}
      else assert.ok(observation.draws.some(x=>x.text==='Above')&&observation.draws.some(x=>x.text==='Below'));
      await Promise.all(pending);assert.ok(assets.length>0);results.push({profile,side,observation,assets});
    }finally{await page.close();}
  }
  assert.deepEqual(errors,[]);assert.deepEqual(fingerprintDirectory(root),files);
  console.log(JSON.stringify({producerSha256:hash(readFileSync(import.meta.filename)),baseline:{file:baselineFile,sha256:hash(bytes)},
    browser:browser.version(),launch:await inspectMaterialBrowserLaunch(browser,launch),results,
    boundary:'Fresh four-profile desktop DPR1 baseline diagnostic on authenticated served bytes. Marker-only native intervention preserves measured bounds;candidate draw coordinates remain texture-local. Not old-browser replay,global baseline equality,current core-source equivalence or full-case acceptance.'}));
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
