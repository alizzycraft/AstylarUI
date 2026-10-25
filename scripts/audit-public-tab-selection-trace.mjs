import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright-core';
import {materialBrowserLaunchOptions,inspectMaterialBrowserLaunch} from '../tests/material-parity/run-checkpoint.mjs';

const script='scripts/audit-public-tab-selection-trace.mjs',hash=b=>createHash('sha256').update(b).digest('hex');
const verifyOnly=process.argv[2]==='--verify',output=path.resolve(process.argv[verifyOnly?3:2]??'');
assert.ok(output.startsWith(path.resolve('artifacts/material-parity')+path.sep));
const baseline={file:'artifacts/material-parity/public-email-tab-entry-20261025/latest-report.json',sha256:'beb04e64610f8c4ef4d6b6298ff504874d4fc2e9fbafa2c8b507fc6488fbee3a'};
const bytes=readFileSync(baseline.file);assert.equal(hash(bytes),baseline.sha256);const original=JSON.parse(bytes);
function verify(report){
 assert.equal(report.scriptSha256,hash(readFileSync(script)));assert.deepEqual(report.baseline,baseline);
 assert.equal(report.probeSource,installTrace.toString());assert.equal(report.probeSha256,hash(report.probeSource));
 assert.equal(hash(readFileSync(report.bundle.file)),report.bundle.sha256);assert.equal(report.bundle.sha256,original.bundle.sha256);
 assert.deepEqual(report.errors,[]);assert.equal(report.currentRenderingAccepted,false);
 assert.deepEqual(report.results.map(r=>r.mode),['reference','astylar']);
 for(const row of report.results){
  const old=original.results.find(r=>r.kind==='text'&&r.dpr===1&&r.mode===row.mode);
  for(const [sample,prior]of [[row.afterTab,old.samples[0]],[row.afterType,old.samples[1]]]){
   for(const key of ['value','focused','selectionStart','selectionEnd','selectionDirection','inputUnchanged'])assert.equal(sample[key],prior[key]);
  }
  assert.ok(row.trace.length>0&&row.trace.length<200);assert.deepEqual(row.afterType.diagnostics,[]);
  assert.ok(row.assets.some(r=>r.sha256===report.bundle.sha256));
 }
 return{pairs:1,endpointControlMatches:true,records:report.results.map(r=>({mode:r.mode,records:r.trace.length})),currentRenderingAccepted:false};
}
if(verifyOnly){const report=JSON.parse(readFileSync(path.join(output,'latest-report.json')));console.log(JSON.stringify(verify(report)));}
else{
 assert.ok(!existsSync(output),'Do not overwrite evidence');mkdirSync(output,{recursive:true});
 const report={scriptSha256:hash(readFileSync(script)),baseline,bundle:original.bundle,probeSource:installTrace.toString(),probeSha256:hash(installTrace.toString()),results:[],errors:[],currentRenderingAccepted:false,
  scope:'One instrumented public text-input Tab then Z pair at DPR1,using the exact uninstrumented bundle. Prototype wrappers preserve receiver,args,return/throw. Endpoint control is checked;timing/noninterference beyond those endpoints and email mechanism remain unproved.'};
 const server=createServer((req,res)=>{const js=new URL(req.url,'http://127.0.0.1').pathname==='/audit.js';res.setHeader('content-type',js?'text/javascript':'text/html');res.end(readFileSync(js?original.bundle.file:original.html.file));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  const launch=materialBrowserLaunchOptions();browser=await chromium.launch(launch);report.browser=browser.version();report.launch=await inspectMaterialBrowserLaunch(browser,launch);
  for(const mode of ['reference','astylar']){
   const page=await browser.newPage({viewport:{width:400,height:180},deviceScaleFactor:1}),assets=[];
   page.on('pageerror',e=>report.errors.push(String(e)));page.on('response',async r=>{if(new URL(r.url()).pathname==='/audit.js')assets.push({url:r.url(),sha256:hash(await r.body())});});
   try{
    await page.addInitScript(installTrace);await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}&kind=text`);
    await page.waitForFunction(()=>!!window.readonlyAudit);await page.evaluate(()=>window.__selectionTrace.length=0);
    await page.keyboard.press('Tab');await page.evaluate(()=>window.readonlyAudit.settle());
    const afterTab=await page.evaluate(()=>window.readonlyAudit.snapshot());
    const tabTrace=await page.evaluate(()=>structuredClone(window.__selectionTrace));
    await page.keyboard.press('Z');await page.evaluate(()=>window.readonlyAudit.settle());
    const afterType=await page.evaluate(()=>window.readonlyAudit.snapshot()),trace=await page.evaluate(()=>structuredClone(window.__selectionTrace));
    report.results.push({mode,afterTab,afterType,tabTrace,trace,assets});await page.evaluate(()=>window.readonlyAudit.dispose());
   }finally{await page.close();}
  }
  const summary=verify(report);writeFileSync(path.join(output,'latest-report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({...summary,reportSha256:hash(readFileSync(path.join(output,'latest-report.json')))}));
 }catch(error){writeFileSync(path.join(output,'failure.json'),JSON.stringify({error:String(error),report},null,2)+'\n',{flag:'wx'});throw error;}
 finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
}

function installTrace(){
 const records=window.__selectionTrace=[];
 const matches=n=>n instanceof HTMLInputElement&&(n.id==='control'||n.getAttribute('data-astylar-id')==='control');
 const describe=n=>({tag:n?.tagName??null,id:n?.getAttribute?.('data-astylar-id')??n?.id??null,start:n?.selectionStart??null,end:n?.selectionEnd??null,value:n?.value??null,focused:document.activeElement===n});
 const record=(kind,node,extra={})=>{if(records.length<200)records.push({kind,state:describe(node),...extra});};
 const range=HTMLInputElement.prototype.setSelectionRange;
 HTMLInputElement.prototype.setSelectionRange=function(...args){
  if(!matches(this))return Reflect.apply(range,this,args);
  record('range-before',this,{args,stack:new Error().stack});try{return Reflect.apply(range,this,args);}finally{record('range-after',this,{args});}
 };
 const focus=HTMLElement.prototype.focus;
 HTMLElement.prototype.focus=function(...args){
  if(!matches(this))return Reflect.apply(focus,this,args);
  record('focus-call-before',this,{stack:new Error().stack});try{return Reflect.apply(focus,this,args);}finally{record('focus-call-after',this);}
 };
 for(const type of ['focus','focusin','blur','focusout','select','selectionchange'])document.addEventListener(type,event=>{
  if(!matches(event.target))return;record(type+'-capture',event.target);
  queueMicrotask(()=>record(type+'-microtask',event.target));
 },true);
}
