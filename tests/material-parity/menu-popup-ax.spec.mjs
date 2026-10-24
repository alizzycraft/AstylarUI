import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';

const file = 'artifacts/material-parity/menu-popup-ax-20261024/latest-report.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function inspect(report) {
  assert.equal(report.results.length, 1);
  const row = report.results[0];
  assert.equal(row.family, 'menu'); assert.equal(row.profile, 'light');
  assert.equal(row.viewport.id, 'desktop-dpr1'); assert.equal(row.state, 'open');
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
    else assert.equal(Object.hasOwn(tree.nodes.find(n => n.authored?.id === 'menu-popup').authored, 'tabIndex'), false);
  }
  const property = (side, target, name) => row[side].ax[target].nodes.find(n => n.backendDOMNodeId === row[side].ax[target].backendNodeId).properties.find(p => p.name === name)?.value.value;
  assert.equal(property('reference', 'rename', 'focused'), true);
  assert.equal(property('astylar', 'trigger', 'focused'), true);
  assert.equal(property('reference', 'popup', 'focusable'), true);
  assert.equal(property('astylar', 'popup', 'focusable'), undefined);
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
