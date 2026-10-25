import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { editingContextSources,editingContextProofRows,prepareEditingContextProducer,restoreEditingContextProducer,createEditingContextPriorRead,editingContextPlanDelta,prepareEditingContextSelection,restoreEditingContextSelection,restoreEditingLegacySource } from './editing-context-registration.mjs';
import { createTextHeldPriorRead } from './text-held-registration.mjs';

const readEditingStage=createTextHeldPriorRead({root:process.cwd(),read:readFileSync});

const inventory=source=>{
  const ast=ts.createSourceFile('producer.mjs',source,99,true,ts.ScriptKind.JS);assert.equal(ast.parseDiagnostics.length,0);const result={sources:[],proofs:[]};
  for(const fn of ast.statements.filter(ts.isFunctionDeclaration)){
    const visit=n=>{
      if(fn.name?.text==='sourceFingerprints'&&ts.isVariableDeclaration(n)&&n.name.getText(ast)==='files')result.sources=n.initializer.elements.map(e=>e.text);
      if(fn.name?.text==='focusedProofInventory'&&ts.isCallExpression(n)&&n.expression.getText(ast)==='proof')result.proofs.push(n.getText(ast));ts.forEachChild(n,visit);
    };visit(fn);
  }return result;
};
test('Staged editing registration conserves complete 1041-source 365-proof producer',()=>{
  const file='tests/material-parity/input-equivalence-audit.mjs',bytes=readFileSync(file),before=createEditingContextPriorRead({root:process.cwd(),read:readFileSync})(file,'utf8');
  const staged=prepareEditingContextProducer(before,readFileSync),old=inventory(before),next=inventory(staged);
  assert.equal(readEditingStage(file,'utf8'),staged,'Live producer must equal the complete verified registration');
  assert.equal(old.sources.length,1041);assert.equal(old.proofs.length,365);
  assert.equal(next.sources.length,1055);assert.equal(next.proofs.length,378);assert.equal(new Set(next.sources).size,1055);
  assert.deepEqual(next.sources.slice(14),old.sources);assert.deepEqual(next.proofs.slice(13),old.proofs);assert.deepEqual(next.sources.slice(0,14),editingContextSources);
  const plans=source=>{const ast=ts.createSourceFile('producer.mjs',source,99,true,ts.ScriptKind.JS),fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='implementationPlan');return new Function(fn.getText(ast)+';return implementationPlan()')();};
  const oldPlan=plans(before),newPlan=plans(staged);assert.equal(oldPlan.length,63);assert.equal(newPlan.length,65);
  assert.deepEqual(newPlan.filter(p=>!editingContextPlanDelta.some(d=>d.rootCause===p.rootCause)),oldPlan);
  for(const delta of editingContextPlanDelta)assert.deepEqual(newPlan.find(p=>p.rootCause===delta.rootCause),delta);
  assert.equal(restoreEditingContextProducer(staged,readFileSync),before);assert.deepEqual(readFileSync(file),bytes);
  assert.throws(()=>prepareEditingContextProducer(staged,readFileSync));assert.throws(()=>restoreEditingContextProducer(staged+'\n// drift',readFileSync));
  const root=process.cwd(),producer=path.resolve(file);let stagedBytes=Buffer.from(staged);
  const read=(name,options)=>path.resolve(root,name)===producer?stagedBytes:readFileSync(name,options);
  const historical=createEditingContextPriorRead({root,read});
  assert.equal(historical(producer,'utf8'),before);assert.equal(historical(producer).toString(),before);
  assert.equal(historical(producer,{encoding:'utf8'}),before);
  const unrelated='docs/evidence/material-original-runner-e01.mjs.gz.b64';assert.deepEqual(historical(unrelated),readFileSync(unrelated));
  stagedBytes=Buffer.from(staged+'\n// drift');assert.throws(()=>historical(producer));
  stagedBytes=Buffer.from(before);assert.equal(historical(producer,'utf8'),before);
});
test('Editing registration binds unique literal and parameterized proof declarations',()=>{
  const rows=editingContextProofRows(readFileSync);assert.equal(rows.length,13);
  for(const r of rows)assert.equal([...readFileSync(r.file,'utf8').matchAll(new RegExp(r.pattern,'g'))].length,1);
  for(const f of editingContextSources)assert.ok(readFileSync(f).length>0);
  assert.equal(rows.filter(r=>r.title.includes('${count}')).length,1);
  const priorRead=createEditingContextPriorRead({root:process.cwd(),read:readFileSync});
  const launcher=priorRead('scripts/export-material-input-audit-current-ancestry.mjs','utf8');
  const staged=prepareEditingContextSelection(launcher,'launcher');assert.equal(restoreEditingContextSelection(staged,'launcher'),launcher);
  assert.equal(readEditingStage('scripts/export-material-input-audit-current-ancestry.mjs','utf8'),staged);
  const rootLine="const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');";
  const run=(s,flags)=>spawnSync(process.execPath,['--input-type=module','-','--dry-run',...flags],{input:s.replace(rootLine,`const root = ${JSON.stringify(process.cwd())};`),encoding:'utf8',windowsHide:true});
  const next=run(staged,['--editing-context']);assert.equal(next.status,0,next.stderr);
  assert.ok(JSON.parse(next.stdout).args.includes('--case-obligation-review-sha256=043361b010508502f4c2be7b7f2b9bf21059e8f2cb71c503d91b61a29b34dadd'));
  assert.ok(JSON.parse(next.stdout).args.includes('--case-obligation-review=artifacts/material-parity/working-audit/proposals/043361b010508502f4c2be7b7f2b9bf21059e8f2cb71c503d91b61a29b34dadd.json'));
  const flags=[...launcher.matchAll(/rawRequested\.includes\('(--[^']+)'\)/g)].map(m=>m[1]);
  for(const flag of flags){const a=run(launcher,[flag]),b=run(staged,[flag]);assert.equal(a.status,0,a.stderr);assert.equal(b.status,0,b.stderr);assert.deepEqual(JSON.parse(b.stdout),JSON.parse(a.stdout));assert.notEqual(run(staged,['--editing-context',flag]).status,0);}
  assert.deepEqual(JSON.parse(run(staged,[]).stdout),JSON.parse(run(launcher,[]).stdout));
  const runner=priorRead('scripts/run-material-input-audit.mjs','utf8'),stagedRunner=prepareEditingContextSelection(runner,'runner');
  assert.equal(readEditingStage('scripts/run-material-input-audit.mjs','utf8'),stagedRunner);
  assert.equal(restoreEditingContextSelection(stagedRunner,'runner'),runner);
  const ast=ts.createSourceFile('runner',stagedRunner,99,true,ts.ScriptKind.JS);assert.equal(ast.parseDiagnostics.length,0);let selector;
  const visit=n=>{if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='editingReaderFactory')selector=n.initializer.getText(ast);ts.forEachChild(n,visit);};visit(ast);assert.ok(selector);
  const choose=new Function('options','editingContextReview','createEditingContextReviewReader','dividerContextReaderFactory','return '+selector),fresh=()=>{},prior=()=>{},digest='043361b010508502f4c2be7b7f2b9bf21059e8f2cb71c503d91b61a29b34dadd';
  assert.equal(choose({caseObligationReviewSha256:digest},digest,fresh,prior),fresh);assert.equal(choose({caseObligationReviewSha256:'0'.repeat(64)},digest,fresh,prior),prior);
  const stagedFiles=new Map([['scripts/export-material-input-audit-current-ancestry.mjs',staged],['scripts/run-material-input-audit.mjs',stagedRunner]].map(([f,s])=>[path.resolve(f),Buffer.from(s)]));
  const read=(name,options)=>stagedFiles.get(path.resolve(name))??readFileSync(name,options),historical=createEditingContextPriorRead({root:process.cwd(),read});
  for(const [file,bytes]of stagedFiles){assert.equal(historical(file,'utf8'),file.endsWith('current-ancestry.mjs')?launcher:runner);stagedFiles.set(file,Buffer.concat([bytes,Buffer.from('\n// drift')]));assert.throws(()=>historical(file));stagedFiles.set(file,bytes);}
  for(const [file,kind]of [['tests/material-parity/divider-owner-context-registration.mjs','registration'],['tests/material-parity/divider-owner-context-registration.spec.mjs','proof'],['tests/material-parity/pending-evidence-registration.mjs','pending-replay'],['tests/material-parity/menu-select-disabled-registration.spec.mjs','menu-proof']]){
    const absolute=path.resolve(file),bytes=readFileSync(file);assert.equal(historical(file,'utf8'),restoreEditingLegacySource(bytes,kind));
    stagedFiles.set(absolute,Buffer.concat([bytes,Buffer.from('\n// drift')]));assert.throws(()=>historical(file));stagedFiles.delete(absolute);
  }
});
