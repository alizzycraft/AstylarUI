import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Retained144 timed samples lack raw events for these24 exact focus contexts.
// Reuse the frozen measured diagnostic; do not repeat the other104 contexts.
const file = 'scripts/audit-material-remaining-configured-focus.mjs';
const sha256 = 'd36736b8f325e74ca9fe364e9bee943266b6beba052e460d9b82ca590ea1bbf3';
const bytes = readFileSync(file);
assert.equal(createHash('sha256').update(bytes).digest('hex'), sha256);
let source = bytes.toString();
const replace = (before, after) => {
  assert.equal(source.split(before).length, 2, `Ambiguous text-input focus recipe: ${before}`);
  source = source.replace(before, after);
};
replace('scripts/audit-material-remaining-configured-focus.mjs', 'scripts/audit-material-text-input-focus-events.mjs');
replace("const families = ['core', 'toolbar', 'card', 'sort', 'paginator', 'tree', 'select', 'slider', 'button-toggle', 'tabs', 'stepper', 'bottom-sheet', 'dialog'];",
  "const families = ['form-field', 'input', 'autocomplete'];");
replace("'assert.equal(cases.length, 104);'", "'assert.equal(cases.length, 24);'");
replace('104 remaining exact configured programmatic focus contexts across13 families;', '24 exact configured text-input focus contexts across3 families;');
replace('const recipe = { eventProducer:', `const recipe = { measuredDiagnosticParent: { file: '${file}', sha256: '${sha256}' }, eventProducer:`);
const packages = Object.fromEntries(['typescript', 'playwright-core'].map(name => [name, import.meta.resolve(name)]));
const resolutionTree = ts.createSourceFile(file, source, 99, true, ts.ScriptKind.JS), calls = [];
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(resolutionTree) === 'import.meta.resolve') calls.push(node);
  ts.forEachChild(node, visit);
}
visit(resolutionTree);
assert.equal(calls.length, 2);
for (const node of calls.toReversed())
  source = source.slice(0, node.getStart(resolutionTree)) + `${JSON.stringify(packages)}[name]` + source.slice(node.end);
const ast = ts.createSourceFile(file, source, 99, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
for (const node of ast.statements.filter(ts.isImportDeclaration).toReversed()) {
  const name = node.moduleSpecifier.text;
  if (name.startsWith('node:')) continue;
  const url = name.startsWith('.') ? pathToFileURL(path.resolve(path.dirname(file), name)).href : import.meta.resolve(name);
  source = source.slice(0, node.moduleSpecifier.getStart(ast)) + JSON.stringify(url) + source.slice(node.moduleSpecifier.end);
}
await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
