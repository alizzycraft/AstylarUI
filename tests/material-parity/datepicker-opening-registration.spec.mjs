import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import path from 'node:path';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { prepareDatepickerOpeningRegistry, restoreDatepickerOpeningRegistry,
  datepickerOpeningSources, datepickerOpeningProofs, createDatepickerHistoricalRead,
  datepickerHistoricalSources, prepareDatepickerOpeningSelection, restoreDatepickerOpeningSelection,
  datepickerOpeningReview, restoreDatepickerOpeningPolicyIfPresent } from './datepicker-opening-registration.mjs';
import { restoreStepperBatchRegistryIfPresent } from './stepper-batch-registration.mjs';

test('datepicker registry preparation preserves every predecessor entry and rejects unrelated drift', () => {
  const bytes = readFileSync('tests/material-parity/input-equivalence-audit.mjs');
  const prior = restoreDatepickerOpeningRegistry(bytes);
  const next = prepareDatepickerOpeningRegistry(prior);
  assert.equal(bytes.toString().replaceAll('\r\n', '\n'), next, 'Live registry must equal the verified preparation');
  assert.equal(restoreDatepickerOpeningRegistry(next), prior);
  const entries = source => {
    const ast = ts.createSourceFile('audit.mjs', source, 99, true);
    assert.deepEqual(ast.parseDiagnostics, []);
    return Object.fromEntries(['sourceFingerprints', 'focusedProofInventory', 'implementationPlan'].map(name => {
      const fn = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
      let array; const visit = n => { if (!array && ts.isArrayLiteralExpression(n)) array = n; ts.forEachChild(n, visit); }; visit(fn);
      return [name, array.elements.map(n => n.getText(ast))];
    }));
  };
  const before = entries(prior), after = entries(next);
  assert.equal(before.sourceFingerprints.length, 1106);
  assert.equal(before.focusedProofInventory.length, 436);
  assert.equal(before.implementationPlan.length, 71);
  assert.deepEqual(after.sourceFingerprints.slice(7), before.sourceFingerprints);
  assert.deepEqual(after.focusedProofInventory.slice(7), before.focusedProofInventory);
  assert.deepEqual(after.implementationPlan.slice(1), before.implementationPlan);
  const files = after.sourceFingerprints.map(text => Function(`return ${text}`)());
  assert.equal(new Set(files).size, files.length);
  assert.deepEqual(files.slice(0, 7), datepickerOpeningSources);
  for (const file of datepickerOpeningSources) assert.ok(readFileSync(file).length);
  const proof = (_root, file, pattern, title) => {
    assert.equal([...readFileSync(file, 'utf8').matchAll(new RegExp(pattern.source, 'g'))].length, 1);
    return [file, title];
  };
  assert.deepEqual(after.focusedProofInventory.slice(0, 7).map(text => Function('proof', 'root', `return ${text}`)(proof, '.')), datepickerOpeningProofs);
  assert.throws(() => prepareDatepickerOpeningRegistry(prior + '\n// unrelated drift'));
  assert.throws(() => restoreDatepickerOpeningRegistry(next + '\n// unrelated drift'));
  assert.deepEqual(readFileSync('tests/material-parity/input-equivalence-audit.mjs'), bytes);
  for (const [kind, file] of Object.entries({ runner: 'scripts/run-material-input-audit.mjs', launcher: 'scripts/export-material-input-audit-current-ancestry.mjs' })) {
    const live = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
    const old = restoreDatepickerOpeningSelection(live, kind);
    assert.equal(prepareDatepickerOpeningSelection(old, kind), live);
    assert.throws(() => restoreDatepickerOpeningSelection(live + '\n// drift', kind));
    assert.deepEqual(ts.createSourceFile(file, live, 99, true).parseDiagnostics, []);
    if (kind !== 'launcher') continue;
    const execute = (source, flags) => {
      const outputs = [];
      vm.runInNewContext(source.replace(/^import .*;\n/gm, '').replaceAll('import.meta.url', 'moduleUrl'), {
        assert, path, fileURLToPath, moduleUrl: pathToFileURL(path.resolve(file)).href,
        statSync: () => ({ isFile: () => true, isDirectory: () => true }),
        process: { argv: ['node', file, ...flags], execPath: 'node', env: {} },
        spawnSync: () => { throw Error('No export in selector check'); }, console: { log: value => outputs.push(JSON.parse(value)) },
      });
      assert.equal(outputs.length, 1); return outputs[0];
    };
    const older = [...old.matchAll(/rawRequested\.includes\('(.*?)'\)/g)].map(m => m[1]);
    for (const flags of [[], ...older.map(flag => [flag])]) assert.deepEqual(execute(live, [...flags, '--dry-run']), execute(old, [...flags, '--dry-run']));
    const selected = execute(live, ['--datepicker-opening', '--dry-run']);
    assert.ok(selected.args.includes(`--case-obligation-review-sha256=${datepickerOpeningReview}`));
    assert.ok(selected.args.includes(`--case-obligation-review=artifacts/material-parity/working-audit/proposals/${datepickerOpeningReview}.json`));
    for (const flag of [...older, '--unknown']) assert.throws(() => execute(live, ['--datepicker-opening', flag, '--dry-run']));
  }
});

