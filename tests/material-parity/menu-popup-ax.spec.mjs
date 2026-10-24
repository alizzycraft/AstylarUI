import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { menuPopupSemanticInputFindings } from './menu-popup-semantic-input-findings.mjs';
import { materialStaticCases, materialInteractionCases, materialMobileFlowCases } from './benchmark.config.mjs';
import { chromium } from 'playwright-core';
import { materialBrowserLaunchOptions } from './run-checkpoint.mjs';
import { gunzipSync } from 'node:zlib';

const file = 'artifacts/material-parity/menu-popup-ax-20261024/latest-report.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function inspect(report, expectedCases = 1) {
  assert.equal(report.results.length, expectedCases);
  assert.equal(new Set(report.results.map(r => `${r.profile}/${r.viewport.id}`)).size, expectedCases);
  for (const row of report.results) {
  assert.equal(row.family, 'menu'); assert.equal(row.state, 'open');
  if (expectedCases === 1) { assert.equal(row.profile, 'light'); assert.equal(row.viewport.id, 'desktop-dpr1'); }
  else { assert.ok(['light', 'dark', 'contrast', 'custom'].includes(row.profile)); assert.ok(['desktop-dpr1', 'desktop-dpr2'].includes(row.viewport.id)); }
  for (const side of ['reference', 'astylar']) {
    assert.deepEqual(row[side].runtime.errors, []);
    const targets = row[side].ax;
    const own = key => {
      const t = targets[key], nodes = t.nodes.filter(n => n.backendDOMNodeId === t.backendNodeId);
      assert.equal(nodes.length, 1); assert.equal(nodes[0].ignored, false); return nodes[0];
    };
    for (const [key, role, name] of [['trigger', 'button', 'Open menu'], ['popup', 'menu', ''], ['rename', 'menuitem', 'Rename'], ['delete', 'menuitem', 'Delete']]) {
      assert.equal(own(key).role.value, role); assert.equal(own(key).name.value, name);
    }
    assert.equal(targets.trigger.dom.controls, targets.popup.dom.id);
    const controls = own('trigger').properties.find(p => p.name === 'controls');
    assert.deepEqual(controls.value.relatedNodes, [{ backendDOMNodeId: targets.popup.backendNodeId, idref: targets.popup.dom.id }]);
    assert.equal(own('trigger').properties.find(p => p.name === 'expanded').value.value, true);
    const receipt = row[side].inputTree, bytes = readFileSync(receipt.file);
    assert.equal(hash(bytes), receipt.sha256);
    const tree = JSON.parse(bytes);
    if (side === 'reference') assert.equal(tree.nodes.find(n => n.attributes?.role === 'menu').attributes.tabindex, '-1');
    else {
      const authored = tree.nodes.find(n => n.authored?.id === 'menu-popup').authored;
      assert.equal(Object.hasOwn(authored, 'tabindex'), false);
      assert.equal(Object.hasOwn(authored, 'tabIndex'), false);
    }
  }
  const property = (side, target, name) => row[side].ax[target].nodes.find(n => n.backendDOMNodeId === row[side].ax[target].backendNodeId).properties.find(p => p.name === name)?.value.value;
  assert.equal(property('reference', 'rename', 'focused'), true);
  assert.equal(property('astylar', 'trigger', 'focused'), true);
  assert.equal(property('reference', 'popup', 'focusable'), true);
  assert.equal(property('astylar', 'popup', 'focusable'), undefined);
  }
}
test('retained Menu AX links resolve exact popup owners; focus and authored tabindex differences remain visible', () => {
  const bytes = readFileSync(file);
  assert.equal(hash(bytes), '244244e3ccb780d97a05a079c83677de3b23df56820f9c142dfe0c99795d99aa');
  const report = JSON.parse(bytes); inspect(report);
  for (const mutate of [r => { r.results[0].astylar.ax.trigger.dom.controls = 'wrong'; },
    r => { r.results[0].astylar.ax.popup.backendNodeId = -1; },
    r => { r.results[0].reference.ax.rename.nodes.find(n => n.backendDOMNodeId === r.results[0].reference.ax.rename.backendNodeId).name.value = 'wrong'; }]) {
    const forged = structuredClone(report); mutate(forged); assert.throws(() => inspect(forged));
  }
});

