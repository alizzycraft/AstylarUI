import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import path from 'node:path';
import { editingContextSources,editingContextProofRows,prepareEditingContextProducer,restoreEditingContextProducer,createEditingContextPriorRead,editingContextPlanDelta } from './editing-context-registration.mjs';

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
  const file='tests/material-parity/input-equivalence-audit.mjs',bytes=readFileSync(file),before=bytes.toString().replaceAll('\r\n','\n');
  const staged=prepareEditingContextProducer(before,readFileSync),old=inventory(before),next=inventory(staged);
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
});
