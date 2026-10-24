import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { materialInteractionCases } from '../tests/material-parity/benchmark.config.mjs';

// Close only the16 demonstrated raw hover/held gaps. Reuse maintained pointer
// actions and existing capture/verification,not the separate slider drag proof.
const script = 'scripts/audit-material-slider-hover-held.mjs';
const ownerFile = 'scripts/audit-material-configured-control-activation.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const owner = readFileSync(ownerFile);
assert.equal(hash(owner), '26d7a294d0c5b4aaa2179fa7a697178b099391493ba28f9ac0261a04bd2d6d46');
let source = owner.toString();
const replace = (before, after) => {
  assert.equal(source.split(before).length, 2, before);
  source = source.replace(before, after);
};
replace("scripts/audit-material-configured-control-activation.mjs';\");", `${script}';\");`);
replace("['activate', 'activate-leave'].includes(c.state)", "['hover', 'held'].includes(c.state)");
replace('cases.length, 113', 'cases.length, 16');
replace("const ast = ts.createSourceFile(baseFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);", `
replace("const families = ['chips', 'slide-toggle', 'button', 'menu', 'expansion', 'snack-bar', 'tooltip'];", "const families = ['slider'];");
replace("await actions.performInteraction(page, mode, c);", "const release = await actions.performInteraction(page, mode, c);");
replace("observations.push(await sample('settled'));", "observations.push(await sample(c.state === 'held' ? 'held' : 'settled'));");
replace("phase: 'settled'", "phase: c.state === 'held' ? 'held' : 'settled'");
replace("'before', 'after-action', 'settled'", "'before', 'after-action', row.state === 'held' ? 'held' : 'settled'");
replace("writeFileSync(stem + '.json', treeBytes, { flag: 'wx' });", "if (release) await release();\\n            writeFileSync(stem + '.json', treeBytes, { flag: 'wx' });");
const ast = ts.createSourceFile(baseFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);`);
replace('113 exact configured pointer activate/activate-leave contexts,including the extra snackbar comparison case;',
  '16 exact configured slider hover/held contexts; held pointer remains down through observations and screenshot,then original release runs;');
replace('const recipe = { base:', `const recipe = { wrapper: { file: ${JSON.stringify(script)}, sha256: ${JSON.stringify(hash(readFileSync(script)))}, base64: ${JSON.stringify(readFileSync(script).toString('base64'))} }, ownerSnapshot: { file: ${JSON.stringify(ownerFile)}, sha256: ${JSON.stringify(hash(owner))}, base64: ${JSON.stringify(owner.toString('base64'))} }, actionRunnerSnapshot: { file: runnerFile, sha256: hash(runnerBytes), base64: runnerBytes.toString('base64') }, base:`);
const packages = Object.fromEntries(['typescript', 'playwright-core'].map(name => [name, import.meta.resolve(name)]));
replace(': import.meta.resolve(name);', `: ${JSON.stringify(packages)}[name];`);
const ast = ts.createSourceFile(ownerFile, source, 99, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
for (const node of ast.statements.filter(ts.isImportDeclaration).toReversed()) {
  const name = node.moduleSpecifier.text;
  if (name.startsWith('node:')) continue;
  const resolved = name.startsWith('.') ? pathToFileURL(path.resolve(path.dirname(ownerFile), name)).href : import.meta.resolve(name);
  source = source.slice(0, node.moduleSpecifier.getStart(ast)) + JSON.stringify(resolved) + source.slice(node.moduleSpecifier.end);
}
const cases = materialInteractionCases.filter(row => row.family === 'slider' && ['hover', 'held'].includes(row.state));
assert.equal(cases.length, 16);
if (process.argv[2] === '--dry-run') console.log(JSON.stringify({ cases: cases.length, browserStarted: false, ownerSha256: hash(owner) }));
else await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
