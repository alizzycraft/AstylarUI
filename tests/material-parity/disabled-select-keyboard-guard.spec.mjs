import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { materialInteractionCases } from './benchmark.config.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
const authenticate=receipt=>{
  const bytes=readFileSync(receipt.file);assert.equal(hash(bytes),receipt.sha256);return bytes;
};

test('Captured native Select disabled guard rejects keyboard delegation before reading event',t=>{
  const report=JSON.parse(authenticate({file:'artifacts/material-parity/disabled-control-boundaries-20261025/latest-report.json',sha256:'654ef78a448876e3ac4ad84673017e49ed0ea1eff527d4c5230f3c515dc2d6bc'}));
  const manifest=JSON.parse(authenticate(report.capture.checkpointManifest));
  const name='chunk-7SL66K3U.js.map',receipt=manifest.provenance.browserFiles.find(r=>r.file===name);assert.ok(receipt);
  const map=JSON.parse(authenticate({file:'artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser/'+name,sha256:receipt.sha256}));
  const module='node_modules/@angular/material/fesm2022/module-B0CLRw5e.mjs',index=map.sources.indexOf(module);assert.ok(index>=0);
  const extract=source=>{
    const ast=ts.createSourceFile('select.js',source,99,true,ts.ScriptKind.JS),found=[];
    const visit=n=>{if(ts.isClassDeclaration(n)&&n.name?.text==='MatSelect')for(const member of n.members)if(ts.isMethodDeclaration(member)&&member.name.getText(ast)==='_handleKeydown')found.push(member.getText(ast));ts.forEachChild(n,visit);};visit(ast);
    assert.equal(found.length,1);return found[0];
  };
  const method=extract(map.sourcesContent[index]);
  const tokens=source=>{
    const scanner=ts.createScanner(99,true,ts.LanguageVariant.Standard,source),out=[];
    while(scanner.scan()!==ts.SyntaxKind.EndOfFileToken)out.push([scanner.getToken(),scanner.getTokenText()]);return out;
  };
  assert.deepEqual(tokens(method),tokens(extract(readFileSync('examples/material-showcase/'+module,'utf8'))));
  const Owner=new Function('return class Owner{'+method+'}')();
  const keys=['x','Enter',' ','ArrowDown','Home'];let disabledCalls=0,enabledCalls=0;
  for(const panelOpen of [false,true])for(const key of keys){
    const owner=new Owner();owner.disabled=true;
    Object.defineProperty(owner,'panelOpen',{get(){disabledCalls++;throw Error('disabled handler delegated');}});
    owner._handleKeydown(new Proxy({key},{get(){throw Error('disabled handler consumed event');}}));
    const enabled=new Owner();enabled.disabled=false;enabled.panelOpen=panelOpen;
    enabled._handleOpenKeydown=()=>{assert.equal(panelOpen,true);enabledCalls++;};
    enabled._handleClosedKeydown=()=>{assert.equal(panelOpen,false);enabledCalls++;};
    enabled._handleKeydown({key});
  }
  assert.equal(disabledCalls,0);assert.equal(enabledCalls,10);
  t.diagnostic(JSON.stringify({methodSha256:hash(method),disabledTrials:10,enabledDelegations:10,
    boundary:'Exact retained native MatSelect method with controlled disabled state and trap adapters. No browser focus,event delivery,typeahead,popup,application callbacks,candidate behavior or current rendering acceptance.'}));
});

for(const [directory,sha256,count]of [
  ['disabled-select-focused-key-20261025','3d78f59ddb888d67316675f8bc3c82332f6bad3df33da0b2248483cc894fdf5f',1],
  ['disabled-select-focused-contexts-20261025','436dd9625e30a42ef4bd49c3e6ce5c22524a6d2fa74017ea56275ef1c06a29c2',8],
])test(`Focused disabled Select retains value through trusted x without pointer blur (${count} contexts)`,()=>{
  const report=JSON.parse(authenticate({file:`artifacts/material-parity/${directory}/latest-report.json`,sha256}));
  authenticate(report.capture.checkpointManifest);assert.equal(report.results.length,count);
  assert.deepEqual(report.results.map(r=>[r.profile,r.viewport.deviceScaleFactor]),count===1?[['light',1]]:['light','dark','contrast','custom'].flatMap(p=>[1,2].map(d=>[p,d])));
  for(const row of report.results){assert.equal(row.family,'select');assert.equal(row.state,'disabled');
  for(const side of ['reference','astylar']){
    const result=row[side];authenticate(result.inputTree);authenticate(result.screenshot);assert.deepEqual(result.runtime.errors,[]);
    assert.deepEqual(result.observations.map(o=>o.boundary),['before','after-focus-attempt','before-key-without-pointer','after-key-attempt','settled']);
    for(const o of result.observations){
      assert.equal(o.target.value,'Team');assert.equal(o.target.expanded,'false');
      assert.equal(o.events.some(e=>e.type==='input'||e.type==='change'),false);
      if(o.boundary!=='before')assert.equal(o.activeEqualsTarget,side==='reference');
    }
    const final=result.observations.at(-1);
    assert.ok(final.events.some(e=>e.type==='keydown'&&e.trusted&&(side!=='reference'||e.target.token===final.target.token)));
  }
  }
  assert.equal(report.inputEquivalent,false);assert.equal(report.renderingEquivalent,false);
});

test('Disabled text-control supplements cover the exact 48 configured contexts without borrowed Select behavior',()=>{
  const original=JSON.parse(authenticate({file:'artifacts/material-parity/disabled-control-boundaries-20261025/latest-report.json',sha256:'654ef78a448876e3ac4ad84673017e49ed0ea1eff527d4c5230f3c515dc2d6bc'}));
  const remaining=JSON.parse(authenticate({file:'artifacts/material-parity/disabled-control-remaining-contexts-20261025/latest-report.json',sha256:'b59849e11047041d992617520323dd4b2fc7a02f537d511d4911d75024162006'}));
  const select=JSON.parse(authenticate({file:'artifacts/material-parity/disabled-select-focused-contexts-20261025/latest-report.json',sha256:'436dd9625e30a42ef4bd49c3e6ce5c22524a6d2fa74017ea56275ef1c06a29c2'}));
  authenticate(remaining.capture.checkpointManifest);assert.equal(remaining.results.length,35);
  const nonSelect=[...original.results.filter(r=>r.family!=='select'),...remaining.results];assert.equal(nonSelect.length,40);
  for(const row of nonSelect)for(const side of ['reference','astylar']){
    const result=row[side];authenticate(result.inputTree);authenticate(result.screenshot);assert.deepEqual(result.runtime.errors,[]);
    assert.deepEqual(result.observations.map(o=>o.boundary),['before','after-focus-attempt','after-pointer-attempt','after-key-attempt','settled']);
    for(const o of result.observations){
      assert.equal(o.target.disabledState,true);assert.equal(o.activeEqualsTarget,false);
      assert.equal(o.target.value,result.observations[0].target.value);
      assert.equal(o.events.some(e=>e.type==='input'||e.type==='change'),false);
      assert.equal(o.appEvents.some(e=>e.type==='input'||e.type==='change'),false);
    }
  }
  const key=r=>`${r.family}/${r.profile}/${r.viewport.id}`;
  const expected=materialInteractionCases.filter(r=>['form-field','input','autocomplete','select','datepicker','timepicker'].includes(r.family)&&r.state==='disabled').map(key).sort();
  const actual=[...nonSelect,...select.results].map(key).sort();assert.equal(new Set(actual).size,48);assert.deepEqual(actual,expected);
});
