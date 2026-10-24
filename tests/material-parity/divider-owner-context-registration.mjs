import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import path from 'node:path';
import { publicBlockAlignmentFindings } from './public-block-alignment-findings.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
export const dividerOwnerRegistrationPrior=Object.freeze({producer:'d791949cfe8a3821d76250379e0c68795759d2f88650ad3414ceeaa7dbd52b17',policy:'cbf641365e8ab55748befc3e59c283e30eadab314519c8f9fbf7f5647f4a7b30'});
export const dividerOwnerContextSources=Object.freeze([
  'scripts/audit-material-divider-heading-boxes.mjs',
  'scripts/audit-material-divider-heading-ua.mjs',
  'scripts/join-material-divider-outside-owner-evidence.mjs',
  'tests/material-parity/divider-outside-owner-evidence.spec.mjs',
  'scripts/audit-material-divider-owner-cursors.mjs',
  'tests/material-parity/divider-owner-cursors.spec.mjs',
  'tests/material-parity/divider-block-alignment-context.spec.mjs',
  'scripts/audit-public-block-align-content.mjs',
  'tests/material-parity/public-block-align-content.spec.mjs',
  'tests/material-parity/public-block-alignment-findings.mjs',
  'tests/material-parity/divider-owner-context-registration.mjs',
  'tests/material-parity/divider-owner-context-registration.spec.mjs',
  'tests/material-parity/divider-owner-context-review-source.mjs',
]);
export function dividerOwnerContextProofRows(read){
  const rows=[];
  for(const file of dividerOwnerContextSources.filter(f=>f.endsWith('.spec.mjs'))){
    const ast=ts.createSourceFile(file,read(file).toString(),99,true,ts.ScriptKind.JS);assert.equal(ast.parseDiagnostics.length,0);
    for(const n of ast.statements){
      if(!ts.isExpressionStatement(n)||!ts.isCallExpression(n.expression)||n.expression.expression.getText(ast)!=='test')continue;
      const title=n.expression.arguments[0];assert.ok(ts.isStringLiteral(title));
      rows.push({file,title:title.text,pattern:"test\\('"+title.text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+"'",
        scope:'Bounded retained owner inputs,desktop-DPR1 cursor observations and general public alignment reductions. Not whole-case closure,current rendering or transfer of public center failure to Material cases.'});
    }
  }
  assert.equal(rows.length,12);assert.equal(new Set(rows.map(r=>r.file+':'+r.title)).size,12);return rows;
}
const sourceAnchor='function sourceFingerprints(root) {\n  const files = [\n';
const proofAnchor='function focusedProofInventory(root) {\n  return [\n';
const policyAnchor='export const sourceAuditDefinitions = Object.freeze([\n';
const once=(s,a,b)=>{assert.equal(s.split(a).length,2,'Exact additive registration boundary required');return s.replace(a,b);};
const prefixes=read=>({sources:dividerOwnerContextSources.map(f=>'    '+JSON.stringify(f)+',\n').join(''),
  proofs:dividerOwnerContextProofRows(read).map(r=>'    proof(root, '+JSON.stringify(r.file)+', new RegExp('+JSON.stringify(r.pattern)+'),\n      '+JSON.stringify(r.title)+', '+JSON.stringify(r.scope)+'),\n').join('')});
export function prepareDividerOwnerContextProducer(source,read){
  let text=source.toString().replaceAll('\r\n','\n');assert.equal(hash(text),dividerOwnerRegistrationPrior.producer);
  for(const file of dividerOwnerContextSources)assert.equal(text.includes(JSON.stringify(file)),false);
  const p=prefixes(read);text=once(text,sourceAnchor,sourceAnchor+p.sources);return once(text,proofAnchor,proofAnchor+p.proofs);
}
export function restoreDividerOwnerContextProducer(source,read){
  const p=prefixes(read);let text=source.toString().replaceAll('\r\n','\n');
  text=once(text,sourceAnchor+p.sources,sourceAnchor);text=once(text,proofAnchor+p.proofs,proofAnchor);
  assert.equal(hash(text),dividerOwnerRegistrationPrior.producer);return text;
}
export const dividerOwnerContextFindingDefinitions=Object.freeze(publicBlockAlignmentFindings.map((finding,index)=>({...finding,
  pattern:index===0?'alignContent: "stretch"':'private layoutBlockChildren\\(',
  focusedProof:'tests/material-parity/public-block-align-content.spec.mjs: '+(index===0?'Public block alignment reduction preserves wrong default separately from explicit center failure':'Actual block placement omits alignment before the CSS projection boundary'),
  evidence:[finding.publicReproduction,finding.sourceBinding,finding.history.evidence,finding.causalExecution?.evidence].filter(Boolean).map(({file,sha256})=>({file,sha256})),
})));
const policyPrefix=dividerOwnerContextFindingDefinitions.map(f=>'  Object.freeze('+JSON.stringify(f,null,2)+'),\n').join('');
export function prepareDividerOwnerContextPolicy(source){
  const text=source.toString().replaceAll('\r\n','\n');assert.equal(hash(text),dividerOwnerRegistrationPrior.policy);
  for(const f of dividerOwnerContextFindingDefinitions)assert.equal(text.includes(f.id),false);
  return once(text,policyAnchor,policyAnchor+policyPrefix);
}
export function restoreDividerOwnerContextPolicy(source){
  const text=once(source.toString().replaceAll('\r\n','\n'),policyAnchor+policyPrefix,policyAnchor);
  assert.equal(hash(text),dividerOwnerRegistrationPrior.policy);return text;
}

