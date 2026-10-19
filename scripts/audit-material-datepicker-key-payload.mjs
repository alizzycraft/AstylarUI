import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Prior typed-event recorder drops keys/modifiers. Observe the actual argument
// at the application callback,without changing its receiver,args or return.
const file='scripts/audit-material-configured-control-focus.mjs',bytes=readFileSync(file);
assert.equal(createHash('sha256').update(bytes).digest('hex'),'dc9305e44f29548ac6b7fbc890d0029467cf01015ba5828eef5b8e22ad491dc3');
let source=bytes.toString();const replace=(a,b)=>{assert.equal(source.split(a).length,2,`Ambiguous payload recipe: ${a}`);source=source.replace(a,b);};
replace("const script = 'scripts/audit-material-configured-control-focus.mjs';","const script = 'scripts/audit-material-datepicker-key-payload.mjs';");
replace("const families = ['chips', 'slide-toggle', 'button', 'menu', 'expansion', 'snack-bar', 'tooltip'];","const families = ['datepicker'];");
replace('assert.equal(cases.length, 56);','assert.equal(cases.length, 8);');
replace("const root = path.resolve('examples/material-showcase/dist/material-showcase/browser');","const root = path.resolve('artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser');");
replace("'sendShowcaseCommand', 'waitForThemeApplied'];","'sendShowcaseCommand', 'waitForThemeApplied', 'measureAstylarInputs'];");
replace('sendShowcaseCommand,waitForThemeApplied};','sendShowcaseCommand,waitForThemeApplied,measureAstylarInputs};');
replace("await actions.performInteraction(page, mode, c); observations.push(await sample('after-action'));",
  "await actions.performInteraction(page, mode, c); observations.push(await sample('after-focus')); await page.keyboard.press('Alt+ArrowDown'); observations.push(await sample('after-shortcut'));");
replace('assert.equal(evidence.observations.length, 3);','assert.equal(evidence.observations.length, 4);');
replace("['before', 'after-action', 'settled']","['before', 'after-focus', 'after-shortcut', 'settled']");
replace('report.results.length * 3','report.results.length * 4');
replace('await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree)','(await actions.measureAstylarInputs(page, [])).inputTree');
replace("const treeBytes = Buffer.from(JSON.stringify(tree)), png = await page.screenshot({ animations: 'disabled' });",'const treeBytes = Buffer.from(JSON.stringify(tree));');
replace(" writeFileSync(stem + '.png', png, { flag: 'wx' });",'');
replace("screenshot: { file: stem + '.png', sha256: hash(png) }, runtime:",'runtime:');
replace('assert.equal(hash(readFileSync(evidence.screenshot.file)), evidence.screenshot.sha256);',
  `assert.equal(hash(readFileSync(evidence.inputTree.file)), evidence.inputTree.sha256);
    const events=evidence.observations.at(-1).events;
    const keys=events.filter(e=>e.type==='keydown'&&e.key==='ArrowDown');assert.equal(keys.length,1);assert.equal(keys[0].altKey,true);assert.equal(keys[0].trusted,true);
    const payloads=evidence.observations.at(-1).applicationKeyPayloads;
    if(side==='astylar') {assert.equal(payloads.length,2);const arrow=payloads.find(e=>e.key==='ArrowDown');assert.ok(arrow);assert.equal(arrow.altKey,true);assert.equal(arrow.id,'datepicker-control');}
    else assert.deepEqual(payloads,[]);`);
replace('56 exact configured focus contexts; direct active owners before/after action and settlement.',
  '8 exact datepicker focus-plus-shortcut contexts; direct application callback payload witness. Instrumentation can affect timing;not whole rendering or AT acceptance.');
let ast=ts.createSourceFile(file,source,99,true,ts.ScriptKind.JS);
const old=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='installObserver');assert.equal(old.length,1);
replace(old[0].getText(ast),installObserver.toString());
ast=ts.createSourceFile(file,source,99,true,ts.ScriptKind.JS);assert.equal(ast.parseDiagnostics.length,0);
for(const n of ast.statements.filter(ts.isImportDeclaration).toReversed()){
  const name=n.moduleSpecifier.text;if(name.startsWith('node:'))continue;
  const url=name.startsWith('.')?pathToFileURL(path.resolve(path.dirname(file),name)).href:import.meta.resolve(name);
  source=source.slice(0,n.moduleSpecifier.getStart(ast))+JSON.stringify(url)+source.slice(n.moduleSpecifier.end);
}
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

function installObserver(){
  const tokens=new WeakMap();let sequence=0,installed=false;const events=[],applicationKeyPayloads=[];
  const describe=n=>{if(!(n instanceof Element))return null;if(!tokens.has(n))tokens.set(n,++sequence);
    return{token:tokens.get(n),tag:n.tagName,id:n.id||null,logicalId:n.getAttribute('data-astylar-id')||n.id||null};};
  for(const type of ['keydown','keyup','focus','focusin','blur','focusout'])document.addEventListener(type,e=>events.push({type,key:e.key??null,code:e.code??null,
    altKey:e.altKey??null,ctrlKey:e.ctrlKey??null,shiftKey:e.shiftKey??null,metaKey:e.metaKey??null,trusted:e.isTrusted,target:describe(e.target)}),true);
  window.__configuredControlFocusObserve=(mode,family,boundary)=>{
    if(mode==='astylar'&&!installed){
      const component=window.ng.getComponent(document.querySelector('app-astylar-showcase')),original=component.handleKeydown;
      if(typeof original!=='function')throw Error('Missing actual application key callback');
      component.handleKeydown=function(...args){const [id,event]=args;
        applicationKeyPayloads.push({id,type:event.type,key:event.key,code:event.code,altKey:event.altKey,ctrlKey:event.ctrlKey,shiftKey:event.shiftKey,metaKey:event.metaKey,targetId:event.targetId});
        return Reflect.apply(original,this,args);};installed=true;
    }
    const host=mode==='reference'?document.getElementById(family+'-primary'):document.querySelector(`[data-astylar-id="${family}-primary"]`);
    const selector='button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]';
    const target=host?.matches(selector)?host:host?.querySelector(selector);if(!host||!target)throw Error('Missing focus owner');
    const active=document.activeElement,activeAncestry=[];for(let n=active;n instanceof Element;n=n.parentElement)activeAncestry.push(describe(n));
    return{boundary,host:describe(host),target:describe(target),active:describe(active),activeEqualsTarget:active===target,activeWithinHost:host.contains(active),activeAncestry,
      events:structuredClone(events),applicationKeyPayloads:structuredClone(applicationKeyPayloads),nativeCalendarContents:document.querySelectorAll('mat-datepicker-content').length,
      candidateCalendarContents:document.querySelectorAll('[data-astylar-id="datepicker-popup"]').length};
  };
}
