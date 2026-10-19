import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { chromium } from 'playwright-core';
import { materialBrowserLaunchOptions, inspectMaterialBrowserLaunch } from '../tests/material-parity/run-checkpoint.mjs';

const root='artifacts/material-parity/public-paragraph-linebox-20261015';
const hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=readFileSync(`${root}/latest-report.json`),report=JSON.parse(bytes);
assert.equal(hash(bytes),'dd72dd2efc9c6838f6bce46b23b1ea0f56bcbab45de0414497ebcbb592aa5bf7');
const bundle=readFileSync(`${root}/audit.js`),html=readFileSync(`${root}/index.html`);
assert.equal(hash(bundle),report.runtime.bundleSha256);assert.equal(hash(html),report.runtime.htmlSha256);
const server=createServer((req,res)=>{const script=req.url==='/audit.js';res.setHeader('content-type',script?'text/javascript':'text/html');res.end(script?bundle:html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;const results=[],errors=[];
try{
  const launch=materialBrowserLaunchOptions();browser=await chromium.launch(launch);
  for(const font of [16,24])for(const unit of ['normal','px'])for(const mode of ['reference','astylar']){
    const page=await browser.newPage({viewport:{width:400,height:260},deviceScaleFactor:1});
    page.on('pageerror',e=>errors.push(String(e)));
    await page.addInitScript(()=>{
      window.drawObservations=[];
      const original=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(...args){
        if(args[0]==='Agpy')window.drawObservations.push({text:args[0],x:args[1],y:args[2],font:this.font,
          baseline:this.textBaseline,transform:this.getTransform().toJSON(),width:this.canvas.width,height:this.canvas.height});
        return Reflect.apply(original,this,args);
      };
    });
    try{
      await page.goto(`http://127.0.0.1:${server.address().port}/?${new URLSearchParams({mode,font:String(font),unit,context:'block'})}`);
      await page.waitForFunction(()=>!!window.marginAudit);
      const observed=await page.evaluate(mode=>{
        const snapshot=window.marginAudit.snapshot();let nativeBaseline=null;
        if(mode==='reference'){
          const child=document.getElementById('child'),leaf=document.getElementById('leaf');
          const before=child.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(leaf);
          const beforeRange=range.getBoundingClientRect();
          const marker=document.createElement('span');marker.style.cssText='display:inline-block;width:0;height:0;padding:0;margin:0;border:0;vertical-align:baseline';
          child.append(marker);const after=child.getBoundingClientRect(),r=marker.getBoundingClientRect();
          const afterRange=range.getBoundingClientRect();marker.remove();
          nativeBaseline={offset:r.top-before.top,height:before.height,markerDidNotChangeParagraph:before.height===after.height,
            markerDidNotMoveText:beforeRange.top===afterRange.top&&beforeRange.height===afterRange.height};
        }
        return {snapshot,nativeBaseline,draws:window.drawObservations};
      },mode);
      assert.equal(observed.snapshot.inputUnchanged,true);assert.deepEqual(observed.snapshot.errors,[]);
      if(mode==='reference'){assert.equal(observed.nativeBaseline.markerDidNotChangeParagraph,true);assert.equal(observed.nativeBaseline.markerDidNotMoveText,true);}
      else assert.ok(observed.draws.length>0);
      results.push({font,unit,mode,...observed});await page.evaluate(()=>window.marginAudit.dispose());
    }finally{await page.close();}
  }
  assert.deepEqual(errors,[]);assert.equal(results.length,8);
  console.log(JSON.stringify({producerSha256:hash(readFileSync(import.meta.filename)),publicReportSha256:hash(bytes),
    browser:browser.version(),launch:await inspectMaterialBrowserLaunch(browser,launch),results,
    boundary:'Fresh diagnostic on immutable retained public bundle,not current full core or Material fixture acceptance. Native marker intervention checks stable paragraph/text bounds. Candidate fillText coordinates are texture-local,not CSS global baseline;no projection inference.'}));
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
