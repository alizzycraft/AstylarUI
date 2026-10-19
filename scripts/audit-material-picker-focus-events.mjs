import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { fingerprintModuleGraph } from '../tests/material-parity/run-checkpoint.mjs';

// Existing settled snapshots cannot recover raw pointer/focus/opening order.
// Keep the original maintained actions; add read-only event-boundary witnesses.
const baseFile = 'scripts/audit-material-configured-control-focus.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const base = readFileSync(baseFile), baseSha256 = 'dc9305e44f29548ac6b7fbc890d0029467cf01015ba5828eef5b8e22ad491dc3';
assert.equal(hash(base), baseSha256);
let source = base.toString();
function replace(before, after) {
  assert.equal(source.split(before).length, 2, `Ambiguous picker event recipe: ${before}`);
  source = source.replace(before, after);
}
replace("const script = 'scripts/audit-material-configured-control-focus.mjs';",
  "const script = 'scripts/audit-material-picker-focus-events.mjs';");
replace("const families = ['chips', 'slide-toggle', 'button', 'menu', 'expansion', 'snack-bar', 'tooltip'];",
  "const families = ['datepicker', 'timepicker'];");
replace('assert.equal(cases.length, 56);', 'assert.equal(cases.length, 16);');
replace("const root = path.resolve('examples/material-showcase/dist/material-showcase/browser');",
  "const root = path.resolve('artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser');");
replace("            const observations = [await sample('before')];",
  "            await page.evaluate(() => window.__configuredPickerTraceClear());\n" +
  "            const observations = [await sample('before')];");
replace('actionSource, results, scope:', 'actionSource, sourceRecipe: recipe, results, scope:');
replace('assert.deepEqual(report.actionSource, actionSource);',
  'assert.deepEqual(report.actionSource, actionSource); assert.deepEqual(report.sourceRecipe, recipe);');
replace('56 exact configured focus contexts; direct active owners before/after action and settlement.',
  '16 exact configured picker focus contexts; timepicker pointer click versus datepicker programmatic focus. Raw DOM capture-listener/microtask snapshots and retained typed events; not uninstrumented timing or pointer-paint equivalence.');
replace("const treeBytes = Buffer.from(JSON.stringify(tree)), png = await page.screenshot({ animations: 'disabled' });",
  'const treeBytes = Buffer.from(JSON.stringify(tree));');
replace(" writeFileSync(stem + '.png', png, { flag: 'wx' });", '');
replace("screenshot: { file: stem + '.png', sha256: hash(png) }, runtime:", 'runtime:');
replace('assert.equal(hash(readFileSync(evidence.screenshot.file)), evidence.screenshot.sha256);',
  `const events = evidence.observations.at(-1).events;
    for (const type of ['pointerdown', 'pointerup', 'click'])
      assert.equal(events.filter(e => e.trusted && e.type === type).length, row.family === 'timepicker' ? 1 : 0);
    assert.deepEqual(events.map(e => e.sequence), events.map((_, i) => i + 1));
    for (const event of events) {
      assert.ok(event.target?.tag && Array.isArray(event.path));
      assert.equal(event.snapshotPoint, 'document-capture-listener');
      assert.ok(event.before && event.afterMicrotask);
    }`);
const ast = ts.createSourceFile(baseFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
const originalObserver = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'installObserver');
assert.equal(originalObserver.length, 1);
replace(originalObserver[0].getText(ast), installObserver.toString());
// Resolve the unchanged base imports before evaluating its adapted module.
const adapted = ts.createSourceFile(baseFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(adapted.parseDiagnostics.length, 0);
for (const node of adapted.statements.filter(ts.isImportDeclaration).toReversed()) {
  const name = node.moduleSpecifier.text;
  if (name.startsWith('node:')) continue;
  const resolved = name.startsWith('.') ? pathToFileURL(path.resolve(path.dirname(baseFile), name)).href : import.meta.resolve(name);
  source = source.slice(0, node.moduleSpecifier.getStart(adapted)) + JSON.stringify(resolved) + source.slice(node.moduleSpecifier.end);
}
const recipe = { base: { file: baseFile, sha256: baseSha256 },
  baseGraph: fingerprintModuleGraph(process.cwd(), baseFile), logicalRunnerSha256: hash(source),
  scope: 'Exact maintained configured actions, no input/layout/focus replacement. Additional DOM capture-listener and queued microtask snapshots may affect timing. No PNGs or parity acceptance.' };
await import('data:text/javascript;base64,' + Buffer.from('const recipe=' + JSON.stringify(recipe) + ';\n' + source).toString('base64'));

function installObserver() {
  const tokens = new WeakMap(); let token = 0, sequence = 0, context = null, typedStart = 0;
  const events = [];
  const describe = node => {
    if (!(node instanceof Element)) return null;
    if (!tokens.has(node)) tokens.set(node, ++token);
    return { token: tokens.get(node), tag: node.tagName, id: node.id || null,
      logicalId: node.getAttribute('data-astylar-id') || node.id || null,
      role: node.getAttribute('role'), tabindex: node.getAttribute('tabindex'),
      disabled: node.hasAttribute('disabled'), value: 'value' in node ? node.value : null,
      expanded: node.getAttribute('aria-expanded') };
  };
  const state = () => {
    const { mode, family } = context;
    const control = mode === 'reference' ? document.getElementById(`${family}-control`)
      : document.querySelector(`[data-astylar-id="${family}-control"]`);
    return { active: describe(document.activeElement), control: describe(control),
      optionIds: [...document.querySelectorAll('[role="option"]')].map(n => n.id || n.getAttribute('data-astylar-id')),
      nativeCalendarContents: document.querySelectorAll('mat-datepicker-content').length };
  };
  for (const type of ['pointerdown', 'mousedown', 'focus', 'focusin', 'pointerup', 'mouseup', 'click', 'input', 'change', 'blur', 'focusout'])
    document.addEventListener(type, event => {
      if (!context) return;
      const row = { sequence: ++sequence, type, trusted: event.isTrusted,
        target: describe(event.target), related: describe(event.relatedTarget),
        path: event.composedPath().filter(n => n instanceof Element).map(describe),
        snapshotPoint: 'document-capture-listener', before: state() };
      events.push(row);
      queueMicrotask(() => { row.afterMicrotask = state(); });
    }, true);
  window.__configuredPickerTraceClear = () => {
    events.length = 0; sequence = 0; context = null;
    typedStart = window.__ASTYLAR_MATERIAL_BENCHMARK__?.events().length ?? 0;
  };
  window.__configuredControlFocusObserve = (mode, family, boundary) => {
    context = { mode, family };
    const host = mode === 'reference' ? document.getElementById(`${family}-primary`)
      : document.querySelector(`[data-astylar-id="${family}-primary"]`);
    const selector = 'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]';
    const target = host?.matches(selector) ? host : host?.querySelector(selector);
    if (!host || !target) throw Error(`Missing configured focus host/target: ${mode}/${family}`);
    const active = document.activeElement, activeAncestry = [];
    for (let node = active; node instanceof Element; node = node.parentElement) activeAncestry.push(describe(node));
    return { boundary, host: describe(host), target: describe(target), active: describe(active),
      activeEqualsTarget: active === target, activeWithinHost: !!active && host.contains(active),
      activeAncestry, state: state(), events: structuredClone(events),
      retainedTypedEvents: mode === 'astylar' ? structuredClone(window.__ASTYLAR_MATERIAL_BENCHMARK__.events().slice(typedStart)) : null,
      targetBoundary: 'Focus-selector candidate,not assumed pointer target;actual DOM targets/path are recorded separately.' };
  };
}
