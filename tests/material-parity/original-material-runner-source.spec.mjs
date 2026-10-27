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
test('datepicker opening finding preserves all predecessors and binds the exact current branch', async () => {
  const { execFileSync } = await import('node:child_process');
  const { sourceAuditDefinitions } = await import('./input-equivalence-policy.mjs');
  const previous = execFileSync('git', ['show', '443acd94:tests/material-parity/input-equivalence-policy.mjs'], { encoding: 'utf8' });
  const prior = Function(previous.replace(/^export const /gm, 'const ') + ';return sourceAuditDefinitions;')();
  assert.equal(prior.length, 204); assert.equal(sourceAuditDefinitions.length, 205);
  assert.deepEqual(sourceAuditDefinitions.slice(0, -1), prior);
  const finding = sourceAuditDefinitions.at(-1);
  assert.equal(finding.id, 'fixture-datepicker-opening-focus-transfer-omitted');
  assert.equal(finding.classification, 'application-plugin-authoring-defect');
  const current = readFileSync(finding.file, 'utf8');
  assert.equal([...current.matchAll(new RegExp(finding.pattern, 'g'))].length, 1);
  assert.doesNotMatch(current.replace("if (opening) this.datepickerView.set('month');",
    "if (opening) this.surface.focus('calendar-active-cell');"), new RegExp(finding.pattern));
  for (const receipt of finding.evidence) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
});

