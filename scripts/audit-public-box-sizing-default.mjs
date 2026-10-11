import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { materialBrowserLaunchOptions } from '../tests/material-parity/run-checkpoint.mjs';

// Separate public diagnostic: explicit-value fixtures cannot prove omission.
const verifyOnly = process.argv[2] === '--verify';
const output = path.resolve(process.argv[verifyOnly ? 3 : 2] ?? '');
assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function verify(report) {
  assert.equal(report.kind, 'public-box-sizing-default-diagnostic');
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.results.map(e => e.dpr), [1, 2]);
  for (const receipt of report.inputs) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  const bounds = [];
  for (const entry of report.results) {
    assert.deepEqual(entry.reference.site, entry.astylar.site);
    assert.deepEqual(entry.reference.snapshot.map(n => [n.width,n.height]), [[166,76],[166,76],[140,50]]);
    assert.deepEqual(entry.reference.site.styles.map(n => n.boxSizing), [undefined,'content-box','border-box']);
    assert.deepEqual(entry.astylar.snapshot.elements.map(n => n.effective.boxSizing), [undefined,'content-box','border-box']);
    for (const side of ['reference','astylar']) {
      const receipt = entry[side].screenshot;
      assert.equal(path.basename(receipt.file), receipt.file);
      const bytes = readFileSync(path.join(output, receipt.file));
      assert.equal(hash(bytes), receipt.sha256);
      const png = PNG.sync.read(bytes), boxes = [];
      assert.equal(png.width, 400 * entry.dpr); assert.equal(png.height, 400 * entry.dpr);
      for (let i=0;i<3;i++) {
        let left=Infinity,top=Infinity,right=-1,bottom=-1;
        for(let y=(20+i*110)*entry.dpr;y<(120+i*110)*entry.dpr;y++) for(let x=0;x<png.width;x++) {
          const k=(y*png.width+x)*4;
          if(png.data[k+3]===255 && ((png.data[k]===171&&png.data[k+1]===205&&png.data[k+2]===239)||(png.data[k]===18&&png.data[k+1]===52&&png.data[k+2]===86))) {
            left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
          }
        }
        assert.ok(right>=left);
        boxes.push([(right-left+1)/entry.dpr,(bottom-top+1)/entry.dpr]);
      }
      assert.deepEqual(boxes, side==='reference'?[[166,76],[166,76],[140,50]]:[[140,50],[166,76],[140,50]]);
      bounds.push({dpr:entry.dpr,side,boxes});
    }
  }
  return bounds;
}
if (verifyOnly) {
  const report = JSON.parse(readFileSync(path.join(output,'latest-report.json'),'utf8'));
  console.log(JSON.stringify({verified:verify(report),scope:'retained pixels, equal inputs and unchanged bundle dependencies; not aggregate parity'}));
  const mutated = structuredClone(report); mutated.results[0].astylar.site.styles[0].boxSizing='border-box';
  assert.throws(() => verify(mutated), 'Unequal author input must reject');
  const missing = structuredClone(report); missing.results.pop();
  assert.throws(() => verify(missing), 'Missing DPR must reject');
  console.log('negative controls: 2/2 rejected');
  process.exit(0);
}
assert.ok(!existsSync(output), 'Preserve prior evidence');
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
  const report={kind:'public-box-sizing-default-diagnostic',browser:browser.version(),scriptSha256:hash(readFileSync(import.meta.filename)),bundleSha256:hash(bundle),inputs,results,errors};
  writeFileSync(path.join(output,'latest-report.json'),JSON.stringify(report,null,2));
  verify(report);
  console.log(JSON.stringify({results:results.map(e=>({dpr:e.dpr,reference:e.reference.snapshot,candidate:e.astylar.snapshot})),errors}));
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
