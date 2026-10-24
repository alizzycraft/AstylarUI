import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';

const hash=b=>createHash('sha256').update(b).digest('hex');
test('Ordinary wrapping request path preserves parsed override and cache boundaries', t=>{
  const reportFile='artifacts/material-parity/public-block-align-content-20261025/latest-report.json',bytes=readFileSync(reportFile);
  assert.equal(hash(bytes),'e13cac751581f025897691bd8279e23fd2b0068f64b8f31e8d222dff8c1519c5');
  const inputs=JSON.parse(bytes).inputs,records=[];
  const extract=(file,owner,names)=>{
    const bytes=readFileSync(file),ast=ts.createSourceFile(file,bytes.toString(),99,true,file.endsWith('.ts')?ts.ScriptKind.TS:ts.ScriptKind.JS);
    const cls=ast.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===owner);assert.ok(cls);
    if(file.endsWith('.js'))assert.equal(inputs.find(q=>q.file===file)?.sha256,hash(bytes));
    const members=names?names.map(name=>{const found=cls.members.filter(n=>ts.isMethodDeclaration(n)&&n.name.getText(ast)===name);assert.equal(found.length,1);return found[0];}):
      cls.members.filter(n=>!(ts.getCombinedModifierFlags(n)&ts.ModifierFlags.Static));
    const text=members.map(n=>n.getText(ast)).join('\n');
    const code=ts.transpileModule('class Probe {'+text+'}',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
    return {file,sha256:hash(bytes),membersSha256:hash(text),code};
  };
  for(const side of ['current','installed']){
    const file=relative=>side==='current'?'src/app/services/'+relative+'.ts':'examples/material-showcase/node_modules/astylarui/dist/lib/app/services/'+relative+'.js';
    const parserSource=extract(file('text/text-style-parser.service'),'TextStyleParserService');
    const renderingSource=extract(file('text/text-rendering.service'),'TextRenderingService',['parseElementTextStyle','renderTextToTexture','generateCacheKey']);
    const Parser=new Function(parserSource.code+';return Probe;')(),parser=new Parser();
    const events=[],canvasCalls=[];
    const Rendering=new Function('console','window',renderingSource.code+';return Probe;')({error:()=>events.push('recorded-raster-stop')},{devicePixelRatio:1});
    const rendering=new Rendering();rendering.scene={};rendering.options={enableCaching:false};
    rendering.textStyleParser={parseTextProperties:rule=>{events.push('parse');return parser.parseTextProperties(rule);}};
    rendering.textCanvasRenderer={createStyledCanvas:(text,style,maxWidth)=>{events.push('canvas');canvasCalls.push({text,style,maxWidth});throw Error('STOP_BEFORE_RASTER');}};
    const base={selector:'#ordinary',fontSize:'16px',lineHeight:'20px'},element={type:'span',id:'ordinary',textContent:'Alpha Beta'};
    const run=(node,rule)=>{assert.throws(()=>rendering.renderTextToTexture(node,'Alpha Beta',rule,60),/STOP_BEFORE_RASTER/);return canvasCalls.at(-1);};
    let observed=run(element,base);assert.deepEqual([observed.style.whiteSpace,observed.style.wordWrap,observed.style.textOverflow],['normal','normal','clip']);
    assert.deepEqual(events,['parse','canvas','recorded-raster-stop']);events.length=0;
    observed=run(element,{...base,whiteSpace:'pre',wordWrap:'break-word',textOverflow:'ellipsis'});
    assert.deepEqual([observed.style.whiteSpace,observed.style.wordWrap,observed.style.textOverflow],['pre','break-word','ellipsis']);
    const override={...observed.style,whiteSpace:'nowrap',wordWrap:'normal',textOverflow:'clip'},before=structuredClone(override);events.length=0;
    observed=run({...element,textStyle:override},{...base,whiteSpace:'pre'});
    assert.equal(observed.style,override);assert.deepEqual(override,before);assert.deepEqual(events,['canvas','recorded-raster-stop']);
    events.length=0;rendering.options.enableCaching=true;const cached={kind:'recording-cache-hit'},oldCalls=canvasCalls.length;
    rendering.getTexture=key=>{events.push('cache');assert.equal(typeof key,'string');return cached;};
    assert.equal(rendering.renderTextToTexture(element,'Alpha Beta',base,60),cached);
    assert.deepEqual(events,['parse','cache']);assert.equal(canvasCalls.length,oldCalls);
    records.push({side,parser:{file:parserSource.file,sha256:parserSource.sha256,membersSha256:parserSource.membersSha256},
      renderer:{file:renderingSource.file,sha256:renderingSource.sha256,membersSha256:renderingSource.membersSha256},
      suppliedDefault:['normal','normal','clip'],explicitSensitivity:['pre','break-word','ellipsis'],preparsedOverride:['nowrap','normal','clip'],cacheParsesBeforeLookup:true,cacheSkipsCanvas:true});
  }
  t.diagnostic(JSON.stringify({records,boundary:'Actual current and captured-installed parser instance members and three rendering methods. Angular metadata excluded;DPR1 window,scene/cache/canvas are recording adapters and canvas stops before raster. Not actual browser texture,original Material action/capture,external inheritance,wordBreak/overflowWrap support or paint acceptance.'}));
});
