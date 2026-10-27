import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import { restoreFocusSelectionAuditRegistry, restoreFocusSelectionAuditSelection } from './public-tab-selection-finding.mjs';
import { prepareStepperBatchRegistry as prepare, restoreStepperBatchRegistry as restore,
  stepperBatchSources, stepperBatchProofs, createStepperBatchPriorRead,
  prepareStepperBatchSelection, restoreStepperBatchSelection, stepperBatchReview } from './stepper-batch-registration.mjs';

test('staged Stepper batch preserves complete source proof finding and plan inventories', () => {
  const arrays = (text, kind) => {
    const ast = ts.createSourceFile(kind + '.mjs', text, 99, true, ts.ScriptKind.JS);
    assert.deepEqual(ast.parseDiagnostics, []);
    if (kind === 'policy') {
      const definition = ast.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations])
        .find(n => n.name.getText(ast) === 'sourceAuditDefinitions');
      return { findings: definition.initializer.arguments[0].elements.map(n => n.getText(ast)) };
    }
    return Object.fromEntries(['sourceFingerprints', 'focusedProofInventory', 'implementationPlan'].map(name => {
      const fn = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
      let array; const visit = n => { if (!array && ts.isArrayLiteralExpression(n)) array = n; ts.forEachChild(n, visit); }; visit(fn);
      return [name, array.elements.map(n => n.getText(ast))];
    }));
  };
  for (const [kind, file] of Object.entries({ policy: 'tests/material-parity/input-equivalence-policy.mjs', producer: 'tests/material-parity/input-equivalence-audit.mjs' })) {
    const bytes = readFileSync(file), source = bytes.toString().replaceAll('\r\n', '\n'), staged = prepare(bytes, kind);
    assert.equal(restore(staged, kind), source);
    const stagedRead = (name, options) => {
      if (path.resolve(name) !== path.resolve(file)) return readFileSync(name, options);
      const encoding = typeof options === 'string' ? options : options?.encoding;
      return encoding ? Buffer.from(staged).toString(encoding) : Buffer.from(staged);
    };
    const priorRead = createStepperBatchPriorRead({ root: process.cwd(), read: stagedRead });
    const nestedRead = createStepperBatchPriorRead({ root: process.cwd(), read: priorRead });
    for (const read of [priorRead, nestedRead]) {
      assert.equal(read(file, 'utf8'), source);
      assert.equal(read(path.resolve(file), { encoding: 'utf8' }), source);
      assert.deepEqual(read(file), Buffer.from(source));
      assert.equal(restoreFocusSelectionAuditRegistry(read(file), kind), restoreFocusSelectionAuditRegistry(source, kind));
      assert.deepEqual(read('scripts/join-material-stepper-leave.mjs'), readFileSync('scripts/join-material-stepper-leave.mjs'));
    }
    assert.throws(() => prepare(source + '\n// drift', kind)); assert.throws(() => prepare(staged, kind));
    assert.throws(() => restore(staged + '\n// drift', kind));
    const before = arrays(source, kind), after = arrays(staged, kind);
    const counts = kind === 'policy' ? { findings: [203, 1] }
      : { sourceFingerprints: [1091, 8], focusedProofInventory: [418, 7], implementationPlan: [70, 1] };
    for (const [name, [count, added]] of Object.entries(counts)) {
      assert.equal(before[name].length, count); assert.equal(after[name].length, count + added);
      assert.deepEqual(after[name].slice(added), before[name]);
    }
    if (kind === 'producer') {
      const files = after.sourceFingerprints.map(s => new Function(`return ${s}`)());
      assert.equal(new Set(files).size, 1099); assert.deepEqual(files.slice(0, 8), stepperBatchSources);
      for (const file of stepperBatchSources) assert.ok(readFileSync(file).length > 0);
      const proof = (_root, file, pattern, title) => {
        assert.equal([...readFileSync(file, 'utf8').matchAll(new RegExp(pattern.source, 'g'))].length, 1);
        return [file, title];
      };
      assert.deepEqual(after.focusedProofInventory.slice(0, 7).map(s => new Function('proof', 'root', `return ${s}`)(proof, '.')), stepperBatchProofs);
    }
    assert.deepEqual(readFileSync(file), bytes, 'Staging must not write live registries');
  }
});

