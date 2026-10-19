import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// The original datepicker keyboard cohort stops at Tab. Reuse the actual-focus
// event/mutation capture,adding just the reference's Alt+ArrowDown shortcut.
const file='scripts/audit-material-radio-space.mjs',bytes=readFileSync(file);
const sha256='f461cf5b633687c0bd4aa2f7527ff97425a1aa555a933f163194154442d4a21f';
assert.equal(createHash('sha256').update(bytes).digest('hex'),sha256);
let source=bytes.toString();
const replace=(before,after)=>{assert.equal(source.split(before).length,2,`Ambiguous date shortcut adapter: ${before}`);source=source.replace(before,after);};
replace('scripts/audit-material-radio-space.mjs','scripts/audit-material-datepicker-alt-arrowdown.mjs');
replace("const families = ['radio'];","const families = ['datepicker'];");
replace('8 exact configured radio contexts; original focus then supplemental real Space on unchecked solo. Not original focus-only output.',
  '8 exact configured datepicker contexts; original focus then supplemental Alt+ArrowDown. Not pointer opening or original focus-only output.');
replace("type === 'click' && side === 'reference' ? 1 : 0",'0');
replace("await page.keyboard.press('Space')","await page.keyboard.press('Alt+ArrowDown')");
replace("sample('after-space')","sample('after-alt-arrowdown')");
replace("'after-space', 'settled'","'after-alt-arrowdown', 'settled'");
replace('configured-focus-then-enabled-unchecked-Space','configured-focus-then-Alt-ArrowDown');
replace('code: event.code ?? null, trusted: event.isTrusted,',
  'code: event.code ?? null, altKey: event.altKey ?? null, ctrlKey: event.ctrlKey ?? null, shiftKey: event.shiftKey ?? null, metaKey: event.metaKey ?? null, trusted: event.isTrusted,');
replace('radioControls: [...document.querySelectorAll',
  'candidateCalendarContents: document.querySelectorAll(\'[data-astylar-id="datepicker-popup"]\').length, radioControls: [...document.querySelectorAll');
replace('const recipe = { measuredDiagnosticParent:', `const recipe = { shortcutAdapterParent: { file: '${file}', sha256: '${sha256}' }, measuredDiagnosticParent:`);
const ast=ts.createSourceFile(file,source,99,true,ts.ScriptKind.JS);assert.equal(ast.parseDiagnostics.length,0);
for(const node of ast.statements.filter(ts.isImportDeclaration).toReversed()){
  const name=node.moduleSpecifier.text;if(name.startsWith('node:'))continue;
  const url=name.startsWith('.')?pathToFileURL(path.resolve(path.dirname(file),name)).href:import.meta.resolve(name);
  source=source.slice(0,node.moduleSpecifier.getStart(ast))+JSON.stringify(url)+source.slice(node.moduleSpecifier.end);
}
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
