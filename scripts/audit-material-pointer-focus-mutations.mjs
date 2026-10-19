import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Close the missing first-mutation witness for the retained113 pointer actions.
// Reuse the measured focus driver and observer without changing action timing.
const file = 'scripts/audit-material-remaining-configured-focus.mjs';
const bytes = readFileSync(file);
const hash = b => createHash('sha256').update(b).digest('hex');
assert.equal(hash(bytes), 'd36736b8f325e74ca9fe364e9bee943266b6beba052e460d9b82ca590ea1bbf3');
let source = bytes.toString();
const replace = (before, after) => {
  assert.equal(source.split(before).length, 2, `Ambiguous pointer mutation recipe: ${before}`);
  source = source.replace(before, after);
};
replace('scripts/audit-material-remaining-configured-focus.mjs', 'scripts/audit-material-pointer-focus-mutations.mjs');
replace("const families = ['core', 'toolbar', 'card', 'sort', 'paginator', 'tree', 'select', 'slider', 'button-toggle', 'tabs', 'stepper', 'bottom-sheet', 'dialog'];",
  "const families = ['chips', 'slide-toggle', 'button', 'menu', 'expansion', 'snack-bar', 'tooltip'];");
replace("'assert.equal(cases.length, 104);'", "'assert.equal(cases.length, 113);'");
replace('104 remaining exact configured programmatic focus contexts across13 families; not supplementary keyboard actions.',
  '113 exact configured activate/activate-leave pointer actions across7 families. First focused mutation witnesses; no action replacement,paint or current-package acceptance.');
replace('const recipe = { eventProducer:', `const recipe = { pointerAdapter: { file: ${JSON.stringify(file)}, sha256: ${JSON.stringify(hash(bytes))} }, eventProducer:`);
// These edits are applied to the nested event producer, which in turn applies
// the guarded edits to its unchanged configured-action base.
const baseAdaptation = [
  ["families.includes(c.family) && c.state === 'focus'", "families.includes(c.family) && ['activate', 'activate-leave'].includes(c.state)"],
  ['&interaction=focus', '&interaction=${c.state}'],
  ['${c.family}-${c.profile}-${c.viewport.id}-${mode}', '${c.family}-${c.profile}-${c.viewport.id}-${c.state}-${hash(materialCaseKey(\'interaction\', c)).slice(0,12)}-${mode}'],
].map(([before, after]) => `replace(${JSON.stringify(before)}, ${JSON.stringify(after)});`).join('\n');
const eventAdaptation = [
  `replace(${JSON.stringify("row.family === 'timepicker' ? 1 : 0")}, '1');`,
  `replace('const ast = ts.createSourceFile(baseFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);', ${JSON.stringify(baseAdaptation + '\nconst ast = ts.createSourceFile(baseFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);')});`,
].join('\n');
replace('const measurementAdaptation = [', eventAdaptation + '\nconst measurementAdaptation = [');
const ast = ts.createSourceFile(file, source, 99, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
for (const node of ast.statements.filter(ts.isImportDeclaration).toReversed()) {
  const name = node.moduleSpecifier.text;
  if (name.startsWith('node:')) continue;
  const url = name.startsWith('.') ? pathToFileURL(path.resolve(path.dirname(file), name)).href : import.meta.resolve(name);
  source = source.slice(0, node.moduleSpecifier.getStart(ast)) + JSON.stringify(url) + source.slice(node.moduleSpecifier.end);
}
// Only actual resolver calls are rewritten: literal replacement guards must
// remain intact in this nested data-URL adapter.
const adapted = ts.createSourceFile(file, source, 99, true, ts.ScriptKind.JS), calls = [];
const visit = node => {
  if (ts.isCallExpression(node) && node.expression.getText(adapted) === 'import.meta.resolve') calls.push(node);
  ts.forEachChild(node, visit);
};
visit(adapted);
assert.equal(calls.length, 2);
const urls = Object.fromEntries(['typescript', 'playwright-core'].map(name => [name, import.meta.resolve(name)]));
for (const node of calls.toReversed()) source = source.slice(0, node.getStart(adapted)) + JSON.stringify(urls) + '[name]' + source.slice(node.end);
await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
