import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';

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
