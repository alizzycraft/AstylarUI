import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import ts from 'typescript';
import vm from 'node:vm';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createSnackbarHistoricalRead, snackbarHistoricalSources, prepareSnackbarSingleOpenRegistry,
  restoreSnackbarSingleOpenRegistry, snackbarSingleOpenSources, snackbarSingleOpenProofs,
  prepareSnackbarSingleOpenSelection, restoreSnackbarSingleOpenSelection, snackbarSingleOpenReview,
  prepareSnackbarSharedSource, restoreSnackbarSharedSource, snackbarSharedFiles, restoreSnackbarRegistrationIfPresent } from './snackbar-single-open-registration.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
test('staged snackbar selector preserves older choices and rejects mixed supplements', () => {
  const files = { runner: 'scripts/run-material-input-audit.mjs', launcher: 'scripts/export-material-input-audit-current-ancestry.mjs' };
  const original = {}, staged = {};
  for (const [kind, file] of Object.entries(files)) {
    original[kind] = restoreSnackbarRegistrationIfPresent(readFileSync(file), kind);
    staged[kind] = prepareSnackbarSingleOpenSelection(original[kind], kind);
    assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), staged[kind]);
    assert.equal(restoreSnackbarSingleOpenSelection(staged[kind], kind), original[kind]);
    assert.equal(ts.createSourceFile(file, staged[kind], 99, true).parseDiagnostics.length, 0);
    assert.throws(() => prepareSnackbarSingleOpenSelection(original[kind] + '\n// drift', kind));
    assert.throws(() => restoreSnackbarSingleOpenSelection(staged[kind] + '\n// drift', kind));
  }
  const execute = (source, flags) => {
    const outputs = [];
    vm.runInNewContext(source.replace(/^import .*;\n/gm, '').replaceAll('import.meta.url', 'moduleUrl'), {
      assert, path, fileURLToPath, moduleUrl: pathToFileURL(path.resolve(files.launcher)).href,
      statSync: () => ({ isFile: () => true, isDirectory: () => true }),
      process: { argv: ['node', files.launcher, ...flags], execPath: 'node', env: {} },
      spawnSync: () => { throw Error('Selector test must not export'); }, console: { log: value => outputs.push(JSON.parse(value)) },
    });
    assert.equal(outputs.length, 1); return outputs[0];
  };
  const older = [...original.launcher.matchAll(/rawRequested\.includes\('(.*?)'\)/g)].map(m => m[1]);
  for (const flags of [[], ...older.map(flag => [flag])])
    assert.deepEqual(execute(staged.launcher, [...flags, '--dry-run']), execute(original.launcher, [...flags, '--dry-run']));
  const selected = execute(staged.launcher, ['--snackbar-single-open', '--dry-run']);
  assert.ok(selected.args.includes(`--case-obligation-review-sha256=${snackbarSingleOpenReview}`));
  assert.ok(selected.args.includes(`--case-obligation-review=artifacts/material-parity/working-audit/proposals/${snackbarSingleOpenReview}.json`));
  for (const flag of [...older, '--unknown']) assert.throws(() => execute(staged.launcher, ['--snackbar-single-open', flag, '--dry-run']));
  const selection = staged.runner.slice(staged.runner.indexOf('    const snackbarSingleOpenReaderFactory'), staged.runner.indexOf('    assert.ok(!applicability'));
  for (const requested of [snackbarSingleOpenReview, 'older']) {
    const context = { options: { caseObligationReviewSha256: requested }, snackbarSingleOpenReview,
      createSnackbarSingleOpenReviewReader: () => 'snackbar', stepperBatchReaderFactory: () => 'older', root: '.', auditReadFileSync: readFileSync };
    assert.equal(vm.runInNewContext(selection + '\napplicability;', context), requested === snackbarSingleOpenReview ? 'snackbar' : 'older');
  }
});
test('staged snackbar registration preserves every accepted source and proof', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const live = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const before = restoreSnackbarRegistrationIfPresent(live, 'producer');
  const staged = prepareSnackbarSingleOpenRegistry(before);
  assert.equal(live, staged);
  assert.equal(restoreSnackbarSingleOpenRegistry(staged), before);
  const arrays = source => {
    const tree = ts.createSourceFile('producer.mjs', source, 99, true);
    assert.equal(tree.parseDiagnostics.length, 0);
    return Object.fromEntries(['sourceFingerprints', 'focusedProofInventory', 'implementationPlan'].map(name => {
      const fn = tree.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
      let array; const visit = n => { if (!array && ts.isArrayLiteralExpression(n)) array = n; ts.forEachChild(n, visit); }; visit(fn);
      return [name, array.elements.map(n => n.getText(tree))];
    }));
  };
  const prior = arrays(before), next = arrays(staged);
  assert.equal(prior.sourceFingerprints.length, 1099); assert.equal(prior.focusedProofInventory.length, 425);
  assert.equal(next.sourceFingerprints.length, 1104); assert.equal(next.focusedProofInventory.length, 432);
  assert.deepEqual(next.sourceFingerprints.slice(5), prior.sourceFingerprints);
  assert.deepEqual(next.focusedProofInventory.slice(7), prior.focusedProofInventory);
  assert.deepEqual(next.implementationPlan, prior.implementationPlan);
  const files = next.sourceFingerprints.map(text => new Function(`return ${text}`)());
  assert.equal(new Set(files).size, files.length); assert.deepEqual(files.slice(0, 5), snackbarSingleOpenSources);
  const proof = (_root, file, pattern, title) => {
    assert.equal([...readFileSync(file, 'utf8').matchAll(new RegExp(pattern.source, 'g'))].length, 1);
    return [file, title];
  };
  assert.deepEqual(next.focusedProofInventory.slice(0, 7).map(text => new Function('proof', 'root', `return ${text}`)(proof, '.')), snackbarSingleOpenProofs);
  assert.throws(() => prepareSnackbarSingleOpenRegistry(before + '\n// drift'));
  assert.throws(() => restoreSnackbarSingleOpenRegistry(staged + '\n// drift'));
  assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), live);
});
test('snackbar historical reader authenticates all five source transitions without changing live inputs', () => {
  const root = process.cwd(), read = createSnackbarHistoricalRead({ root, read: readFileSync });
  const nested = createSnackbarHistoricalRead({ root, read });
  for (const [file, previous, current] of snackbarHistoricalSources) {
    const before = readFileSync(file);
    assert.equal(hash(before.toString().replaceAll('\r\n', '\n')), current);
    for (const reader of [read, nested]) {
      assert.equal(hash(reader(file)), previous);
      assert.equal(hash(reader(path.resolve(file), 'utf8')), previous);
      assert.equal(hash(reader(file, { encoding: 'utf8' })), previous);
    }
    assert.deepEqual(readFileSync(file), before);
    const bad = createSnackbarHistoricalRead({ root, read: (name, options) =>
      path.resolve(root, name) === path.resolve(root, file) ? Buffer.from(before.toString() + '\n// drift') : readFileSync(name, options) });
    assert.throws(() => bad(file), /Unrecognized snackbar source/);
  }
  const untouched = 'scripts/join-material-snackbar-single-open.mjs';
  assert.deepEqual(read(untouched), readFileSync(untouched));
  for (const file of snackbarSharedFiles) {
    const before = restoreSnackbarSharedSource(readFileSync(file), file);
    const staged = prepareSnackbarSharedSource(before, file);
    assert.equal(restoreSnackbarSharedSource(staged, file), before);
    assert.throws(() => restoreSnackbarSharedSource(staged + '\n// drift', file));
    const sourceRead = (name, options) => {
      if (path.resolve(root, name) !== path.resolve(root, file)) return readFileSync(name, options);
      const encoding = typeof options === 'string' ? options : options?.encoding;
      return encoding ? Buffer.from(staged).toString(encoding) : Buffer.from(staged);
    };
    const prior = createSnackbarHistoricalRead({ root, read: sourceRead });
    const twice = createSnackbarHistoricalRead({ root, read: prior });
    assert.equal(prior(file, 'utf8'), before); assert.equal(twice(file, 'utf8'), before);
  }
});
