import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createDividerOwnerContextHistoricalRead,createDividerOwnerContextReviewReader,dividerOwnerContextReview } from './divider-owner-context-review-source.mjs';
import { createMenuHistoricalRead } from './menu-select-disabled-registration.mjs';
import { dividerOwnerContextSources,dividerOwnerContextProofRows,prepareDividerOwnerContextProducer,restoreDividerOwnerContextProducer,
  dividerOwnerContextFindingDefinitions,prepareDividerOwnerContextPolicy,restoreDividerOwnerContextPolicy,
  prepareDividerOwnerContextSelection,restoreDividerOwnerContextSelection } from './divider-owner-context-registration.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const conservedRead=createDividerOwnerContextHistoricalRead({root:process.cwd(),read:readFileSync});
const inventory=source=>{
  const ast=ts.createSourceFile('producer.mjs',source,99,true,ts.ScriptKind.JS);assert.equal(ast.parseDiagnostics.length,0);const result={sources:[],proofs:[]};
  for(const fn of ast.statements.filter(ts.isFunctionDeclaration)){const visit=n=>{
    if(fn.name?.text==='sourceFingerprints'&&ts.isVariableDeclaration(n)&&n.name.getText(ast)==='files')result.sources=n.initializer.elements.map(e=>e.text);
    if(fn.name?.text==='focusedProofInventory'&&ts.isCallExpression(n)&&n.expression.getText(ast)==='proof')result.proofs.push(n.getText(ast));ts.forEachChild(n,visit);
  };visit(fn);}return result;
};
test('Divider context staged producer conserves all1028 sources and353 proofs without writing production',()=>{
  const file='tests/material-parity/input-equivalence-audit.mjs',bytes=readFileSync(file),before=conservedRead(file,'utf8').replaceAll('\r\n','\n');
  const staged=prepareDividerOwnerContextProducer(before,readFileSync),old=inventory(before),next=inventory(staged);
  assert.equal(bytes.toString().replaceAll('\r\n','\n'),staged,'Live producer must equal verified complete additive registration');
  assert.equal(old.sources.length,1028);assert.equal(old.proofs.length,353);assert.equal(next.sources.length,1041);assert.equal(next.proofs.length,365);
  assert.equal(new Set(next.sources).size,1041);assert.deepEqual(next.sources.slice(13),old.sources);assert.deepEqual(next.proofs.slice(12),old.proofs);
  assert.deepEqual(next.sources.slice(0,13),dividerOwnerContextSources);
  for(const row of dividerOwnerContextProofRows(readFileSync))assert.equal([...readFileSync(row.file,'utf8').matchAll(new RegExp(row.pattern,'g'))].length,1);
  assert.equal(restoreDividerOwnerContextProducer(staged,readFileSync),before);
  assert.throws(()=>restoreDividerOwnerContextProducer(staged+'\n// drift',readFileSync));assert.throws(()=>prepareDividerOwnerContextProducer(staged,readFileSync));
  assert.deepEqual(readFileSync(file),bytes);
});

test('Divider context staged launcher selects exact review and preserves every older supplement',()=>{
  const file='scripts/export-material-input-audit-current-ancestry.mjs',live=readFileSync(file,'utf8').replaceAll('\r\n','\n'),original=conservedRead(file,'utf8'),staged=prepareDividerOwnerContextSelection(original,'launcher');
  assert.equal(live,staged);
  assert.equal(restoreDividerOwnerContextSelection(staged,'launcher'),original);
  const rootLine="const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');";
  const run=(source,flags)=>spawnSync(process.execPath,['--input-type=module','-','--dry-run',...flags],{input:source.replace(rootLine,`const root = ${JSON.stringify(process.cwd())};`),encoding:'utf8',windowsHide:true});
  const selected=run(staged,['--divider-owner-context']);assert.equal(selected.status,0,selected.stderr);
  const args=JSON.parse(selected.stdout).args;assert.ok(args.includes('--case-obligation-review-sha256='+dividerOwnerContextReview));
  assert.ok(args.includes('--case-obligation-review=artifacts/material-parity/working-audit/proposals/'+dividerOwnerContextReview+'.json'));
  for(const flag of ['--static-ax','--card-inputs','--expansion-semantics','--stepper-inputs','--tabs-menu-sheet','--static-semantic-inputs','--popup-depth-inputs','--scrollbar-paint','--table-label-paint','--radio-caret-paint','--retained-focus','--slider-hover-held','--slider-state-inputs','--original-runner-recovery','--divider-computed-paint','--divider-owner-frame','--menu-select-disabled']){
    assert.notEqual(run(staged,['--divider-owner-context',flag]).status,0);const before=run(original,[flag]),after=run(staged,[flag]);assert.equal(before.status,0,before.stderr);assert.equal(after.status,0,after.stderr);assert.deepEqual(JSON.parse(after.stdout),JSON.parse(before.stdout));
  }
  assert.deepEqual(JSON.parse(run(staged,[]).stdout),JSON.parse(run(original,[]).stdout));
  assert.throws(()=>restoreDividerOwnerContextSelection(staged+'\n// drift','launcher'));assert.equal(readFileSync(file,'utf8').replaceAll('\r\n','\n'),live);
});
test('Divider context staged runner routes only exact digest to the new reader',()=>{
  const file='scripts/run-material-input-audit.mjs',live=readFileSync(file,'utf8').replaceAll('\r\n','\n'),original=conservedRead(file,'utf8'),staged=prepareDividerOwnerContextSelection(original,'runner');
  assert.equal(live,staged);
  assert.equal(restoreDividerOwnerContextSelection(staged,'runner'),original);
  const ast=ts.createSourceFile(file,staged,99,true,ts.ScriptKind.JS);assert.equal(ast.parseDiagnostics.length,0);let selector;
  const visit=n=>{if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='dividerContextReaderFactory')selector=n.initializer.getText(ast);ts.forEachChild(n,visit);};visit(ast);assert.ok(selector);
  const choose=new Function('options','dividerOwnerContextReview','createDividerOwnerContextReviewReader','menuSelectReaderFactory','return '+selector),next=()=>{},prior=()=>{};
  assert.equal(choose({caseObligationReviewSha256:dividerOwnerContextReview},dividerOwnerContextReview,next,prior),next);
  assert.equal(choose({caseObligationReviewSha256:'0'.repeat(64)},dividerOwnerContextReview,next,prior),prior);
  assert.equal(readFileSync(file,'utf8').replaceAll('\r\n','\n'),live);
});