test('captured datepicker opening inputs explicitly differ in calendar focus transfer', () => {
  const manifestBytes = readFileSync('artifacts/material-parity/current-full-20261005/checkpoint/manifest.json');
  assert.equal(hash(manifestBytes), '7ae2cba1739353661a0c84e28ef70819157311cc824fd00ae94ced29fadeb352');
  const receipts = JSON.parse(manifestBytes).provenance.browserFiles;
  const root = 'artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser/';
  function source(file, suffix, expected) {
    for (const asset of [file.replace(/\.map$/, ''), file]) {
      assert.equal(hash(readFileSync(root + asset)), receipts.find(r => r.file === asset).sha256);
    }
    const map = JSON.parse(readFileSync(root + file));
    const indexes = map.sources.flatMap((s, i) => s.endsWith(suffix) ? [i] : []);
    assert.equal(indexes.length, 1);
    const text = map.sourcesContent[indexes[0]]; assert.equal(hash(text), expected);
    return ts.createSourceFile(suffix, text, 99, true);
  }
  function methods(ast, names) {
    const found = [];
    function visit(n) {
      if (ts.isMethodDeclaration(n) && names.includes(n.name.getText(ast))) found.push(n.getText(ast));
      ts.forEachChild(n, visit);
    }
    visit(ast); assert.equal(found.length, names.length);
    const js = ts.transpileModule(`class Replay { ${found.join('\n')} }`,
      { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    return new (Function(js + ';return Replay')())();
  }
  const native = source('chunk-7SL66K3U.js.map', '/datepicker.mjs',
    'd19532ed7097a899496310d27e6e0a493e7581b16d40674f14fc82bcf5c489ae');
  function nativeClass(name, names) {
    const node = native.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === name);
    assert.ok(node);
    return methods(ts.createSourceFile('native.ts', node.getText(native), 99, true), names);
  }
  const calls = [];
  const calendar = nativeClass('MatCalendar', ['focusActiveCell']);
  calendar._getCurrentViewComponent = () => ({ _focusActiveCell: value => calls.push(['cell-focus', value]) });
  const content = nativeClass('MatDatepickerContent', ['ngAfterViewInit']);
  content.datepicker = { stateChanges: { subscribe: () => ({ unsubscribe() {} }) } };
  content._calendar = calendar;
  content.ngAfterViewInit();
  assert.deepEqual(calls, [['cell-focus', false]]);

  const candidate = source('chunk-JPEJK334.js.map', 'astylar.component.ts',
    '71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd');
  const replay = methods(candidate, ['handleClick', 'dismissPopupForOutsideTarget']);
  let state = { open: false, disabled: false };
  const effects = [];
  replay.store = { state: () => state, patchState: patch => { state = { ...state, ...patch }; effects.push(['patch', patch]); } };
  replay.datepickerView = { set: view => effects.push(['view', view]) };
  replay.family = () => 'datepicker';
  replay.status = { set() {} };
  replay.surface = { focus: (...args) => effects.push(['focus', ...args]), whenSettled: () => { throw Error('Unexpected settlement request'); } };
  replay.handleClick('datepicker-icon', { targetId: 'datepicker-icon' });
  assert.deepEqual(effects, [['view', 'month'], ['patch', { open: true }]]);
  assert.equal(state.open, true);
  effects.length = 0;
  replay.handleClick('datepicker-icon', { targetId: 'datepicker-icon' });
  assert.deepEqual(effects, [['patch', { open: false }]]);
  // Source-extracted complete click/dismiss methods, not hand-written substitutes.
  // This identifies an opening-input omission; it does not exonerate all core
  // focus/reconciliation paths or establish local paint/current-code acceptance.
});

test('fresh seventeen-case datepicker toggle trace records opening and divergent focus destinations', async () => {
  const { execFileSync } = await import('node:child_process');
  const directory = 'artifacts/material-parity/datepicker-toggle-activation-20261027';
  const bytes = readFileSync(directory + '/latest-report.json');
  assert.equal(hash(bytes), '20c3697d44b777b380c070a3b2cf3b5178b68f3814e2aeb662d5aeed699ca62e');
  // This capture predates the additive finding. Restore only its exact policy
  // bytes for receipt verification in a separate read-only process; no disk edit.
  const policyFile = 'tests/material-parity/input-equivalence-policy.mjs';
  const historical = execFileSync('git', ['show', `443acd94:${policyFile}`]);
  assert.equal(hash(historical), 'a38dc20ab17b392fcd1eeac4e8ff693859c3dbfaf4395ae0e0a782326bd72a6c');
  const bootstrap = `import fs from 'node:fs';import path from 'node:path';import {syncBuiltinESMExports} from 'node:module';
    const original=fs.readFileSync,target=path.resolve(${JSON.stringify(policyFile)}),bytes=original(0);
    fs.readFileSync=function(file,options){if(typeof file==='string'&&path.resolve(file)===target){const encoding=typeof options==='string'?options:options?.encoding;return encoding?bytes.toString(encoding):Buffer.from(bytes);}return original.apply(this,arguments);};
    syncBuiltinESMExports();`;
  const verified = JSON.parse(execFileSync(process.execPath, ['--import', 'data:text/javascript;base64,' + Buffer.from(bootstrap).toString('base64'),
    'scripts/audit-material-configured-control-activation.mjs', '--verify', directory, '--datepicker-activation'], { encoding: 'utf8', input: historical }));
  assert.equal(verified.cases, 17); assert.equal(verified.sourceRecipeVerified, true);
  const report = JSON.parse(bytes);
  assert.equal(report.browser, '156.0.8078.48');
  const inspect = row => {
    const reference = row.reference.observations.at(-1), candidate = row.astylar.observations.at(-1);
    for (const side of [reference, candidate]) {
      const clicks = side.events.filter(e => ['pointerdown', 'pointerup', 'click'].includes(e.type));
      assert.deepEqual(clicks.map(e => e.type), ['pointerdown', 'pointerup', 'click']);
      assert.ok(clicks.every(e => e.trusted));
    }
    const routed = candidate.configuredEvents.filter(e => ['pointerdown', 'pointerup', 'click'].includes(e.type));
    assert.deepEqual(routed.map(e => [e.type, e.targetId]),
      ['pointerdown', 'pointerup', 'click'].map(type => [type, 'datepicker-icon']));
    assert.equal(candidate.state.open, true);
    assert.equal(candidate.active.logicalId, 'datepicker-icon');
    assert.equal(reference.active.tag, 'BUTTON');
    assert.ok(reference.activeAncestry.some(n => n.tag === 'MAT-CALENDAR'));
    assert.ok(reference.activeAncestry.some(n => n.role === 'gridcell'));
    assert.equal(reference.activeWithinHost, false);
  };
  for (const row of report.results) inspect(row);
  for (const mutate of [
    row => { row.astylar.observations.at(-1).state.open = false; },
    row => { row.astylar.observations.at(-1).active.logicalId = 'datepicker-control'; },
    row => { row.reference.observations.at(-1).activeAncestry = []; },
  ]) { const altered = structuredClone(report.results[0]); mutate(altered); assert.throws(() => inspect(altered)); }
  // Maintained exact configured actions, not an input click or unobserved
  // sub-frame opening/paint. This is new-browser retained-build evidence.
});
test('original datepicker activation targets the toggle and seventeen retained endpoints contain calendars', () => {
  const original = ts.createSourceFile('original.mjs', loadOriginal().toString(), 99, true, ts.ScriptKind.JS);
  const target = original.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'interactionTargetBox');
  const declarations = target.body.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations]);
  for (const [name, expected] of [['referenceTargets', '#datepicker-primary mat-datepicker-toggle button'], ['astylarTargets', 'datepicker-icon']]) {
    const object = declarations.find(n => n.name.getText(original) === name).initializer;
    const property = object.properties.find(n => n.name.getText(original) === 'datepicker');
    assert.equal(property.initializer.text, expected);
  }
  const root = 'artifacts/material-parity/working-audit/f16b51d247b97cbeeb87b3ecde6ca0175f2b1f654e29a74c83e1e5516c5a10e0';
  const bytes = readFileSync(root + '/index.json');
  assert.equal(hash(bytes), '52342f029cf75aba64f9d5da25d9ce8e1b077615d8fdfe530366f880c0b7ca4e');
  const cases = JSON.parse(bytes).metadata.coverage.inspectionEvidence.cases.filter(c =>
    c.family === 'datepicker' && /\/(activate|activate-leave)$/.test(c.case));
  const expected = ['light', 'dark', 'contrast', 'custom'].flatMap(profile => [1, 2].flatMap(dpr =>
    ['activate', 'activate-leave'].map(state => `interaction:datepicker@${profile}/desktop-dpr${dpr}/${state}`)));
  expected.push('interaction:datepicker@light/desktop-short-dpr1/activate');
  assert.deepEqual(cases.map(c => c.case), expected);
  for (const c of cases) for (const [side, receipt] of Object.entries(c.evidence.pairedTrees)) {
    const bytes = readFileSync(receipt.file); assert.equal(hash(bytes), receipt.sha256);
    const tree = JSON.parse(bytes); assert.deepEqual(tree.errors, []);
    const popup = tree.nodes.filter(n => side === 'reference' ? n.type === 'mat-calendar' : n.authored?.id === 'datepicker-popup');
    assert.equal(popup.length, 1, `${c.case}/${side}`);
  }
  // Selector intent plus retained endpoint presence is not raw pointer delivery,
  // visible paint, input-click behavior, intermediate state, or current acceptance.
});
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
