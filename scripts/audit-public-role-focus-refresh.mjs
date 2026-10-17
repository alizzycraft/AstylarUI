import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { materialBrowserLaunchOptions, inspectMaterialBrowserLaunch } from '../tests/material-parity/run-checkpoint.mjs';

// Specific gap: does public unchanged-document update first blur a role control
// during attribute refresh, before the independently proved root replacement?
const script = 'scripts/audit-public-role-focus-refresh.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const kinds = ['div', 'span', 'input', 'button'];
const verifyOnly = process.argv[2] === '--verify';
const output = path.resolve(process.argv[verifyOnly ? 3 : 2] ?? '');
assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep));
function verify(report) {
  assert.equal(report.kind, 'public-role-focus-refresh');
  assert.equal(report.scriptSha256, hash(readFileSync(script)));
  for (const receipt of [report.inputSource, report.bundle, report.html, ...report.inputs])
    assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.results.map(r => `${r.dpr}/${r.controlKind}`), [1, 2].flatMap(d => kinds.map(k => `${d}/${k}`)));
  let attributeFirst = 0, rootFirst = 0, nativeControls = 0;
  for (const row of report.results) {
    assert.deepEqual(row.reference.site, row.astylar.site);
    assert.equal(row.reference.site.root.children[0].children[0].type, row.controlKind);
    for (const side of ['reference', 'astylar']) {
      const observation = row[side];
      assert.equal(observation.inputUnchanged, true); assert.deepEqual(observation.diagnostics, []);
      assert.equal(observation.updates.length, 2);
      for (const type of ['document', 'script']) assert.ok(observation.assets.some(a => a.type === type && a.sha256 === report[type === 'document' ? 'html' : 'bundle'].sha256));
      for (const sample of observation.updates) {
        assert.equal(sample.initiallyFocused, true); assert.equal(sample.sameNode, true); assert.equal(sample.focused, true);
        if (side === 'reference') {
          assert.deepEqual(sample.events, []); assert.deepEqual(sample.operations, []); nativeControls++;
        } else {
          assert.deepEqual(sample.events.map(e => e.type), ['focusout', 'focusin']);
          const first = sample.operations.find(o => o.before && !o.after);
          assert.ok(first); assert.equal(first.connected, true);
          if (['div', 'span'].includes(row.controlKind)) {
            assert.equal(first.operation, 'removeAttribute'); assert.equal(first.attribute, 'tabindex');
            assert.equal(first.controlOwner, true); attributeFirst++;
          } else { assert.equal(first.operation, 'replaceChildren'); rootFirst++; }
        }
      }
    }
  }
  return { pairs: 8, nativeNoopControls: nativeControls, candidateAttributeFirstFailures: attributeFirst,
    candidateRootFirstFailures: rootFirst, currentRenderingAccepted: false };
}
if (verifyOnly) {
  const report = JSON.parse(readFileSync(path.join(output, 'latest-report.json'))), summary = verify(report);
  let controls = 0;
  for (const mutate of [r => r.results.pop(), r => r.results[0].astylar.site.root.children[0].children[0].tabindex = -1,
    r => { r.results[0].astylar.updates[0].operations.find(o => o.before && !o.after).attribute = 'id'; }]) {
    const forged = structuredClone(report); mutate(forged); assert.throws(() => verify(forged)); controls++;
  }
  console.log(JSON.stringify({ ...summary, negativeControlsRejected: controls }));
} else {
  assert.ok(!existsSync(output), 'Use a fresh path; keep original and failed evidence');
  const contents = `import '@angular/compiler';
import {provideZonelessChangeDetection} from '@angular/core';
import {createApplication} from '@angular/platform-browser';
import {Astylar} from 'astylarui';
const q=new URLSearchParams(location.search),mode=q.get('mode'),kind=q.get('kind');
const site={root:{children:[{type:'div',id:'focus-parent',children:[{type:kind,id:'focus-control',tabindex:0,
role:kind==='input'?'textbox':'button',...(kind==='input'?{inputType:'text',value:'Atlas'}:{textContent:'Atlas'})}]}]},styles:[
{selector:'*',margin:'0',padding:'0',boxSizing:'border-box'},
{selector:'#focus-parent',width:'300px',height:'60px'},
{selector:'#focus-control',display:'block',width:'228px',height:'24px',fontFamily:'Arial',fontSize:'16px'}]};
const authored=JSON.stringify(site),host=document.createElement(mode==='reference'?'div':'canvas');
host.style.cssText='display:block;width:390px;height:140px';document.body.append(host);
let app,surface;
if(mode==='reference'){
 const style=document.createElement('style');style.textContent=site.styles.map(({selector,...s})=>selector+'{'+Object.entries(s).map(([k,v])=>k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+v).join(';')+'}').join('');document.head.append(style);
 const parent=document.createElement('div'),control=document.createElement(kind);parent.id='focus-parent';control.id='focus-control';control.tabIndex=0;control.setAttribute('role',kind==='input'?'textbox':'button');
 if(kind==='input'){control.type='text';control.value='Atlas';}else{control.textContent='Atlas';if(kind==='button')control.type='button';}parent.append(control);host.append(parent);
}else{app=await createApplication({providers:[provideZonelessChangeDetection()]});surface=app.injector.get(Astylar).mount(host,site,{diagnostics:{logLevel:'silent'}});await surface.whenSettled();}
const settle=async()=>{await document.fonts.ready;if(surface)await surface.whenSettled();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};
await settle();
const control=document.querySelector(mode==='reference'?'#focus-control':'[data-astylar-id="focus-control"]'),events=[],operations=[];
if(!control)throw Error('Missing public focus control');
for(const type of ['focusout','focusin'])control.addEventListener(type,()=>events.push({type,connected:control.isConnected,stack:new Error().stack}));
const originals={removeAttribute:Element.prototype.removeAttribute,replaceChildren:Element.prototype.replaceChildren};
for(const operation of Object.keys(originals))Element.prototype[operation]=function(...args){
 const relevant=this===control||this.contains(control),before=document.activeElement===control;
 const result=originals[operation].apply(this,args);
 if(relevant)operations.push({operation,attribute:operation==='removeAttribute'?args[0]:null,controlOwner:this===control,
 owner:this.dataset.astylarId||this.id||null,before,after:document.activeElement===control,connected:control.isConnected,stack:new Error().stack});return result;
};
window.roleFocusAudit={async run(){const updates=[];for(let index=0;index<2;index++){
 control.focus();const initiallyFocused=document.activeElement===control;events.length=0;operations.length=0;
 if(surface)await surface.update(structuredClone(site));await settle();
 updates.push({index,initiallyFocused,sameNode:document.querySelector(mode==='reference'?'#focus-control':'[data-astylar-id="focus-control"]')===control,
 focused:document.activeElement===control,events:structuredClone(events),operations:structuredClone(operations)});
}return{site,inputUnchanged:JSON.stringify(site)===authored,updates,diagnostics:surface?surface.diagnostics.messages:[]};},
dispose(){for(const key of Object.keys(originals))Element.prototype[key]=originals[key];surface?.dispose();app?.destroy();}};`;
  const require = createRequire(path.resolve('examples/material-showcase/package.json'));
  const built = await require('esbuild').build({ absWorkingDir: process.cwd(), stdin: { resolveDir: path.resolve('examples/material-showcase'),
    sourcefile: 'public-role-focus-refresh.mjs', contents }, bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', metafile: true });
  const inputs = Object.keys(built.metafile.inputs).filter(f => path.basename(f) !== 'public-role-focus-refresh.mjs').map(file => ({ file, sha256: hash(readFileSync(file)) }));
  assert.ok(!inputs.some(r => r.file.includes('material-showcase/src') || r.file.includes('astylarui/dist/lib/plugins/material')));
  mkdirSync(output, { recursive: true });
  const bundle = built.outputFiles[0].contents, html = Buffer.from('<!doctype html><script type="module" src="/audit.js"></script>');
  const receipt = (name, bytes) => { const file = path.join(output, name); writeFileSync(file, bytes, { flag: 'wx' }); return { file, sha256: hash(bytes) }; };
  const inputSource = receipt('input.mjs', contents), bundleReceipt = receipt('audit.js', bundle), htmlReceipt = receipt('index.html', html);
  const server = createServer((request, response) => {
    const js = new URL(request.url, 'http://127.0.0.1').pathname === '/audit.js';
    response.setHeader('content-type', js ? 'text/javascript' : 'text/html'); response.end(js ? bundle : html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const launch = materialBrowserLaunchOptions(); let browser; const errors = [], results = [];
  try {
    browser = await chromium.launch(launch);
    for (const dpr of [1, 2]) for (const controlKind of kinds) {
      const row = { dpr, controlKind };
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 390, height: 300 }, deviceScaleFactor: dpr }), assets = [];
        page.on('pageerror', error => errors.push(String(error)));
        page.on('response', r => { if (['document', 'script'].includes(r.request().resourceType())) assets.push(r.body().then(b => ({ type: r.request().resourceType(), sha256: hash(b) }))); });
        try {
          await page.goto('http://127.0.0.1:' + server.address().port + '/?mode=' + mode + '&kind=' + controlKind);
          await page.waitForFunction(() => !!window.roleFocusAudit);
          row[mode] = { ...await page.evaluate(() => window.roleFocusAudit.run()), assets: await Promise.all(assets) };
          await page.evaluate(() => window.roleFocusAudit.dispose());
        } finally { await page.close(); }
      }
      results.push(row);
    }
    const report = { kind: 'public-role-focus-refresh', scriptSha256: hash(readFileSync(script)), inputSource, bundle: bundleReceipt, html: htmlReceipt,
      inputs, runtime: { browser: browser.version(), launch: await inspectMaterialBrowserLaunch(browser, launch) }, errors, results };
    writeFileSync(path.join(output, 'latest-report.json'), JSON.stringify(report, null, 2), { flag: 'wx' });
    console.log(JSON.stringify(verify(report)));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
