import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { sourceAuditDefinitions } from '../tests/material-parity/input-equivalence-policy.mjs';

// Same bounded recorded-element accounting contract as the card/stepper proofs.
// Unequal ownership groups are not an assertion of structural equivalence.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reviewId = '5caa57e5f2254471d9d082ff0831db36704f73997b41ae48aa4b4064b45c4c99';
const reviewFile = `artifacts/material-parity/working-audit/proposals/${reviewId}.json`;
const review = JSON.parse(fs.readFileSync(reviewFile)).review;
assert.equal(hash(JSON.stringify(review)), reviewId);
const rows = review.groups.filter(row => row.family === 'tabs');
assert.equal(rows.length, 70); assert.equal(new Set(rows.map(row => row.case)).size, 70);
const findings = ['fixture-tab-label-typography-flattened', 'fixture-tab-breakpoint-raster-compensation',
  'plugin-tab-panel-competing-text-renderer', 'plugin-tab-panel-baseline-offset'];
for (const id of findings) assert.ok(sourceAuditDefinitions.some(row => row.id === id));
const one = rows => { assert.equal(rows.length, 1); return rows[0]; };
function inspect(reference, candidate, held) {
  assert.equal(reference.nodes.length, 35 + Number(held)); assert.equal(candidate.nodes.length, 12);
  assert.deepEqual(candidate.nodes.slice(1).map(n => n.authored.id), ['page', 'eyebrow', 'title',
    'tabs-root', 'tabs-primary', 'tabs-list', 'tab-overview', 'tab-activity', 'tab-baseline', 'tab-indicator', 'tab-panel']);
  assert.equal(candidate.nodes[0].key, 'root'); assert.deepEqual(candidate.nodes[0].authored, {});
  for (const [side, tree] of [['reference', reference], ['candidate', candidate]]) {
    assert.deepEqual(tree.errors, []); assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
    for (const n of tree.nodes) {
      const root = side === 'reference' ? 'frame' : 'root';
      assert.equal(n.parent, n.key === root ? null : n.key.slice(0, n.key.lastIndexOf('/')));
      if (side === 'reference') assert.ok(tree.styles[n.style]);
      else if (n.key !== 'root') for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']) assert.ok(n[stage]);
    }
  }
  const rn = key => one(reference.nodes.filter(n => n.key === 'frame/' + key));
  const an = key => one(candidate.nodes.filter(n => n.key === 'root/0/' + key));
  const selected = an('2/0/0/0').authored.ariaSelected;
  assert.equal(typeof selected, 'boolean'); assert.equal(an('2/0/0/1').authored.ariaSelected, !selected);
  assert.equal(an('2/0/3').authored.data.selected, selected);
  assert.equal(an('2/0/3').authored.type, 'showcase.material:tab-panel');
  assert.deepEqual(reference.nodes.map(n => n.ownText).filter(Boolean), ['Angular Material 20 reference',
    'tabs', 'Overview', 'Activity', selected ? 'Overview content' : 'Activity content']);
  assert.deepEqual(candidate.nodes.map(n => n.authored.textContent).filter(Boolean), ['Angular Material 20 reference', 'tabs']);
  assert.equal(rn('2/0/0/1/0').attributes.role, 'tablist'); assert.equal(an('2/0/0').authored.role, 'tablist');
  for (const [i, id, label] of [[0, 'tab-overview', 'Overview'], [1, 'tab-activity', 'Activity']]) {
    const r = rn(`2/0/0/1/0/0/${i}`), a = an(`2/0/0/${i}`);
    assert.equal(r.attributes.role, 'tab'); assert.equal(a.authored.role, 'tab');
    assert.equal(r.attributes['aria-selected'], String(a.authored.ariaSelected));
    assert.equal(a.authored.id, id); assert.equal(a.authored.value, label);
    const text = rn(`2/0/0/1/0/0/${i}/2/0/0`);
    assert.equal(text.attributes.id, id); assert.equal(text.ownText, label);
    const panel = rn(`2/0/1/${i}`);
    assert.equal(panel.type, 'mat-tab-body'); assert.equal(panel.attributes.role, 'tabpanel');
    assert.equal(r.attributes['aria-controls'], panel.attributes.id);
    assert.equal(panel.attributes['aria-labelledby'], r.attributes.id);
    assert.equal(a.authored.ariaControls, 'tab-panel');
  }
  const descendants = (tree, key, prefix) => tree.nodes.filter(n => n.key === prefix + key || n.key.startsWith(prefix + key + '/')).map(n => n.key.slice(prefix.length));
  const specifications = ['', '0', '1', '2', '2/0'].map(key => ({ label: 'shared-owner:' + key, reference: [key], candidate: [key] }));
  specifications.push({ label: 'native-header-owner', reference: ['2/0/0'], candidate: [] },
    { label: 'native-pagination-before', reference: descendants(reference, '2/0/0/0', 'frame/'), candidate: [] },
    { label: 'native-label-container', reference: ['2/0/0/1'], candidate: [] },
    { label: 'native-list-and-labels-versus-flat-list', reference: ['2/0/0/1/0', '2/0/0/1/0/0'], candidate: ['2/0/0'] },
    { label: 'native-pagination-after', reference: descendants(reference, '2/0/0/2', 'frame/'), candidate: [] });
  for (const i of [0, 1]) {
    const r = `2/0/0/1/0/0/${i}`, a = `2/0/0/${i}`;
    specifications.push({ label: `tab-owner:${i}`, reference: [r], candidate: [a] },
      { label: `native-state-layer:${i}`, reference: descendants(reference, r + '/0', 'frame/'), candidate: [] },
      { label: `native-ripple:${i}`, reference: descendants(reference, r + '/1', 'frame/'), candidate: [] },
      { label: `native-content-and-label-versus-button-value:${i}`, reference: [r + '/2', r + '/2/0', r + '/2/0/0'], candidate: [] });
  }
  specifications.push({ label: 'two-native-indicators-versus-one-positioned-indicator',
    reference: [0, 1].flatMap(i => [`2/0/0/1/0/0/${i}/3`, `2/0/0/1/0/0/${i}/3/0`]), candidate: ['2/0/2'] },
    { label: 'candidate-baseline-versus-native-header-border-ownership', reference: [], candidate: ['2/0/1'] },
    { label: 'native-body-wrapper', reference: ['2/0/1'], candidate: [] },
    { label: 'native-two-panels-and-core-text-versus-one-private-paint-plugin',
      reference: ['2/0/1/0', '2/0/1/0/0', '2/0/1/1', '2/0/1/1/0', `2/0/1/${selected ? 0 : 1}/0/0`], candidate: ['2/0/3'] });
  const seen = { reference: new Set(), candidate: new Set(['root']) };
  const groups = specifications.map(spec => ({ label: spec.label, ...Object.fromEntries(
    [['reference', reference, 'frame'], ['candidate', candidate, 'root/0']].map(([side, tree, prefix]) => [side, spec[side].map(relative => {
      const key = prefix + (relative ? '/' + relative : ''); assert.ok(!seen[side].has(key)); seen[side].add(key);
      const n = one(tree.nodes.filter(n => n.key === key));
      return { key, parent: n.parent, type: n.type ?? n.authored.type,
        text: side === 'reference' ? n.ownText : n.authored.textContent ?? '',
        ...(side === 'candidate' && n.authored.value ? { value: n.authored.value } : {}) };
    })])) }));
  for (const [side, tree] of [['reference', reference], ['candidate', candidate]]) assert.deepEqual([...seen[side]].sort(), tree.nodes.map(n => n.key).sort());
  return groups;
}
let controls = 0, referenceNodes = 0, candidateNodes = 0;
const patterns = { ordinary: 0, held: 0 };
const observations = rows.map(row => {
  const pair = {};
  for (const side of ['reference', 'astylar']) {
    const r = row.evidence.pairedTrees[side], bytes = fs.readFileSync(r.file);
    assert.equal(hash(bytes), r.sha256); pair[side] = JSON.parse(bytes);
  }
  const held = row.case.endsWith('/held'); patterns[held ? 'held' : 'ordinary']++;
  const groups = inspect(pair.reference, pair.astylar, held);
  for (const mutate of [p => p.reference.nodes.pop(), p => { p.astylar.nodes[6].parent = 'root'; },
    p => { p.reference.nodes[2].ownText += ' '; }, p => p.astylar.nodes.push(p.astylar.nodes[1])]) {
    const forged = structuredClone(pair); mutate(forged);
    assert.throws(() => inspect(forged.reference, forged.astylar, held)); controls++;
  }
  referenceNodes += pair.reference.nodes.length; candidateNodes += pair.astylar.nodes.length;
  return { case: row.case, evidence: row.evidence.pairedTrees, groups };
});
assert.deepEqual(patterns, { ordinary: 62, held: 8 }); assert.equal(controls, 280);
console.log(JSON.stringify({ producer: { file: 'scripts/check-tabs-recorded-nodes.mjs', sha256: hash(fs.readFileSync('scripts/check-tabs-recorded-nodes.mjs')) },
  review: { file: reviewFile, reviewSha256: reviewId }, cases: 70, referenceNodes, candidateNodes, patterns,
  negativeControlsRejected: controls, existingFindings: findings, observations,
  boundary: 'All retained element records accounted for,including native pagination,list/label wrappers,ripples,two indicators,two panel identities and active text versus candidate button values,positioned baseline/indicator and private-paint plugin. Explicit unequal groups reuse existing authoring findings,not structural equivalence or complete classification of every relationship. Actual AX,anonymous boxes,pseudo paint,full styles,event/resource/currentness and whole-case closure remain open. No renderer/fixture change or new core finding.',
  canonicalPublication: false, inspectionComplete: false, renderingAccepted: false }));
