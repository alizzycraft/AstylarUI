import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Bounded cohort expansion of the immutable one-context collector.
const file = 'scripts/audit-material-menu-ax.mjs', bytes = readFileSync(file);
assert.equal(createHash('sha256').update(bytes).digest('hex'), '6a11d25070c355a124b4ba5bb0d4256ba504d68772777777bdf92e0a0d9a0c76');
let source = bytes.toString();
source = source.replace(': import.meta.resolve(name);', `: ${JSON.stringify(Object.fromEntries(['typescript', 'playwright-core'].map(name => [name, import.meta.resolve(name)])))}[name];`);
const marker = 'const ast = ts.createSourceFile(base, source, 99, true, ts.ScriptKind.JS);';
assert.equal(source.split(marker).length, 2);
const adaptations = [
  ["const script = 'scripts/audit-material-menu-ax.mjs';", "const script = 'scripts/audit-material-menu-ax-contexts.mjs';"],
  ["c.family === 'menu' && c.profile === 'light' &&\n  c.viewport.id === 'desktop-dpr1' && c.state === 'open'", "c.family === 'menu' && ['desktop-dpr1', 'desktop-dpr2'].includes(c.viewport.id) && c.state === 'open'"],
  ['assert.equal(cases.length, 1);', 'assert.equal(cases.length, 8);'],
  ['return { cases: 1, targetObservations: 8,', 'return { cases: 8, targetObservations: 64,'],
  ["colorScheme: 'light', reducedMotion:", "colorScheme: c.profile === 'dark' ? 'dark' : 'light', reducedMotion:"],
  ['`${evidence.directory}/${side}-input-tree.json`', '`${evidence.directory}/${c.profile}-${c.viewport.id}-${side}-input-tree.json`'],
  ['One retained-build light desktop open endpoint;', 'Eight retained-build desktop theme/DPR open endpoints;'],
];
source = source.replace(marker, adaptations.map(([before, after]) => `replace(${JSON.stringify(before)}, ${JSON.stringify(after)});`).join('\n') + '\n' + marker);
const ast = ts.createSourceFile(file, source, 99, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
for (const node of ast.statements.filter(ts.isImportDeclaration).toReversed()) {
  const name = node.moduleSpecifier.text;
  if (name.startsWith('node:')) continue;
  const url = name.startsWith('.') ? pathToFileURL(path.resolve(path.dirname(file), name)).href : import.meta.resolve(name);
  source = source.slice(0, node.moduleSpecifier.getStart(ast)) + JSON.stringify(url) + source.slice(node.moduleSpecifier.end);
}
await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
