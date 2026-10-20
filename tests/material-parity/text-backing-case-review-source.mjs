import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import ts from 'typescript';
import { restoreTextBackingPolicy } from './semantic-text-transform-registration.mjs';

export const textBackingRetainedReview='33a0bd8b71e92c7ededcc6f8e2cbf9ef1f5e981034362793c0531851672fe617';
export const dividerReviewedBoundariesReview='be99cd383dabb304da259cef9046b6b81ce44922c3ae4d8fe6dfc2a76ab33f6f';
export const inactiveParagraphInputsReview='bfc2b6d546a0a636f07272eef14591ec830dcc7e90098c06a865af72076d238e';
export const filledFieldStructureReview='f471932bd9ed51a2df35d533632acafc5e4788df07e6e46ed4b5b8bf0c57739b';
export const chipPaintReview='868daaecb79c16d632701361c4303197f5d2760aec70f4cdd5d138840decabe5';
const hash=b=>createHash('sha256').update(b).digest('hex');
// Reuse the exact validated four-source boundary. The supplied session reader
// observes every current byte, including the immutable boundary owner itself.
export function createDividerReviewedBoundariesReader({root,read,reviewSha256}){
  // Both exact reviews retain the same pre-extension alignment-suite receipt.
  // Supporting the predecessor does not change the three-source base contract.
  assert.ok([textBackingRetainedReview,dividerReviewedBoundariesReview,inactiveParagraphInputsReview,filledFieldStructureReview,chipPaintReview].includes(reviewSha256));
  const owner='scripts/join-material-divider-paint-boundaries.mjs';
  const source=read(path.resolve(root,owner),'utf8');
  assert.equal(hash(source),'b187103f2f773955dd97ea3e0ee4e0b5d4b4b9faab4af0ebb6fe5d6627f681da');
  const start=source.indexOf("const suite = 'tests/material-parity/alignment-crop-provenance.spec.mjs'");
  const end=source.indexOf('const review = JSON.parse',start);
  assert.ok(start>0&&end>start);
  const boundary=source.slice(start,end);
  assert.equal(hash(boundary),'d15efcaec30d491a75cdbad706e2ec7baf41ddbb76f6648a854f0a08d7f8b355');
  let baseReader;
  const createBase=options=>{
    baseReader=createTextBackingReviewReader(options);
    return baseReader;
  };
  const {trackedRead}=new Function('assert','readFileSync','hash','path','createTextBackingReviewReader','predecessor',
    `${boundary}\nreturn {trackedRead};`)(assert,read,hash,path,createBase,textBackingRetainedReview);
  const suite='tests/material-parity/alignment-crop-provenance.spec.mjs';
  return {read:trackedRead,sourceApplicability:{
    mode:'explicit-reviewed-divider-boundaries-historical-review',reviewSha256,
    transitions:[...baseReader.sourceApplicability.transitions,{
      logicalFile:suite,currentSha256:hash(read(path.resolve(root,suite))),
      historicalSha256:hash(trackedRead(path.resolve(root,suite))),
    }],boundaryOwner:{file:owner,sha256:hash(source)},boundarySha256:hash(boundary),
    boundary:'Exact historical source restorations,including benchmark support replay;current bytes remain tracked. No current-rendering acceptance or inspection promotion.',
  }};
}
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
  let reviewedHelperText=helperText,replayRestorationBlock;
  if(hash(helperText)==='141bc88ae07fda6194f856f55dd374d9116be7b92e3f2983aa25923dd88cac72'){
    // Only later benchmark historical-replay accounting is removed. No policy,
    // producer,actions or original helper statement is treated as equivalent by name.
    const start=helperText.indexOf('    const focusStart =');
    const end=helperText.indexOf('    assert.equal(restored.split(importLine).length, 2);',start);
    assert.ok(start>0&&end>start);
    assert.equal(hash(helperText.slice(start,end)),'c679fe6a57ab2e3734e97f3ca855c9e68b2b7ad6b35c6143f767d294b6b5bf88');
    replayRestorationBlock=helperText.slice(start,end);
    reviewedHelperText=helperText.slice(0,start)+helperText.slice(end);
  }
  assert.equal(hash(reviewedHelperText),'4a1160686d55a5a27d722a55f7ddee6cd6a8674dec4cc381391d76965d69cd16');
  const ast=ts.createSourceFile(helper,reviewedHelperText,99,true,ts.ScriptKind.JS),ranges=[];
  for(const node of ast.statements){
    if(ts.isFunctionDeclaration(node)&&['restoreTextBackingPolicy','restoreTextBackingProducer'].includes(node.name.text))ranges.push([node.getFullStart(),node.end]);
    if(ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>d.name.getText(ast)==='backingId'))ranges.push([node.getFullStart(),node.end]);
    if(ts.isFunctionDeclaration(node)&&node.name.text==='historicalSemanticDefinitions'){
      const first=node.body.statements[0];assert.equal(first.expression.getText(ast),'current.length === 165');ranges.push([first.getFullStart(),first.end]);
    }
  }
  assert.equal(ranges.length,4);let prior=reviewedHelperText;
  for(const [start,end]of ranges.sort((a,b)=>b[0]-a[0]))prior=prior.slice(0,start)+prior.slice(end);
  const replace=(a,b)=>{assert.equal(prior.split(a).length,2);prior=prior.replace(a,b);};
  replace('const current = restoreTextBackingPolicy(source);','const current = normalized(source);');
  replace('const current = restoreTextBackingProducer(source);','const current = normalized(source);');
  replace("new Function(restoreTextBackingPolicy(source).replace(/^export const /gm, 'const ')","new Function(source.replace(/^export const /gm, 'const ')");
  bind(helper,helperText,prior,'6005638773f461cc73ed5f8ee41971127181186000cf4e464ca04dd42cca9ff7');
  if(replayRestorationBlock){
    // Reuse the exact guarded support reversal already executed by the existing
    // benchmark reader. This stops BEFORE its older registration-header reversal.
    const benchmark='tests/material-parity/benchmark-config.spec.mjs';
    const benchmarkText=read(path.resolve(root,benchmark),'utf8');
    assert.equal(hash(benchmarkText),'a270e3d3330d361512593efa60f69771c71709f70f2f679c8787f186ceb275d0');
    const originalBenchmark=new Function('assert','digest','restored',
      replayRestorationBlock+'\nreturn restored;')(assert,hash,benchmarkText);
    bind(benchmark,benchmarkText,originalBenchmark,'e74ef1d5d42b3534ed33396347e67eea6beb8625a7c9dccd18c9c51142ca88b4');
  }
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
