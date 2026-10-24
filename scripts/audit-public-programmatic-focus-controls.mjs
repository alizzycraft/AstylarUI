import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// One diagnostic matrix: distinguish negative tabindex from public focus sync.
const file = 'scripts/audit-public-menu-negative-tabindex.mjs', bytes = readFileSync(file);
assert.equal(createHash('sha256').update(bytes).digest('hex'), 'f8ab8c3b07db8886a4b940ef7252c91ded9f7862ceee51a7b0fd6e9153e339d5');
let source = bytes.toString();
const extra = [
  ["const script = 'scripts/audit-public-menu-negative-tabindex.mjs';", "const script = 'scripts/audit-public-programmatic-focus-controls.mjs';"],
  ["const kinds = ['div', 'span'];", "const kinds = ['div', 'span', 'button'];"],
  ["id:'focus-control',tabindex:-1,", "id:'focus-control',tabindex:Number(q.get('tabindex')),"],
  ['control.tabIndex=-1;', "control.tabIndex=Number(q.get('tabindex'));"],
  ['for (const dpr of [1, 2]) for (const controlKind of kinds) {', 'for (const dpr of [1, 2]) for (const controlKind of kinds) for (const tabIndex of [-1, 0]) {'],
  ['const row = { dpr, controlKind };', 'const row = { dpr, controlKind, tabIndex };'],
  ["+ '&kind=' + controlKind);", "+ '&kind=' + controlKind + '&tabindex=' + tabIndex);"],
  ['assert.deepEqual(report.results.map(r => `${r.dpr}/${r.controlKind}`), [1, 2].flatMap(d => kinds.map(k => `${d}/${k}`)));',
    'assert.deepEqual(report.results.map(r => `${r.dpr}/${r.controlKind}/${r.tabIndex}`), [1, 2].flatMap(d => kinds.flatMap(k => [-1,0].map(t => `${d}/${k}/${t}`))));'],
  ['return { pairs: 4,', 'return { pairs: 12,'],
];
const marker = 'const ast = ts.createSourceFile(base, source, 99, true, ts.ScriptKind.JS);';
assert.equal(source.split(marker).length, 2);
source = source.replace(marker, extra.map(([a, b]) => `replace(${JSON.stringify(a)}, ${JSON.stringify(b)});`).join('\n') + '\n' + marker);
source = source.replace(': import.meta.resolve(name);', `: ${JSON.stringify(Object.fromEntries(['typescript', 'playwright-core'].map(name => [name, import.meta.resolve(name)])))}[name];`);
const ast = ts.createSourceFile(file, source, 99, true, ts.ScriptKind.JS); assert.equal(ast.parseDiagnostics.length, 0);
for (const node of ast.statements.filter(ts.isImportDeclaration).toReversed()) {
  const name = node.moduleSpecifier.text; if (name.startsWith('node:')) continue;
  const url = name.startsWith('.') ? pathToFileURL(path.resolve(path.dirname(file), name)).href : import.meta.resolve(name);
  source = source.slice(0, node.moduleSpecifier.getStart(ast)) + JSON.stringify(url) + source.slice(node.moduleSpecifier.end);
}
await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
