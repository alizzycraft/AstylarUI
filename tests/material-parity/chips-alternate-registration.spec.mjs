import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import { restoreFocusSelectionAuditRegistry, restoreFocusSelectionAuditSelection } from './public-tab-selection-finding.mjs';
import { chipsAlternateReview, chipsAlternateSources, chipsAlternateProofs,
  prepareChipsAlternateRegistration as prepare, restoreChipsAlternateRegistration as restore,
  chipsAlternateSharedSources, prepareChipsAlternateSharedSource, restoreChipsAlternateSharedSourceIfPresent,
  createChipsAlternatePriorRead, restoreChipsAlternateRegistrationIfPresent } from './chips-alternate-registration.mjs';

const files = {
  producer: 'tests/material-parity/input-equivalence-audit.mjs',
  runner: 'scripts/run-material-input-audit.mjs',
  launcher: 'scripts/export-material-input-audit-current-ancestry.mjs',
};
const read = file => readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
test('proposed Chips registration preserves complete source and proof inventories', () => {
  for (const [kind, file] of Object.entries(files)) {
    const live = read(file), original = restoreChipsAlternateRegistrationIfPresent(live, kind), staged = prepare(original, kind);
    assert.equal(live, staged, 'Live source must equal the bounded proposed delta');
    assert.equal(restore(staged, kind), original);
    assert.throws(() => prepare(original + '\n// drift', kind));
    assert.throws(() => restore(staged + '\n// drift', kind));
    assert.throws(() => prepare(staged, kind));
    const legacyRestore = kind === 'producer' ? restoreFocusSelectionAuditRegistry : restoreFocusSelectionAuditSelection;
    assert.doesNotThrow(() => legacyRestore(original, kind));
    assert.equal(legacyRestore(staged, kind), legacyRestore(original, kind), 'Direct legacy entry must restore the newest delta');
    const ast = ts.createSourceFile(file, staged, 99, true, ts.ScriptKind.JS);
    assert.deepEqual(ast.parseDiagnostics, []);
    if (kind === 'producer') {
      const arrays = source => {
        const tree = ts.createSourceFile(file, source, 99, true, ts.ScriptKind.JS), result = {};
        for (const name of ['sourceFingerprints', 'focusedProofInventory']) {
          const fn = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
          let array;
          const visit = node => { if (!array && ts.isArrayLiteralExpression(node)) array = node; ts.forEachChild(node, visit); };
          visit(fn); result[name] = array.elements.map(node => node.getText(tree));
        }
        return result;
      };
      const before = arrays(original), after = arrays(staged);
      assert.equal(before.sourceFingerprints.length, 1085);
      assert.equal(before.focusedProofInventory.length, 412);
      assert.equal(after.sourceFingerprints.length, 1091);
      assert.equal(after.focusedProofInventory.length, 418);
      assert.deepEqual(after.sourceFingerprints.slice(6), before.sourceFingerprints);
      assert.deepEqual(after.focusedProofInventory.slice(6), before.focusedProofInventory);
      assert.equal(new Set(after.sourceFingerprints.map(value => vm.runInNewContext(value))).size, 1091);
      for (const file of chipsAlternateSources) assert.ok(readFileSync(file).length);
      const proof = (_root, file, pattern, title) => {
        assert.equal([...read(file).matchAll(new RegExp(pattern.source, 'g'))].length, 1, title);
        return [file, title];
      };
      assert.deepEqual(after.focusedProofInventory.slice(0, 6).map(value =>
        new Function('proof', 'root', `return ${value}`)(proof, process.cwd())), chipsAlternateProofs);
    }
    assert.equal(read(file), live, 'Validation must not write live sources');
  }
  const previousRead = createChipsAlternatePriorRead({root:process.cwd(),read:readFileSync});
  const nested = createChipsAlternatePriorRead({root:process.cwd(),read:previousRead});
  for (const file of chipsAlternateSharedSources) {
    const live = read(file), previous = restoreChipsAlternateSharedSourceIfPresent(live, file);
    assert.equal(prepareChipsAlternateSharedSource(previous, file), live);
    assert.equal(previousRead(file, 'utf8'), previous);
    assert.equal(nested(file, 'utf8'), previous);
    assert.throws(() => restoreChipsAlternateSharedSourceIfPresent(live + '\n// drift', file));
    assert.throws(() => prepareChipsAlternateSharedSource(previous + '\n// drift', file));
  }
});

test('proposed Chips selector preserves old choices and rejects combined supplements', () => {
  const original = restoreChipsAlternateRegistrationIfPresent(read(files.launcher), 'launcher'), staged = prepare(original, 'launcher');
  const execute = (source, flags) => {
    const outputs = [];
    // Execute the complete launcher body with explicit filesystem/process seams.
    // This tests argument routing, not real path availability or export success.
    const body = source.replace(/^import .*;\n/gm, '').replaceAll('import.meta.url', 'moduleUrl');
    vm.runInNewContext(body, { assert, path, moduleUrl: pathToFileURL(path.resolve(files.launcher)).href,
      fileURLToPath: value => new URL(value).pathname.replace(/^\/([A-Z]:)/i, '$1'),
      statSync: () => ({ isFile: () => true, isDirectory: () => true }),
      process: { argv: ['node', files.launcher, ...flags], execPath: 'node', env: {} },
      spawnSync: () => { throw new Error('Export must not run in selector test'); },
      console: { log: value => outputs.push(JSON.parse(value)) } });
    assert.equal(outputs.length, 1); return outputs[0];
  };
  const oldFlags = [...original.matchAll(/rawRequested\.includes\('(.*?)'\)/g)].map(match => match[1]);
  for (const flags of [[], ...oldFlags.map(flag => [flag])])
    assert.deepEqual(execute(staged, [...flags, '--dry-run']), execute(original, [...flags, '--dry-run']));
  const selected = execute(staged, ['--chips-alternate', '--dry-run']);
  assert.ok(selected.args.includes(`--case-obligation-review-sha256=${chipsAlternateReview}`));
  assert.ok(selected.args.some(argument => argument.includes(`${chipsAlternateReview}.json`)));
  for (const flag of oldFlags) assert.throws(() => execute(staged, ['--chips-alternate', flag, '--dry-run']));
  assert.throws(() => execute(staged, ['--chips-alternate', '--unknown', '--dry-run']));
  const runner = prepare(restoreChipsAlternateRegistrationIfPresent(read(files.runner), 'runner'), 'runner');
  const selection = runner.slice(runner.indexOf('    const chipsAlternateReaderFactory'), runner.indexOf('    assert.ok(!applicability'));
  for (const requested of [chipsAlternateReview, 'older-review']) {
    const context = { options: { caseObligationReviewSha256: requested }, chipsAlternateReview, root: process.cwd(),
      auditReadFileSync: readFileSync, createChipsAlternateReviewReader: () => 'chips', focusSelectionReaderFactory: () => 'older' };
    assert.equal(vm.runInNewContext(selection + '\napplicability;', context), requested === chipsAlternateReview ? 'chips' : 'older');
  }
  console.log(JSON.stringify({ liveRegistrationVerified: true, preservedOldSelectors: oldFlags.length + 1,
    proposedSources: 1091, proposedProofs: 418, review: chipsAlternateReview }));
});
