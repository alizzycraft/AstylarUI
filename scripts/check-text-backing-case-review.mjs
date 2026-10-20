import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import ts from 'typescript';
import { restoreTextBackingPolicy } from '../tests/material-parity/semantic-text-transform-registration.mjs';
import { loadCaseObligationReview } from './audit-findings-store.mjs';
import { restoreInputBoundaryReadonlyAppend, createDividerReviewedBoundariesReader } from '../tests/material-parity/text-backing-case-review-source.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const restored=new Map(),receipts=[];
const historical=(file,current,prior,revision='98b60259')=>{
  const original=execFileSync('git',['show',`${revision}:${file}`],{maxBuffer:2_000_000});
  assert.equal(prior,original.toString());restored.set(path.resolve(file),Buffer.from(prior));
  receipts.push({logicalFile:file,currentSha256:hash(current),historicalSha256:hash(prior)});
};
const policy='tests/material-parity/input-equivalence-policy.mjs',policyText=readFileSync(policy,'utf8');
historical(policy,policyText,restoreTextBackingPolicy(policyText));
const suite='tests/material-parity/input-boundary-evidence.spec.mjs',suiteCurrentText=readFileSync(suite,'utf8');
const suiteText=restoreInputBoundaryReadonlyAppend(suiteCurrentText);
assert.equal(hash(suiteText),'171bf9fae8fe2e701f5a42d5eef896685085ef267200956729ab447e04a032d5');
const suiteAst=ts.createSourceFile(suite,suiteText,99,true,ts.ScriptKind.JS);
const addition=suiteAst.statements.filter(n=>ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)
  &&n.expression.arguments[0]?.text==='equal explicit line height isolates text backing allocation from authored geometry');
assert.equal(addition.length,1);
historical(suite,suiteCurrentText,suiteText.slice(0,addition[0].getFullStart())+suiteText.slice(addition[0].end),'d125a47e');
const helper='tests/material-parity/semantic-text-transform-registration.mjs',helperText=readFileSync(helper,'utf8');
const sha='33a0bd8b71e92c7ededcc6f8e2cbf9ef1f5e981034362793c0531851672fe617';
const reader=createDividerReviewedBoundariesReader({root:process.cwd(),read:readFileSync,reviewSha256:sha});
historical(helper,helperText,reader.read(path.resolve(helper),'utf8'));
const file=`artifacts/material-parity/working-audit/proposals/${sha}.json`,review=JSON.parse(readFileSync(file)).review;
const used=new Set();
const result=loadCaseObligationReview(file,sha,review.groups.map(g=>g.case),{read(file,...args){
  const key=path.resolve(file);if(restored.has(key)){used.add(key);return restored.get(key);}return reader.read(file,...args);
}});
assert.equal(used.size,3);assert.equal(result.cases.length,2311);
console.log(JSON.stringify({reviewSha:sha,receipts,sourceApplicability:reader.sourceApplicability,validatedDependencies:result.evidenceFingerprints.length,cases:result.cases.length,
  boundary:'Three original whole-source/Git assertions plus existing five-transition reader. Original proposal and receipts untouched;not default exporter acceptance,current historical bytes or rendering completion.'}));
