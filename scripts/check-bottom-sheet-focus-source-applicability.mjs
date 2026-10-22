import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(fs.readFileSync(file)) });
const traceFile = 'artifacts/material-parity/overlay-focus-current-6606d13-controls/result.json';
const traceBytes = fs.readFileSync(traceFile), trace = JSON.parse(traceBytes);
assert.equal(hash(traceBytes), 'cc12796e722e1415263f84f542104897b5836913d7783bb6c30526da1e9c1e0c');
assert.deepEqual(trace.errors, []); assert.equal(trace.cases.length, 12);
const currentFile = 'examples/material-showcase/src/app/astylar.component.ts';
const originalFile = 'D:/dev/github/AstylarUI-material/examples/material-showcase/src/app/astylar.component.ts';
const original = fs.readFileSync(originalFile), captured = trace.sourceMatches.find(r => r.file === currentFile);
assert.equal(hash(original), captured.sha256);
const methods = bytes => {
  const ast = ts.createSourceFile(currentFile, bytes.toString(), 99, true);
  const owner = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'AstylarShowcaseComponent');
  return ['handleClick', 'familyElements'].map(name => {
    const found = owner.members.filter(n => ts.isMethodDeclaration(n) && n.name.getText(ast) === name);
    assert.equal(found.length, 1); return { name, source: found[0].getText(ast).replaceAll('\r\n', '\n') };
  });
};
const current = methods(fs.readFileSync(currentFile)); assert.deepEqual(current, methods(original));
const bindingFile = 'artifacts/material-parity/list-static-ax-review-20261021.log', binding = JSON.parse(fs.readFileSync(bindingFile));
const currentBinding = binding.bindings.find(b => b.current.file === currentFile);
assert.equal(hash(fs.readFileSync(currentFile)), currentBinding.current.sha256);
assert.equal(hash(fs.readFileSync(currentBinding.sourceMap.file)), currentBinding.sourceMap.sha256);
const map = JSON.parse(fs.readFileSync(currentBinding.sourceMap.file));
const index = map.sources.indexOf(currentBinding.sourcePath); assert.ok(index >= 0);
assert.deepEqual(methods(Buffer.from(map.sourcesContent[index])), current);
const rows = trace.cases.filter(r => r.family === 'bottom-sheet' && r.mode === 'astylar');
assert.deepEqual(rows.map(r => r.instrumented).sort(), [false, true]);
const row = rows.find(r => r.instrumented), events = row.trace;
const attempt = events.findIndex(r => r.event === 'focus-result' && r.target === 'bottom-sheet-dismiss');
assert.ok(attempt >= 0); assert.equal(events[attempt].ok, false);
assert.ok(Array.isArray(events[attempt].ids)); assert.ok(!events[attempt].ids.includes('bottom-sheet-dismiss'));
const firstUpdate = events.findIndex(r => r.event === 'update-call'); assert.ok(firstUpdate > attempt);
assert.ok(events.some((r, i) => i > firstUpdate && r.event === 'update-resolved' && r.ids.includes('bottom-sheet-dismiss')));
assert.ok(current[0].source.includes("else void this.surface?.whenSettled().then(() => this.surface?.focus(id.replace('-primary', '-dismiss')))"));
assert.ok(current[1].source.includes("class: 'modal-overlay bottom-sheet-overlay', role: 'dialog'"));
assert.ok(current[1].source.includes("id: 'bottom-sheet-dismiss', class: 'bottom-sheet-option', autofocus: true"));
const endpointFile = 'artifacts/material-parity/bottom-sheet-activate-ax-review-20261022.log';
const endpoint = JSON.parse(fs.readFileSync(endpointFile)); assert.equal(endpoint.pairs, 9); assert.equal(endpoint.negativeControlsRejected, 108);
for (const o of endpoint.observations) assert.equal(hash(fs.readFileSync(o.file)), o.sha256);
console.log(JSON.stringify({ producer: receipt('scripts/check-bottom-sheet-focus-source-applicability.mjs'),
  historicalTrace: receipt(traceFile), preservedCapturedSource: receipt(originalFile), capturedSourceReceipt: captured,
  current: receipt(currentFile), currentSourceBinding: receipt(bindingFile), sourceMap: currentBinding.sourceMap,
  exactWholeAuthoredMethods: current.map(({ name, source }) => ({ name, sha256: hash(source) })),
  historicalOrdering: { focusAttempt: attempt, firstOpenUpdate: firstUpdate, targetMissingAtAttempt: true, failedRequest: true, targetPresentAfterUpdate: true },
  newEndpoint: receipt(endpointFile),
  conclusion: 'Existing historical scheduling cause remains applicable to the unchanged complete authored handleClick/familyElements methods,also bound to the new pinned served source. A role=dialog div does not opt into the core modal-dialog autofocus lifecycle. Preserve this application request-order defect separately from names/roles and modal core behavior;do not repeat the same reduction or convert the fixture into a modal as a visual workaround.',
  boundary: 'Exact authored method applicability and historical trace ordering,not whole old/new code equality,Chrome equivalence or proof of timing cause for each of the9 new endpoint pairs. No new capture,renderer/fixture change,current whole-rendering or case closure.',
  renderingAccepted: false, inspectionComplete: false }));
