import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { fingerprintModuleGraph } from '../tests/material-parity/run-checkpoint.mjs';

// Reuse the existing direct-owner capture, changing only the declared action
// cohort and observations. No replacement click,focus,layout or fixture rules.
const baseFile = 'scripts/audit-material-configured-control-focus.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const base = readFileSync(baseFile), baseSha256 = 'dc9305e44f29548ac6b7fbc890d0029467cf01015ba5828eef5b8e22ad491dc3';
assert.equal(hash(base), baseSha256);
let source = base.toString();
function replace(before, after) {
  assert.equal(source.split(before).length, 2, `Ambiguous activation recipe: ${before}`);
  source = source.replace(before, after);
}
replace("const script = 'scripts/audit-material-configured-control-focus.mjs';",
  "const script = 'scripts/audit-material-configured-control-activation.mjs';");
replace("families.includes(c.family) && c.state === 'focus'", "families.includes(c.family) && ['activate', 'activate-leave'].includes(c.state)");
replace('assert.equal(cases.length, 56);', `assert.equal(cases.length, 113);
assert.equal(new Set(cases.map(c => materialCaseKey('interaction', c))).size, cases.length);
assert.equal(new Set(cases.map(c => [c.family,c.profile,c.viewport.id,c.state,hash(materialCaseKey('interaction', c)).slice(0,12)].join('-'))).size, cases.length);`);
replace('${c.family}-${c.profile}-${c.viewport.id}-${mode}',
  "${c.family}-${c.profile}-${c.viewport.id}-${c.state}-${hash(materialCaseKey('interaction', c)).slice(0,12)}-${mode}");
replace('&interaction=focus', '&interaction=${c.state}');
replace("for (const type of ['focus', 'blur', 'focusin', 'focusout'])", "for (const type of ['focus', 'blur', 'focusin', 'focusout', 'pointerdown', 'pointerup', 'click', 'input', 'change'])");
replace('function installObserver() {', 'function installFocusObserver() {');
const runnerFile = 'tests/material-parity/run-material-parity.mjs', runnerBytes = readFileSync(runnerFile);
const runnerAST = ts.createSourceFile(runnerFile, runnerBytes.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(runnerAST.parseDiagnostics.length, 0);
const openers = runnerAST.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'openInteractionPage');
assert.equal(openers.length, 1);
const branches = openers[0].body.statements.filter(node => ts.isIfStatement(node) && node.expression.getText(runnerAST) === "mode === 'astylar'");
assert.equal(branches.length, 1);
const nativeSetup = branches[0].elseStatement.statements;
assert.equal(nativeSetup.length, 1);
const nativeCall = nativeSetup[0].expression.expression;
assert.ok(ts.isCallExpression(nativeCall) && nativeCall.expression.getText(runnerAST) === 'page.evaluate');
const nativeListener = nativeCall.arguments[0].getText(runnerAST);
replace("            await actions.sendShowcaseCommand(page, { type: 'showcase:benchmark', phase: 'start' });",
  "            if (mode === 'reference') await page.evaluate(rawReferenceListener, c.family);\n" +
  "            else await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.clearEvents());\n" +
  "            await actions.sendShowcaseCommand(page, { type: 'showcase:benchmark', phase: 'start' });");
replace('actionSource, results, scope:', 'actionSource, sourceRecipe: recipe, results, scope:');
replace('assert.deepEqual(report.actionSource, actionSource);',
  'assert.deepEqual(report.actionSource, actionSource); assert.deepEqual(report.sourceRecipe, recipe);');
replace('56 exact configured focus contexts; direct active owners before/after action and settlement.',
  '113 exact configured pointer activate/activate-leave contexts,including the extra snackbar comparison case; raw maintained events,state and direct active owners before/after action and settlement. Target means focus-selector candidate,not a pointer hit witness.');
replace('observedNotParityAccepted: true, reportSha256:', 'observedNotParityAccepted: true, sourceRecipeVerified: true, reportSha256:');
// Data-URL module imports must resolve against the unchanged base module, not
// against a synthetic URL. Preserve every imported implementation verbatim.
const ast = ts.createSourceFile(baseFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
for (const node of ast.statements.filter(ts.isImportDeclaration).toReversed()) {
  const name = node.moduleSpecifier.text;
  if (name.startsWith('node:')) continue;
  const resolved = name.startsWith('.') ? pathToFileURL(path.resolve(path.dirname(baseFile), name)).href : import.meta.resolve(name);
  source = source.slice(0, node.moduleSpecifier.getStart(ast)) + JSON.stringify(resolved) + source.slice(node.moduleSpecifier.end);
}
const focusInitializer = ast.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'installFocusObserver');
assert.equal(focusInitializer.length, 1);
const observer = installObserver.toString();
assert.equal(observer.split('installFocusObserver();').length, 2);
// Playwright serializes this function alone. Include its unchanged initializer
// locally rather than relying on a Node-side closure in the browser realm.
source += '\n' + observer.replace('installFocusObserver();', focusInitializer[0].getText(ast) + '\n  installFocusObserver();');
const recipe = { base: { file: baseFile, sha256: baseSha256 }, baseGraph: fingerprintModuleGraph(process.cwd(), baseFile),
  nativeListener: { file: runnerFile, sha256: hash(runnerBytes), bodySha256: hash(nativeListener) },
  logicalRunnerSha256: hash(source), scope: 'Original configured pointer actions;additional read-only raw event/state snapshots. Focus-selector target is not asserted to be the pointer target.' };
await import('data:text/javascript;base64,' + Buffer.from('const recipe=' + JSON.stringify(recipe) + ';\nconst rawReferenceListener=' + nativeListener + ';\n' + source).toString('base64'));

function installObserver() {
  installFocusObserver();
  const observeFocus = window.__configuredControlFocusObserve;
  window.__configuredControlFocusObserve = (mode, family, boundary) => {
    const observation = observeFocus(mode, family, boundary);
    const api = window.__ASTYLAR_MATERIAL_BENCHMARK__;
    const state = mode === 'reference' ? window.ng.getComponent(document.querySelector('app-reference')).store.state() : api.state();
    const events = mode === 'reference' ? window.__MATERIAL_REFERENCE_EVENTS__ : api.events();
    if (!Array.isArray(events)) throw Error('Missing maintained raw event stream');
    return { ...observation, targetKind: 'focus-selector-candidate-not-pointer-hit',
      configuredEvents: structuredClone(events), state: structuredClone(state) };
  };
}