test('popup tabindex omission predates later parity changes and remains an authored-input divergence', () => {
  const file = 'examples/material-showcase/src/app/astylar.component.ts';
  const sources = { initial: execFileSync('git', ['show', `2f440115:${file}`]), current: readFileSync(file) };
  const receipts = {};
  for (const [revision, bytes] of Object.entries(sources)) {
    const ast = ts.createSourceFile(file, bytes.toString(), 99, true, ts.ScriptKind.TS);
    const matches = [], triggers = [];
    const visit = node => {
      if (ts.isObjectLiteralExpression(node) && node.properties.some(p => ts.isPropertyAssignment(p) &&
        p.name.getText(ast) === 'id' && ts.isStringLiteral(p.initializer) && p.initializer.text === 'menu-popup')) matches.push(node);
      if (ts.isObjectLiteralExpression(node) && node.properties.some(p => ts.isPropertyAssignment(p) &&
        p.name.getText(ast) === 'id' && ts.isStringLiteral(p.initializer) && p.initializer.text === 'menu-primary')) triggers.push(node);
      ts.forEachChild(node, visit);
    };
    visit(ast); assert.equal(matches.length, 1);
    const properties = matches[0].properties.map(p => p.name?.getText(ast));
    assert.ok(properties.includes('role')); assert.ok(properties.includes('children'));
    assert.equal(properties.includes('tabindex'), false); assert.equal(properties.includes('tabIndex'), false);
    assert.equal(triggers.length, 1);
    const controls = triggers[0].properties.find(p => p.name?.getText(ast) === 'ariaControls');
    assert.ok(ts.isStringLiteral(controls.initializer)); assert.equal(controls.initializer.text, 'menu-popup');
    receipts[revision] = { sourceSha256: hash(bytes), popupObjectSha256: hash(matches[0].getText(ast)), properties };
  }
  console.log(JSON.stringify({ receipts, boundary: 'Initial/current authored objects only; not every intermediate revision,motive,initial runtime or current-core rendering proof.' }));
});

test('all eight retained desktop themes and DPRs preserve exact popup AX associations and visible authoring differences', () => {
  const bytes = readFileSync('artifacts/material-parity/menu-popup-ax-contexts-retry-20261024/latest-report.json');
  assert.equal(hash(bytes), '819932e79b0bae14534f399643ac01a05942d581a2c28239d1ce88f39e49c9a1');
  const report = JSON.parse(bytes); inspect(report, 8);
  const forged = structuredClone(report); forged.results[7].profile = forged.results[0].profile;
  forged.results[7].viewport.id = forged.results[0].viewport.id;
  assert.throws(() => inspect(forged, 8));
});

test('supplementary Escape removes Menu AX owners but preserves candidate dangling authored controls', () => {
  const bytes = readFileSync('artifacts/material-parity/menu-dismissal-ax-retry-20261024/latest-report.json');
  assert.equal(hash(bytes), '6cca3cbb686397037da63b543ad3544039fa26356e60fb5d62ac5643d3997b86');
  const report = JSON.parse(bytes); inspect(report, 8);
  for (const row of report.results) for (const side of ['reference', 'astylar']) {
    const result = row[side].dismissalAX;
    assert.equal(result.action, 'supplementary-Escape-after-maintained-open');
    assert.equal(result.popupCount, 0); assert.equal(result.trigger.expanded, 'false');
    assert.equal(result.trigger.focused, true);
    assert.equal(result.trigger.controls, side === 'reference' ? null : row[side].ax.popup.dom.id);
    assert.equal(result.nodes.some(n => !n.ignored && n.role?.value === 'menu'), false);
    const trigger = result.nodes.find(n => n.backendDOMNodeId === row[side].ax.trigger.backendNodeId);
    assert.ok(trigger); assert.equal(trigger.properties.some(p => p.name === 'controls'), false);
  }
});

