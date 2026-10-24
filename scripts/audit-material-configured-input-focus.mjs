import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { materialInteractionCases } from '../tests/material-parity/benchmark.config.mjs';
import { fingerprintModuleGraph } from '../tests/material-parity/run-checkpoint.mjs';

// Extend the existing checkpointed direct-owner probe, not its action/settlement
// implementation. In particular, the maintained Timepicker focus case clicks;
// it is never substituted for programmatic focus or applied to Datepicker.
const baseFile = 'scripts/audit-material-configured-control-focus.mjs';
const baseSha256 = 'dc9305e44f29548ac6b7fbc890d0029467cf01015ba5828eef5b8e22ad491dc3';
const script = 'scripts/audit-material-configured-input-focus.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const base = readFileSync(baseFile);
assert.equal(hash(base), baseSha256);
const families = ['form-field', 'input', 'autocomplete', 'datepicker', 'timepicker'];
const cases = materialInteractionCases.filter(row => families.includes(row.family) && row.state === 'focus');
assert.equal(cases.length, 40);
assert.equal(new Set(cases.map(row => `${row.family}@${row.profile}/${row.viewport.id}`)).size, 40);
let source = base.toString();
function replace(before, after) {
  assert.equal(source.split(before).length, 2, `Ambiguous input-focus recipe: ${before}`);
  source = source.replace(before, after);
}
replace("const script = 'scripts/audit-material-configured-control-focus.mjs';", `const script = '${script}';`);
replace("const families = ['chips', 'slide-toggle', 'button', 'menu', 'expansion', 'snack-bar', 'tooltip'];",
  `const families = ${JSON.stringify(families)};`);
replace('assert.equal(cases.length, 56);', 'assert.equal(cases.length, 40);');
replace('function installObserver() {', 'function installFocusObserver() {');
replace("for (const type of ['focus', 'blur', 'focusin', 'focusout'])",
  "for (const type of ['focus', 'blur', 'focusin', 'focusout', 'pointerdown', 'pointerup', 'click', 'keydown', 'keyup'])");
replace('event => events.push({ type, trusted: event.isTrusted,',
  'event => events.push({ type, time: performance.now(), trusted: event.isTrusted,');
replace('            assert.ok(tree.nodes.length); assert.deepEqual(tree.errors, []);',
  "            const measurementBoundaries = [await sample('after-tree-measurement')];\n" +
  '            assert.ok(tree.nodes.length); assert.deepEqual(tree.errors, []);');
replace('            row[mode] = { observations, inputTree:',
  "            measurementBoundaries.push(await sample('after-screenshot'));\n" +
  '            row[mode] = { observations, measurementBoundaries, inputTree:');
replace('actionSource, results, scope:', 'actionSource, sourceRecipe: recipe, results, scope:');
replace('const provenance = { browser: browser.version(), browserLaunch:',
  'const provenance = { sourceRecipe: recipe, browser: browser.version(), browserLaunch:');
replace('assert.deepEqual(report.actionSource, actionSource);',
  'assert.deepEqual(report.actionSource, actionSource); assert.deepEqual(report.sourceRecipe, recipe); assert.equal(report.actionSource.sha256, recipe.actionRunnerSnapshot.sha256);');
replace('    const evidence = row[side]; assert.equal(evidence.observations.length, 3);',
  '    const evidence = row[side]; validateInputFocusBoundaries(evidence, side); assert.equal(evidence.observations.length, 3);');
replace('56 exact configured focus contexts; direct active owners before/after action and settlement.',
  '40 exact configured input focus contexts; direct DOM owners and renderer logical state before/after maintained action,settlement,tree measurement and screenshot. Timepicker retains its pointer action. Diagnostic reads are observed separately;not paired focus-paint or current-package acceptance.');
replace('observedNotParityAccepted: true, reportSha256:',
  'pairedMeasurementBoundaries: report.results.length * 2, observedNotParityAccepted: true, sourceRecipeVerified: true, reportSha256:');