test('datepicker historical source reader authenticates both endpoints and rejects unknown edits', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const root = process.cwd();
  const reader = createDatepickerHistoricalRead({ root, read: readFileSync });
  const twice = createDatepickerHistoricalRead({ root, read: reader });
  for (const [file, previous, current] of datepickerHistoricalSources) {
    const bytes = readFileSync(file);
    assert.equal(hash(bytes.toString().replaceAll('\r\n', '\n')), current);
    for (const read of [reader, twice]) {
      assert.equal(hash(read(file)), previous);
      assert.equal(hash(read(path.resolve(file), 'utf8')), previous);
      assert.equal(hash(read(file, { encoding: 'utf8' })), previous);
    }
    const bad = createDatepickerHistoricalRead({ root, read: (name, options) => path.resolve(root, name) === path.resolve(file)
      ? Buffer.from(bytes.toString() + '\n// unrelated edit') : readFileSync(name, options) });
    assert.throws(() => bad(file), /Unrecognized datepicker source/);
    assert.deepEqual(readFileSync(file), bytes);
  }
  const untouched = 'scripts/join-material-datepicker-opening.mjs';
  assert.deepEqual(reader(untouched), readFileSync(untouched));
  const policy = readFileSync('tests/material-parity/input-equivalence-policy.mjs');
  const oldPolicy = restoreDatepickerOpeningPolicyIfPresent(policy);
  assert.equal(hash(oldPolicy), datepickerHistoricalSources.find(([file]) => file.endsWith('/input-equivalence-policy.mjs'))[1]);
  assert.equal(restoreDatepickerOpeningPolicyIfPresent(oldPolicy), oldPolicy);
  assert.equal(restoreStepperBatchRegistryIfPresent(policy, 'policy'),
    restoreStepperBatchRegistryIfPresent(oldPolicy, 'policy'), 'Direct historical collectors must recover the same prior policy');
  assert.throws(() => restoreDatepickerOpeningPolicyIfPresent(policy.toString() + '\n// drift'));
  // Passthrough must reuse the bytes already read. A second read here amplified
  // five nested adapters into32 underlying reads during complete validation.
  for (const [file, bytes] of [
    ['tests/material-parity/input-equivalence-audit.mjs', Buffer.from(restoreDatepickerOpeningRegistry(readFileSync('tests/material-parity/input-equivalence-audit.mjs')))],
    ['scripts/run-material-input-audit.mjs', Buffer.from(restoreDatepickerOpeningSelection(readFileSync('scripts/run-material-input-audit.mjs'), 'runner'))],
    ['scripts/export-material-input-audit-current-ancestry.mjs', Buffer.from(restoreDatepickerOpeningSelection(readFileSync('scripts/export-material-input-audit-current-ancestry.mjs'), 'launcher'))],
    ['tests/material-parity/input-equivalence-policy.mjs', Buffer.from(restoreStepperBatchRegistryIfPresent(oldPolicy, 'policy'))],
  ]) {
    let calls = 0;
    let nested = () => { calls++; return bytes; };
    for (let i = 0; i < 20; i++) nested = createDatepickerHistoricalRead({ root, read: nested });
    assert.deepEqual(nested(file), bytes); assert.equal(calls, 1);
    assert.equal(nested(file, 'utf8'), bytes.toString()); assert.equal(calls, 2);
    assert.equal(nested(file, { encoding: 'utf8' }), bytes.toString()); assert.equal(calls, 3);
  }
});