test('pending Menu semantic input findings retain distinct first divergences and authenticated evidence', () => {
  assert.equal(menuPopupSemanticInputFindings.length, 2);
  assert.equal(new Set(menuPopupSemanticInputFindings.map(f => f.id)).size, 2);
  for (const finding of menuPopupSemanticInputFindings) {
    assert.equal(finding.classification, 'application-plugin-authoring-defect');
    assert.equal(finding.file, 'examples/material-showcase/src/app/astylar.component.ts');
    assert.ok(finding.owner && finding.observation.stage && finding.justification && finding.boundary);
    for (const receipt of finding.evidence) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  }
});

test('Menu AX context coverage binds only eight configured desktop open cases, not mobile flows or all ninety-four cases', () => {
  const staticCases = materialStaticCases.filter(c => c.family === 'menu');
  const interactions = materialInteractionCases.filter(c => c.family === 'menu');
  const mobile = materialMobileFlowCases.filter(c => c.family === 'menu');
  assert.equal(staticCases.length, 12); assert.equal(interactions.length, 80); assert.equal(mobile.length, 2);
  assert.deepEqual(mobile.map(c => [c.profile, c.viewport.id, c.state]),
    [['light', 'mobile-dpr2', 'open-dismiss'], ['dark', 'mobile-dpr2', 'open-dismiss']]);
  const key = c => `interaction:${c.family}@${c.profile}/${c.viewport.id}/${c.state}`;
  const expected = interactions.filter(c => c.state === 'open').map(key).sort();
  assert.equal(expected.length, 8);
  for (const reportFile of ['menu-popup-ax-contexts-retry-20261024', 'menu-dismissal-ax-retry-20261024']) {
    const report = JSON.parse(readFileSync(`artifacts/material-parity/${reportFile}/latest-report.json`));
    assert.deepEqual(report.results.map(key).sort(), expected);
    assert.ok(report.results.every(c => !mobile.map(key).includes(key(c))));
  }
});

test('mobile Menu AX uses the original side/boundary shape without weakening checkpoint validation', () => {
  const output = execFileSync(process.execPath, ['scripts/check-material-menu-mobile-ax.mjs',
    'artifacts/material-parity/menu-mobile-ax-retry-20261024/latest-report.json'], { encoding: 'utf8' });
  const result = JSON.parse(output);
  assert.equal(result.physicalContexts, 2); assert.equal(result.pairedBoundaries, 14);
  assert.equal(result.sideBoundaries, 28); assert.equal(result.rawReportPreserved, true);
  assert.equal(result.currentRenderingAccepted, false);
});

test('Menu semantic declaration attribution binds map content and actual loaded JavaScript receipts', () => {
  const root = 'artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser';
  const mapBytes = readFileSync(root + '/chunk-JPEJK334.js.map');
  assert.equal(hash(mapBytes), '47654b641610e1d56e02948b17fab41aff25e9c6aedc6f83b70a26b6f349ce9e');
  const map = JSON.parse(mapBytes), index = map.sources.findIndex(s => s.endsWith('/astylar.component.ts'));
  assert.ok(index >= 0);
  assert.equal(map.sourcesContent[index], readFileSync('examples/material-showcase/src/app/astylar.component.ts', 'utf8'));
  const js = readFileSync(root + '/chunk-JPEJK334.js');
  assert.match(js.toString(), /sourceMappingURL=chunk-JPEJK334\.js\.map/);
  let candidateLoads = 0;
  for (const name of ['menu-popup-ax-contexts-retry-20261024', 'menu-dismissal-ax-retry-20261024', 'menu-mobile-ax-retry-20261024']) {
    const report = JSON.parse(readFileSync(`artifacts/material-parity/${name}/latest-report.json`));
    const manifestReceipt = report.capture.checkpointManifest, manifestBytes = readFileSync(manifestReceipt.file);
    assert.equal(hash(manifestBytes), manifestReceipt.sha256);
    const manifest = JSON.parse(manifestBytes);
    assert.equal(manifest.provenance.browserFiles.find(f => f.file.endsWith('chunk-JPEJK334.js.map')).sha256, hash(mapBytes));
    for (const row of report.results) for (const side of row.mode === 'astylar' ? [row] : row.astylar ? [row.astylar] : []) {
      const assets = side.runtime.assets.filter(a => a.file === 'chunk-JPEJK334.js');
      assert.equal(assets.length, 1); assert.equal(assets[0].sha256, hash(js)); candidateLoads++;
    }
  }
  assert.equal(candidateLoads, 18);
});

