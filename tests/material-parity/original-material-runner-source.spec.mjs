import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import test from 'node:test';
import ts from 'typescript';

const hash = b => createHash('sha256').update(b).digest('hex');
function loadOriginal() {
  const compressed = Buffer.from(readFileSync('docs/evidence/material-original-runner-e01.mjs.gz.b64', 'utf8').replace(/\s/g, ''), 'base64');
  assert.equal(hash(compressed), 'e4922400a7ee2d64bb531a93a2b490b7478636f45d77dc4d5d854b5321949a85');
  const bytes = gunzipSync(compressed); assert.equal(bytes.length, 96666);
  assert.equal(hash(bytes), 'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0');
  return bytes;
}
test('portable original Material runner bytes match the complete immutable full-capture receipt', () => {
  const bytes = loadOriginal(), file = 'artifacts/material-parity/current-full-20261005/latest-report.json';
  const reportBytes = readFileSync(file); assert.equal(hash(reportBytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const report = JSON.parse(reportBytes);
  const receipts = report.captureProvenance.harnessFiles.filter(r => r.file === 'tests/material-parity/run-material-parity.mjs');
  assert.equal(receipts.length, 1); assert.equal(receipts[0].sha256, hash(bytes));
  const normalized = bytes.toString().replaceAll('\r\n', '\n');
  assert.equal(hash(normalized), '33c5a4b31a5140bb19e524eaa9fba5bbbb877b45a38f6f0be5722fbe09113f6a');
  assert.notEqual(hash(normalized), hash(bytes), 'Mixed line endings are part of the captured source receipt');
  const ast = ts.createSourceFile('original-runner.mjs', bytes.toString(), 99, true, ts.ScriptKind.JS);
  assert.deepEqual(ast.parseDiagnostics, []);
  assert.equal(report.captureProvenance.cases.length, 436);
  assert.equal(report.captureProvenance.interactionCases.length + report.captureProvenance.mobileFlowCases.length, 1875);
  // This authenticates original producer bytes, not complete runtime/event/paint or current-code acceptance.
});
test('recorded runner patches preserve exact payload hashes and chronological source anchors', () => {
  loadOriginal();
  const evidence = JSON.parse(readFileSync('docs/evidence/material-original-runner-launch-patches.json'));
  assert.equal(evidence.patches.length, 7);
  assert.equal(evidence.targetRawSha256, 'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0');
  let previous = '';
  for (const row of evidence.patches) {
    assert.equal(hash(row.patch), row.patchSha256);
    assert.ok(row.timestamp > previous); previous = row.timestamp;
    assert.ok(Number.isSafeInteger(row.byteOffset));
    assert.match(row.patch, /Update File: D:\/dev\/github\/AstylarUI-audit-integration\/tests\/material-parity\/run-material-parity\.mjs/);
  }
  // The portable runner needs neither the external transcript nor the mutable predecessor at replay time.
});

test('recovered original action/theme methods preserve maintained procedures without claiming whole-runner identity', () => {
  const original = ts.createSourceFile('original.mjs', loadOriginal().toString(), 99, true, ts.ScriptKind.JS);
  const current = ts.createSourceFile('current.mjs', readFileSync('tests/material-parity/run-material-parity.mjs', 'utf8'), 99, true, ts.ScriptKind.JS);
  const body = (tree, name) => {
    const nodes = tree.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
    assert.equal(nodes.length, 1); return nodes[0].getText(tree).replaceAll('\r\n', '\n');
  };
  for (const name of ['performInteraction', 'interactionTargetBox', 'settleInteraction', 'profileTheme', 'sendShowcaseCommand', 'waitForThemeApplied']) {
    assert.equal(body(original, name), body(current, name), name);
  }
  assert.notEqual(hash(readFileSync('tests/material-parity/run-material-parity.mjs')), hash(loadOriginal()));
  // Method content applicability is separate from changed capture instrumentation and full runtime provenance.
});
