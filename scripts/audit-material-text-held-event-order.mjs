import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// One decisive temporal trace;the complete16-case capture remains immutable.
const parent='scripts/audit-material-text-control-held-focus.mjs';
const bytes=readFileSync(parent),hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(hash(bytes),'f188e4d0026d50fbc459eb452dbd2749a1a91a02281a10665af1319610309dbf');
let source=bytes.toString();
const replace=(before,after)=>{assert.equal(source.split(before).length,2,before);source=source.replace(before,after);};
replace("const script='scripts/audit-material-text-control-held-focus.mjs';","const script='scripts/audit-material-text-held-event-order.mjs';");
replace("const families = ['input', 'form-field'];","const families = ['input'];");
replace("families.includes(c.family) && c.state === 'held'","families.includes(c.family) && c.state === 'held' && c.profile === 'light' && c.viewport.deviceScaleFactor === 1");
replace('assert.equal(cases.length, 16);','assert.equal(cases.length, 1);');
replace('configuredCases:16','configuredCases:1');
replace('16 exact input/form-field held contexts','One exact input/light/desktop-DPR1 held context');
const additional=`
replace('const tokens = new WeakMap();',
  "const focusCalls=[];const originalFocus=HTMLElement.prototype.focus;HTMLElement.prototype.focus=function(...args){focusCalls.push({tag:this.tagName,id:this.id,logicalId:this.getAttribute('data-astylar-id'),stack:new Error().stack});return Reflect.apply(originalFocus,this,args);};const tokens = new WeakMap();");
replace('return { boundary, host: describe(host),',
  "return { boundary, focusCalls:structuredClone(focusCalls), publicEvents:mode==='astylar'?window.__ASTYLAR_MATERIAL_BENCHMARK__.events():[], interaction:mode==='astylar'?window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface.diagnostics.interaction:null, host: describe(host),");
`;
replace("const ast=ts.createSourceFile(baseFile,source,99,true,ts.ScriptKind.JS);",additional+"\nconst ast=ts.createSourceFile(baseFile,source,99,true,ts.ScriptKind.JS);");
// Resolve the adapter's own imports and its actual dynamic package resolver.
const tree=ts.createSourceFile(parent,source,99,true,ts.ScriptKind.JS);
const edits=[];
for(const node of tree.statements.filter(ts.isImportDeclaration)){
  const name=node.moduleSpecifier.text;if(name.startsWith('node:'))continue;
  edits.push({start:node.moduleSpecifier.getStart(tree),end:node.moduleSpecifier.end,
    text:JSON.stringify(name.startsWith('.')?pathToFileURL(path.resolve(path.dirname(parent),name)).href:import.meta.resolve(name))});
}
const visit=node=>{
  if(ts.isCallExpression(node)&&node.expression.getText(tree)==='import.meta.resolve')edits.push({start:node.getStart(tree),end:node.end,
    text:JSON.stringify(Object.fromEntries(['typescript','playwright-core'].map(name=>[name,import.meta.resolve(name)])))+'[name]'});
  ts.forEachChild(node,visit);
};visit(tree);
assert.equal(edits.length,2);
for(const edit of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,edit.start)+edit.text+source.slice(edit.end);
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