export const dividerOwnerContextSelectionPrior=Object.freeze({launcher:'625e585f51d670cceb52a2eaa0600c70d6051d91c7c743bed1ad4e71f2f6673c',runner:'d6b7a4f8704689f5e1a44b0b45795c43913aca48181eefd12179c125856e8bb9'});
const selectedReview='f812d8d9e169b51afd03ae43ea06f8b8ac69e6df5147f11589112919c6ef7083';
const selectionTransitions=kind=>{
  assert.ok(Object.hasOwn(dividerOwnerContextSelectionPrior,kind));
  if(kind==='runner')return [
    ["import { menuSelectDisabledReview, createMenuSelectDisabledReviewReader } from '../tests/material-parity/menu-select-disabled-review-source.mjs';\n","import { menuSelectDisabledReview, createMenuSelectDisabledReviewReader } from '../tests/material-parity/menu-select-disabled-review-source.mjs';\nimport { dividerOwnerContextReview, createDividerOwnerContextReviewReader } from '../tests/material-parity/divider-owner-context-review-source.mjs';\n"],
    ['    const applicability=menuSelectReaderFactory?.','    const dividerContextReaderFactory = options.caseObligationReviewSha256===dividerOwnerContextReview ? createDividerOwnerContextReviewReader : menuSelectReaderFactory;\n    const applicability=dividerContextReaderFactory?.'],
  ];
  return [
    ['const rawRequested = process.argv.slice(2);\n',"const rawRequested = process.argv.slice(2);\nconst dividerOwnerContext = rawRequested.includes('--divider-owner-context');\nassert.ok(!dividerOwnerContext || rawRequested.every(argument => ['--divider-owner-context', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\n"],
    ['const requested = rawRequested.filter',"const requested = rawRequested.filter(argument => argument !== '--divider-owner-context').filter"],
    ['|--menu-select-disabled]','|--menu-select-disabled|--divider-owner-context]'],
    ['for (const [name, relative] of Object.entries(inputs)) {',`if (dividerOwnerContext) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/${selectedReview}.json';\nfor (const [name, relative] of Object.entries(inputs)) {`],
    ['(originalRunnerRecovery || dividerComputedPaint || dividerOwnerFrame || menuSelectDisabled)','(originalRunnerRecovery || dividerComputedPaint || dividerOwnerFrame || menuSelectDisabled || dividerOwnerContext)'],
    ["if (requested.includes('--dry-run'))",`if (dividerOwnerContext) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=${selectedReview}';\nif (requested.includes('--dry-run'))`],
  ];
};
export function prepareDividerOwnerContextSelection(source,kind){
  let s=source.toString().replaceAll('\r\n','\n');assert.equal(hash(s),dividerOwnerContextSelectionPrior[kind]);
  for(const [a,b]of selectionTransitions(kind))s=once(s,a,b);return s;
}
export function restoreDividerOwnerContextSelection(source,kind){
  let s=source.toString().replaceAll('\r\n','\n');for(const [a,b]of selectionTransitions(kind).toReversed())s=once(s,b,a);
  assert.equal(hash(s),dividerOwnerContextSelectionPrior[kind]);return s;
}

export function restoreDividerOwnerContextMenuRegistration(source){
  let text=source.toString().replaceAll('\r\n','\n');
  text=once(text,"import { createDividerOwnerContextPriorRead } from './divider-owner-context-registration.mjs';\n",'');
  text=once(text,'export function createMenuHistoricalRead({ root, read }) {\n  read = createDividerOwnerContextPriorRead({ root, read });\n','export function createMenuHistoricalRead({ root, read }) {\n');
  assert.equal(hash(text),'6d36eb153c21a9c66ec6b6ef3004d80aa4fa1d5de74bd2a055bb651d9ac1bb48');return text;
}
export function createDividerOwnerContextPriorRead({root,read}){
  const transitions=new Map([
    ['tests/material-parity/input-equivalence-audit.mjs',{prior:dividerOwnerRegistrationPrior.producer,restore:b=>restoreDividerOwnerContextProducer(b,f=>read(path.resolve(root,f)))}],
    ['tests/material-parity/input-equivalence-policy.mjs',{prior:dividerOwnerRegistrationPrior.policy,restore:restoreDividerOwnerContextPolicy}],
    ['scripts/export-material-input-audit-current-ancestry.mjs',{prior:dividerOwnerContextSelectionPrior.launcher,restore:b=>restoreDividerOwnerContextSelection(b,'launcher')}],
    ['scripts/run-material-input-audit.mjs',{prior:dividerOwnerContextSelectionPrior.runner,restore:b=>restoreDividerOwnerContextSelection(b,'runner')}],
    ['tests/material-parity/menu-select-disabled-registration.mjs',{prior:'6d36eb153c21a9c66ec6b6ef3004d80aa4fa1d5de74bd2a055bb651d9ac1bb48',restore:restoreDividerOwnerContextMenuRegistration}],
  ].map(([file,value])=>[path.resolve(root,file),value]));
  return (name,options)=>{
    const transition=transitions.get(path.resolve(root,name));if(!transition)return read(name,options);
    const bytes=read(name),normalized=bytes.toString().replaceAll('\r\n','\n');
    const restored=hash(normalized)===transition.prior?normalized:transition.restore(bytes);assert.equal(hash(restored),transition.prior);
    const encoding=typeof options==='string'?options:options?.encoding;return encoding?Buffer.from(restored).toString(encoding):Buffer.from(restored);
  };
}
