import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { materialInteractionCases } from '../tests/material-parity/benchmark.config.mjs';
import { materialCaseKey } from '../tests/material-parity/run-checkpoint.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { validateSupplementalCapture } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Preserve the captured producer and its failed one-click verifier. Native
// label forwarding produces a second trusted click in exactly16 switch rows.
const hash = b => createHash('sha256').update(b).digest('hex');
const file = 'artifacts/material-parity/pointer-focus-mutations-20261019/latest-report.json';
const bytes = readFileSync(file), report = JSON.parse(bytes);
assert.equal(hash(bytes), 'd49b33a5e32e51cb7e1674574ec2b16f4b12a4ffc607df0595c007b8d3abf89d');
const manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
assert.deepEqual(validateSupplementalCapture(report, { reportFile: file,
  expectedProvenance: manifest.provenance, script: 'scripts/audit-material-pointer-focus-mutations.mjs',
  styleProperties: Object.values(propertyGroups).flat() }), { status: 'checkpoint-bound', errors: [] });
for (const r of [...manifest.provenance.harnessFiles, ...manifest.provenance.diagnosticFiles,
  report.sourceRecipe.pointerAdapter, report.sourceRecipe.eventProducer, report.sourceRecipe.mutationProducer,
  report.sourceRecipe.base, ...report.sourceRecipe.baseGraph]) assert.equal(hash(readFileSync(r.file)), r.sha256);
const runner = readFileSync(report.actionSource.file), ast = ts.createSourceFile(report.actionSource.file, runner.toString(), 99, true, ts.ScriptKind.JS);
const names = ['performInteraction', 'interactionTargetBox', 'settleInteraction', 'profileTheme', 'sendShowcaseCommand', 'waitForThemeApplied', 'measureAstylarInputs'];
const methods = names.map(name => {
  const found = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.equal(found.length, 1); return found[0].getText(ast);
});
assert.equal(hash(runner), report.actionSource.sha256);
assert.equal(hash(methods.join('\n')), report.actionSource.methodsSha256);
assert.equal(report.sourceRecipe.logicalRunnerSha256, 'b3f32bd40b246fabbc2d5e328853086729194774bd73132ddb6d4041effe14e1');
const families = ['chips', 'slide-toggle', 'button', 'menu', 'expansion', 'snack-bar', 'tooltip'];
const cases = materialInteractionCases.filter(c => families.includes(c.family) && ['activate', 'activate-leave'].includes(c.state));
assert.equal(cases.length, 113);
assert.deepEqual(report.results.map(r => r.caseId).sort(), cases.map(c => materialCaseKey('interaction', c)).sort());
function checkEvents(row, side) {
  const events = row[side].observations.at(-1).events;
  assert.deepEqual(events.map(e => e.sequence), events.map((_, i) => i + 1));
  for (const type of ['pointerdown', 'pointerup', 'click']) {
    const actual = events.filter(e => e.trusted && e.type === type);
    const forwarded = side === 'reference' && row.family === 'slide-toggle' && type === 'click';
    assert.equal(actual.length, forwarded ? 2 : 1);
    if (forwarded) assert.deepEqual(actual.map(e => [e.target.tag, e.target.logicalId]),
      [['SPAN', 'slide-toggle-label'], ['BUTTON', 'slide-toggle-primary-button']]);
  }
  for (const e of events) assert.ok(e.target?.tag && Array.isArray(e.path) && e.before && e.afterMicrotask && e.snapshotPoint === 'document-capture-listener');
}
let rejectedControls = 0;
for (const row of report.results) for (const side of ['reference', 'astylar']) {
  const evidence = row[side];
  assert.deepEqual(evidence.observations.map(o => o.boundary), ['before', 'after-action', 'settled']);
  assert.equal(hash(readFileSync(evidence.inputTree.file)), evidence.inputTree.sha256);
  for (const o of evidence.observations) {
    assert.equal(o.host.logicalId, `${row.family}-primary`);
    assert.equal(o.activeEqualsTarget, o.active.token === o.target.token);
    assert.ok(Array.isArray(o.mutations) && Array.isArray(o.activeAncestry));
  }
  checkEvents(row, side);
  const altered = structuredClone(row);
  altered[side].observations.at(-1).events.find(e => e.type === 'pointerdown').trusted = false;
  assert.throws(() => checkEvents(altered, side)); rejectedControls++;
}
console.log(JSON.stringify({ reportSha256: hash(bytes), cases: report.results.length, pairedBoundaries: 339,
  rejectedControls, forwardedNativeSwitchClicks: 16,
  scope: 'Authenticated capture and exact action/observation membership; no current rendering,whole-case closure or first-cause classification.' }));
