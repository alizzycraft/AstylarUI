import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';
import { transformSync } from 'esbuild';
import { restoreInputBoundaryReadonlyAppend } from '../tests/material-parity/text-backing-case-review-source.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const suite = 'tests/material-parity/input-boundary-evidence.spec.mjs', currentSource = readFileSync(suite, 'utf8');
const source = restoreInputBoundaryReadonlyAppend(currentSource);
assert.equal(hash(source), '171bf9fae8fe2e701f5a42d5eef896685085ef267200956729ab447e04a032d5');
const oldFile = 'artifacts/material-parity/retained-evidence/component-map-recovery-20261011/chunk-3JXWRYJY.js.map';
const oldBytes = readFileSync(oldFile); assert.equal(hash(oldBytes), 'dba484044ca0dea965d8ef4b12635673f0f055d7711099d2f6476ca490988ec4');
const currentFile = 'examples/material-showcase/dist/material-showcase/browser/chunk-XOU37TRR.js.map';
const currentBytes = readFileSync(currentFile); assert.equal(hash(currentBytes), '8692027f86a8d2d5571de110d92ad3fdda97ea35da86adc10f1522a5134a686d');
const baselineFile = 'artifacts/material-parity/divider-alignment-provenance-20261015/latest-report.json';
const baselineBytes = readFileSync(baselineFile); assert.equal(hash(baselineBytes), '4be9c6d199952f35203f31d08def08d0d936071f4eb313b75ad3bbf72dd46f11');
const baseline = JSON.parse(baselineBytes);
assert.equal(baseline.captureProvenance.browserFiles.find(row => row.file === path.basename(currentFile)).sha256, hash(currentBytes));
const oldMap = JSON.parse(oldBytes), currentMap = JSON.parse(currentBytes);
const modules = map => map.sources.filter(file => file.startsWith('node_modules/astylarui/'));
assert.deepEqual(modules(oldMap).sort(), modules(currentMap).sort()); assert.equal(modules(currentMap).length, 88);
const whole = text => transformSync(text, { loader: 'js', legalComments: 'none', minifyWhitespace: true }).code;
const changed = modules(oldMap).filter(file => whole(oldMap.sourcesContent[oldMap.sources.indexOf(file)]) !==
  whole(currentMap.sourcesContent[currentMap.sources.indexOf(file)]));
assert.deepEqual(changed, ['node_modules/astylarui/dist/lib/lib/astylar.js']);

// Execute the existing owning callback with the NEW immutable capture, not a
// duplicated member/linker implementation or a change to the historical test.
const ast = ts.createSourceFile(suite, source, 99, true, ts.ScriptKind.JS);
const tests = ast.statements.filter(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) &&
  node.expression.arguments[0]?.text === 'current runtime member drift is confined to the retained layout diagnostic owner');
assert.equal(tests.length, 1);
const original = tests[0].expression.arguments[1].getText(ast);
let callback = original;
const replacements = [];
const replace = (before, after, reason) => {
  assert.equal(callback.split(before).length, 2); callback = callback.replace(before, after); replacements.push(reason);
};
replace("'./public-cursor-defaults-evidence.mjs'", JSON.stringify(pathToFileURL(path.resolve('tests/material-parity/public-cursor-defaults-evidence.mjs')).href), 'resolve original helper from original suite directory');
replace(oldFile, currentFile, 'select exact newer capture map');
replace(hash(oldBytes), hash(currentBytes), 'authenticate newer whole map');
replace("const installedSource = module === 'node_modules/astylarui/dist/lib/lib/astylar.js'\n      ? restoreCursorInspectorCaptureSource(liveInstalledSource) : liveInstalledSource;",
  'const installedSource = liveInstalledSource;', 'new capture includes the current inspector; no historical source restoration');
replace('assert.equal(equalMembers, 1583);', 'assert.equal(equalMembers, 1584);', 'all current members must agree including inspector');
replace("assert.deepEqual(differences, [{ file: 'src/lib/astylar.ts',\n    key: 'AstylarRenderer:MethodDeclaration:inspectCurrentDocumentStyles',\n    current: '2949e37e0ec074e81855e4835170c5165ba0b497cec902f70ad406f0cff95160',\n    installed: 'effd5c129a1c70cb9343a8d5c863b92169b6c7316f25e8c0120df575a8cb3147' }]);",
  'assert.deepEqual(differences, []);', 'newer capture must have zero class-member drift');
await new Function('assert', 'readFileSync', 'hash', 'path', 'ts', 'createRequire', `return (${callback})();`)(
  assert, readFileSync, hash, path, ts, createRequire);
console.log(JSON.stringify({ producerSha256: hash(readFileSync(import.meta.filename)), sourceSuite: { file: suite, sha256: hash(currentSource), reviewedPrefixSha256: hash(source) },
  baseline: { file: baselineFile, sha256: hash(baselineBytes) }, previousMap: { file: oldFile, sha256: hash(oldBytes) },
  capturedMap: { file: currentFile, sha256: hash(currentBytes) },
  sameModuleInventory: 88, unchangedCompleteCapturedModules: 87, changedCapturedModules: changed,
  linkedCompleteModules: 88, currentClassMembersEqual: 1584, memberDifferences: [],
  originalCallbackSha256: hash(original), selectedCallbackSha256: hash(callback), replacements,
  boundary: 'Existing consumer-linker/full captured-installed module and current class-member assertions execute against exact newer capture. No claim of complete current TS module imports/top-level wiring/Angular metadata equivalence,all dependencies,execution coverage or rendering acceptance.' }));
