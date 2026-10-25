import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Fill the exact held-owner gap,not another configured focus-action capture.
// Keep the existing driver,real action,settlement and checkpoint validation.
const baseFile='scripts/audit-material-configured-control-focus.mjs';
const script='scripts/audit-material-text-control-held-focus.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=readFileSync(baseFile);
assert.equal(hash(bytes),'dc9305e44f29548ac6b7fbc890d0029467cf01015ba5828eef5b8e22ad491dc3');
let source=bytes.toString();
const replace=(before,after)=>{assert.equal(source.split(before).length,2,`Ambiguous held-owner recipe: ${before}`);source=source.replace(before,after);};
replace(`const script = '${baseFile}';`,`const script = '${script}';`);
replace("const families = ['chips', 'slide-toggle', 'button', 'menu', 'expansion', 'snack-bar', 'tooltip'];","const families = ['input', 'form-field'];");
replace("families.includes(c.family) && c.state === 'focus'","families.includes(c.family) && c.state === 'held'");
replace('assert.equal(cases.length, 56);','assert.equal(cases.length, 16);');
replace('&interaction=focus','&interaction=${c.state}');
replace('await actions.performInteraction(page, mode, c); observations.push(await sample(\'after-action\'));',
  "const release=await actions.performInteraction(page, mode, c); assert.equal(typeof release,'function'); observations.push(await sample('after-action'));");
replace("{ type: 'showcase:benchmark', phase: 'settled' }","{ type: 'showcase:benchmark', phase: 'held' }");
replace("for (const type of ['focus', 'blur', 'focusin', 'focusout'])","for (const type of ['focus', 'blur', 'focusin', 'focusout', 'pointerdown', 'pointerup', 'pointercancel'])");
replace('event => events.push({ type, trusted: event.isTrusted, target:', 'event => events.push({ type, trusted: event.isTrusted, buttons: event.buttons ?? null, target:');
replace('const tree = mode === \'reference\' ?',
  "// The three raw-owner observations precede measurement and explicit release.\n            await release();\n            const tree = mode === 'reference' ?");
replace('56 exact configured focus contexts; direct active owners before/after action and settlement.',
  '16 exact input/form-field held contexts; direct active owners before pointerdown,after pointerdown and after held settlement. Tree/screenshot are AFTER explicit release,not held paint. Not original-browser replay or current-package rendering acceptance.');
replace('actionSource, results, scope:', 'actionSource, sourceRecipe: recipe, results, scope:');
replace('assert.deepEqual(report.actionSource, actionSource);', 'assert.deepEqual(report.actionSource, actionSource); assert.deepEqual(report.sourceRecipe,recipe);');
replace("assert.equal(evidence.observations.length, 3);", `assert.equal(evidence.observations.length, 3);
    for(const sample of evidence.observations.slice(1)){
      const down=sample.events.filter(e=>e.type==='pointerdown');
      assert.equal(down.length,1);assert.equal(down[0].trusted,true);assert.equal(down[0].buttons,1);
      assert.equal(sample.events.filter(e=>['pointerup','pointercancel'].includes(e.type)).length,0);
    }`);
const ast=ts.createSourceFile(baseFile,source,99,true,ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length,0);
for(const node of ast.statements.filter(ts.isImportDeclaration).toReversed()){
  const name=node.moduleSpecifier.text;if(name.startsWith('node:'))continue;
  const url=name.startsWith('.')?pathToFileURL(path.resolve(path.dirname(baseFile),name)).href:import.meta.resolve(name);
  source=source.slice(0,node.moduleSpecifier.getStart(ast))+JSON.stringify(url)+source.slice(node.moduleSpecifier.end);
}
const recipe={base:{file:baseFile,sha256:hash(bytes)},adaptedRunnerSha256:hash(source),
  observationBoundary:'Raw owner samples before release;tree and screenshot after release. No held paint or current-rendering acceptance.'};
if(process.argv[2]==='--dry-run'){
  console.log(JSON.stringify({script,recipe,configuredCases:16,browserStarted:false}));
}else{
  await import('data:text/javascript;base64,'+Buffer.from('const recipe='+JSON.stringify(recipe)+';\n'+source).toString('base64'));
}
