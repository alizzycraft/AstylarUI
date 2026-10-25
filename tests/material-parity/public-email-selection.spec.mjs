import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const hash=b=>createHash('sha256').update(b).digest('hex');
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
