import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import path from 'node:path';
import { createTextHeldPriorRead, restoreTextHeldReplaySource } from './text-held-registration.mjs';

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
  read=createTextHeldPriorRead({root,read});
  const producer=path.resolve(root,'tests/material-parity/input-equivalence-audit.mjs');
  const selections=new Map([['launcher','scripts/export-material-input-audit-current-ancestry.mjs'],['runner','scripts/run-material-input-audit.mjs']].map(([kind,file])=>[path.resolve(root,file),kind]));
  const legacy=new Map([['registration','tests/material-parity/divider-owner-context-registration.mjs'],['proof','tests/material-parity/divider-owner-context-registration.spec.mjs'],['pending-replay','tests/material-parity/pending-evidence-registration.mjs'],['menu-proof','tests/material-parity/menu-select-disabled-registration.spec.mjs']].map(([kind,file])=>[path.resolve(root,file),kind]));
  return (name,options)=>{
    const resolved=path.resolve(root,name),kind=selections.get(resolved),oldKind=legacy.get(resolved);
    if(resolved!==producer&&!kind&&!oldKind)return read(name,options);
    const bytes=read(name),normalized=bytes.toString().replaceAll('\r\n','\n');
    // Older staged tests can enter between Menu and owner-context registration.
    // Pass through only the exact authenticated predecessor for the next reader;
    // absence of this stage's marker alone must never permit arbitrary drift.
    const intermediate=resolved===producer?'d791949cfe8a3821d76250379e0c68795759d2f88650ad3414ceeaa7dbd52b17':kind==='launcher'?'625e585f51d670cceb52a2eaa0600c70d6051d91c7c743bed1ad4e71f2f6673c':kind==='runner'?'d6b7a4f8704689f5e1a44b0b45795c43913aca48181eefd12179c125856e8bb9':undefined;
    if(intermediate&&hash(normalized)===intermediate)return read(name,options);
    const expected=oldKind?editingLegacyPrior[oldKind]:kind?editingSelectionPrior[kind]:editingProducerPrior;
    const prior=hash(normalized)===expected?normalized:oldKind?restoreEditingLegacySource(bytes,oldKind):kind?restoreEditingContextSelection(bytes,kind):restoreEditingContextProducer(bytes,f=>read(path.resolve(root,f)));
    assert.equal(hash(prior),expected);
    const encoding=typeof options==='string'?options:options?.encoding;return encoding?Buffer.from(prior).toString(encoding):Buffer.from(prior);
  };
}
const editingLegacyPrior=Object.freeze({registration:'73c933562cf3ba381cb258632b88b41059bcf1db2dc58f7320d4e10592b480b4',proof:'035e13aab28532b8e832992c1027ab15d340193d5940df46af5917e0a67380e7','pending-replay':'521695641afcadbff787f41213270d305f189f30c4e06cef8d8453826fe06079','menu-proof':'2374097355dafef883d90e879a841adc5bc7cd7e6869df27b16f3fe82cf36920'});
export function restoreEditingLegacySource(source,kind){
  if(kind==='proof')source=createTextHeldPriorRead({root:process.cwd(),read:()=>source})('tests/material-parity/divider-owner-context-registration.spec.mjs');
  if(kind==='pending-replay')source=restoreTextHeldReplaySource(source,'pending');
  let text=source.toString().replaceAll('\r\n','\n');
  if(kind==='pending-replay'){
    text=once(text,"import { readFileSync } from 'node:fs';\nimport { createMenuHistoricalRead } from './menu-select-disabled-registration.mjs';\n",'');
    text=once(text,`  if (source.toString().includes('"scripts/audit-material-menu-ax-contexts.mjs"')) {
    const file = path.resolve('tests/material-parity/input-equivalence-audit.mjs');
    const read = (name, options) => path.resolve(name) === file
      ? (typeof options === 'string' ? source.toString(options) : Buffer.from(source))
      : readFileSync(name, options);
    source = createMenuHistoricalRead({ root: process.cwd(), read })(file);
  }
`,'');
    assert.equal(hash(text),editingLegacyPrior[kind]);return text;
  }
  if(kind==='menu-proof'){
    text=once(text,"import { restorePendingEvidenceProducer } from './pending-evidence-registration.mjs';\n",'');
    text=once(text,`  const liveProducer = readFileSync('tests/material-parity/input-equivalence-audit.mjs');
  assert.equal(createHash('sha256').update(restorePendingEvidenceProducer(liveProducer)).digest('hex'),
    '0aba1870b5ee9f0231cfb2528d6d89a581ae8558a0c9859e116a145febcbe3e1');
  assert.throws(() => restorePendingEvidenceProducer(Buffer.concat([
    liveProducer, Buffer.from('\\n// unexpected mutation'),
  ])));
`,'');
    assert.equal(hash(text),editingLegacyPrior[kind]);return text;
  }
  text=once(text,"import { createEditingContextPriorRead } from './editing-context-registration.mjs';\n",'');
  if(kind==='registration')text=once(text,'export function createDividerOwnerContextPriorRead({root,read}){\n  read=createEditingContextPriorRead({root,read});\n','export function createDividerOwnerContextPriorRead({root,read}){\n');
  else{
    assert.equal(kind,'proof');text=once(text,"assert.equal(createEditingContextPriorRead({root:process.cwd(),read:readFileSync})(file,'utf8'),staged,", "assert.equal(bytes.toString().replaceAll('\\r\\n','\\n'),staged,");
    const expression="createEditingContextPriorRead({root:process.cwd(),read:readFileSync})(file,'utf8')";assert.equal(text.split(expression).length,5);
    text=text.replaceAll(expression,"readFileSync(file,'utf8').replaceAll('\\r\\n','\\n')");
  }
  assert.equal(hash(text),editingLegacyPrior[kind]);return text;
}
export const editingSelectionPrior=Object.freeze({launcher:'5168a9b9165fdae234bd90b1db314923a385bbca52b39f536d649dcac30ce955',runner:'34f44830880417b629269d5782131dd9c84c149103b52628ae227573f5c9a005'});
const selectedReview='043361b010508502f4c2be7b7f2b9bf21059e8f2cb71c503d91b61a29b34dadd';
const selectionTransitions=kind=>{
  if(kind==='runner')return [
    ["import { dividerOwnerContextReview, createDividerOwnerContextReviewReader } from '../tests/material-parity/divider-owner-context-review-source.mjs';", "import { dividerOwnerContextReview, createDividerOwnerContextReviewReader } from '../tests/material-parity/divider-owner-context-review-source.mjs';\nimport { editingContextReview, createEditingContextReviewReader } from '../tests/material-parity/editing-context-review-source.mjs';"],
    ['const applicability=dividerContextReaderFactory?.','const editingReaderFactory = options.caseObligationReviewSha256===editingContextReview ? createEditingContextReviewReader : dividerContextReaderFactory;\n    const applicability=editingReaderFactory?.'],
  ];
  assert.equal(kind,'launcher');return [
    ["const dividerOwnerContext = rawRequested.includes('--divider-owner-context');","const editingContext = rawRequested.includes('--editing-context');\nassert.ok(!editingContext || rawRequested.every(argument => ['--editing-context', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\nconst dividerOwnerContext = rawRequested.includes('--divider-owner-context');"],
    ['const requested = rawRequested.filter(',"const requested = rawRequested.filter(argument => argument !== '--editing-context').filter("],
    ['|--divider-owner-context]','|--divider-owner-context|--editing-context]'],
    ['for (const [name, relative] of Object.entries(inputs)) {',`if (editingContext) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/${selectedReview}.json';\nfor (const [name, relative] of Object.entries(inputs)) {`],
    ['menuSelectDisabled || dividerOwnerContext)','menuSelectDisabled || dividerOwnerContext || editingContext)'],
    ["if (requested.includes('--dry-run'))",`if (editingContext) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=${selectedReview}';\nif (requested.includes('--dry-run'))`],
  ];
};
export function prepareEditingContextSelection(source,kind){
  let text=source.toString().replaceAll('\r\n','\n');assert.equal(hash(text),editingSelectionPrior[kind]);
  for(const [a,b]of selectionTransitions(kind))text=once(text,a,b);return text;
}
export function restoreEditingContextSelection(source,kind){
  let text=source.toString().replaceAll('\r\n','\n');for(const [a,b]of selectionTransitions(kind).toReversed())text=once(text,b,a);
  assert.equal(hash(text),editingSelectionPrior[kind]);return text;
}
