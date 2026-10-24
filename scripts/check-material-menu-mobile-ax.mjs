import assert from 'node:assert/strict';
import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import ts from 'typescript';
import { validateSupplementalCapture } from '../tests/material-parity/supplemental-capture-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { createMenuHistoricalRead } from '../tests/material-parity/menu-select-disabled-registration.mjs';

const file = process.argv[2]; assert.ok(file);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = readFileSync(file), report = JSON.parse(bytes);
assert.equal(report.results.length, 4);
const pairs = [];
for (const profile of ['light', 'dark']) {
  const rows = Object.fromEntries(['reference', 'astylar'].map(side => {
    const matches = report.results.filter(r => r.profile === profile && r.mode === side);
    assert.equal(matches.length, 1); const row = matches[0];
    assert.equal(row.family, 'menu'); assert.equal(row.viewport.id, 'mobile-dpr2');
    assert.deepEqual(row.boundaries.map(b => b.state), ['initial-closed', 'open-1', 'closed-1', 'open-2', 'closed-2', 'open-3', 'closed-3']);
    return [side, row];
  }));
  for (let i = 0; i < 7; i++) {
    const pair = {};
    for (const side of ['reference', 'astylar']) {
      const row = rows[side], boundary = row.boundaries[i], actual = boundary.observation.actualAX;
      pair[side] = { runtime: row.runtime, inputTree: boundary.inputTree };
      assert.equal(hash(readFileSync(boundary.screenshot.file)), boundary.screenshot.sha256);
      const trigger = actual.nodes.find(n => n.backendDOMNodeId === actual.dom.trigger.backendNodeId);
      assert.ok(trigger && !trigger.ignored); assert.equal(trigger.role.value, 'button');
      if (boundary.state.startsWith('open-')) {
        assert.equal(boundary.observation.open, true);
        const popup = actual.nodes.find(n => n.backendDOMNodeId === actual.dom.popup.backendNodeId);
        assert.ok(popup && !popup.ignored); assert.equal(popup.role.value, 'menu');
        assert.deepEqual(trigger.properties.find(p => p.name === 'controls').value.relatedNodes,
          [{ backendDOMNodeId: actual.dom.popup.backendNodeId, idref: actual.dom.popup.id }]);
        for (const [key, name] of [['rename', 'Rename'], ['delete', 'Delete']]) {
          const item = actual.nodes.find(n => n.backendDOMNodeId === actual.dom[key].backendNodeId);
          assert.equal(item.role.value, 'menuitem'); assert.equal(item.name.value, name);
        }
        assert.equal(actual.dom.popup.tabindex, side === 'reference' ? '-1' : null);
        assert.equal(actual.dom.trigger.focused, side === 'astylar');
      } else {
        assert.equal(boundary.observation.open, false); assert.equal(actual.dom.popup, null);
        assert.equal(actual.nodes.some(n => !n.ignored && n.role?.value === 'menu'), false);
        assert.equal(actual.dom.trigger.expanded, 'false');
        if (i > 0) assert.equal(actual.dom.trigger.focused, true);
        assert.equal(actual.dom.trigger.controls, side === 'reference' ? null : 'astylar-semantic-1-menu-popup');
      }
    }
    pairs.push(pair);
  }
}
const manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
const producerFile = 'scripts/audit-material-menu-mobile-ax.mjs';
const producerReceipt = manifest.provenance.diagnosticFiles.find(r => r.file === producerFile);
assert.ok(producerReceipt);
const currentProducer = readFileSync(producerFile);
let historicalProducer;
if (hash(currentProducer) !== producerReceipt.sha256) {
  assert.equal(producerReceipt.sha256, '07e1a052fc49ee423efaa0f671cc6b388b58548d479ba8d07f899b8a4b3c357e');
  historicalProducer = execFileSync('git', ['show', `0b2f7a41:${producerFile}`]);
  assert.equal(hash(historicalProducer), producerReceipt.sha256);
  const captureBranch = bytes => {
    const ast = ts.createSourceFile(producerFile, bytes.toString(), 99, true, ts.ScriptKind.JS);
    const branches = ast.statements.filter(n => ts.isIfStatement(n) && n.expression.getText(ast) === "process.argv[2] === '--verify'");
    assert.equal(branches.length, 1); return branches[0].elseStatement.getText(ast);
  };
  assert.equal(captureBranch(currentProducer), captureBranch(historicalProducer), 'Collection branch changed; historical verifier exception no longer applies');
  const nonVerifierSource = bytes => {
    const ast = ts.createSourceFile(producerFile, bytes.toString(), 99, true, ts.ScriptKind.JS);
    return ast.statements.filter(n => !(ts.isIfStatement(n) && n.expression.getText(ast) === "process.argv[2] === '--verify'") &&
      n.getText(ast) !== "import { execFileSync } from 'node:child_process';").map(n => n.getText(ast)).join('\n');
  };
  assert.equal(nonVerifierSource(currentProducer), nonVerifierSource(historicalProducer), 'Non-verification producer statements changed');
}
const inside = (base, file) => file === base || file.startsWith(base + path.sep);
const allowedRoots = [realpathSync(process.cwd()), realpathSync('artifacts/material-parity')];
const guardedRead = file => {
  if (historicalProducer && path.resolve(file) === path.resolve(producerFile)) return historicalProducer;
  assert.ok(allowedRoots.some(root => inside(root, realpathSync(file))), 'Evidence symlink escapes allowed roots');
  return readFileSync(file);
};
const read = createMenuHistoricalRead({ root: process.cwd(), read: guardedRead });
// Only reshape side/boundary containers; all original receipts/runtime records
// pass unchanged through the existing validator. Raw report is never rewritten.
assert.deepEqual(validateSupplementalCapture({ ...report, results: pairs }, {
  reportFile: file, expectedProvenance: manifest.provenance,
  script: 'scripts/audit-material-menu-mobile-ax.mjs', styleProperties: Object.values(propertyGroups).flat(),
  readBytes: read,
}), { status: 'checkpoint-bound', errors: [] });
for (const receipt of [...manifest.provenance.harnessFiles, ...manifest.provenance.diagnosticFiles]) assert.equal(hash(read(receipt.file)), receipt.sha256);
console.log(JSON.stringify({ reportSha256: hash(bytes), physicalContexts: 2, pairedBoundaries: pairs.length,
  sideBoundaries: 28, rawReportPreserved: true, historicalProducerAuthenticated: !!historicalProducer, currentRenderingAccepted: false }));
