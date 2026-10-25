import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import path from 'node:path';

const hash=b=>createHash('sha256').update(b).digest('hex');
export const editingProducerPrior='ec5be8ce8f6a47371e22b4c041abcc677013d9263834edc4a6ae4b94d07c906d';
export const editingContextSources=Object.freeze([
  'scripts/audit-material-disabled-control-remaining-contexts.mjs',
  'scripts/audit-material-disabled-select-focused-contexts.mjs',
  'scripts/audit-material-disabled-select-focused-key.mjs',
  'scripts/audit-material-select-readonly-focus-contexts.mjs',
  'scripts/join-material-editing-context-evidence.mjs',
  'tests/material-parity/disabled-select-keyboard-guard.spec.mjs',
  'tests/material-parity/divider-original-crop-provenance.spec.mjs',
  'tests/material-parity/ordinary-wrapping-request-path.spec.mjs',
  'tests/material-parity/select-readonly-focus-contexts.spec.mjs',
  'tests/material-parity/editing-context-evidence-join.spec.mjs',
  'tests/material-parity/editing-context-review-source.mjs',
  'tests/material-parity/editing-context-registration.mjs',
  'tests/material-parity/editing-context-registration.spec.mjs',
  'docs/evidence/material-divider-light-desktop-requirement-review.json',
]);
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function editingContextProofRows(read){
  const rows=[];
  for(const file of editingContextSources.filter(f=>f.endsWith('.spec.mjs'))){
    const ast=ts.createSourceFile(file,read(file).toString(),99,true,ts.ScriptKind.JS);assert.equal(ast.parseDiagnostics.length,0);
    const visit=n=>{
      if(ts.isCallExpression(n)&&n.expression.getText(ast)==='test'){
        const title=n.arguments[0];assert.ok(ts.isStringLiteral(title)||ts.isTemplateExpression(title));
        rows.push({file,title:ts.isStringLiteral(title)?title.text:title.getText(ast),pattern:'test\\('+escape(title.getText(ast)),
          scope:'Bounded retained requirements,request paths,disabled/readonly context evidence and exact conservation. Parameterized source declarations are not runtime case counts;no whole-case/current-rendering acceptance.'});
      }ts.forEachChild(n,visit);
    };visit(ast);
  }
  assert.equal(rows.length,13);return rows;
}
const sourceAnchor='function sourceFingerprints(root) {\n  const files = [\n';
const proofAnchor='function focusedProofInventory(root) {\n  return [\n';
const planAnchor='function implementationPlan() {\n  return [\n';
export const editingContextPlanDelta=Object.freeze([
  {priority:3.05,rootCause:'Block align-content omission resolves to stretch instead of normal',action:'Resolve omitted block align-content as CSS normal at the owning defaults/layout boundary. Preserve the native normal/stretch margin-collapse distinction and flex/grid behavior;do not globally alias the keywords or retune Material paragraph heights. Reuse the existing public block-alignment reduction before removing flow substitutions.'},
  {priority:3.06,rootCause:'Explicit block align-content center is ignored before projection',action:'Honor explicit center in CSS-space content layout after containing-block and used-size ownership. Retain native55px versus candidate20px failing child-placement evidence at DPR1/2 and normal/stretch controls. Extend auto sizing,overflow,margin collapse,nesting and updates before general support claims. Remove fixture offsets only after original equivalent declarations pass;do not change world projection or replace layout in plugins.'},
]);
const planPrefix=editingContextPlanDelta.map(p=>'    '+JSON.stringify(p)+',\n').join('');
const once=(s,a,b)=>{assert.equal(s.split(a).length,2);return s.replace(a,b);};
const prefixes=read=>({sources:editingContextSources.map(f=>'    '+JSON.stringify(f)+',\n').join(''),
  proofs:editingContextProofRows(read).map(r=>'    proof(root, '+JSON.stringify(r.file)+', new RegExp('+JSON.stringify(r.pattern)+'),\n      '+JSON.stringify(r.title)+', '+JSON.stringify(r.scope)+'),\n').join('')});
export function prepareEditingContextProducer(source,read){
  let text=source.toString().replaceAll('\r\n','\n');assert.equal(hash(text),editingProducerPrior);
  for(const f of editingContextSources)assert.equal(text.includes(JSON.stringify(f)),false);
  const p=prefixes(read);text=once(text,sourceAnchor,sourceAnchor+p.sources);text=once(text,proofAnchor,proofAnchor+p.proofs);return once(text,planAnchor,planAnchor+planPrefix);
}
export function restoreEditingContextProducer(source,read){
  const p=prefixes(read);let text=source.toString().replaceAll('\r\n','\n');
  text=once(text,sourceAnchor+p.sources,sourceAnchor);text=once(text,proofAnchor+p.proofs,proofAnchor);
  text=once(text,planAnchor+planPrefix,planAnchor);
  assert.equal(hash(text),editingProducerPrior);return text;
}
export function createEditingContextPriorRead({root,read}){
  const producer=path.resolve(root,'tests/material-parity/input-equivalence-audit.mjs');
  return (name,options)=>{
    if(path.resolve(root,name)!==producer)return read(name,options);
    const bytes=read(name),normalized=bytes.toString().replaceAll('\r\n','\n');
    const prior=hash(normalized)===editingProducerPrior?normalized:restoreEditingContextProducer(bytes,f=>read(path.resolve(root,f)));
    assert.equal(hash(prior),editingProducerPrior);
    const encoding=typeof options==='string'?options:options?.encoding;return encoding?Buffer.from(prior).toString(encoding):Buffer.from(prior);
  };
}
