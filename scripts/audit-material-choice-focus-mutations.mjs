import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Missing original configured focus,not the already inspected Tab/arrow actions.
const file = 'scripts/audit-material-picker-focus-events.mjs';
const ownerFile = 'scripts/audit-material-picker-focus-mutations.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const bytes = readFileSync(file), owner = readFileSync(ownerFile);
assert.equal(hash(bytes), '28135b9251bdc4b9547907bfd8945a9b39b32b7916b7207f5bdc674eec561ab5');
assert.equal(hash(owner), '4ab6988a32092ba0490dbcf2ef07141cdc4ed0cff2b0571aa71d2887d2a4c5b6');
const ownerTree = ts.createSourceFile(ownerFile, owner.toString(), 99, true, ts.ScriptKind.JS);
const observer = ownerTree.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'installMutations');
assert.equal(observer.length, 1);
let source = bytes.toString();
const replace = (before, after) => {
  assert.equal(source.split(before).length, 2, `Ambiguous choice recipe: ${before}`);
  source = source.replace(before, after);
};
replace("scripts/audit-material-picker-focus-events.mjs';\");", "scripts/audit-material-choice-focus-mutations.mjs';\");");
replace("const families = ['datepicker', 'timepicker'];", "const families = ['checkbox', 'radio'];");
replace('16 exact configured picker focus contexts; timepicker pointer click versus datepicker programmatic focus.',
  '16 exact configured checkbox/radio programmatic focus contexts; not supplementary keyboard actions.');
replace('const recipe = { base:', `const recipe = { eventProducer: { file: ${JSON.stringify(file)}, sha256: ${JSON.stringify(hash(bytes))} }, mutationProducer: { file: ${JSON.stringify(ownerFile)}, sha256: ${JSON.stringify(hash(owner))} }, base:`);
replace(': import.meta.resolve(name);', `: ${JSON.stringify(Object.fromEntries(['typescript', 'playwright-core'].map(name => [name, import.meta.resolve(name)])))}[name];`);
replace('  const events = [];', '  const events = [];\n' + observer[0].getText(ownerTree) + '\n  const mutations = installMutations(() => context);');
replace("snapshotPoint: 'document-capture-listener', before: state()", "snapshotPoint: 'document-capture-listener', mutation: structuredClone(mutations.active), before: state()");
replace('events.length = 0; sequence = 0; context = null;', 'events.length = 0; sequence = 0; context = null; mutations.records.length = 0;');
replace('activeAncestry, state: state(), events: structuredClone(events),', 'activeAncestry, state: state(), events: structuredClone(events), mutations: structuredClone(mutations.records),');
const ast = ts.createSourceFile(file, source, 99, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
for (const node of ast.statements.filter(ts.isImportDeclaration).toReversed()) {
  const name = node.moduleSpecifier.text;
  if (name.startsWith('node:')) continue;
  const url = name.startsWith('.') ? pathToFileURL(path.resolve(path.dirname(file), name)).href : import.meta.resolve(name);
  source = source.slice(0, node.moduleSpecifier.getStart(ast)) + JSON.stringify(url) + source.slice(node.moduleSpecifier.end);
}
await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
