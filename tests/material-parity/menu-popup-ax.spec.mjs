import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { menuPopupSemanticInputFindings } from './menu-popup-semantic-input-findings.mjs';
import { materialStaticCases, materialInteractionCases, materialMobileFlowCases } from './benchmark.config.mjs';

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
