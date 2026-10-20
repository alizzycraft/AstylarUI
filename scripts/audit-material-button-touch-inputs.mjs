import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { selectedButtonInputs } from '../tests/material-parity/button-pill-radius-evidence.mjs';

// Extend an existing exact shared-button population,not another browser survey.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const inventoryFile = 'docs/material-button-flex-input-audit.json';
const inventory = JSON.parse(readFileSync(inventoryFile));
assert.deepEqual([inventory.cases, inventory.owners, inventory.families], [480, 600, 7]);
const helper = 'tests/material-parity/button-pill-radius-evidence.mjs';
assert.equal(hash(readFileSync(helper, 'utf8').replaceAll('\r\n', '\n')),
  inventory.sourceFingerprints.find(row => row.file === helper).sha256);
const capture = inventory.capture;
assert.deepEqual(receipt(capture.file), capture);
const report = JSON.parse(readFileSync(capture.file));
const entries = [...report.results.map(row => ({ ...row, kind: 'static' })),
  ...report.interactions.map(row => ({ ...row, kind: 'interaction' }))];
assert.equal(entries.length, 2311);
const keyOf = row => `${row.kind}:${row.family}@${row.profile}/${row.viewport.id}${row.state ? '/' + row.state : ''}`;
const prior = new Map(inventory.observations.map(row => [`${row.case}:${row.proof.element}`, row]));
assert.equal(prior.size, 600);
const trees = new Map();
function readTree(descriptor) {
  if (!trees.has(descriptor.file)) {
    assert.deepEqual(receipt(descriptor.file), descriptor);
    trees.set(descriptor.file, { receipt: descriptor, tree: JSON.parse(readFileSync(descriptor.file)) });
  }
  assert.deepEqual(trees.get(descriptor.file).receipt, descriptor);
  return trees.get(descriptor.file).tree;
}
const classHas = (node, value) => String(node.attributes?.class ?? '').split(/\s+/).includes(value);
const one = list => { assert.equal(list.length, 1); return list[0]; };
function owners(input, reference, candidate) {
  const host = one(reference.nodes.filter(n => n.attributes?.id === input.id));
  const button = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  assert.equal(host.type, 'button'); assert.ok(classHas(host, 'mdc-button'));
  assert.equal(button.authored.type, 'button');
  assert.ok(button.authored.class.split(/\s+/).includes('material-button'));
  const target = one(reference.nodes.filter(n => n.parent === host.key && classHas(n, 'mat-mdc-button-touch-target')));
  assert.equal(target.type, 'span'); assert.equal(target.ownText, '');
  assert.equal(reference.nodes.filter(n => n.parent === target.key).length, 0);
  assert.equal(candidate.nodes.filter(n => n.parent === button.key).length, 0);
  assert.equal(target.parent, host.key);
  return { host, target, button };
}
const rows = [], states = new Map(); let rejectedControls = 0;
const properties = ['display', 'position', 'height', 'width', 'top', 'left', 'right', 'transform',
  'pointerEvents', 'visibility', 'overflowX', 'overflowY'];
for (const entry of entries) {
  const inputs = selectedButtonInputs(entry); if (!inputs.length) continue;
  const reference = readTree(entry.inputTrees.reference), candidate = readTree(entry.inputTrees.astylar);
  for (const input of inputs) {
    const key = `${keyOf(entry)}:${input.id}`, old = prior.get(key); assert.ok(old);
    assert.deepEqual(old.inputTrees, entry.inputTrees);
    const { host, target, button } = owners(input, reference, candidate);
    assert.equal(host.key, old.proof.referenceNode); assert.equal(button.key, old.proof.candidateNode);
    const style = reference.styles[target.style], hostStyle = reference.styles[host.style];
    const disabled = Object.hasOwn(host.attributes, 'disabled');
    const nativeChildren = reference.nodes.filter(n => n.parent === host.key);
    const targetRequests = Object.fromEntries(properties.map(name => [name, style[name]]));
    const reason = style.display === 'none' ? 'target-display-none'
      : style.visibility !== 'visible' ? 'target-not-visible'
      : style.pointerEvents === 'none' ? 'target-pointer-events-none'
      : disabled ? 'disabled-host'
      : hostStyle.pointerEvents === 'none' ? 'host-pointer-events-none' : 'declared-visible-target-not-runtime-verified';
    const stateKey = JSON.stringify({ profile: entry.profile, hostHeight: hostStyle.height, touchHeight: style.height,
      targetDisplay: style.display, targetTransform: style.transform, disabled, reason });
    states.set(stateKey, (states.get(stateKey) ?? 0) + 1);
    const changed = structuredClone(reference);
    changed.nodes.find(n => n.key === target.key).parent = 'detached';
    assert.throws(() => owners(input, changed, candidate)); rejectedControls++;
    const added = structuredClone(candidate);
    added.nodes.push({ key: `${button.key}/extra`, parent: button.key, authored: { type: 'span', id: 'extra' } });
    assert.throws(() => owners(input, reference, added)); rejectedControls++;
    rows.push({ case: keyOf(entry), family: entry.family, profile: entry.profile, state: entry.state ?? 'static',
      element: input.id, inputTrees: entry.inputTrees,
      reference: { host: host.key, target: target.key, hostDisabled: disabled,
        hostBoxRequests: Object.fromEntries(['height', 'width', 'pointerEvents', 'visibility', 'overflowX', 'overflowY'].map(name => [name, hostStyle[name]])),
        targetRequests, matchedTargetRules: target.rules.map(index => reference.rules[index]),
        nativeDirectChildren: nativeChildren.map(n => ({ key: n.key, type: n.type, class: n.attributes?.class ?? null })) },
      candidate: { key: button.key, authored: button.authored, childCount: 0 },
      requestDisposition: reason, actualActivationVerified: false,
      boundary: 'Retained declarations/structure only. Disabled,display-none,occluded/unverified contexts are not generalized from the one fresh enabled Material primary-button probe.' });
    prior.delete(key);
  }
}
assert.equal(rows.length, 600); assert.equal(prior.size, 0); assert.equal(rejectedControls, 1200);
assert.equal(new Set(rows.map(row => row.case)).size, 480);
assert.equal(new Set(rows.map(row => row.family)).size, 7);
console.log(JSON.stringify({ producer: receipt('scripts/audit-material-button-touch-inputs.mjs'), inventory: receipt(inventoryFile),
  capture, selectorHelper: receipt(helper), cases: 480, owners: rows.length, families: [...new Set(rows.map(r => r.family))],
  treeReceipts: [...trees.values()].map(value => value.receipt), rejectedControls,
  requestStates: [...states].map(([key, count]) => ({ ...JSON.parse(key), count })), rows,
  conclusion: 'All600 exactly selected retained shared-button owners have a native touch-span descendant and no corresponding authored candidate child. Native request suppression and host-disabled state remain separate;not all600 are active touch targets.',
  boundary: 'Exact480-case historical population and requested structure only,not all Material button kinds,current runtime or600 activation tests. The fresh primary-button pair and public percentage-transform limitation are separate bounded evidence;no canonical registration,status promotion,renderer/fixture fix or acceptance change.' }));
