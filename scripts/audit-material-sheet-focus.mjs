import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { chromium } from 'playwright-core';

// Bounded public-API diagnostic, not a canonical fixture or implementation fix.
const root = process.cwd();
const out = path.resolve(process.argv[2] ?? path.join(root, 'artifacts/material-parity/sheet-focus-probe'));
assert.ok(!fs.existsSync(path.join(out, 'result.json')), 'Preserve prior diagnostic results; supply a fresh output directory');
fs.mkdirSync(out, { recursive: true });
const consumer = createRequire(path.join(root, 'examples/material-showcase/package.json'));
const hash = b => createHash('sha256').update(b).digest('hex');
const packageRoot = path.dirname(consumer.resolve('astylarui'));
const fresh = path.join(root, 'artifacts/material-parity/radius-source-build-f95a265');
const receipts = fs.readdirSync(fresh, { recursive: true }).filter(f => f.endsWith('.js')).sort().map(file => {
  const bytes = fs.readFileSync(path.join(fresh, file));
  assert.deepEqual(fs.readFileSync(path.join(packageRoot, '..', file)), bytes);
  return { file, sha256: hash(bytes) };
});
assert.ok(receipts.length);
const source = `
import '@angular/compiler';
import {Component,signal,provideZonelessChangeDetection} from '@angular/core';
import {getTestBed,TestBed} from '@angular/core/testing';
import {BrowserTestingModule,platformBrowserTesting} from '@angular/platform-browser/testing';
import {AstylarSurfaceComponent} from 'astylarui';
getTestBed().initTestEnvironment(BrowserTestingModule,platformBrowserTesting());
const site = open => ({root:{children:[{type:'button',id:'opener',value:'Open'},...(open ? [{type:'div',id:'sheet',role:'dialog',children:[{type:'button',id:'share',value:'Share',autofocus:true}]}] : [])]},styles:[{selector:'button',width:'100px',height:'40px'}]});
const trace=[];
class App {
  data=signal(site(false)); surface; mode='immediate';
  mounted(s){this.surface=s;const update=s.update.bind(s);s.update=d=>{trace.push({event:'update-submitted',hasShare:JSON.stringify(d).includes('share')});return update(d)};}
  open(){trace.push({event:'open',mode:this.mode});this.data.set(site(true));
    if(this.mode==='immediate')this.surface.whenSettled().then(()=>{trace.push({event:'focus-attempt',ok:this.surface.focus('share'),ids:this.surface.inspectResolvedStyles().elements.map(e=>e.id)})});
  }
}
Component({selector:'focus-probe',standalone:true,imports:[AstylarSurfaceComponent],template:'<button id="trigger" (click)="open()">Open</button><astylar-surface [siteData]="data()" (mounted)="mounted($event)"/>',styles:['astylar-surface{display:block;width:400px;height:250px}']})(App);
await TestBed.configureTestingModule({imports:[App],providers:[provideZonelessChangeDetection()]}).compileComponents();
let fixture=TestBed.createComponent(App);fixture.detectChanges();await fixture.whenStable();
await new Promise(resolve=>{const poll=()=>fixture.componentInstance.surface?resolve():requestAnimationFrame(poll);poll()});
window.probe={trace,async finish(){await fixture.whenStable();await fixture.componentInstance.surface.whenSettled();return {trace:[...trace],ids:fixture.componentInstance.surface.inspectResolvedStyles().elements.map(e=>e.id),active:document.activeElement?.dataset?.astylarId}},async afterAngular(){return {ok:fixture.componentInstance.surface.focus('share')}},async control(){const app=fixture.componentInstance;await app.surface.update(site(false));await app.surface.update(site(true));const ok=app.surface.focus('share');return {ok,ids:app.surface.inspectResolvedStyles().elements.map(e=>e.id),active:document.activeElement?.dataset?.astylarId}},dispose(){fixture.destroy()}};
`;
const built = await consumer('esbuild').build({stdin:{contents:source,resolveDir:root},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',metafile:true,plugins:[{name:'public-package',setup(b){b.onResolve({filter:/^(astylarui$|@angular\/|@babylonjs\/core)/},a=>({path:consumer.resolve(a.path)}))}}]});
const bundle = built.outputFiles[0].contents;
const html='<!doctype html><html><body><script type="module" src="/probe.js"></script></body></html>';
const server=createServer((req,res)=>{res.setHeader('content-type',req.url==='/probe.js'?'text/javascript':'text/html');res.end(req.url==='/probe.js'?bundle:html)});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try {
  browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:700,height:500}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const cases=[];
  for(let repetition=0;repetition<3;repetition++){
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.waitForFunction(()=>window.probe,undefined,{timeout:60000});
    await page.locator('#trigger').click();
    const immediate=await page.evaluate(()=>window.probe.finish());
    const afterAngular=await page.evaluate(()=>window.probe.afterAngular());
    const control=await page.evaluate(()=>window.probe.control());
    cases.push({repetition,immediate,afterAngular,control});
    await page.evaluate(()=>window.probe.dispose());
  }
  const result={browser:browser.version(),errors,cases,receipts,probeSha256:hash(fs.readFileSync(new URL(import.meta.url))),entrySource:source,bundleSha256:hash(bundle),inputs:Object.keys(built.metafile.inputs).filter(f=>f!=='<stdin>').sort().map(file=>({file,sha256:hash(fs.readFileSync(file))})),limitations:['Current installed public package and Angular scheduling reduction, not original Material bundle attribution.','No claim of equivalent Material styling or final raster parity.']};
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({errors,cases,compiledFiles:receipts.length}));
  assert.equal(errors.length,0);
  for(const c of cases){assert.equal(c.control.ok,true);assert.equal(c.afterAngular.ok,true);assert.equal(c.immediate.trace.find(e=>e.event==='focus-attempt').ok,false);assert.deepEqual(c.immediate.trace.map(e=>e.event),['open','focus-attempt','update-submitted']);}
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
