import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Reuse the checkpoint collector and maintained actions; only the cohort and
// read-only control observation differ. Additional awaited reads affect timing.
const baseFile = 'scripts/audit-material-chips-alternate.mjs';
const bytes = readFileSync(baseFile);
const hash = value => createHash('sha256').update(value).digest('hex');
assert.equal(hash(bytes), 'd6caee076ec639e4035b36bef7fc8c2cacc04d01bcd46b8f32dd38c72552beeb');
let source = bytes.toString();
function edit(before, after) {
  assert.equal(source.split(before).length, 2, `Ambiguous Stepper adaptation: ${before}`);
  source = source.replace(before, after);
}
edit("'scripts/audit-material-chips-alternate.mjs'", "'scripts/audit-material-stepper-leave.mjs'");
edit("c.family === 'chips' && c.state === 'activate-alternate'", "c.family === 'stepper' && c.state === 'activate-leave'");
edit('Eight configured Chips alternate contexts with supplementary mouse-boundary DOM option observations;',
  'Eight configured Stepper activate-leave contexts with supplementary mouse-boundary DOM tab observations;');
edit("['mouse-move','mouse-down','mouse-up','mouse-move','mouse-down','mouse-up']",
  "['mouse-move','mouse-down','mouse-up','mouse-move']");
edit('chipOptions: optionSnapshot(mode)', 'tabOptions: optionSnapshot(mode)');
const parsed = ts.createSourceFile(baseFile, source, 99, true, ts.ScriptKind.JS);
assert.equal(parsed.parseDiagnostics.length, 0);
const snapshots = parsed.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'optionSnapshot');
assert.equal(snapshots.length, 1);
source = source.slice(0, snapshots[0].getStart(parsed)) + optionSnapshot.toString() + source.slice(snapshots[0].end);
const dependencies = Object.fromEntries(['typescript', 'playwright-core'].map(name => [name, import.meta.resolve(name)]));
edit('name => [name, import.meta.resolve(name)]', `name => [name, (${JSON.stringify(dependencies)})[name]]`);
edit(': import.meta.resolve(name);', `: (${JSON.stringify(dependencies)})[name];`);
const ast = ts.createSourceFile(baseFile, source, 99, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
for (const node of ast.statements.filter(ts.isImportDeclaration).toReversed()) {
  const name = node.moduleSpecifier.text;
  if (name.startsWith('node:')) continue;
  const resolved = name.startsWith('.') ? pathToFileURL(path.resolve(path.dirname(baseFile), name)).href : import.meta.resolve(name);
  source = source.slice(0, node.moduleSpecifier.getStart(ast)) + JSON.stringify(resolved) + source.slice(node.moduleSpecifier.end);
}
if (process.argv[2] === '--dry-run') {
  console.log(JSON.stringify({ baseFile, baseSha256: hash(bytes), generatedSha256: hash(source),
    cases: 8, state: 'activate-leave', boundary: 'Adapter syntax/unique replacements only; not capture or parity.' }));
} else {
  try { await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64')); }
  catch (error) {
    console.error(String(error?.stack ?? error).replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g, '<generated-collector>'));
    process.exitCode = 1;
  }
}

function optionSnapshot(mode) {
  const host = mode === 'reference' ? document.getElementById('stepper-primary')
    : document.querySelector('[data-astylar-id="stepper-primary"]');
  if (!host) throw Error(`Missing Stepper host: ${mode}`);
  const tabs = [...host.querySelectorAll('[role="tab"]')];
  if (tabs.length !== 2) throw Error(`Expected exactly two Stepper tabs: ${mode}`);
  return ['Details', 'Review'].map(label => {
    const matching = tabs.filter(tab => mode === 'reference'
      ? tab.querySelector('.mat-step-text-label')?.textContent?.trim() === label
      : tab.getAttribute('data-astylar-id') === (label === 'Details' ? 'step-details' : 'step-review'));
    if (matching.length !== 1) throw Error(`Ambiguous Stepper tab: ${mode}/${label}`);
    const tab = matching[0], selected = tab.getAttribute('aria-selected');
    if (!['true', 'false'].includes(selected)) throw Error(`Missing selected state: ${mode}/${label}`);
    return { label, id: tab.id, logicalId: tab.getAttribute('data-astylar-id'), role: tab.getAttribute('role'),
      selected: selected === 'true', tabindex: tab.getAttribute('tabindex'), focused: document.activeElement === tab };
  });
}
