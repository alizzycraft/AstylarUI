import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { publicBlockAlignmentFindings } from './public-block-alignment-findings.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
test('Public block alignment reduction preserves wrong default separately from explicit center failure', () => {
  const root = 'artifacts/material-parity/public-block-align-content-20261025/';
  const bytes = readFileSync(root+'latest-report.json');
  assert.equal(hash(bytes),'e13cac751581f025897691bd8279e23fd2b0068f64b8f31e8d222dff8c1519c5');
  const report = JSON.parse(bytes);
  assert.equal(hash(readFileSync(report.producer.file)),report.producer.sha256);
  assert.equal(hash(readFileSync(root+'audit.js')),report.bundleSha256);
  assert.equal(hash(readFileSync(root+'input.mjs')),report.inputSha256);
  const source = readFileSync(root+'input.mjs','utf8');
  assert.match(source,/import \{Astylar\} from 'astylarui'/);
  assert.doesNotMatch(source,/from ['"]astylarui\//);
  for (const receipt of report.inputs) assert.equal(hash(readFileSync(receipt.file)),receipt.sha256);
  assert.deepEqual(report.errors,[]);
  const validate = results => {
    assert.deepEqual(results.map(r=>[r.dpr,r.value]),[1,2].flatMap(d=>['omitted','normal','stretch','center'].map(v=>[d,v])));
    for (const row of results) {
      assert.deepEqual(row.reference.site,row.astylar.site);
      for (const side of ['reference','astylar']) {
        assert.equal(row[side].inputUnchanged,true);assert.deepEqual(row[side].errors,[]);
        assert.ok(row[side].assets.some(a=>a.sha256===report.bundleSha256));
        assert.equal(row[side].site.styles[1].display,'block');
        assert.equal(row[side].site.styles[1].position,'absolute');
        assert.equal(row[side].site.styles[1].alignContent,row.value==='omitted'?undefined:row.value);
      }
      assert.equal(row.reference.alignContent,row.value==='omitted'?'normal':row.value);
      assert.equal(row.astylar.alignContent,row.value==='omitted'?'stretch':row.value);
      const offset = side => row[side].bounds.child.top-row[side].bounds.parent.top;
      assert.ok(Math.abs(offset('reference')-(row.value==='center'?55:20))<.01);
      assert.ok(Math.abs(offset('astylar')-20)<.01);
      if(row.value==='center')assert.ok(Math.abs(offset('astylar')-offset('reference')+35)<.01);
    }
  };
  validate(report.results);
  const unequal=structuredClone(report.results);unequal[0].astylar.site.styles[1].alignContent='normal';assert.throws(()=>validate(unequal));
  const hidden=structuredClone(report.results);hidden.pop();assert.throws(()=>validate(hidden));
  // This test conserves a documented failure;passing it is NOT parity acceptance.
  assert.match(report.boundary,/Not local pixel\/raster/);
});

test('Public block alignment capture uses current default and block routing implementations', t => {
  const root='artifacts/material-parity/public-block-align-content-20261025/';
  const report=JSON.parse(readFileSync(root+'latest-report.json'));
  const prefix='examples/material-showcase/node_modules/astylarui/dist/lib/';
  const tokens = source => {
    const scanner=ts.createScanner(ts.ScriptTarget.Latest,true,ts.LanguageVariant.Standard,source),result=[];
    for(let kind=scanner.scan();kind!==ts.SyntaxKind.EndOfFileToken;kind=scanner.scan())result.push([kind,scanner.getTokenText()]);
    return result;
  };
  const methods=(file,owner,names)=>{
    const bytes=readFileSync(file),ast=ts.createSourceFile(file,bytes.toString(),99,true,file.endsWith('.ts')?ts.ScriptKind.TS:ts.ScriptKind.JS);
    const cls=ast.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===owner);assert.ok(cls);
    return {file,sha256:hash(bytes),methods:names.map(name=>{
      const nodes=cls.members.filter(n=>ts.isMethodDeclaration(n)&&n.name.getText(ast)===name);assert.equal(nodes.length,1);
      return {name,source:nodes[0].getText(ast)};
    })};
  };
  const evidence=[];
  for(const [relative,owner,names]of [
    ['app/services/dom/elements/element-creation.service','ElementCreationService',['processChildren','shouldUseInlineFlow','layoutInlineChildren','layoutBlockChildren']],
    ['app/services/dom/style-defaults.service','StyleDefaultsService',['getGlobalDefaultStyle','getElementTypeDefaults']],
  ]){
    const current=methods('src/'+relative+'.ts',owner,names),installed=methods(prefix+relative+'.js',owner,names);
    assert.equal(report.inputs.find(r=>r.file===installed.file)?.sha256,installed.sha256);
    const emitted=ts.transpileModule('class Probe {'+current.methods.map(m=>m.source).join('\n')+'}',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
    const ast=ts.createSourceFile('emitted.js',emitted,99,true,ts.ScriptKind.JS),cls=ast.statements.find(ts.isClassDeclaration);
    for(const method of installed.methods){
      const node=cls.members.find(n=>ts.isMethodDeclaration(n)&&n.name.getText(ast)===method.name);assert.ok(node);
      assert.deepEqual(tokens(node.getText(ast)),tokens(method.source),relative+'/'+method.name);
    }
    evidence.push({current:{file:current.file,sha256:current.sha256},installed:{file:installed.file,sha256:installed.sha256},methods:names});
  }
  const initializer=file=>{
    const bytes=readFileSync(file),ast=ts.createSourceFile(file,bytes.toString(),99,true);
    const found=[];const visit=n=>{if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='globalDefaultStyle')found.push(n.initializer.getText(ast));ts.forEachChild(n,visit);};visit(ast);assert.equal(found.length,1);
    return {file,sha256:hash(bytes),source:found[0]};
  };
  const current=initializer('src/app/config/browser-defaults.ts'),installed=initializer(prefix+'app/config/browser-defaults.js');
  assert.equal(report.inputs.find(r=>r.file===installed.file)?.sha256,installed.sha256);
  assert.deepEqual(tokens(current.source),tokens(installed.source));
  evidence.push({current:{file:current.file,sha256:current.sha256},installed:{file:installed.file,sha256:installed.sha256},initializer:'globalDefaultStyle'});
  t.diagnostic(JSON.stringify({sourceApplicability:evidence,boundary:'Complete six methods and global initializer token equality only;not entire package/source equality or historical runtime. Candidate center geometry failure remains separately observed.'}));
});

test('Pending block alignment findings distinguish resolution from explicit layout failure', () => {
  assert.equal(publicBlockAlignmentFindings.length,2);
  assert.equal(new Set(publicBlockAlignmentFindings.map(f=>f.id)).size,2);
  for(const finding of publicBlockAlignmentFindings){
    assert.equal(finding.classification,'confirmed-core-renderer-defect');
    for(const receipt of [finding.publicReproduction,finding.sourceBinding,finding.history.evidence].filter(Boolean))assert.equal(hash(readFileSync(receipt.file)),receipt.sha256);
    assert.deepEqual(finding.observation.dpr,[1,2]);
  }
  assert.match(publicBlockAlignmentFindings[0].boundary,/not a demonstrated omission-driven geometry failure/);
  assert.match(publicBlockAlignmentFindings[1].boundary,/Exact internal causal statement still requires/);
});
