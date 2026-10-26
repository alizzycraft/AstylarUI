import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Narrow adaptation of the existing checkpoint-bound collector, not a new harness.
const baseFile = 'scripts/audit-material-configured-control-activation.mjs';
const bytes = readFileSync(baseFile);
assert.equal(createHash('sha256').update(bytes).digest('hex'),
  '26d7a294d0c5b4aaa2179fa7a697178b099391493ba28f9ac0261a04bd2d6d46');
let source = bytes.toString();
function edit(before, after) {
  assert.equal(source.split(before).length, 2, `Ambiguous alternate collector adaptation: ${before}`);
  source = source.replace(before, after);
}
edit('scripts/audit-material-configured-control-activation.mjs', 'scripts/audit-material-chips-alternate.mjs');
edit("families.includes(c.family) && ['activate', 'activate-leave'].includes(c.state)",
  "c.family === 'chips' && c.state === 'activate-alternate'");
edit('assert.equal(cases.length, 113);', 'assert.equal(cases.length, 8);');
edit('113 exact configured pointer activate/activate-leave contexts,including the extra snackbar comparison case;',
  'Eight configured Chips alternate contexts with supplementary mouse-boundary DOM option observations;');
// Apply these further guarded changes to the shared focus collector after its
// existing activation adaptations, before it is parsed/imported.
const adaptations = [
  ["            const observations = [await sample('before')];",
    "            const actionTimeline = []; const observations = [await sample('before')];"],
  ['await actions.performInteraction(page, mode, c);',
    'await actions.performInteraction(observeMouse(page, sample, actionTimeline), mode, c);'],
  ['row[mode] = { observations, inputTree:', 'row[mode] = { observations, actionTimeline, inputTree:'],
  ['const evidence = row[side]; assert.equal(evidence.observations.length, 3);',
    "const evidence = row[side]; assert.deepEqual(evidence.actionTimeline.map(o => o.boundary), ['mouse-move','mouse-down','mouse-up','mouse-move','mouse-down','mouse-up']); assert.equal(evidence.observations.length, 3);"],
];
edit('const ast = ts.createSourceFile(baseFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);',
  adaptations.map(([a,b]) => `replace(${JSON.stringify(a)}, ${JSON.stringify(b)});`).join('\n') +
  '\nconst ast = ts.createSourceFile(baseFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);');
edit('  const observeFocus = window.__configuredControlFocusObserve;',
  '  const optionSnapshot = ' + optionSnapshot.toString() + ';\n  const observeFocus = window.__configuredControlFocusObserve;');
edit('return { ...observation, targetKind:',
  'return { ...observation, chipOptions: optionSnapshot(mode), targetKind:');
edit('const recipe = { base:',
  `source += ${JSON.stringify('\n' + observeMouse.toString())};\nconst recipe = { base:`);
// The reused adapter resolves the focus collector's bare imports while running
// inside a data URL. Resolve them here, in this file's normal module context.
const dependencies = Object.fromEntries(['typescript', 'playwright-core'].map(name => [name, import.meta.resolve(name)]));
edit('import.meta.resolve(name)', `(${JSON.stringify(dependencies)})[name]`);

const ast = ts.createSourceFile(baseFile, source, 99, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
for (const node of ast.statements.filter(ts.isImportDeclaration).toReversed()) {
  const name = node.moduleSpecifier.text;
  if (name.startsWith('node:')) continue;
  const resolved = name.startsWith('.') ? pathToFileURL(path.resolve(path.dirname(baseFile), name)).href : import.meta.resolve(name);
  source = source.slice(0, node.moduleSpecifier.getStart(ast)) + JSON.stringify(resolved) + source.slice(node.moduleSpecifier.end);
}
try {
  await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
} catch (error) {
  // A data URL stack can contain the entire generated runner. Keep useful
  // diagnostics without flooding logs with its base64 source.
  console.error(String(error?.stack ?? error).replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g, '<generated-collector>'));
  process.exitCode = 1;
}

function observeMouse(page, sample, timeline) {
  const mouse = new Proxy(page.mouse, { get(target, key) {
    const value = Reflect.get(target, key);
    if (!['move', 'down', 'up'].includes(key)) return typeof value === 'function' ? value.bind(target) : value;
    return async (...args) => {
      const result = await value.apply(target, args);
      timeline.push(await sample(`mouse-${key}`));
      return result;
    };
  } });
  return new Proxy(page, { get(target, key) {
    if (key === 'mouse') return mouse;
    const value = Reflect.get(target, key);
    return typeof value === 'function' ? value.bind(target) : value;
  } });
}

function optionSnapshot(mode) {
  return ['chip-0', 'chip-1'].map(id => {
    const host = mode === 'reference' ? document.getElementById(id) : document.querySelector(`[data-astylar-id="${id}"]`);
    const option = host?.matches('[role="option"]') ? host : host?.querySelector('[role="option"]');
    if (!host || !option) throw Error(`Missing generated chip option: ${mode}/${id}`);
    const selected = option.getAttribute('aria-selected');
    if (!['true', 'false'].includes(selected)) throw Error(`Missing actual option state: ${mode}/${id}`);
    return { id, hostTag: host.tagName, optionTag: option.tagName, role: option.getAttribute('role'),
      selected: selected === 'true', disabled: option.getAttribute('aria-disabled'),
      focused: document.activeElement === option, label: option.textContent?.trim() || option.getAttribute('aria-label') };
  });
}