test('staged Stepper selection preserves every older choice and rejects mixed supplements', () => {
  const files = { runner: 'scripts/run-material-input-audit.mjs', launcher: 'scripts/export-material-input-audit-current-ancestry.mjs' };
  const staged = {}, original = {};
  for (const [kind, file] of Object.entries(files)) {
    original[kind] = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
    staged[kind] = prepareStepperBatchSelection(original[kind], kind);
    assert.equal(restoreStepperBatchSelection(staged[kind], kind), original[kind]);
    assert.deepEqual(ts.createSourceFile(file, staged[kind], 99, true, ts.ScriptKind.JS).parseDiagnostics, []);
    assert.throws(() => prepareStepperBatchSelection(original[kind] + '\n// drift', kind));
    assert.throws(() => prepareStepperBatchSelection(staged[kind], kind));
    assert.throws(() => restoreStepperBatchSelection(staged[kind] + '\n// drift', kind));
  }
  const execute = (source, flags) => {
    const outputs = [];
    const body = source.replace(/^import .*;\n/gm, '').replaceAll('import.meta.url', 'moduleUrl');
    vm.runInNewContext(body, { assert, path, fileURLToPath, moduleUrl: pathToFileURL(path.resolve(files.launcher)).href,
      statSync: () => ({ isFile: () => true, isDirectory: () => true }),
      process: { argv: ['node', files.launcher, ...flags], execPath: 'node', env: {} },
      spawnSync: () => { throw new Error('Selector proof must not export'); },
      console: { log: value => outputs.push(JSON.parse(value)) } });
    assert.equal(outputs.length, 1); return outputs[0];
  };
  const oldFlags = [...original.launcher.matchAll(/rawRequested\.includes\('(.*?)'\)/g)].map(match => match[1]);
  for (const flags of [[], ...oldFlags.map(flag => [flag])])
    assert.deepEqual(execute(staged.launcher, [...flags, '--dry-run']), execute(original.launcher, [...flags, '--dry-run']));
  const selected = execute(staged.launcher, ['--stepper-batch', '--dry-run']);
  assert.ok(selected.args.includes(`--case-obligation-review-sha256=${stepperBatchReview}`));
  assert.ok(selected.args.includes(`--case-obligation-review=artifacts/material-parity/working-audit/proposals/${stepperBatchReview}.json`));
  for (const flag of oldFlags) assert.throws(() => execute(staged.launcher, ['--stepper-batch', flag, '--dry-run']));
  assert.throws(() => execute(staged.launcher, ['--stepper-batch', '--unknown', '--dry-run']));
  const selection = staged.runner.slice(staged.runner.indexOf('    const stepperBatchReaderFactory'), staged.runner.indexOf('    assert.ok(!applicability'));
  for (const requested of [stepperBatchReview, 'older-review']) {
    const context = { options: { caseObligationReviewSha256: requested }, stepperBatchReview, root: process.cwd(),
      auditReadFileSync: readFileSync, createStepperBatchReviewReader: () => 'stepper', chipsAlternateReaderFactory: () => 'older' };
    assert.equal(vm.runInNewContext(selection + '\napplicability;', context), requested === stepperBatchReview ? 'stepper' : 'older');
  }
  const stagedRead = (name, options) => {
    const kind = Object.keys(files).find(kind => path.resolve(files[kind]) === path.resolve(name));
    if (!kind) return readFileSync(name, options);
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? Buffer.from(staged[kind]).toString(encoding) : Buffer.from(staged[kind]);
  };
  const priorRead = createStepperBatchPriorRead({ root: process.cwd(), read: stagedRead });
  const nestedRead = createStepperBatchPriorRead({ root: process.cwd(), read: priorRead });
  for (const [kind, file] of Object.entries(files)) {
    for (const read of [priorRead, nestedRead]) {
      assert.equal(read(file, 'utf8'), original[kind]);
      assert.equal(restoreFocusSelectionAuditSelection(read(file), kind), restoreFocusSelectionAuditSelection(original[kind], kind));
    }
    assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), original[kind]);
  }
  console.log(JSON.stringify({ preservedOldSelectors: oldFlags.length + 1, review: stepperBatchReview, liveSourcesUnchanged: true }));
});
