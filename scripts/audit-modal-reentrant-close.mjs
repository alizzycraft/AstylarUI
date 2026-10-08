import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { chromium } from 'playwright-core';

// Isolated public-API reproduction; does not modify Material fixtures or core.
const applicationSource = `
import '@angular/compiler';
import {provideZonelessChangeDetection} from '@angular/core';
import {createApplication} from '@angular/platform-browser';
import {Astylar} from 'astylarui';
document.body.style.cssText='margin:0';
const canvas=document.createElement('canvas');
canvas.style.cssText='display:block;width:390px;height:180px';document.body.append(canvas);
const app=await createApplication({providers:[provideZonelessChangeDetection()]});
const policy=new URL(location.href).searchParams.get('policy');
let surface;const calls=[];
const site=open=>({root:{children:[{type:'button',id:'trigger',value:'Open'},
  ...(open?[{type:'dialog',id:'modal',open:true,modal:true,children:[
    {type:'button',id:'action',value:'Continue',autofocus:true}]}]:[])]},styles:[
  {selector:'#trigger',position:'absolute',left:'20px',top:'20px',width:'120px',height:'40px',padding:'0',borderWidth:'0',background:'#eeeeee',fontFamily:'Arial',fontSize:'14px'},
  {selector:'#modal',position:'absolute',left:'10px',top:'70px',width:'280px',height:'90px',padding:'0',borderWidth:'0',background:'#ffffff'},
  {selector:'#action',width:'120px',height:'40px',padding:'0',borderWidth:'0',background:'#eeeeee',fontFamily:'Arial',fontSize:'14px'}]});
surface=app.injector.get(Astylar).mount(canvas,site(false),{
  diagnostics:{logLevel:'silent'},events:{handlers:{
    trigger:{click:()=>{calls.push('trigger.click');void surface.update(site(true));}},
    action:{keydown:e=>{if(e.key==='Escape'){
      calls.push('action.Escape');if(policy!=='default'){
        if(policy==='request-before-update') calls.push({restorationAccepted:surface.focus('trigger')});
        void surface.update(site(false));
        if(policy==='update') calls.push({restorationAccepted:surface.focus('trigger')});
      }
    }}},
    modal:{close:()=>{calls.push('modal.close');void surface.update(site(false));}}
  }}
});
const settle=async()=>{await document.fonts.ready;await surface.whenSettled();
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};
const snapshot=()=>({focus:document.activeElement.getAttribute('data-astylar-id')||document.activeElement.tagName,
  interaction:surface.diagnostics.interaction,modal:!!document.querySelector('[data-astylar-id="modal"]'),
  calls:[...calls],diagnostics:surface.diagnostics.messages});
await settle();window.repro={settle,snapshot,dispose(){surface.dispose();app.destroy();}};
`;
const consumer = path.resolve('examples/material-showcase');
const nativeSource = `
document.body.style.cssText='margin:0';
const params=new URL(location.href).searchParams,
  policy=params.get('policy'),removeNode=params.get('side')==='native-remove',calls=[];
const trigger=document.createElement('button');trigger.id='trigger';trigger.textContent='Open';
trigger.style.cssText='position:absolute;left:20px;top:20px;width:120px;height:40px;padding:0;border-width:0;background:#eeeeee;font:14px Arial';
const modal=document.createElement('dialog');modal.id='modal';
modal.style.cssText='position:absolute;left:10px;top:70px;width:280px;height:90px;padding:0;border-width:0;background:#ffffff';
const action=document.createElement('button');action.id='action';action.textContent='Continue';action.autofocus=true;
action.style.cssText='width:120px;height:40px;padding:0;border-width:0;background:#eeeeee;font:14px Arial';
modal.append(action);document.body.append(trigger,modal);
trigger.onclick=()=>{calls.push('trigger.click');modal.showModal();};
action.onkeydown=e=>{if(e.key==='Escape'){calls.push('action.Escape');if(policy!=='default'){
  if(policy==='request-before-update'){trigger.focus();calls.push({restorationAccepted:document.activeElement===trigger});}
  if(removeNode) modal.remove();else modal.close();
  if(policy==='update'){trigger.focus();calls.push({restorationAccepted:document.activeElement===trigger});}
}}};
window.repro={settle:()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))),
snapshot:()=>({focus:document.activeElement.id||document.activeElement.tagName,modal:modal.isConnected&&modal.open,calls:[...calls],diagnostics:[]}),
dispose(){trigger.remove();modal.remove();}};
`;
const hash = value => createHash('sha256').update(value).digest('hex');
const built = await createRequire(path.join(consumer, 'package.json'))('esbuild').build({
  absWorkingDir: process.cwd(), stdin: { resolveDir: consumer, sourcefile: 'public-modal-close.mjs', contents: applicationSource },
  bundle: true, write: false, metafile: true, format: 'esm', platform: 'browser', target: 'es2022',
});
const dependencies = Object.keys(built.metafile.inputs).filter(file => existsSync(path.resolve(file)))
  .sort().map(file => ({ file, sha256: hash(readFileSync(path.resolve(file))) }));
