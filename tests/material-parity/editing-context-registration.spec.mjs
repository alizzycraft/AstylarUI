import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { editingContextSources,editingContextProofRows,prepareEditingContextProducer,restoreEditingContextProducer } from './editing-context-registration.mjs';

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
  assert.equal(restoreEditingContextProducer(staged,readFileSync),before);assert.deepEqual(readFileSync(file),bytes);
  assert.throws(()=>prepareEditingContextProducer(staged,readFileSync));assert.throws(()=>restoreEditingContextProducer(staged+'\n// drift',readFileSync));
});
test('Editing registration binds unique literal and parameterized proof declarations',()=>{
  const rows=editingContextProofRows(readFileSync);assert.equal(rows.length,13);
  for(const r of rows)assert.equal([...readFileSync(r.file,'utf8').matchAll(new RegExp(r.pattern,'g'))].length,1);
  for(const f of editingContextSources)assert.ok(readFileSync(f).length>0);
  assert.equal(rows.filter(r=>r.title.includes('${count}')).length,1);
});