test('mobile producer verification entry point authenticates captured source without rerunning collection', () => {
  const output = execFileSync(process.execPath, ['scripts/audit-material-menu-mobile-ax.mjs', '--verify',
    'artifacts/material-parity/menu-mobile-ax-retry-20261024/latest-report.json'], { encoding: 'utf8' });
  const result = JSON.parse(output);
  assert.equal(result.reportSha256, '04ab953a6db5773212b85c9bc09c20d01708d065c38704a36ce1f58038620ba0');
  assert.equal(result.historicalProducerAuthenticated, true);
  assert.equal(result.sideBoundaries, 28); assert.equal(result.currentRenderingAccepted, false);
});

test('isolated current focus eligibility and semantic projection honor supplied negative tabindex and removed controls', async () => {
  const extract = (file, owner, names) => {
    const bytes = readFileSync(file), ast = ts.createSourceFile(file, bytes.toString(), 99, true, ts.ScriptKind.TS);
    const cls = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === owner);
    assert.ok(cls);
    const methods = names.map(name => {
      const matches = cls.members.filter(n => ts.isMethodDeclaration(n) && n.name.getText(ast) === name);
      assert.equal(matches.length, 1); return matches[0].getText(ast);
    });
    const code = ts.transpileModule(`class Probe { ${methods.join('\n')} }`, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
    }).outputText;
    return { code, file, sha256: hash(bytes), methodsSha256: hash(methods.join('\n')) };
  };
  const runtime = extract('src/lib/astylar-interaction-runtime.ts', 'AstylarInteractionRuntime', ['buildFocusableElementIds', 'buildFocusOrder']);
  const Runtime = new Function(runtime.code + ';return Probe;')(), probe = new Runtime();
  const site = { styles: [], root: { children: [
    { type: 'div', id: 'popup', role: 'menu', tabindex: -1 },
    { type: 'div', id: 'omitted', role: 'menu' }, { type: 'button', id: 'trigger' },
  ] } };
  assert.deepEqual([...probe.buildFocusableElementIds(site)], ['popup', 'trigger']);
  assert.deepEqual(probe.buildFocusOrder(site), ['trigger']);
  const bridge = extract('src/lib/astylar-semantic-bridge.ts', 'AstylarSemanticBridge', ['applyAttributes', 'nativeId', 'nativeIdRefs']);
  const browser = await chromium.launch(materialBrowserLaunchOptions());
  try {
    const page = await browser.newPage();
    const result = await page.evaluate(code => {
      const Probe = new Function(code + ';return Probe;')(), bridge = new Probe(); bridge.prefix = '';
      const reset = document.createElement('button'), reference = document.createElement('div'), candidate = document.createElement('div');
      document.body.append(reset, reference, candidate);
      reference.setAttribute('role', 'menu'); reference.setAttribute('tabindex', '-1');
      bridge.applyAttributes(candidate, { type: 'div', id: 'popup', role: 'menu', tabindex: -1, ariaControls: 'item' });
      reference.focus(); const nativeFocused = document.activeElement === reference;
      reset.focus(); candidate.focus(); const candidateFocused = document.activeElement === candidate;
      const negativeTabindex = candidate.getAttribute('tabindex');
      reset.focus(); bridge.applyAttributes(candidate, { type: 'div', id: 'popup', role: 'menu' });
      candidate.focus();
      return { nativeFocused, candidateFocused, negativeTabindex, omittedTabindex: candidate.getAttribute('tabindex'),
        omittedFocused: document.activeElement === candidate, removedControls: candidate.getAttribute('aria-controls') };
    }, bridge.code);
    assert.deepEqual(result, { nativeFocused: true, candidateFocused: true, negativeTabindex: '-1',
      omittedTabindex: null, omittedFocused: false, removedControls: null });
    console.log(JSON.stringify({ runtime: { ...runtime, code: undefined }, bridge: { ...bridge, code: undefined }, result,
      boundary: 'Complete extracted methods and native browser DOM only;not package-root/full-surface proof,AX,paint,focus update lifetime or current whole-renderer acceptance.' }));
  } finally { await browser.close(); }
});

