import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import ts from 'typescript';
import { loadCaseObligationReview } from './audit-findings-store.mjs';
import { restoreInputBoundaryReadonlyAppend, createDividerReviewedBoundariesReader } from '../tests/material-parity/text-backing-case-review-source.mjs';

// Explicit historical read boundary only; no file or stored receipt is replaced.
const file='tests/material-parity/input-boundary-evidence.spec.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const normalize=b=>b.toString().replaceAll('\r\n','\n');
const currentSource=normalize(readFileSync(file));
const current=restoreInputBoundaryReadonlyAppend(currentSource);
assert.equal(hash(current),'171bf9fae8fe2e701f5a42d5eef896685085ef267200956729ab447e04a032d5');
const ast=ts.createSourceFile(file,current,99,true,ts.ScriptKind.JS);
const additions=ast.statements.filter(n=>ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)
  &&n.expression.expression.getText(ast)==='test'
  &&n.expression.arguments[0]?.text==='equal explicit line height isolates text backing allocation from authored geometry');
assert.equal(additions.length,1);
const added=additions[0];
const restored=current.slice(0,added.getFullStart())+current.slice(added.end);
const original=execFileSync('git',['show',`d125a47e:${file}`],{maxBuffer:2_000_000});
assert.equal(restored,normalize(original));
assert.notEqual(hash(current),hash(restored));
assert.notEqual(hash(restored+'\n// unrelated drift'),hash(normalize(original)));
const reviewSha='33a0bd8b71e92c7ededcc6f8e2cbf9ef1f5e981034362793c0531851672fe617';
const proposal=`artifacts/material-parity/working-audit/proposals/${reviewSha}.json`;
const review=JSON.parse(readFileSync(proposal)).review;
let historicalReads=0;
const reader=createDividerReviewedBoundariesReader({root:process.cwd(),read:readFileSync,reviewSha256:reviewSha});
assert.equal(reader.read(path.resolve(file),'utf8'),restored);
const loaded=loadCaseObligationReview(proposal,reviewSha,review.groups.map(g=>g.case),{
  read(name,...args){
    if(path.resolve(name)===path.resolve(file))historicalReads++;
    return reader.read(name,...args);
  },
});
assert.ok(historicalReads>0);assert.equal(loaded.cases.length,2311);
console.log(JSON.stringify({producerSha256:hash(readFileSync(import.meta.filename)),file,
  currentNormalizedSha256:hash(currentSource),readonlyPredecessorSha256:hash(current),restoredNormalizedSha256:hash(restored),
  additiveTestSha256:hash(added.getText(ast)),predecessorCommit:'d125a47e',reviewSha,
  historicalReads,validatedDependencies:loaded.evidenceFingerprints.length,cases:loaded.cases.length,
  boundary:'Exact removal of one additive test recovers complete predecessor suite. Explicit historical reader validates prior review unchanged;not default-loader acceptance,current suite byte equality or whole-case rendering acceptance.'}));