assert.ok(!dependencies.some(row => /^src[\\/]/.test(row.file)));
const server = createServer((request, response) => {
  const script = request.url.startsWith('/audit.js') || request.url.startsWith('/native.js');
  response.setHeader('content-type', script ? 'text/javascript' : 'text/html');
  response.end(script ? (request.url.startsWith('/native.js') ? nativeSource : built.outputFiles[0].contents) :
    `<!doctype html><script type="module" src="${request.url.includes('side=native') ? '/native.js' : '/audit.js'}"></script>`);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
const observations = [];
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const sides = process.argv.includes('--native-removal') ? ['native-remove'] : ['astylar', 'native', 'native-remove'];
  for (const side of sides) for (const dpr of [1, 2]) for (const policy of ['default', 'update', 'request-before-update']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr });
    try {
      const errors = []; page.on('pageerror', error => errors.push(String(error)));
      await page.goto(`http://127.0.0.1:${server.address().port}/?policy=${policy}&side=${side}`);
      await page.waitForFunction(() => !!window.repro);
      await page.mouse.click(80, 40); await page.evaluate(() => window.repro.settle());
      const opened = await page.evaluate(() => window.repro.snapshot());
      assert.equal(opened.modal, true);
      await page.keyboard.press('Escape'); await page.waitForTimeout(30);
      await page.evaluate(() => window.repro.settle());
      const closed = await page.evaluate(() => window.repro.snapshot());
      observations.push({ side, dpr, policy, opened, closed, errors });
      console.log(JSON.stringify(observations.at(-1)));
      assert.deepEqual(errors, []);
      assert.deepEqual(opened.diagnostics, []); assert.deepEqual(closed.diagnostics, []);
      assert.equal(closed.modal, false);
      assert.equal(closed.focus, side !== 'native' && policy === 'request-before-update' ? 'BODY' : 'trigger');
      if (policy !== 'default') assert.equal(closed.calls.find(call => typeof call === 'object').restorationAccepted,
        policy === 'update');
      await page.evaluate(() => window.repro.dispose());
    } finally { await page.close(); }
  }
  for (const row of dependencies) assert.equal(hash(readFileSync(path.resolve(row.file))), row.sha256);
  console.log(JSON.stringify({ status: 'complete', applicationSource, nativeSource, observations: observations.length,
    bundleSha256: hash(built.outputFiles[0].contents), dependencyCount: dependencies.length,
    dependencyReceipt: hash(JSON.stringify(dependencies)), browser: browser.version(),
    scope: 'Package-root default Escape versus two focus/update orders inside Escape handler DPR1/2; not native-equivalent rendering or full close contract.' }));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