test('public negative-tabindex failure remains unfocused after settlement until an unrelated update', () => {
  const bytes = readFileSync('artifacts/material-parity/public-menu-negative-tabindex-settled-20261024/latest-report.json');
  assert.equal(hash(bytes), 'a75f974f1b8570c4a8dadde51f65115e93703d3ea796a5993f4deadf7f4d889c');
  const report = JSON.parse(bytes);
  assert.deepEqual(report.errors, []); assert.equal(report.results.length, 4);
  for (const receipt of [report.inputSource, report.bundle, report.html, ...report.inputs]) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  assert.equal(report.scriptSha256, hash(readFileSync('scripts/audit-public-menu-negative-tabindex.mjs')));
  for (const row of report.results) {
    assert.deepEqual(row.reference.site, row.astylar.site);
    assert.equal(row.astylar.site.root.children[0].children[0].tabindex, -1);
    assert.equal(row.astylar.site.root.children[0].children[0].role, 'menu');
    const sample = row.astylar.updates[0];
    assert.equal(sample.publicFocusResult, true); assert.equal(sample.immediateFocus, false);
    assert.equal(sample.settledBeforeUpdate, true); assert.equal(sample.initiallyFocused, false);
    assert.equal(sample.focused, true); assert.deepEqual(sample.events.map(e => e.type), ['focusin']);
    assert.equal(row.reference.updates[0].initiallyFocused, true);
    for (const side of ['reference', 'astylar']) for (const [type, receipt] of [['document', report.html], ['script', report.bundle]])
      assert.ok(row[side].assets.some(a => a.type === type && a.sha256 === receipt.sha256));
  }
});

test('public focus failure is not specific to negative tabindex across twelve menu-role controls', () => {
  const bytes = readFileSync('artifacts/material-parity/public-programmatic-focus-controls-20261024/latest-report.json');
  assert.equal(hash(bytes), '4696d253fbd95a1504b7de4d067c3eb92904bf595e5dfd8bad8aab32fb9144ab');
  const report = JSON.parse(bytes); assert.deepEqual(report.errors, []);
  const expected = [1, 2].flatMap(d => ['div', 'span', 'button'].flatMap(k => [-1, 0].map(t => `${d}/${k}/${t}`)));
  assert.deepEqual(report.results.map(r => `${r.dpr}/${r.controlKind}/${r.tabIndex}`), expected);
  for (const receipt of [report.inputSource, report.bundle, report.html, ...report.inputs]) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  assert.equal(report.scriptSha256, hash(readFileSync('scripts/audit-public-programmatic-focus-controls.mjs')));
  for (const row of report.results) {
    assert.deepEqual(row.reference.site, row.astylar.site);
    const control = row.astylar.site.root.children[0].children[0];
    assert.equal(control.tabindex, row.tabIndex); assert.equal(control.type, row.controlKind); assert.equal(control.role, 'menu');
    assert.equal(row.reference.updates[0].initiallyFocused, true);
    const sample = row.astylar.updates[0];
    assert.equal(sample.publicFocusResult, true); assert.equal(sample.immediateFocus, false);
    assert.equal(sample.settledBeforeUpdate, true); assert.equal(sample.initiallyFocused, false); assert.equal(sample.focused, true);
    for (const side of ['reference', 'astylar']) for (const [type, receipt] of [['document', report.html], ['script', report.bundle]])
      assert.ok(row[side].assets.some(a => a.type === type && a.sha256 === receipt.sha256));
  }
});

