import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { materialBrowserLaunchOptions } from '../tests/material-parity/run-checkpoint.mjs';

// Separate public diagnostic: explicit-value fixtures cannot prove omission.
const output = path.resolve(process.argv[2] ?? '');
assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep));
assert.ok(!existsSync(output), 'Preserve prior evidence');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const require = createRequire(path.resolve('examples/material-showcase/package.json'));
const contents = `import '@angular/compiler';
import {provideZonelessChangeDetection} from '@angular/core';
import {createApplication} from '@angular/platform-browser';
import {Astylar} from 'astylarui';
const mode=new URLSearchParams(location.search).get('mode');
document.body.style.cssText='margin:0;padding:0';
const styles=['omitted','content-box','border-box'].map((value,i)=>({selector:'#box'+i,
position:'absolute',left:'20px',top:(20+i*110)+'px',width:'140px',height:'50px',
padding:'10px',borderWidth:'3px',borderStyle:'solid',borderColor:'#123456',
background:'#abcdef',...(value==='omitted'?{}:{boxSizing:value})}));
const site={styles,root:{children:styles.map((_,i)=>({type:'div',id:'box'+i}))}};
const host=document.createElement(mode==='reference'?'div':'canvas');
host.style.cssText='position:relative;display:block;width:400px;height:400px';document.body.append(host);
let app,surface;
if(mode==='reference'){
const css=document.createElement('style');css.textContent=styles.map(({selector,...s})=>selector+'{'+Object.entries(s).map(([k,v])=>k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+v).join(';')+'}').join('');document.head.append(css);
for(let i=0;i<3;i++){const n=document.createElement('div');n.id='box'+i;host.append(n);}
}else{app=await createApplication({providers:[provideZonelessChangeDetection()]});surface=app.injector.get(Astylar).mount(host,site,{diagnostics:{logLevel:'silent'}});await surface.whenSettled();}
await document.fonts.ready;
window.boxAudit={site,snapshot:()=>mode==='reference'?styles.map((_,i)=>{const n=document.getElementById('box'+i),r=n.getBoundingClientRect();return {id:n.id,width:r.width,height:r.height,boxSizing:getComputedStyle(n).boxSizing};}):surface.inspectResolvedStyles(),dispose:()=>{surface?.dispose();app?.destroy();}};`;
const built = await require('esbuild').build({ absWorkingDir: process.cwd(), stdin: { contents, resolveDir: path.resolve('examples/material-showcase'), sourcefile: 'box-sizing-default-diagnostic.mjs' }, bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', metafile: true });
const bundle = built.outputFiles[0].contents;
const inputs = Object.keys(built.metafile.inputs).filter(p => existsSync(p)).sort().map(file => ({ file, sha256: hash(readFileSync(file)) }));
const html = '<!doctype html><script type="module" src="/audit.js"></script>';
const server = createServer((req,res) => {res.setHeader('content-type',req.url==='/audit.js'?'text/javascript':'text/html');res.end(req.url==='/audit.js'?bundle:html);});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
mkdirSync(output);
const browser = await chromium.launch(materialBrowserLaunchOptions());
const results=[],errors=[];
try {
  for(const dpr of [1,2]) {
    const entry={dpr};
    for(const mode of ['reference','astylar']) {
      const page=await browser.newPage({viewport:{width:400,height:400},deviceScaleFactor:dpr});
      page.on('pageerror',e=>errors.push(String(e)));
      try {
        await page.goto('http://127.0.0.1:'+server.address().port+'/?mode='+mode);
        await page.waitForFunction(()=>!!window.boxAudit);
        entry[mode]=await page.evaluate(()=>({site:window.boxAudit.site,snapshot:window.boxAudit.snapshot()}));
        const file='dpr'+dpr+'-'+mode+'.png';
        entry[mode].screenshot={file,sha256:hash(await page.screenshot({path:path.join(output,file)}))};
        await page.evaluate(()=>window.boxAudit.dispose());
      } finally {await page.close();}
    }
    assert.deepEqual(entry.reference.site,entry.astylar.site);
    results.push(entry);
  }
  for(const receipt of inputs) assert.equal(hash(readFileSync(receipt.file)),receipt.sha256);
  assert.deepEqual(errors,[]);
  writeFileSync(path.join(output,'latest-report.json'),JSON.stringify({kind:'public-box-sizing-default-diagnostic',browser:browser.version(),scriptSha256:hash(readFileSync(import.meta.filename)),bundleSha256:hash(bundle),inputs,results,errors},null,2));
  console.log(JSON.stringify({results:results.map(e=>({dpr:e.dpr,reference:e.reference.snapshot,candidate:e.astylar.snapshot})),errors}));
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
