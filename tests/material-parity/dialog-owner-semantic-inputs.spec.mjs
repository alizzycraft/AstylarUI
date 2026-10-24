import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
test('all retained open dialogs preserve real owner label/modal differences omitted by inner-surface comparator', () => {
  const bytes = readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(hash(bytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const rows = JSON.parse(bytes).interactions.filter(r => r.family === 'dialog');
  let open = 0; const contexts = new Set(), states = new Set();
  for (const row of rows) {
    const trees = {};
    for (const side of ['reference', 'astylar']) {
      const receipt = row.inputTrees[side], treeBytes = readFileSync(receipt.file);
      assert.equal(hash(treeBytes), receipt.sha256); trees[side] = JSON.parse(treeBytes);
    }
    const candidate = trees.astylar.nodes.find(n => n.authored?.id === 'dialog-overlay');
    if (!candidate) continue;
    const native = trees.reference.nodes.filter(n => n.attributes?.role === 'dialog');
    assert.equal(native.length, 1);
    const labelId = native[0].attributes['aria-labelledby']; assert.ok(labelId);
    const labels = trees.reference.nodes.filter(n => n.attributes?.id === labelId); assert.equal(labels.length, 1);
    const label = labels[0], text = (label.ownText ?? '') + trees.reference.nodes
      .filter(n => n.parent === label.key).map(n => n.ownText ?? '').join('');
    assert.equal(text.trim(), 'Confirm action');
    assert.equal(native[0].attributes['aria-modal'], 'false');
    assert.equal(candidate.authored.type, 'dialog'); assert.equal(candidate.authored.modal, true);
    assert.equal(candidate.authored.ariaLabel, 'Open dialog');
    assert.equal(row.semantics.some(s => s.id === 'dialog-overlay'), false);
    const surface = row.semantics.find(s => s.id === 'dialog-panel'); assert.ok(surface);
    assert.equal(surface.matches, true);
    assert.equal(surface.expected.role, undefined); assert.equal(surface.actual.role, undefined);
    assert.equal(surface.expected.name, surface.actual.name);
    open++; contexts.add(`${row.profile}/${row.viewport.id}`); states.add(row.state);
  }
  assert.equal(open, 32); assert.equal(contexts.size, 8);
  assert.deepEqual([...states].sort(), ['activate', 'activate-leave', 'open', 'open-hover-content']);
  // Authenticated captured DOM/authored inputs only, not AX names, current rendering or modality behavior.
});