test('actual renderer event callback excludes public focus events from semantic synchronization', () => {
  const callback = (file, typed) => {
    const bytes = readFileSync(file), ast = ts.createSourceFile(file, bytes.toString(), 99, true, typed ? ts.ScriptKind.TS : ts.ScriptKind.JS);
    const declarations = [];
    const visit = n => { if (ts.isVariableDeclaration(n) && n.name.getText(ast) === 'interactionEvents') declarations.push(n); ts.forEachChild(n, visit); };
    visit(ast); assert.equal(declarations.length, 1);
    const object = declarations[0].initializer.whenTrue;
    assert.ok(ts.isObjectLiteralExpression(object));
    const property = object.properties.filter(p => ts.isPropertyAssignment(p) && p.name.getText(ast) === 'onEvent');
    assert.equal(property.length, 1);
    const original = property[0].initializer.getText(ast);
    const code = ts.transpileModule('const cb = ' + original + ';', {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
    }).outputText;
    return { code, originalSha256: hash(original), file, sourceSha256: hash(bytes) };
  };
  const current = callback('src/lib/astylar.ts', true);
  const installed = callback('examples/material-showcase/node_modules/astylarui/dist/lib/lib/astylar.js', false);
  assert.equal(current.code.replace(/\s/g, ''), installed.code.replace(/\s/g, ''));
  const trace = [], bridge = {
    queueControlStateSync: () => trace.push('control-state'),
    queueFocusSync: (getId, keepCanvas, visible) => trace.push({ focus: getId(), keepCanvas: keepCanvas('popup'), visible: visible() }),
  };
  const owner = { inputElementService: { getFocusedElementId: () => undefined, isFocusVisible: () => true },
    hasLiveTextSelection: () => false, getLiveSemanticControlState: () => ({}) };
  const handler = new Function('semanticBridge', 'options', 'interaction',
    'let pointerFocusTransaction = false; ' + current.code + ';return cb;').call(owner,
      bridge, {}, { snapshot: { focusedElementId: 'popup', focusVisible: true } });
  handler({ type: 'focus' });
  assert.deepEqual(trace, ['control-state']);
  const runtimeMethods = ['focusElement', 'setFocus', 'getFocusedElementId', 'liveState'];
  const runtimeCode = file => {
    const bytes = readFileSync(file), ast = ts.createSourceFile(file, bytes.toString(), 99, true, ts.ScriptKind.TS);
    const owner = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'AstylarInteractionRuntime');
    const methods = runtimeMethods.map(name => {
      const nodes = owner.members.filter(n => ts.isMethodDeclaration(n) && n.name.getText(ast) === name);
      assert.equal(nodes.length, 1); return nodes[0].getText(ast);
    });
    return ts.transpileModule('class Probe {' + methods.join('\n') + '}', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  };
  const typedRuntime = runtimeCode('src/lib/astylar-interaction-runtime.ts');
  const installedRuntime = runtimeCode('examples/material-showcase/node_modules/astylarui/dist/lib/lib/astylar-interaction-runtime.js');
  assert.equal(typedRuntime.replace(/\s/g, ''), installedRuntime.replace(/\s/g, ''));
  const Runtime = new Function(typedRuntime + ';return Probe;')(), runtime = new Runtime();
  Object.assign(runtime, { disposed: false, focusableElementIds: new Set(['popup']), controlTypes: new Map(),
    isAllowedByModal: () => true, dispatcher: { hasEnabledTarget: () => true, getElementState: () => ({}), dispatch: event => handler(event) } });
  trace.length = 0;
  assert.equal(runtime.focusElement('popup', { scrollIntoView: false }), true);
  assert.equal(runtime.getFocusedElementId(), 'popup'); assert.deepEqual(trace, ['control-state']);
  trace.length = 0; handler({ type: 'keydown' });
  assert.deepEqual(trace, ['control-state', { focus: 'popup', keepCanvas: false, visible: true }]);
  trace.length = 0; handler({ type: 'click' });
  assert.deepEqual(trace, ['control-state', { focus: 'popup', keepCanvas: false, visible: true }]);
  console.log(JSON.stringify({ current: { ...current, code: undefined }, installed: { ...installed, code: undefined },
    focusEventsQueueNativeFocus: false, keyboardAndClickControlsQueueNativeFocus: true,
    boundary: 'Complete actual callback with explicit no-pointer/no-selection controls. Public request reproduction separately proves failure;not a fix or waiver of pointer/selection/modal safeguards.' }));
});

