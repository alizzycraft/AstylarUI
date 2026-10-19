import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Extend the retained event witness, not its actions, inputs or settlement.
const file = 'scripts/audit-material-picker-focus-events.mjs';
const sha256 = '28135b9251bdc4b9547907bfd8945a9b39b32b7916b7207f5bdc674eec561ab5';
const bytes = readFileSync(file);
assert.equal(createHash('sha256').update(bytes).digest('hex'), sha256);
let source = bytes.toString();
const replace = (before, after) => {
  assert.equal(source.split(before).length, 2, `Ambiguous mutation adapter: ${before}`);
  source = source.replace(before, after);
};
replace("scripts/audit-material-picker-focus-events.mjs';\");", "scripts/audit-material-picker-focus-mutations.mjs';\");");
replace('const recipe = { base:', `const recipe = { eventProducer: { file: ${JSON.stringify(file)}, sha256: ${JSON.stringify(sha256)} }, base:`);
replace(': import.meta.resolve(name);', `: ${JSON.stringify(Object.fromEntries(['typescript', 'playwright-core'].map(name => [name, import.meta.resolve(name)])))}[name];`);
replace('  const events = [];', '  const events = [];\n' + installMutations.toString() + '\n  const mutations = installMutations(() => context);');
replace("snapshotPoint: 'document-capture-listener', before: state()", "snapshotPoint: 'document-capture-listener', mutation: structuredClone(mutations.active), before: state()");
replace('events.length = 0; sequence = 0; context = null;', 'events.length = 0; sequence = 0; context = null; mutations.records.length = 0;');
replace('activeAncestry, state: state(), events: structuredClone(events),', 'activeAncestry, state: state(), events: structuredClone(events), mutations: structuredClone(mutations.records),');
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
for (const node of ast.statements.filter(ts.isImportDeclaration).toReversed()) {
  const name = node.moduleSpecifier.text;
  if (name.startsWith('node:')) continue;
  const url = name.startsWith('.') ? pathToFileURL(path.resolve(path.dirname(file), name)).href : import.meta.resolve(name);
  source = source.slice(0, node.moduleSpecifier.getStart(ast)) + JSON.stringify(url) + source.slice(node.moduleSpecifier.end);
}
await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

function installMutations(getContext) {
  const state = { active: null, records: [] };
  for (const method of ['replaceChildren', 'removeAttribute']) {
    const original = Element.prototype[method];
    Element.prototype[method] = function (...args) {
      const context = getContext(), active = document.activeElement;
      if (!context || !(active instanceof Element) || !this.contains(active)) return Reflect.apply(original, this, args);
      if (state.records.length >= 300) throw Error('Picker mutation observation cap exceeded');
      const describe = node => ({ tag: node.tagName, id: node.id || null, logicalId: node.getAttribute('data-astylar-id') || node.id || null });
      const record = { method, target: describe(this), focused: describe(active),
        args: method === 'removeAttribute' ? args : args.map(node => node instanceof Element ? describe(node) : { type: typeof node }),
        sameChildren: method === 'replaceChildren' ? args.length === this.childNodes.length && args.every((n, i) => n === this.childNodes[i]) : null,
        stack: new Error().stack, beforeFocused: true };
      const previous = state.active; state.active = record; state.records.push(record);
      try { return Reflect.apply(original, this, args); }
      finally {
        record.afterFocused = document.activeElement === active;
        record.connected = active.isConnected;
        state.active = previous;
      }
    };
  }
  return state;
}
