import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Diagnostic equal-input variant of the existing package-root focus probe.
// Never substitute this input into the canonical Material showcase.
const base = 'scripts/audit-public-role-focus-refresh.mjs', bytes = readFileSync(base);
assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b0ffd7893972731130156efec261b44fb9e322b7b9f031891cdbdb18f2525ba6');
let source = bytes.toString();
const replace = (before, after) => { assert.equal(source.split(before).length, 2, before); source = source.replace(before, after); };
replace("const script = 'scripts/audit-public-role-focus-refresh.mjs';", "const script = 'scripts/audit-public-menu-negative-tabindex.mjs';");
replace("const kinds = ['div', 'span', 'input', 'button'];", "const kinds = ['div', 'span'];");
replace("id:'focus-control',tabindex:0,", "id:'focus-control',tabindex:-1,");
replace("role:kind==='input'?'textbox':'button'", "role:kind==='input'?'textbox':'menu'");
replace("control.tabIndex=0;control.setAttribute('role',kind==='input'?'textbox':'button');", "control.tabIndex=-1;control.setAttribute('role',kind==='input'?'textbox':'menu');");
replace(" control.focus();const initiallyFocused=", " const publicFocusResult=surface?surface.focus('focus-control',{scrollIntoView:false}):(control.focus(),true);const initiallyFocused=");
replace('updates.push({index,initiallyFocused,', 'updates.push({index,publicFocusResult,initiallyFocused,');
replace('assert.equal(sample.initiallyFocused, true);', 'assert.equal(sample.publicFocusResult, true); assert.equal(sample.initiallyFocused, true);');
replace('return { pairs: 8,', 'return { pairs: 4,');
replace('children[0].children[0].tabindex = -1,', 'children[0].children[0].tabindex = 0,');
const ast = ts.createSourceFile(base, source, 99, true, ts.ScriptKind.JS); assert.equal(ast.parseDiagnostics.length, 0);
for (const node of ast.statements.filter(ts.isImportDeclaration).toReversed()) {
  const name = node.moduleSpecifier.text; if (name.startsWith('node:')) continue;
  const url = name.startsWith('.') ? pathToFileURL(path.resolve(path.dirname(base), name)).href : import.meta.resolve(name);
  source = source.slice(0, node.moduleSpecifier.getStart(ast)) + JSON.stringify(url) + source.slice(node.moduleSpecifier.end);
}
await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
