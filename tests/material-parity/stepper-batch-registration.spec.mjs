import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { prepareStepperBatchRegistry as prepare, restoreStepperBatchRegistry as restore,
  stepperBatchSources, stepperBatchProofs, createStepperBatchPriorRead } from './stepper-batch-registration.mjs';

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
      assert.deepEqual(read('scripts/join-material-stepper-leave.mjs'), readFileSync('scripts/join-material-stepper-leave.mjs'));
    }
    assert.throws(() => prepare(source + '\n// drift', kind)); assert.throws(() => prepare(staged, kind));
    assert.throws(() => restore(staged + '\n// drift', kind));
    const before = arrays(source, kind), after = arrays(staged, kind);
    const counts = kind === 'policy' ? { findings: [203, 1] }
      : { sourceFingerprints: [1091, 8], focusedProofInventory: [418, 6], implementationPlan: [70, 1] };
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
      assert.deepEqual(after.focusedProofInventory.slice(0, 6).map(s => new Function('proof', 'root', `return ${s}`)(proof, '.')), stepperBatchProofs);
    }
    assert.deepEqual(readFileSync(file), bytes, 'Staging must not write live registries');
  }
});
