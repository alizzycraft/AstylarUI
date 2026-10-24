import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import path from 'node:path';
import { materialInteractionCases } from './benchmark.config.mjs';

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

test('all eight retained-build activate contexts expose unequal actual dialog AX names and modal properties', () => {
  const root = 'artifacts/material-parity/dialog-owner-ax-20261024';
  const bytes = readFileSync(`${root}/latest-report.json`);
  assert.equal(hash(bytes), '4e0eb63acc179362f8e6d4bc92c994d35f630fdbc44d08fa68a30af9de3012ea');
  const report = JSON.parse(bytes);
  for (const value of Object.values(report.provenance)) if (value?.file && value.sha256) {
    assert.equal(hash(readFileSync(value.file)), value.sha256, value.file);
  }
  const expected = materialInteractionCases.filter(c => c.family === 'dialog' && c.state === 'activate')
    .flatMap(c => ['reference', 'astylar'].map(mode => `${c.profile}/${c.viewport.id}/${mode}`));
  assert.deepEqual(report.observations.map(r => `${r.profile}/${r.viewport.id}/${r.mode}`), expected);
  assert.equal(expected.length, 16);
  for (const receipt of report.observations) {
    assert.equal(path.basename(receipt.file), receipt.file);
    const bytes = readFileSync(`${root}/${receipt.file}`); assert.equal(hash(bytes), receipt.sha256);
    const row = JSON.parse(bytes); assert.deepEqual(row.runtimeErrors, []);
    assert.equal(row.state, 'activate'); assert.equal(row.boundary, 'after-configured-activate-and-settlement');
    const owners = row.nodes.filter(n => n.role?.value === 'dialog' && !n.ignored); assert.equal(owners.length, 1);
    const owner = owners[0];
    assert.ok(row.dom.some(n => n.backendNodeId === owner.backendDOMNodeId));
    assert.equal(owner.name.value, row.mode === 'reference' ? 'Confirm action' : 'Open dialog');
    assert.equal(owner.properties.find(p => p.name === 'modal').value.value, row.mode === 'astylar');
    if (row.mode === 'reference') {
      const labels = owner.properties.find(p => p.name === 'labelledby').value.relatedNodes;
      assert.equal(labels.length, 1); assert.equal(labels[0].text, 'Confirm action');
      assert.ok(row.dom.some(n => n.backendNodeId === labels[0].backendDOMNodeId));
      assert.ok(owner.name.sources.some(s => s.attribute === 'aria-labelledby' && s.value?.value === 'Confirm action'));
    } else assert.ok(owner.name.sources.some(s => s.attribute === 'aria-label' && s.value?.value === 'Open dialog'));
  }
  // Actual AX at these endpoints, not AT behavior, focus-trap equivalence or current source applicability.
});

test('dialog retained owner projection follows authored name while modality and aria-modal are coupled', () => {
  const report = JSON.parse(readFileSync('artifacts/material-parity/dialog-owner-ax-20261024/latest-report.json'));
  const manifest = JSON.parse(readFileSync(report.provenance.checkpoint.file));
  const owner = (mapName, suffix, expected) => {
    const bytes = readFileSync(`artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser/${mapName}`);
    assert.equal(hash(bytes), manifest.provenance.browserFiles.find(x => x.file === mapName).sha256);
    const map = JSON.parse(bytes), index = map.sources.findIndex(x => x.endsWith(suffix)); assert.ok(index >= 0);
    const source = map.sourcesContent[index]; assert.equal(hash(Buffer.from(source)), expected); return source;
  };
  const app = owner('chunk-JPEJK334.js.map', 'src/app/astylar.component.ts',
    '71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd');
  assert.match(app, /const label = family === 'dialog' \? 'Open dialog'/);
  assert.match(app, /type: 'dialog' as const,[\s\S]*?modal: true, ariaLabel: label/);
  const bridge = owner('chunk-3JXWRYJY.js.map', '/astylar-semantic-bridge.js',
    '590d49a2a4d5e205c10cf18a1e2e45a3f768079afad86f5ea330f7c6136088e8');
  assert.match(bridge, /if \(element\.ariaLabel !== undefined\)\s*node\.setAttribute\('aria-label', element\.ariaLabel\)/);
  assert.match(bridge, /if \(element\.modal\)\s*node\.setAttribute\('aria-modal', 'true'\)/);
  assert.match(bridge, /element\.type === 'dialog' && element\.open && element\.modal && element\.id/);
  const reference = owner('chunk-7SL66K3U.js.map', 'src/app/reference.component.ts',
    'debe55bc492d0fa1e48a9c7f09e1b668d435a2260588710207ab878b23c1d4aa');
  assert.match(reference, /this\.dialog\.open\(content, \{ id: 'material-dialog', restoreFocus: true \}\)/);
  const native = owner('chunk-7SL66K3U.js.map', '/module-Ce6F7TNm.mjs',
    '00a9d69dd72153dcd83b53c68328c9493d80636048ef215fcdea278e5931bd7b');
  assert.match(native, /ariaModal = false/);
  const model = readFileSync('src/app/types/dom-element.ts');
  assert.equal(hash(model), '72eef2f09d5cdacaab10db7328c40e5b4748c3f22640e2b40f0436a268351e83');
  assert.match(model.toString(), /modal\?: boolean/); assert.doesNotMatch(model.toString(), /ariaModal\??:/);
  // A typed-model expressiveness question, not proof no public composition can express the reference contract.
});
