import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { prepareMenuSelection } from './menu-select-disabled-selection.mjs';
import { restoreDividerOwnerFrameProducer } from './divider-owner-frame-registration.mjs';
import { restoreDividerOwnerFrameExportSource } from './pending-evidence-registration.mjs';
import { menuPendingSources, menuPendingProofRows, prepareMenuProducerRegistration, restoreMenuProducerRegistration,
  menuPendingFindingDefinitions, prepareMenuPolicyRegistration, restoreMenuPolicyRegistration, createMenuHistoricalRead,
  menuHistoricalSpecHashes, restoreMenuHistoricalSpec } from './menu-select-disabled-registration.mjs';
const frozenRead = createMenuHistoricalRead({ root: process.cwd(), read: readFileSync });

test('historical read restores only four authenticated staged transitions and rejects modified staged content', () => {
  const root = process.cwd(), names = ['tests/material-parity/input-equivalence-audit.mjs','tests/material-parity/input-equivalence-policy.mjs',
    'scripts/export-material-input-audit-current-ancestry.mjs','scripts/run-material-input-audit.mjs'];
  const originals = names.map(f => frozenRead(f, 'utf8').replaceAll('\r\n', '\n'));
  const staged = [prepareMenuProducerRegistration(originals[0], readFileSync), prepareMenuPolicyRegistration(originals[1]),
    prepareMenuSelection(originals[2], 'launcher'), prepareMenuSelection(originals[3], 'runner')];
  const overlay = new Map(names.map((f,i) => [path.resolve(root,f), Buffer.from(staged[i])]));
  const read = (file, options) => { const b = overlay.get(path.resolve(root,file)); if (!b) return readFileSync(file, options);
    const encoding = typeof options === 'string' ? options : options?.encoding; return encoding ? b.toString(encoding) : Buffer.from(b); };
  const historical = createMenuHistoricalRead({ root, read });
  names.forEach((file,i) => { assert.equal(historical(file, 'utf8'), originals[i]); assert.equal(historical(file).toString(), originals[i]); });
  // Old direct entry points do not know the new stage. Demonstrate that gap,
  // then prove exact historical reads preserve their original assertions.
  assert.throws(() => restoreDividerOwnerFrameProducer(staged[0]));
  assert.doesNotThrow(() => restoreDividerOwnerFrameProducer(historical(names[0])));
  for (const [index,kind] of [[2,'launcher'],[3,'runner']]) {
    assert.throws(() => restoreDividerOwnerFrameExportSource(staged[index],kind));
    assert.doesNotThrow(() => restoreDividerOwnerFrameExportSource(historical(names[index]),kind));
  }
  const untouched = 'docs/evidence/material-original-runner-e01.mjs.gz.b64';
  assert.deepEqual(historical(untouched), readFileSync(untouched));
  for (let i=0;i<names.length;i++) {
    const key = path.resolve(root,names[i]), saved = overlay.get(key);
    overlay.set(key, Buffer.concat([saved, Buffer.from('\n// unexpected mutation')]));
    assert.throws(() => historical(names[i])); overlay.set(key,saved);
  }
  const frozen = createMenuHistoricalRead({ root, read: readFileSync });
  names.forEach((file,i) => assert.equal(frozen(file).toString(), originals[i]));
  for (const [file,priorHash] of Object.entries(menuHistoricalSpecHashes)) {
    const bytes = readFileSync(file), restored = restoreMenuHistoricalSpec(bytes,file);
    assert.equal(createHash('sha256').update(restored).digest('hex'),priorHash);
    assert.equal(frozen(file).toString(),restored);
    assert.throws(() => restoreMenuHistoricalSpec(bytes.toString() + '\n// unexpected mutation',file));
  }
});

test('pending policy registration conserves all193 definitions and binds three exact source anchors and receipts', () => {
  const file = 'tests/material-parity/input-equivalence-policy.mjs', live = readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), original = frozenRead(file, 'utf8').replaceAll('\r\n', '\n');
  const definitions = source => new Function(source.replace(/^export const /gm, 'const ') + ';return sourceAuditDefinitions;')();
  const before = definitions(original), prepared = prepareMenuPolicyRegistration(original), after = definitions(prepared);
  assert.equal(before.length, 193); assert.equal(after.length, 196); assert.equal(new Set(after.map(f => f.id)).size, 196);
  assert.deepEqual(after.slice(3), before); assert.deepEqual(after.slice(0,3), menuPendingFindingDefinitions);
  for (const finding of after.slice(0,3)) {
    assert.ok(finding.pattern.length > 0); assert.equal([...readFileSync(finding.file, 'utf8').matchAll(new RegExp(finding.pattern, 'g'))].length, 1);
    assert.ok(finding.evidence.length > 0);
    for (const receipt of finding.evidence) assert.equal(createHash('sha256').update(readFileSync(receipt.file)).digest('hex'), receipt.sha256);
    assert.ok(finding.owner && finding.classification && finding.justification && finding.focusedProof && finding.observation);
  }
  assert.equal(restoreMenuPolicyRegistration(prepared), original);
  assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), live);
  assert.throws(() => prepareMenuPolicyRegistration(original + '\n'));
});

function inventory(source) {
  const ast = ts.createSourceFile('producer.mjs', source, 99, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0);
  let sources = [], proofs = [];
  for (const fn of ast.statements.filter(ts.isFunctionDeclaration)) {
    const visit = n => {
      if (fn.name?.text === 'sourceFingerprints' && ts.isVariableDeclaration(n) && n.name.getText(ast) === 'files') sources = n.initializer.elements.map(e => e.text);
      if (fn.name?.text === 'focusedProofInventory' && ts.isCallExpression(n) && n.expression.getText(ast) === 'proof') proofs.push(n.getText(ast));
      ts.forEachChild(n, visit);
    }; visit(fn);
  }
  return { sources, proofs };
}
test('pending producer registration conserves complete frozen inventories and verifies every new proof declaration', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const live = readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), original = frozenRead(file, 'utf8').replaceAll('\r\n', '\n');
  const before = inventory(original), prepared = prepareMenuProducerRegistration(original, readFileSync), after = inventory(prepared);
  assert.equal(before.sources.length, 1002); assert.equal(before.proofs.length, 326);
  assert.equal(after.sources.length, 1028); assert.equal(after.proofs.length, 353);
  assert.equal(new Set(after.sources).size, 1028);
  assert.deepEqual(after.sources.slice(26), before.sources); assert.deepEqual(after.proofs.slice(27), before.proofs);
  assert.deepEqual(after.sources.slice(0,26), menuPendingSources);
  for (const row of menuPendingProofRows(readFileSync)) assert.ok(new RegExp(row.pattern).test(readFileSync(row.file, 'utf8')));
  assert.equal(restoreMenuProducerRegistration(prepared, readFileSync), original);
  assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), live);
});
test('pending registration rejects changed frozen producer or missing proof source', () => {
  const source = frozenRead('tests/material-parity/input-equivalence-audit.mjs');
  assert.throws(() => prepareMenuProducerRegistration(source.toString() + '\n', readFileSync));
  assert.throws(() => prepareMenuProducerRegistration(source, file => file.endsWith('menu-popup-ax.spec.mjs') ? Buffer.from('') : readFileSync(file)));
});
