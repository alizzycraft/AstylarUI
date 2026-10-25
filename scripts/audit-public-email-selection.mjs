import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';

// Isolate selected replacement from Material callbacks and nullable email DOM
// endpoints. Reuse the public mount/build/real-key/asset-verification driver.
const baseFile='scripts/audit-public-readonly-editing.mjs',base=readFileSync(baseFile);
const hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(hash(base),'60fcf3d822f15a7ccfefddc8590c0acfda4af914661c6897a06b2f4e39a5384f');
const script='scripts/audit-public-email-selection.mjs';let source=base.toString();
function replace(a,b){assert.equal(source.split(a).length,2,`Ambiguous email reduction: ${a}`);source=source.replace(a,b);}
const tree=ts.createSourceFile(baseFile,source,99,true,ts.ScriptKind.JS);
const verifier=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='verify');
source=source.slice(0,verifier.getStart(tree))+verify.toString()+source.slice(verifier.end);
const t=ts.createSourceFile(baseFile,source,99,true,ts.ScriptKind.JS),branch=t.statements.find(n=>ts.isIfStatement(n)&&n.expression.getText(t)==='verifyOnly');
source=source.slice(0,branch.thenStatement.getStart(t))+`{
 const report=JSON.parse(readFileSync(path.join(output,'latest-report.json'))),summary=verify(report);let rejected=0;
 for(const mutate of [r=>r.results.pop(),r=>r.results[1].site.root.children[0].inputType='password',r=>r.inputs[0].sha256='0'.repeat(64),r=>r.currentRenderingAccepted=true]){
  const changed=structuredClone(report);mutate(changed);assert.throws(()=>verify(changed));rejected++;
 }console.log(JSON.stringify({...summary,negativeControlsRejected:rejected}));
}`+source.slice(branch.thenStatement.end);
replace("const script = 'scripts/audit-public-readonly-editing.mjs';",`const script = '${script}';`);
replace("const kinds = ['writable', 'readonly', 'disabled'];","const kinds = ['text', 'email'];");
source=source.replaceAll('public-readonly-editing','public-email-selection');
replace("inputType:'text',value:'Atlas'","inputType:kind,value:'team@example.com'");
replace("control.type='text';control.value='Atlas';","control.type=kind;control.value='team@example.com';");
replace("['focus','blur','keydown','keyup','input','change']","['focus','blur','keydown','keyup','beforeinput','input','change']");
replace("trusted:e.isTrusted,value:control.value,readonly:control.readOnly","trusted:e.isTrusted,defaultPrevented:e.defaultPrevented,inputType:e.inputType??null,value:control.value,readonly:control.readOnly");
replace('value:control.value,readonly:control.readOnly,disabled:control.disabled,focused:',
  'value:control.value,selectionStart:control.selectionStart,selectionEnd:control.selectionEnd,selectionDirection:control.selectionDirection,readonly:control.readOnly,disabled:control.disabled,focused:');
replace("await page.keyboard.press('Home');","await page.keyboard.press('Control+A');");
replace("await sample('focused-home');","await sample('selected-all');");
replace("[['x', 'typed-x'], ['Delete', 'delete'], ['Backspace', 'backspace']]","[['Z', 'typed-Z'], ['Delete', 'delete'], ['Backspace', 'backspace']]");
replace("const expected = kind === 'writable' ? ['Atlas', 'xAtlas', 'xtlas', 'tlas'] : ['Atlas', 'Atlas', 'Atlas', 'Atlas'];","const expected = ['team@example.com', 'Z', 'Z', ''];");
source=source.replaceAll('readonlyFailingPairs','replacementFailingPairs');
replace("if (kind === 'readonly' && mode === 'astylar' && !contractPass)","if (mode === 'astylar' && !contractPass)");
replace('No Material/plugin/callback/update;not raster,all keys,all browsers,current full-package or Material case acceptance.',
  'Text/email Control+A,Z,Delete,Backspace only;no Material/plugin/callback/update. Null email endpoints remain null. Not raster,clipboard,all keys/browsers,current full-package or Material case acceptance.');
const ast=ts.createSourceFile(baseFile,source,99,true,ts.ScriptKind.JS);assert.equal(ast.parseDiagnostics.length,0);
for(const node of ast.statements.filter(ts.isImportDeclaration).toReversed()){
 const name=node.moduleSpecifier.text;if(name.startsWith('node:'))continue;
 const url=name.startsWith('.')?pathToFileURL(path.resolve(path.dirname(baseFile),name)).href:import.meta.resolve(name);
 source=source.slice(0,node.moduleSpecifier.getStart(ast))+JSON.stringify(url)+source.slice(node.moduleSpecifier.end);
}
if(process.argv[2]==='--dry-run')console.log(JSON.stringify({script,baseFile,baseSha256:hash(base),sourceSha256:hash(source),pairs:4,types:['text','email'],actions:['Control+A','Z','Delete','Backspace']}));
else await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

function verify(report){
 assert.equal(report.kind,'public-email-selection');assert.equal(report.scriptSha256,hash(readFileSync(script)));
 for(const receipt of [report.source,report.bundle,report.html,...report.inputs])assert.equal(hash(readFileSync(receipt.file)),receipt.sha256);
 assert.deepEqual(report.errors,[]);assert.equal(report.currentRenderingAccepted,false);
 assert.deepEqual(report.results.map(r=>`${r.dpr}/${r.kind}/${r.mode}`),[1,2].flatMap(d=>['text','email'].flatMap(k=>['reference','astylar'].map(m=>`${d}/${k}/${m}`))));
 let replacementFailingPairs=0;for(const dpr of [1,2])for(const kind of ['text','email']){
  const pair=report.results.filter(r=>r.dpr===dpr&&r.kind===kind);assert.deepEqual(pair[0].site,pair[1].site);
  for(const row of pair){
   assert.equal(row.site.root.children[0].inputType,kind);assert.equal(row.inputUnchanged,true);assert.deepEqual(row.diagnostics,[]);
   assert.ok(row.assets.some(r=>r.sha256===report.bundle.sha256));
   assert.deepEqual(row.samples.map(s=>s.boundary),['selected-all','typed-Z','delete','backspace']);
   assert.ok(row.samples.every(s=>s.readonly===false&&s.disabled===false));
   const pass=JSON.stringify(row.samples.map(s=>s.value))===JSON.stringify(['team@example.com','Z','Z','']);
   assert.equal(row.contractPass,pass);if(row.mode==='reference')assert.equal(pass,true);else replacementFailingPairs+=Number(!pass);
   if(kind==='email')for(const sample of row.samples){assert.equal(sample.selectionStart,null);assert.equal(sample.selectionEnd,null);}
  }
 }assert.equal(report.replacementFailingPairs,replacementFailingPairs);return{pairs:4,replacementFailingPairs,currentRenderingAccepted:false};
}
