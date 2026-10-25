import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';

// Observe native writes/calls in the existing equal-input pair; do not replace their behavior.
const file='scripts/audit-public-tree-fixed-tabstop.mjs',bytes=readFileSync(file);
assert.equal(createHash('sha256').update(bytes).digest('hex'),'46c20ea36a443a8ea6eb86ce17c368be49326c7852cc39aa918011f4f690c2e3');
let source=bytes.toString();
const replace=(before,after)=>{assert.equal(source.split(before).length,2,before);source=source.replace(before,after);};
replace("script='scripts/audit-public-tree-fixed-tabstop.mjs'","script='scripts/audit-public-tree-tab-exit-trace.mjs'");
replace('let app,surface;',`const operations=[],describe=n=>n?.dataset?.astylarId||n?.id||n?.tagName;
const focusOriginal=HTMLElement.prototype.focus,tabIndexOriginal=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'tabIndex');
HTMLElement.prototype.focus=function(...args){const before=describe(document.activeElement),stack=new Error().stack,result=focusOriginal.apply(this,args);operations.push({operation:'focus',owner:describe(this),before,after:describe(document.activeElement),stack});return result;};
Object.defineProperty(HTMLElement.prototype,'tabIndex',{...tabIndexOriginal,set(value){const before=tabIndexOriginal.get.call(this),stack=new Error().stack;tabIndexOriginal.set.call(this,value);if(this.tagName==='CANVAS')operations.push({operation:'canvas-tabindex',before,value,after:tabIndexOriginal.get.call(this),stack});}});
let app,surface;`);
replace('return{boundary,active:',"return{boundary,canvasTabIndex:mode==='astylar'?host.tabIndex:null,operations:structuredClone(operations),active:");
replace('dispose(){surface?.dispose();app?.destroy();}',"dispose(){surface?.dispose();app?.destroy();HTMLElement.prototype.focus=focusOriginal;Object.defineProperty(HTMLElement.prototype,'tabIndex',tabIndexOriginal);}");
const ast=ts.createSourceFile(file,source,99,true,ts.ScriptKind.JS);assert.equal(ast.parseDiagnostics.length,0);
for(const n of ast.statements.filter(ts.isImportDeclaration).toReversed()){
 const name=n.moduleSpecifier.text;if(name.startsWith('node:'))continue;
 const url=name.startsWith('.')?pathToFileURL(path.resolve(path.dirname(file),name)).href:import.meta.resolve(name);
 source=source.slice(0,n.moduleSpecifier.getStart(ast))+JSON.stringify(url)+source.slice(n.moduleSpecifier.end);
}
// The parent adapter resolves its external imports from its own original path.
await import('data:text/javascript;base64,'+Buffer.from(source.replace(':import.meta.resolve(name);',':'+JSON.stringify(Object.fromEntries(['typescript','playwright-core'].map(n=>[n,import.meta.resolve(n)])))+'[name];')).toString('base64'));
