import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import ts from 'typescript';
import { restoreTextBackingPolicy } from '../tests/material-parity/semantic-text-transform-registration.mjs';
import { loadCaseObligationReview } from './audit-findings-store.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const restored=new Map(),receipts=[];
const historical=(file,current,prior,revision='98b60259')=>{
  const original=execFileSync('git',['show',`${revision}:${file}`],{maxBuffer:2_000_000});
  assert.equal(prior,original.toString());restored.set(path.resolve(file),Buffer.from(prior));
  receipts.push({logicalFile:file,currentSha256:hash(current),historicalSha256:hash(prior)});
};
const policy='tests/material-parity/input-equivalence-policy.mjs',policyText=readFileSync(policy,'utf8');
historical(policy,policyText,restoreTextBackingPolicy(policyText));
const suite='tests/material-parity/input-boundary-evidence.spec.mjs',suiteText=readFileSync(suite,'utf8');
assert.equal(hash(suiteText),'171bf9fae8fe2e701f5a42d5eef896685085ef267200956729ab447e04a032d5');
const suiteAst=ts.createSourceFile(suite,suiteText,99,true,ts.ScriptKind.JS);
const addition=suiteAst.statements.filter(n=>ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)
  &&n.expression.arguments[0]?.text==='equal explicit line height isolates text backing allocation from authored geometry');
assert.equal(addition.length,1);
historical(suite,suiteText,suiteText.slice(0,addition[0].getFullStart())+suiteText.slice(addition[0].end),'d125a47e');
const helper='tests/material-parity/semantic-text-transform-registration.mjs',helperText=readFileSync(helper,'utf8');
assert.equal(hash(helperText),'8168d164b04e18fbc075a2b0b66cf19cc6f8ed13bea199c34dea854dda036afc');
const ast=ts.createSourceFile(helper,helperText,99,true,ts.ScriptKind.JS),ranges=[];
for(const node of ast.statements){
  if(ts.isFunctionDeclaration(node)&&['restoreTextBackingPolicy','restoreTextBackingProducer'].includes(node.name.text))ranges.push([node.getFullStart(),node.end]);
  if(ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>d.name.getText(ast)==='backingId'))ranges.push([node.getFullStart(),node.end]);
  if(ts.isFunctionDeclaration(node)&&node.name.text==='historicalSemanticDefinitions'){
    const first=node.body.statements[0];assert.ok(first.expression.getText(ast)==='current.length === 165');ranges.push([first.getFullStart(),first.end]);
  }
}
assert.equal(ranges.length,4);let prior=helperText;
for(const [start,end]of ranges.sort((a,b)=>b[0]-a[0]))prior=prior.slice(0,start)+prior.slice(end);
const replace=(a,b)=>{assert.equal(prior.split(a).length,2);prior=prior.replace(a,b);};
replace('const current = restoreTextBackingPolicy(source);','const current = normalized(source);');
replace('const current = restoreTextBackingProducer(source);','const current = normalized(source);');
replace("new Function(restoreTextBackingPolicy(source).replace(/^export const /gm, 'const ')","new Function(source.replace(/^export const /gm, 'const ')");
historical(helper,helperText,prior);
const sha='33a0bd8b71e92c7ededcc6f8e2cbf9ef1f5e981034362793c0531851672fe617';
const file=`artifacts/material-parity/working-audit/proposals/${sha}.json`,review=JSON.parse(readFileSync(file)).review;
const used=new Set();
const result=loadCaseObligationReview(file,sha,review.groups.map(g=>g.case),{read(file,...args){
  const key=path.resolve(file);if(restored.has(key)){used.add(key);return restored.get(key);}return readFileSync(file,...args);
}});
assert.equal(used.size,3);assert.equal(result.cases.length,2311);
console.log(JSON.stringify({reviewSha:sha,receipts,validatedDependencies:result.evidenceFingerprints.length,cases:result.cases.length,
  boundary:'Three explicit whole-source-verified historical reads only. Original proposal and receipts untouched;not default exporter acceptance,current historical bytes or rendering completion.'}));
