import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import ts from 'typescript';
import { restoreTextBackingPolicy } from './semantic-text-transform-registration.mjs';

export const textBackingRetainedReview='33a0bd8b71e92c7ededcc6f8e2cbf9ef1f5e981034362793c0531851672fe617';
const hash=b=>createHash('sha256').update(b).digest('hex');
// This adapter is selected only for the named retained review. Supplied reader
// observes CURRENT bytes first, so evidence sessions still detect concurrent drift.
export function createTextBackingReviewReader({root,read,reviewSha256}){
  assert.equal(reviewSha256,textBackingRetainedReview);
  const restored=new Map(),transitions=[];
  const bind=(file,current,prior,expected)=>{
    assert.equal(hash(prior),expected,'Unreviewed historical source restoration');
    restored.set(path.resolve(root,file),Buffer.from(prior));
    transitions.push({logicalFile:file,currentSha256:hash(current),historicalSha256:expected});
  };
  const policy='tests/material-parity/input-equivalence-policy.mjs',policyText=read(path.resolve(root,policy),'utf8');
  bind(policy,policyText,restoreTextBackingPolicy(policyText),'da0c6f3359f1146b07a9cd1f686c184df55185bbc0517c3a7df832f40e5c1512');
  const suite='tests/material-parity/input-boundary-evidence.spec.mjs',suiteText=read(path.resolve(root,suite),'utf8');
  assert.equal(hash(suiteText),'171bf9fae8fe2e701f5a42d5eef896685085ef267200956729ab447e04a032d5');
  const suiteAst=ts.createSourceFile(suite,suiteText,99,true,ts.ScriptKind.JS);
  const addition=suiteAst.statements.filter(n=>ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)
    &&n.expression.arguments[0]?.text==='equal explicit line height isolates text backing allocation from authored geometry');
  assert.equal(addition.length,1);
  bind(suite,suiteText,suiteText.slice(0,addition[0].getFullStart())+suiteText.slice(addition[0].end),
    '9ef883389c3aa8811d3a0a4756bc9e6f7cce82158c62ea453c08b4bb654c6367');
  const helper='tests/material-parity/semantic-text-transform-registration.mjs',helperText=read(path.resolve(root,helper),'utf8');
  assert.equal(hash(helperText),'4a1160686d55a5a27d722a55f7ddee6cd6a8674dec4cc381391d76965d69cd16');
  const ast=ts.createSourceFile(helper,helperText,99,true,ts.ScriptKind.JS),ranges=[];
  for(const node of ast.statements){
    if(ts.isFunctionDeclaration(node)&&['restoreTextBackingPolicy','restoreTextBackingProducer'].includes(node.name.text))ranges.push([node.getFullStart(),node.end]);
    if(ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>d.name.getText(ast)==='backingId'))ranges.push([node.getFullStart(),node.end]);
    if(ts.isFunctionDeclaration(node)&&node.name.text==='historicalSemanticDefinitions'){
      const first=node.body.statements[0];assert.equal(first.expression.getText(ast),'current.length === 165');ranges.push([first.getFullStart(),first.end]);
    }
  }
  assert.equal(ranges.length,4);let prior=helperText;
  for(const [start,end]of ranges.sort((a,b)=>b[0]-a[0]))prior=prior.slice(0,start)+prior.slice(end);
  const replace=(a,b)=>{assert.equal(prior.split(a).length,2);prior=prior.replace(a,b);};
  replace('const current = restoreTextBackingPolicy(source);','const current = normalized(source);');
  replace('const current = restoreTextBackingProducer(source);','const current = normalized(source);');
  replace("new Function(restoreTextBackingPolicy(source).replace(/^export const /gm, 'const ')","new Function(source.replace(/^export const /gm, 'const ')");
  bind(helper,helperText,prior,'6005638773f461cc73ed5f8ee41971127181186000cf4e464ca04dd42cca9ff7');
  return {
    read(file,...args){const actual=read(file,...args),old=restored.get(path.resolve(file));
      if(!old)return actual;
      const expected=transitions.find(t=>path.resolve(root,t.logicalFile)===path.resolve(file));
      assert.equal(hash(actual),expected.currentSha256,'Source changed after applicability review');
      return args[0]==='utf8'?old.toString('utf8'):old;
    },
    sourceApplicability:{mode:'explicit-text-backing-additive-registration-historical-review',reviewSha256,transitions,
      boundary:'Old review receipts remain historical. Current source bytes are separately authenticated/tracked;no rendering-currentness or inspection promotion.'},
  };
}
