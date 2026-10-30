import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Replay the exact producer used for the retained capture without replacing the
// live shared producer. This authenticates historical evidence, not parity.
const file = 'scripts/audit-material-configured-control-activation.mjs';
const originalRead = fs.readFileSync;
const live = originalRead(file);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(digest(live), 'f97c4459373bcca113d05842aec5179425a551d7c8ccd064e62d0693d9438fda');
const historical = execFileSync('git', ['show', `dc0bb349:${file}`]);
assert.equal(digest(historical), '862155fee760be272b49a8919af013489a457bee93f7288f48315f5b445aa15c');
const target = path.resolve(file);
fs.readFileSync = function (name, options) {
  if (typeof name === 'string' && path.resolve(name) === target) {
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? historical.toString(encoding) : Buffer.from(historical);
  }
  return originalRead.apply(this, arguments);
};
syncBuiltinESMExports();
let source = historical.toString();
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
for (const node of ast.statements.filter(ts.isImportDeclaration).toReversed()) {
  const name = node.moduleSpecifier.text;
  if (name.startsWith('node:')) continue;
  const resolved = name.startsWith('.') ? pathToFileURL(path.resolve(path.dirname(file), name)).href : import.meta.resolve(name);
  source = source.slice(0, node.moduleSpecifier.getStart(ast)) + JSON.stringify(resolved) + source.slice(node.moduleSpecifier.end);
}
const dependencies = Object.fromEntries(['typescript', 'playwright-core'].map(name => [name, import.meta.resolve(name)]));
source = source.replaceAll('import.meta.resolve(name)', `(${JSON.stringify(dependencies)})[name]`);
process.argv = [process.execPath, file, '--verify', 'artifacts/material-parity/calendar-paired-geometry-corrected-20261031', '--datepicker-activation', '--calendar-geometry'];
try {
  await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
} finally {
  fs.readFileSync = originalRead;
  syncBuiltinESMExports();
}
