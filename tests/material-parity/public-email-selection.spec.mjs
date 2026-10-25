import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';

const hash=b=>createHash('sha256').update(b).digest('hex');

test('pending public Tab-selection finding authenticates its bounded cause without promoting the audit',async()=>{
  const {publicTabSelectionFinding:f}=await import('./public-tab-selection-finding.mjs');
  assert.equal(f.classification,'confirmed-core-renderer-defect');
  assert.equal([...readFileSync(f.file,'utf8').matchAll(new RegExp(f.pattern,'g'))].length,1);
  for(const receipt of f.evidence)assert.equal(hash(readFileSync(receipt.file)),receipt.sha256);
  assert.equal(f.observation.causalTrace.pairs,1);assert.equal(f.observation.publicPairs,4);
  assert.match(f.recommendation,/Do not globally selectAll/);
  assert.match(f.boundary,/Not email-specific setter attribution/);
});

test('public Tab trace observes native selection overwritten by queued semantic control sync',()=>{
  const directory='artifacts/material-parity/public-tab-selection-trace-20261025',bytes=readFileSync(directory+'/latest-report.json');
  assert.equal(hash(bytes),'966276cd72bd0043b30e86923b67e130a0a8048831d43906db875e754b15f1dd');
  const report=JSON.parse(bytes),verified=JSON.parse(execFileSync(process.execPath,['scripts/audit-public-tab-selection-trace.mjs','--verify',directory],{encoding:'utf8'}));
  assert.equal(verified.endpointControlMatches,true);
  const check=report=>{
    for(const row of report.results){const first=row.tabTrace.find(r=>r.kind==='focus-capture');assert.deepEqual([first.state.start,first.state.end],[0,16]);}
    const native=report.results.find(r=>r.mode==='reference'),candidate=report.results.find(r=>r.mode==='astylar');
    assert.equal(native.tabTrace.some(r=>r.kind==='range-before'),false);
    const index=candidate.tabTrace.findIndex(r=>r.kind==='range-before'),write=candidate.tabTrace[index];
    assert.deepEqual([write.state.start,write.state.end],[0,16]);assert.deepEqual(write.args,[0,0,'none']);
    assert.match(write.stack,/AstylarSemanticBridge\.applyControlState/);assert.match(write.stack,/AstylarSemanticBridge\.syncControlStates/);
    const after=candidate.tabTrace[index+1];assert.equal(after.kind,'range-after');assert.deepEqual([after.state.start,after.state.end],[0,0]);
  };check(report);
  const wrong=structuredClone(report);wrong.results[1].tabTrace.find(r=>r.kind==='range-before').state.end=0;assert.throws(()=>check(wrong));
});

