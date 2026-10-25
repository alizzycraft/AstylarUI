import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';

// Missing boundary: initiating DOM focus(),not the configured pointer click or
// focus restoration inside popup reconciliation. Reuse the direct-owner probe.
const baseFile='scripts/audit-material-configured-control-focus.mjs';
const base=readFileSync(baseFile),hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(hash(base),'dc9305e44f29548ac6b7fbc890d0029467cf01015ba5828eef5b8e22ad491dc3');
const script='scripts/audit-material-timepicker-programmatic-focus.mjs';
const action=`await page.evaluate(mode=>{const target=document.querySelector(mode==='reference'?'#timepicker-control':'[data-astylar-id="timepicker-control"]');if(!target)throw Error('Missing timepicker input');target.focus();},mode);`;
let source=base.toString();
function replace(a,b){assert.equal(source.split(a).length,2,`Ambiguous probe boundary: ${a}`);source=source.replace(a,b);}
replace("const script = 'scripts/audit-material-configured-control-focus.mjs';",`const script = '${script}';`);
replace("const families = ['chips', 'slide-toggle', 'button', 'menu', 'expansion', 'snack-bar', 'tooltip'];","const families = ['timepicker'];");
replace('assert.equal(cases.length, 56);','assert.equal(cases.length, 8);');
replace('await actions.performInteraction(page, mode, c);',action);
replace('methodsSha256: hash(methods.join(\'\\n\'))','methodsSha256: hash(methods.join(\'\\n\')), executedAction: '+JSON.stringify({kind:'supplementary-dom-programmatic-focus',source:action,sha256:hash(action),baseFile,baseSha256:hash(base)}));
replace('return { boundary, host:',`return { boundary, action: 'supplementary-dom-programmatic-focus', popupCount: document.querySelectorAll(mode === 'reference' ? '.mat-timepicker-panel' : '[data-astylar-id="timepicker-options"]').length, host:`);
replace('56 exact configured focus contexts; direct active owners before/after action and settlement. Not equal-input,paint,current-package or whole-case acceptance.',
  'Eight supplementary Timepicker DOM-programmatic-focus contexts;not configured pointer actions,Tab or Datepicker. Direct raw owners and popup counts before/after focus and settlement. Retained served build,not equal inputs,paint,current-package or whole-case acceptance.');
replace('Current readable configured action; retained served build, not whole-library current rendering acceptance.',
  'Supplementary initiating DOM focus on both input mirrors;configured pointer action unchanged. Retained served build,not whole-library current rendering acceptance.');
const ast=ts.createSourceFile(baseFile,source,99,true,ts.ScriptKind.JS);assert.equal(ast.parseDiagnostics.length,0);
for(const node of ast.statements.filter(ts.isImportDeclaration).toReversed()){
  const name=node.moduleSpecifier.text;if(name.startsWith('node:'))continue;
  const url=name.startsWith('.')?pathToFileURL(path.resolve(path.dirname(baseFile),name)).href:import.meta.resolve(name);
  source=source.slice(0,node.moduleSpecifier.getStart(ast))+JSON.stringify(url)+source.slice(node.moduleSpecifier.end);
}
if(process.argv[2]==='--dry-run')console.log(JSON.stringify({script,baseFile,baseSha256:hash(base),action,actionSha256:hash(action),cases:8,profiles:4,viewports:2,notConfiguredAction:true,noDatepicker:true,sourceSha256:hash(source)}));
else await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