test('Divider context reader restores only staged producer and policy and rejects unknown selection',()=>{
  const root=process.cwd(),producer='tests/material-parity/input-equivalence-audit.mjs',policy='tests/material-parity/input-equivalence-policy.mjs';
  const launcher='scripts/export-material-input-audit-current-ancestry.mjs',runner='scripts/run-material-input-audit.mjs';
  const original=new Map([producer,policy,launcher,runner].map(f=>[path.resolve(root,f),conservedRead(f,'utf8').replaceAll('\r\n','\n')]));
  const staged=new Map([[path.resolve(root,producer),Buffer.from(prepareDividerOwnerContextProducer(original.get(path.resolve(root,producer)),readFileSync))],
    [path.resolve(root,policy),Buffer.from(prepareDividerOwnerContextPolicy(original.get(path.resolve(root,policy))))]]);
  staged.set(path.resolve(root,launcher),Buffer.from(prepareDividerOwnerContextSelection(original.get(path.resolve(root,launcher)),'launcher')));
  staged.set(path.resolve(root,runner),Buffer.from(prepareDividerOwnerContextSelection(original.get(path.resolve(root,runner)),'runner')));
  const read=(name,options)=>{const b=staged.get(path.resolve(root,name));if(!b)return readFileSync(name,options);const encoding=typeof options==='string'?options:options?.encoding;return encoding?b.toString(encoding):Buffer.from(b);};
  const historical=createDividerOwnerContextHistoricalRead({root,read});
  for(const [name,text]of original){assert.equal(historical(name,'utf8'),text);assert.equal(historical(name).toString(),text);}
  const directPrior=createMenuHistoricalRead({root,read}),unmodifiedPrior=createMenuHistoricalRead({root,read:readFileSync});
  for(const name of original.keys())assert.deepEqual(directPrior(name),unmodifiedPrior(name),'Direct old consumer must recover complete original bytes');
  const shared='tests/material-parity/menu-select-disabled-registration.mjs';
  assert.equal(hash(historical(shared)),'6d36eb153c21a9c66ec6b6ef3004d80aa4fa1d5de74bd2a055bb651d9ac1bb48');
  for(const [name,b]of staged){staged.set(name,Buffer.concat([b,Buffer.from('\n// unexpected')]));assert.throws(()=>historical(name));staged.set(name,b);}
  const untouched='docs/evidence/material-original-runner-e01.mjs.gz.b64';assert.deepEqual(historical(untouched),readFileSync(untouched));
  assert.throws(()=>createDividerOwnerContextReviewReader({root,read,reviewSha256:'0'.repeat(64)}));
  assert.equal(dividerOwnerContextReview,'f812d8d9e169b51afd03ae43ea06f8b8ac69e6df5147f11589112919c6ef7083');
  const selected=createDividerOwnerContextReviewReader({root,read,reviewSha256:dividerOwnerContextReview});
  const virtual=`artifacts/material-parity/working-audit/proposals/${dividerOwnerContextReview}.json`;
  const proposal=JSON.parse(selected.read(virtual));assert.equal(proposal.sha256,dividerOwnerContextReview);
  assert.equal(hash(JSON.stringify(proposal.review)),dividerOwnerContextReview);assert.equal(proposal.review.groups.length,2311);
  assert.ok(proposal.review.groups.every(g=>g.inspection==='partial'&&g.currentRendering==='unverified'));
  assert.deepEqual(selected.read(untouched),readFileSync(untouched));
});
test('Divider context staged policy conserves all196 definitions and binds two distinct failures',()=>{
  const file='tests/material-parity/input-equivalence-policy.mjs',bytes=readFileSync(file),before=conservedRead(file,'utf8').replaceAll('\r\n','\n');
  const definitions=s=>new Function(s.replace(/^export const /gm,'const ')+';return sourceAuditDefinitions;')();
  const staged=prepareDividerOwnerContextPolicy(before),old=definitions(before),next=definitions(staged);
  assert.equal(bytes.toString().replaceAll('\r\n','\n'),staged,'Live policy must equal verified complete additive registration');
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