// As in the existing activation recipe, serialize the unchanged base observer
// inside the browser callback and resolve imports against the original module.
const ast = ts.createSourceFile(baseFile, source, 99, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
const initializer = ast.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'installFocusObserver');
assert.equal(initializer.length, 1);
const observer = installObserver.toString();
assert.equal(observer.split('installFocusObserver();').length, 2);
for (const node of ast.statements.filter(ts.isImportDeclaration).toReversed()) {
  const name = node.moduleSpecifier.text;
  if (name.startsWith('node:')) continue;
  const resolved = name.startsWith('.') ? pathToFileURL(path.resolve(path.dirname(baseFile), name)).href : import.meta.resolve(name);
  source = source.slice(0, node.moduleSpecifier.getStart(ast)) + JSON.stringify(resolved) + source.slice(node.moduleSpecifier.end);
}
source += '\n' + observer.replace('installFocusObserver();', initializer[0].getText(ast) + '\n  installFocusObserver();');
source += '\n' + validateInputFocusBoundaries.toString();
const actionRunnerFile = 'tests/material-parity/run-material-parity.mjs';
const actionRunnerBytes = readFileSync(actionRunnerFile);
const diagnosticBytes = readFileSync(script);
const recipe = { base: { file: baseFile, sha256: baseSha256, base64: base.toString('base64') },
  baseGraph: fingerprintModuleGraph(process.cwd(), baseFile),
  // Retain the exact producer bytes in the report so later source edits cannot
  // recreate the older capture's missing-runner provenance gap.
  actionRunnerSnapshot: { file: actionRunnerFile, sha256: hash(actionRunnerBytes), base64: actionRunnerBytes.toString('base64') },
  diagnosticScriptSnapshot: { file: script, sha256: hash(diagnosticBytes), base64: diagnosticBytes.toString('base64') },
  logicalRunnerSha256: hash(source), cases: cases.map(row => `${row.family}@${row.profile}/${row.viewport.id}/focus`),
  scope: 'Unchanged maintained actions; direct paired DOM and logical-focus observations. Extra synchronous diagnostic reads may affect execution; before/after those reads are retained. No fixture/core changes or historical procedure substitution.' };
assert.equal(ts.createSourceFile(script, source, 99, true, ts.ScriptKind.JS).parseDiagnostics.length, 0);
if (process.argv.length === 3 && process.argv[2] === '--dry-run') {
  console.log(JSON.stringify({ script, recipe: { ...recipe,
    base: { file: baseFile, sha256: baseSha256, retainedBytes: base.length },
    diagnosticScriptSnapshot: { file: script, sha256: hash(diagnosticBytes), retainedBytes: diagnosticBytes.length },
    actionRunnerSnapshot: { file: actionRunnerFile, sha256: hash(actionRunnerBytes), retainedBytes: actionRunnerBytes.length } },
  cases: cases.length, browserStarted: false }, null, 2));
} else {
  await import('data:text/javascript;base64,' + Buffer.from('const recipe=' + JSON.stringify(recipe) + ';\n' + source).toString('base64'));
}

function installObserver() {
  installFocusObserver();
  const observe = window.__configuredControlFocusObserve;
  window.__configuredControlFocusObserve = (mode, family, boundary) => {
    const observationTime = performance.now();
    const before = observe(mode, family, boundary);
    let rendererInteraction = null;
    if (mode === 'astylar') {
      const component = window.ng?.getComponent(document.querySelector('app-astylar-showcase'));
      if (!component?.surface) throw Error('Input-focus probe requires the readable mounted surface');
      rendererInteraction = structuredClone(component.surface.diagnostics.interaction);
      if (!rendererInteraction) throw Error('Missing renderer interaction diagnostics');
    }
    const afterDiagnosticRead = observe(mode, family, `${boundary}-after-diagnostic-read`);
    return { ...before, observationTime, rendererInteraction, afterDiagnosticRead,
      afterDiagnosticTime: performance.now(),
      diagnosticReadChangedActive: before.active?.token !== afterDiagnosticRead.active?.token };
  };
}

function validateInputFocusBoundaries(evidence, side) {
  assert.deepEqual(evidence.measurementBoundaries.map(row => row.boundary),
    ['after-tree-measurement', 'after-screenshot']);
  let previousTime = -Infinity;
  for (const row of [...evidence.observations, ...evidence.measurementBoundaries]) {
    assert.ok(Number.isFinite(row.observationTime) && row.observationTime >= previousTime);
    assert.ok(row.afterDiagnosticTime >= row.observationTime);
    previousTime = row.afterDiagnosticTime;
    assert.equal(row.diagnosticReadChangedActive, row.active.token !== row.afterDiagnosticRead.active.token);
    assert.equal(row.afterDiagnosticRead.boundary, `${row.boundary}-after-diagnostic-read`);
    assert.equal(row.afterDiagnosticRead.activeEqualsTarget,
      row.afterDiagnosticRead.active.token === row.afterDiagnosticRead.target.token);
    if (side === 'reference') assert.equal(row.rendererInteraction, null);
    else assert.ok(row.rendererInteraction && typeof row.rendererInteraction.focusVisible === 'boolean');
    for (const event of row.events) assert.ok(Number.isFinite(event.time) && typeof event.trusted === 'boolean');
  }
}
