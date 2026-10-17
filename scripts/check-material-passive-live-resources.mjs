import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';

// The captured producer is frozen. Adapt only the paired reader's row shape in
// memory; do not fabricate a native side, mutate the helper or recapture data.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const file = 'artifacts/material-parity/passive-live-resources-20261017/latest-report.json';
const driver = 'scripts/audit-material-passive-live-resources.mjs';
const helper = 'tests/material-parity/supplemental-capture-evidence.mjs';
const bytes = readFileSync(file); assert.equal(hash(bytes), '68d347cdc733bf4314f586cf64a058569641329735622a4d6e462cebf e9289ac'.replace(' ', ''));
const source = readFileSync(driver, 'utf8'); assert.equal(hash(source), '8359604a71d51f73a278f896d7999b2c795fda36e308e3c67575f2f1a8d21dab');
const helperSource = readFileSync(helper, 'utf8');
assert.equal(hash(helperSource), '94d18aa40a5d2311c1c352a8ca698986dc7771de4faadca5aa672728eff1bdbc');
const paired = "for (const entry of raw.results) for (const side of ['reference', 'astylar']) {\n      const evidence = entry[side];";
const candidateOnly = 'for (const entry of raw.results) {\n      const evidence = entry;';
assert.equal(helperSource.split(paired).length, 2);
const adapted = helperSource.replace(paired, candidateOnly);
assert.equal(adapted.replace(candidateOnly, paired), helperSource);
const helperExports = {};
new Function('require', 'exports', ts.transpileModule(adapted, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText)(createRequire(path.resolve(helper)), helperExports);
const prefix = source.split("if (process.argv[2] === '--verify')")[0];
assert.ok(prefix.length < source.length);
const ast = ts.createSourceFile(driver, prefix, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
let verifier = prefix;
for (const statement of [...ast.statements].filter(ts.isImportDeclaration).reverse())
  verifier = verifier.slice(0, statement.pos) + verifier.slice(statement.end);
const run = new Function('assert', 'createHash', 'readFileSync', 'ts', 'propertyGroups', 'validateSupplementalCapture', 'raw', 'file', verifier + '\nreturn verify(raw,file);');
const check = raw => run(assert, createHash, readFileSync, ts, propertyGroups,
  helperExports.validateSupplementalCapture, raw, file);
const raw = JSON.parse(bytes), summary = check(raw);
let controls = 0;
for (const mutate of [r => r.results.pop(), r => { r.results[0].appliedTheme = {}; },
  r => { r.results[0].runtime.errors.push('forged runtime error'); },
  r => { r.results[0].inputTree.sha256 = '0'.repeat(64); },
  r => { r.results[0].snapshots[1].live.meshes++; },
  r => { r.results[0].disposal.scene = false; }]) {
  const forged = structuredClone(raw); mutate(forged); assert.throws(() => check(forged)); controls++;
}
console.log(JSON.stringify({ ...summary, negativeControlsRejected: controls, reportSha256: hash(bytes),
  producerSha256: hash(source), originalHelperSha256: hash(helperSource), adaptedReaderSha256: hash(adapted),
  readerChange: { from: paired, to: candidateOnly },
  originalHelperFullyRecoverable: true, helperOnDiskUnchanged: hash(readFileSync(helper)) === hash(helperSource),
  scope: raw.scope }));
