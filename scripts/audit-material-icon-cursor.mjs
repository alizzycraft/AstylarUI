import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { fingerprintDirectory, fingerprintModuleGraph, materialBrowserLaunchOptions, inspectMaterialBrowserLaunch, openMaterialCheckpoint } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture } from '../tests/material-parity/supplemental-capture-evidence.mjs';
import { materialProfiles, materialViewports } from '../tests/material-parity/benchmark.config.mjs';
import { effectiveBrowserCursor } from '../tests/material-parity/cursor-metrics.mjs';
import ts from 'typescript';

const script = 'scripts/audit-material-icon-cursor.mjs', output = path.resolve(process.argv[2] ?? '');
assert(output.startsWith(path.resolve('artifacts/material-parity') + path.sep) && !existsSync(output) && !existsSync(output+'-checkpoint'));
const root = path.resolve('examples/material-showcase/dist/material-showcase/browser'), browserFiles = fingerprintDirectory(root);
const themeExports = {};
new Function('exports', ts.transpileModule(readFileSync('examples/material-showcase/src/app/theme.ts','utf8'), {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(themeExports);
assert.deepEqual(browserFiles, JSON.parse(readFileSync('artifacts/material-parity/tooltip-depth-checkpoint-c479097f/checkpoint/manifest.json')).provenance.browserFiles);
const server = createServer((req,res)=>{
  const file=path.resolve(root,new URL(req.url,'http://localhost').pathname.replace(/^\/+/,''));
  const target=file.startsWith(root+path.sep)&&path.extname(file)&&existsSync(file)?file:path.join(root,'index.csr.html');
  res.writeHead(200,{'content-type':{'.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'}[path.extname(target)]??'text/html','cache-control':'no-store'});res.end(readFileSync(target));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const baseUrl=`http://127.0.0.1:${server.address().port}`, launch=materialBrowserLaunchOptions(), browser=await chromium.launch(launch), results=[];
try {
  openMaterialCheckpoint({directory:output+'-checkpoint',provenance:{browser:browser.version(),browserLaunch:await inspectMaterialBrowserLaunch(browser,launch),browserFiles,harness:fingerprintModuleGraph(process.cwd(),script)}});
  const evidence=openSupplementalCapture({options:{baseUrl,checkpoint:output+'-checkpoint/checkpoint',output},browser,script,styleProperties:[]});
  const viewports=[...materialViewports,{...materialViewports[0],id:'desktop-dpr2',deviceScaleFactor:2}];
  for(const profile of materialProfiles) for(const viewport of viewports) for(const side of ['reference','astylar']) {
    const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:viewport.deviceScaleFactor}), finish=evidence.observe(page);
    try {
      await page.goto(`${baseUrl}/${side}/icon?benchmark=1&profile=${profile}`);
      if(side==='astylar') {await page.waitForFunction(()=>!!window.__ASTYLAR_MATERIAL_BENCHMARK__);await page.evaluate(()=>window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());}
      else await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
      const theme=await page.evaluate(side=>window.ng.getComponent(document.querySelector(side==='reference'?'app-reference':'app-astylar-showcase')).store.theme(),side);
      assert.deepEqual(theme,themeExports.MATERIAL_THEME_PROFILES[profile]);
      const measurements=await page.evaluate(side=>side==='astylar'?window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['icon-root','icon-primary']):{elements:Object.fromEntries(['icon-root','icon-primary'].map(id=>{const box=document.getElementById(id).getBoundingClientRect();return [id,{borderBox:{left:box.left,top:box.top,width:box.width,height:box.height}}]}))},side);
      const targets=[];
      for(const id of ['icon-root','icon-primary']) {
        const box=measurements.elements[id].borderBox;
        const canvas=side==='astylar'?await page.locator('canvas').boundingBox():{x:0,y:0};
        const point={x:canvas.x+box.left+box.width/2,y:canvas.y+box.top+(id==='icon-root'?12:box.height/2)};
        await page.mouse.move(point.x,point.y);
        if(side==='astylar') await page.evaluate(()=>window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
        const observation=await page.evaluate(({id,point,side})=>{
          const hit=document.elementFromPoint(point.x,point.y), owner=side==='reference'?document.getElementById(id):document.querySelector('canvas');
          let textAtPoint=false;
          const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
          for(let node=walker.nextNode();node;node=walker.nextNode()) {const range=document.createRange();range.selectNodeContents(node);if([...range.getClientRects()].some(r=>point.x>=r.left&&point.x<=r.right&&point.y>=r.top&&point.y<=r.bottom))textAtPoint=true;}
          return {id,point,hitType:hit?.tagName.toLowerCase(),hitId:hit?.id??null,ownerCursor:getComputedStyle(owner).cursor,hitCursor:getComputedStyle(hit).cursor,textAtPoint};
        },{id,point,side});
        observation.effectiveCursor=effectiveBrowserCursor(observation.hitCursor,observation.textAtPoint);
        targets.push(observation);
      }
      results.push({profile,viewport,side,theme,targets,runtime:await finish()});
      console.log(JSON.stringify({profile,viewport:viewport.id,side,cursors:targets.map(target=>target.effectiveCursor)}));
    } finally {await page.close();}
  }
  assert.deepEqual(fingerprintDirectory(root),browserFiles);
  writeFileSync(`${evidence.directory}/latest-report.json`,JSON.stringify({capture:evidence.capture,results,scope:'Settled Icon/root pointer hit cursors in16 configured physical cohorts; no held/click,OS cursor pixel capture,current source equivalence or complete case closure.'},null,2),{flag:'wx'});
  for(const row of results) for(const target of row.targets) {assert.equal(target.textAtPoint,false);assert.equal(target.effectiveCursor,'default');}
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