test('public focus API initially inherited the existing native-origin focus-event exclusion', () => {
  const file = 'src/lib/astylar.ts';
  const inspect = revision => {
    const bytes = execFileSync('git', ['show', `${revision}:${file}`]);
    const ast = ts.createSourceFile(file, bytes.toString(), 99, true, ts.ScriptKind.TS);
    const renderer = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'AstylarRenderer') ??
      ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'Astylar');
    assert.ok(renderer);
    const focus = renderer.members.filter(n => ts.isMethodDeclaration(n) && n.name.getText(ast) === 'focus');
    let callback;
    const visit = n => {
      if (ts.isVariableDeclaration(n) && n.name.getText(ast) === 'interactionEvents')
        callback = n.initializer.whenTrue.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText(ast) === 'onEvent').initializer.getText(ast);
      ts.forEachChild(n, visit);
    };
    visit(ast);
    return { revision, sourceSha256: hash(bytes), focus: focus.map(n => n.getText(ast)), callback };
  };
  const parent = inspect('cd222388^'), introduced = inspect('cd222388');
  assert.equal(parent.focus.length, 0); assert.equal(introduced.focus.length, 1);
  assert.equal(hash(introduced.focus[0]), '3814563ee560c51ef0974a3d97aa2ae384828669e91914960dc293a548290737');
  assert.match(parent.callback, /event\.type !== 'focus'/); assert.match(introduced.callback, /event\.type !== 'focus'/);
  const beforeGate = inspect('dbe4d8ed^'), gate = inspect('dbe4d8ed');
  assert.doesNotMatch(beforeGate.callback, /queueFocusSync/); assert.match(gate.callback, /event\.type !== 'focus'/);
  assert.equal(gate.focus.length, 0);
  const ancestry = execFileSync('git', ['merge-base', '--is-ancestor', 'dbe4d8ed', 'cd222388']);
  assert.equal(ancestry.length, 0);
  console.log(JSON.stringify({ initialAPI: { revision: introduced.revision, sourceSha256: introduced.sourceSha256, methodSha256: hash(introduced.focus[0]) },
    parent: { revision: parent.revision, sourceSha256: parent.sourceSha256, publicFocusAbsent: true },
    priorGate: { revision: gate.revision, sourceSha256: gate.sourceSha256, callbackSha256: hash(gate.callback) },
    boundary: 'Exact source introduction and ancestry only;not historical runtime execution,bisect,every intermediate behavior or motive.' }));
});

test('original and current configured Menu focus actions target native semantic DOM rather than public surface focus', async () => {
  const original = gunzipSync(Buffer.from(readFileSync('docs/evidence/material-original-runner-e01.mjs.gz.b64', 'utf8').replace(/\s/g, ''), 'base64'));
  assert.equal(hash(original), 'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0');
  let originalFocusBranch;
  for (const [name, bytes] of [['original', original], ['current', readFileSync('tests/material-parity/run-material-parity.mjs')]]) {
    const ast = ts.createSourceFile(name, bytes.toString(), 99, true, ts.ScriptKind.JS);
    const method = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'performInteraction');
    assert.ok(method);
    const focus = method.body.statements.find(n => ts.isIfStatement(n) && n.expression.getText(ast) === "state === 'focus'");
    const branch = focus.thenStatement.getText(ast).replaceAll('\r\n', '\n');
    if (name === 'original') originalFocusBranch = branch; else assert.equal(branch, originalFocusBranch);
    const perform = new Function('assert', 'interactionTargetBox', method.getText(ast) + ';return performInteraction;')(
      assert, async () => ({ x: 0, y: 0, width: 100, height: 40 }));
    for (const side of ['reference', 'astylar']) {
      let nativeFocusCalls = 0, evaluations = 0;
      class Element { matches() { return true; } focus() { nativeFocusCalls++; } }
      const target = new Element();
      const document = { getElementById: id => { assert.equal(side, 'reference'); assert.equal(id, 'menu-primary'); return target; },
        querySelector: selector => { assert.equal(side, 'astylar'); assert.equal(selector, '[data-astylar-id="menu-primary"]'); return target; } };
      const page = { evaluate: async (fn, id) => {
        evaluations++; assert.equal(id, 'menu-primary');
        return new Function('document', 'HTMLElement', 'CSS', 'id', `return (${fn.toString()})(id);`)(document, Element, { escape: id => id }, id);
      }, mouse: { click: () => assert.fail('Menu focus must not become a pointer action') } };
      await perform(page, side, { family: 'menu', state: 'focus' });
      assert.equal(evaluations, 1); assert.equal(nativeFocusCalls, 1);
    }
  }
});