test('Tab selection trace binds complete current and installed selection-sync methods',t=>{
  const report=JSON.parse(readFileSync('artifacts/material-parity/public-email-tab-entry-20261025/latest-report.json'));
  const normalize=text=>{const scan=ts.createScanner(99,true,ts.LanguageVariant.Standard,text),out=[];let token;
    while((token=scan.scan())!==ts.SyntaxKind.EndOfFileToken)out.push([token,scan.getTokenText()]);return JSON.stringify(out);};
  const body=(source,name,owner)=>{const tree=ts.createSourceFile('owner.js',source,99,true,ts.ScriptKind.JS),found=[];
    assert.equal(tree.parseDiagnostics.length,0);const visit=n=>{if((ts.isMethodDeclaration(n)||ts.isPropertyDeclaration(n))&&n.parent.name?.text===owner&&n.name?.getText(tree)===name&&(n.body||n.initializer))found.push((n.body??n.initializer).getText(tree));ts.forEachChild(n,visit);};visit(tree);assert.equal(found.length,1,name);return normalize(found[0]);};
  const receipts=[];for(const [source,installed,owner,names]of [
    ['src/lib/astylar-semantic-bridge.ts','examples/material-showcase/node_modules/astylarui/dist/lib/lib/astylar-semantic-bridge.js','AstylarSemanticBridge',['handleFocusIn','queueControlStateSync','syncControlStates','applyControlState']],
    ['src/lib/astylar.ts','examples/material-showcase/node_modules/astylarui/dist/lib/lib/astylar.js','AstylarRenderer',['mount','getLiveSemanticControlState']]]){
    const original=readFileSync(source),compiled=ts.transpileModule(original.toString(),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,experimentalDecorators:true}}).outputText,packed=readFileSync(installed);
    assert.ok(report.inputs.some(r=>r.file===installed&&r.sha256===hash(packed)));
    for(const name of names){const current=body(compiled,name,owner);assert.equal(current,body(packed.toString(),name,owner),name);receipts.push({source:{file:source,sha256:hash(original)},installed:{file:installed,sha256:hash(packed)},owner,method:name,completeBodySha256:hash(current)});}
  }
  t.diagnostic(JSON.stringify({methods:receipts,boundary:'Six complete current/installed methods bound to the traced bundle;not original Material cause,all focus origins or historical introduction.'}));
});
test('public text and email Tab-entry failures separate initial selection from explicit replacement',()=>{
  const load=(name,sha)=>{const directory='artifacts/material-parity/'+name+'-20261025',bytes=readFileSync(directory+'/latest-report.json');
    assert.equal(hash(bytes),sha);const summary=JSON.parse(execFileSync(process.execPath,['scripts/audit-'+name+'.mjs','--verify',directory],{encoding:'utf8'}));
    assert.equal(summary.negativeControlsRejected,4);return{report:JSON.parse(bytes),summary};};
  const explicit=load('public-email-selection','c5ee5295c582fe7506c21b3e3124cc357e4cac82785822dfa5294d36caa26683');
  const tab=load('public-email-tab-entry','beb04e64610f8c4ef4d6b6298ff504874d4fc2e9fbafa2c8b507fc6488fbee3a');
  assert.equal(explicit.summary.replacementFailingPairs,0);assert.equal(tab.summary.replacementFailingPairs,4);
  assert.equal(explicit.report.source.sha256,tab.report.source.sha256);
  assert.equal(explicit.report.bundle.sha256,tab.report.bundle.sha256);
  assert.deepEqual(explicit.report.inputs,tab.report.inputs);
  for(let i=0;i<tab.report.results.length;i++){
    const row=tab.report.results[i],control=explicit.report.results[i];assert.deepEqual(row.site,control.site);
    assert.equal(row.samples[0].focused,true);assert.equal(control.samples[0].focused,true);
    if(row.kind==='text')assert.deepEqual([row.samples[0].selectionStart,row.samples[0].selectionEnd],row.mode==='reference'?[0,16]:[0,0]);
    else for(const sample of row.samples){assert.equal(sample.selectionStart,null);assert.equal(sample.selectionEnd,null);}
    assert.equal(row.samples[1].value,row.mode==='reference'?'Z':'Zteam@example.com');
    assert.equal(control.samples[1].value,'Z');
    const events=row.samples.at(-1).events;
    assert.equal(events.filter(e=>e.type==='beforeinput').length,row.mode==='reference'?3:0);
    assert.equal(events.filter(e=>e.type==='input').length,row.mode==='reference'?2:0);
  }
  // Equal output after explicit Ctrl+A is a control,not event parity. Text Tab
  // endpoints expose the divergence without inventing email selection values.
});

test('public selection controls reuse authenticated installed keyboard-owner applicability',()=>{
  const file='artifacts/material-parity/public-readonly-owning-methods-20261020.log',bytes=readFileSync(file);
  assert.equal(hash(bytes),'4d4dd8440ab6c2a3c9c357b24fa6f6d00110f67b288284a86466b8d73500b81a');
  const methods=JSON.parse(bytes).methods,report=JSON.parse(readFileSync('artifacts/material-parity/public-email-tab-entry-20261025/latest-report.json'));
  assert.equal(methods.length,6);
  for(const item of methods){
    assert.equal(item.completeBodyEqual,true);
    for(const receipt of [item.source,item.installed])assert.equal(hash(readFileSync(receipt.file)),receipt.sha256);
    assert.ok(report.inputs.some(r=>r.file===item.installed.file&&r.sha256===item.installed.sha256));
  }
  // Keyboard/insertion methods only. Tab focus/selection synchronization still
  // needs its own causal trace;this does not attribute a particular setter.
});
