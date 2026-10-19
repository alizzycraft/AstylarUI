import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Missing enabled,unchecked Space activation,not repeated Arrow/disabled tests.
const file = 'scripts/audit-material-remaining-configured-focus.mjs';
const sha256 = 'd36736b8f325e74ca9fe364e9bee943266b6beba052e460d9b82ca590ea1bbf3';
const bytes = readFileSync(file);
assert.equal(createHash('sha256').update(bytes).digest('hex'), sha256);
let source = bytes.toString();
const replace = (before, after) => {
  assert.equal(source.split(before).length, 2, `Ambiguous radio Space recipe: ${before}`);
  source = source.replace(before, after);
};
replace('scripts/audit-material-remaining-configured-focus.mjs', 'scripts/audit-material-radio-space.mjs');
replace("const families = ['core', 'toolbar', 'card', 'sort', 'paginator', 'tree', 'select', 'slider', 'button-toggle', 'tabs', 'stepper', 'bottom-sheet', 'dialog'];", "const families = ['radio'];");
replace("'assert.equal(cases.length, 104);'", "'assert.equal(cases.length, 8);'");
replace('104 remaining exact configured programmatic focus contexts across13 families; not supplementary keyboard actions.',
  '8 exact configured radio contexts; original focus then supplemental real Space on unchecked solo. Not original focus-only output.');
replace('const recipe = { eventProducer:', `const recipe = { measuredDiagnosticParent: { file: '${file}', sha256: '${sha256}' }, eventProducer:`);
const eventChanges = [
  ["['pointerdown', 'mousedown', 'focus', 'focusin', 'pointerup', 'mouseup', 'click', 'input', 'change', 'blur', 'focusout']",
    "['keydown', 'keypress', 'keyup', 'pointerdown', 'mousedown', 'focus', 'focusin', 'pointerup', 'mouseup', 'click', 'input', 'change', 'blur', 'focusout']"],
  ['sequence: ++sequence, type, trusted: event.isTrusted,', 'sequence: ++sequence, type, key: event.key ?? null, code: event.code ?? null, trusted: event.isTrusted,'],
  ["row.family === 'timepicker' ? 1 : 0", "type === 'click' && side === 'reference' ? 1 : 0"],
  ['nativeCalendarContents: document.querySelectorAll(\'mat-datepicker-content\').length',
    `nativeCalendarContents: document.querySelectorAll('mat-datepicker-content').length,
      radioControls: [...document.querySelectorAll(mode === 'reference' ? 'input[type="radio"]' : '[role="radio"]')].map(node => ({
        ...describe(node), checked: typeof node.checked === 'boolean' ? node.checked : node.getAttribute('aria-checked') === 'true',
        ariaChecked: node.getAttribute('aria-checked'), inputType: node.getAttribute('type'),
        ariaDisabled: node.getAttribute('aria-disabled') }))`],
].map(([before, after]) => `replace(${JSON.stringify(before)},${JSON.stringify(after)});`).join('\n');
const extra = [
  ["await actions.performInteraction(page, mode, c); observations.push(await sample('after-action'));",
    "await actions.performInteraction(page, mode, c); observations.push(await sample('after-focus')); await page.keyboard.press('Space'); observations.push(await sample('after-space'));"],
  ['assert.equal(evidence.observations.length, 3);', 'assert.equal(evidence.observations.length, 4);'],
  ["['before', 'after-action', 'settled']", "['before', 'after-focus', 'after-space', 'settled']"],
  ['report.results.length * 3', 'report.results.length * 4'],
  ['const row = { family: c.family,', "const row = { scenario: 'configured-focus-then-enabled-unchecked-Space', family: c.family,"],
].map(([before, after]) => `[${JSON.stringify(before)},${JSON.stringify(after)}],`).join('\n');
replace('const measurementAdaptation = [', eventChanges + '\nconst measurementAdaptation = [\n' + extra);
const packages = Object.fromEntries(['typescript', 'playwright-core'].map(name => [name, import.meta.resolve(name)]));
const tree = ts.createSourceFile(file, source, 99, true, ts.ScriptKind.JS), calls = [];
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(tree) === 'import.meta.resolve') calls.push(node);
  ts.forEachChild(node, visit);
}
visit(tree); assert.equal(calls.length, 2);
for (const node of calls.toReversed()) source = source.slice(0, node.getStart(tree)) + `${JSON.stringify(packages)}[name]` + source.slice(node.end);
const ast = ts.createSourceFile(file, source, 99, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
for (const node of ast.statements.filter(ts.isImportDeclaration).toReversed()) {
  const name = node.moduleSpecifier.text;
  if (name.startsWith('node:')) continue;
  const url = name.startsWith('.') ? pathToFileURL(path.resolve(path.dirname(file), name)).href : import.meta.resolve(name);
  source = source.slice(0, node.moduleSpecifier.getStart(ast)) + JSON.stringify(url) + source.slice(node.moduleSpecifier.end);
}
await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
