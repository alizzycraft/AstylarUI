import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

assert.equal(process.argv[2],'--verify');
const file='scripts/audit-material-datepicker-key-payload.mjs',bytes=readFileSync(file);
assert.equal(createHash('sha256').update(bytes).digest('hex'),'8137014e4c289e71842c331c1bea6775e7bc986c9a280e7d31c99bfd6197a81d');
let source=bytes.toString();
const before='assert.equal(payloads.length,2);const arrow=payloads.find(e=>e.key===\'ArrowDown\');';
assert.equal(source.split(before).length,2);
source=source.replace(before,`assert.deepEqual(payloads.map(p=>[p.id,p.key]),['Alt','ArrowDown'].flatMap(key=>['datepicker-control','datepicker-input-region','datepicker-primary','datepicker-root','page'].map(id=>[id,key])));
      for(const p of payloads){assert.equal(p.targetId,'datepicker-control');assert.equal(p.type,'keydown');assert.equal(p.altKey,true);assert.equal(p.ctrlKey,false);assert.equal(p.shiftKey,false);assert.equal(p.metaKey,false);assert.equal(p.code,p.key==='Alt'?'AltLeft':'ArrowDown');}
      const arrow=payloads.find(e=>e.key==='ArrowDown');`);
let ast=ts.createSourceFile(file,source,99,true,ts.ScriptKind.JS),calls=[];
const visit=n=>{if(ts.isCallExpression(n)&&n.expression.getText(ast)==='import.meta.resolve')calls.push(n);ts.forEachChild(n,visit);};visit(ast);assert.equal(calls.length,1);
const urls=Object.fromEntries(['typescript','playwright-core'].map(name=>[name,import.meta.resolve(name)]));
for(const n of calls.toReversed())source=source.slice(0,n.getStart(ast))+JSON.stringify(urls)+'[name]'+source.slice(n.end);
ast=ts.createSourceFile(file,source,99,true,ts.ScriptKind.JS);assert.equal(ast.parseDiagnostics.length,0);
for(const n of ast.statements.filter(ts.isImportDeclaration).toReversed()){
  const name=n.moduleSpecifier.text;if(name.startsWith('node:'))continue;
  const url=name.startsWith('.')?pathToFileURL(path.resolve(path.dirname(file),name)).href:import.meta.resolve(name);
  source=source.slice(0,n.moduleSpecifier.getStart(ast))+JSON.stringify(url)+source.slice(n.moduleSpecifier.end);
}
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
