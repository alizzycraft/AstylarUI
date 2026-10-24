import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { dividerOwnerContextSources,dividerOwnerContextProofRows,prepareDividerOwnerContextProducer,restoreDividerOwnerContextProducer,
  dividerOwnerContextFindingDefinitions,prepareDividerOwnerContextPolicy,restoreDividerOwnerContextPolicy } from './divider-owner-context-registration.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const inventory=source=>{
  const ast=ts.createSourceFile('producer.mjs',source,99,true,ts.ScriptKind.JS);assert.equal(ast.parseDiagnostics.length,0);const result={sources:[],proofs:[]};
  for(const fn of ast.statements.filter(ts.isFunctionDeclaration)){const visit=n=>{
    if(fn.name?.text==='sourceFingerprints'&&ts.isVariableDeclaration(n)&&n.name.getText(ast)==='files')result.sources=n.initializer.elements.map(e=>e.text);
    if(fn.name?.text==='focusedProofInventory'&&ts.isCallExpression(n)&&n.expression.getText(ast)==='proof')result.proofs.push(n.getText(ast));ts.forEachChild(n,visit);
  };visit(fn);}return result;
};
test('Divider context staged producer conserves all1028 sources and353 proofs without writing production',()=>{
  const file='tests/material-parity/input-equivalence-audit.mjs',bytes=readFileSync(file),before=bytes.toString().replaceAll('\r\n','\n');
  const staged=prepareDividerOwnerContextProducer(before,readFileSync),old=inventory(before),next=inventory(staged);
  assert.equal(old.sources.length,1028);assert.equal(old.proofs.length,353);assert.equal(next.sources.length,1040);assert.equal(next.proofs.length,362);
  assert.equal(new Set(next.sources).size,1040);assert.deepEqual(next.sources.slice(12),old.sources);assert.deepEqual(next.proofs.slice(9),old.proofs);
  assert.deepEqual(next.sources.slice(0,12),dividerOwnerContextSources);
  for(const row of dividerOwnerContextProofRows(readFileSync))assert.equal([...readFileSync(row.file,'utf8').matchAll(new RegExp(row.pattern,'g'))].length,1);
  assert.equal(restoreDividerOwnerContextProducer(staged,readFileSync),before);
  assert.throws(()=>restoreDividerOwnerContextProducer(staged+'\n// drift',readFileSync));assert.throws(()=>prepareDividerOwnerContextProducer(staged,readFileSync));
  assert.deepEqual(readFileSync(file),bytes);
});
test('Divider context staged policy conserves all196 definitions and binds two distinct failures',()=>{
  const file='tests/material-parity/input-equivalence-policy.mjs',bytes=readFileSync(file),before=bytes.toString().replaceAll('\r\n','\n');
  const definitions=s=>new Function(s.replace(/^export const /gm,'const ')+';return sourceAuditDefinitions;')();
  const staged=prepareDividerOwnerContextPolicy(before),old=definitions(before),next=definitions(staged);
  assert.equal(old.length,196);assert.equal(next.length,198);assert.deepEqual(next.slice(2),old);assert.deepEqual(next.slice(0,2),dividerOwnerContextFindingDefinitions);
  assert.equal(new Set(next.map(f=>f.id)).size,198);
  for(const f of next.slice(0,2)){
    assert.equal([...readFileSync(f.file,'utf8').matchAll(new RegExp(f.pattern,'g'))].length,1);
    for(const q of f.evidence)assert.equal(hash(readFileSync(q.file)),q.sha256);
    assert.ok(f.focusedProof&&f.justification&&f.owner&&f.boundary);
  }
  assert.equal(restoreDividerOwnerContextPolicy(staged),before);assert.throws(()=>restoreDividerOwnerContextPolicy(staged+'\n// drift'));assert.throws(()=>prepareDividerOwnerContextPolicy(staged));
  assert.deepEqual(readFileSync(file),bytes);
});
