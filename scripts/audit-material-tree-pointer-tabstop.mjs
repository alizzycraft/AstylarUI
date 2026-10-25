import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Reuse the direct-owner driver for one missing actual-DOM boundary,not all52 cases.
const baseFile='scripts/audit-material-configured-control-focus.mjs';
const script='scripts/audit-material-tree-pointer-tabstop.mjs';
const bytes=readFileSync(baseFile),hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(hash(bytes),'dc9305e44f29548ac6b7fbc890d0029467cf01015ba5828eef5b8e22ad491dc3');
let source=bytes.toString();
const replace=(before,after)=>{assert.equal(source.split(before).length,2,before);source=source.replace(before,after);};
replace(`const script = '${baseFile}';`,`const script = '${script}';`);
replace("const families = ['chips', 'slide-toggle', 'button', 'menu', 'expansion', 'snack-bar', 'tooltip'];","const families = ['tree'];");
replace("families.includes(c.family) && c.state === 'focus'","families.includes(c.family) && c.state === 'activate' && c.profile === 'light' && c.viewport.deviceScaleFactor === 1");
replace('assert.equal(cases.length, 56);','assert.equal(cases.length, 1);');
replace('&interaction=focus','&interaction=${c.state}');
replace("for (const type of ['focus', 'blur', 'focusin', 'focusout'])","for (const type of ['focus', 'blur', 'focusin', 'focusout', 'pointerdown', 'pointerup', 'click', 'keydown', 'keyup'])");
replace('event => events.push({ type, trusted: event.isTrusted, target:',"event => events.push({ type, trusted: event.isTrusted, key: event.key ?? null, target:");
replace('return { boundary, host: describe(host),',"return { boundary, tabStops:[...host.querySelectorAll('[role=treeitem]')].map(n=>({id:mode==='reference'?n.id:n.getAttribute('data-astylar-id'),attribute:n.getAttribute('tabindex'),tabIndex:n.tabIndex})), host: describe(host),");
replace("observations.push(await sample('settled'));",`observations.push(await sample('settled'));
            await page.keyboard.press('Tab');await actions.settleInteraction(page,mode);observations.push(await sample('tab-out'));
            await page.keyboard.press('Shift+Tab');await actions.settleInteraction(page,mode);observations.push(await sample('shift-tab-return'));`);
replace('assert.equal(evidence.observations.length, 3);','assert.equal(evidence.observations.length, 5);');
replace("['before', 'after-action', 'settled']","['before', 'after-action', 'settled', 'tab-out', 'shift-tab-return']");
replace('report.results.length * 3','report.results.length * 5');
replace('56 exact configured focus contexts; direct active owners before/after action and settlement.',
  'One tree/light/desktop-DPR1 configured pointer activation followed by real Tab and Shift+Tab. Raw native DOM owners and tabIndex attributes/properties;not held timing,all keys/contexts,paint or current-library acceptance.');
replace('actionSource, results, scope:','actionSource, sourceRecipe:recipe, results, scope:');
replace('assert.deepEqual(report.actionSource, actionSource);','assert.deepEqual(report.actionSource, actionSource);assert.deepEqual(report.sourceRecipe,recipe);');
const tree=ts.createSourceFile(baseFile,source,99,true,ts.ScriptKind.JS);assert.equal(tree.parseDiagnostics.length,0);
for(const node of tree.statements.filter(ts.isImportDeclaration).toReversed()){
  const name=node.moduleSpecifier.text;if(name.startsWith('node:'))continue;
  const url=name.startsWith('.')?pathToFileURL(path.resolve(path.dirname(baseFile),name)).href:import.meta.resolve(name);
  source=source.slice(0,node.moduleSpecifier.getStart(tree))+JSON.stringify(url)+source.slice(node.moduleSpecifier.end);
}
const recipe={base:{file:baseFile,sha256:hash(bytes)},adaptedRunnerSha256:hash(source),
  scope:'One original pointer action plus disclosed Tab/Shift+Tab supplement;no replacement focus(),style/state injection or core mutation.'};
if(process.argv[2]==='--dry-run')console.log(JSON.stringify({script,recipe,cases:1,browserStarted:false}));
else await import('data:text/javascript;base64,'+Buffer.from('const recipe='+JSON.stringify(recipe)+';\n'+source).toString('base64'));
