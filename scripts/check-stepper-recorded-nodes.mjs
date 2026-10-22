import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { sourceAuditDefinitions } from '../tests/material-parity/input-equivalence-policy.mjs';

// Same bounded recorded-element contract as check-card-recorded-nodes.mjs.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reviewId = '5caa57e5f2254471d9d082ff0831db36704f73997b41ae48aa4b4064b45c4c99';
const reviewFile = `artifacts/material-parity/working-audit/proposals/${reviewId}.json`;
const review = JSON.parse(fs.readFileSync(reviewFile)).review;
assert.equal(hash(JSON.stringify(review)), reviewId);
const rows = review.groups.filter(row => row.family === 'stepper');
assert.equal(rows.length, 68); assert.equal(new Set(rows.map(row => row.case)).size, 68);
const findings = ['fixture-stepper-inactive-panel-omitted', 'fixture-stepper-edit-state-replaced-by-checkmark',
  'fixture-stepper-number-wrapper-substitution', 'fixture-stepper-breakpoint-connector'];
for (const id of findings) assert.ok(sourceAuditDefinitions.some(row => row.id === id));
const one = rows => { assert.equal(rows.length, 1); return rows[0]; };
function inspect(reference, candidate, active, held) {
  assert.equal(reference.nodes.length, 29 + Number(active || held));
  assert.equal(candidate.nodes.length, 16 + Number(active));
  assert.deepEqual(candidate.nodes.slice(1).map(n => n.authored.id), ['page', 'eyebrow', 'title',
    'stepper-root', 'stepper-primary', 'stepper-head', 'step-details', 'step-details-badge',
    ...(active ? ['step-details-complete'] : []), 'step-details-text', 'step-connector',
    'step-review', 'step-review-badge', 'step-review-text', 'stepper-content-container', 'stepper-content']);
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
  assert.deepEqual(reference.nodes.map(n => n.ownText).filter(Boolean), ['Angular Material 20 reference',
    'stepper', ...(active ? ['Editable', 'create'] : ['1']), 'Details', '2', 'Review', 'Project details', 'Review changes']);
  assert.deepEqual(candidate.nodes.map(n => n.authored.textContent).filter(Boolean), ['Angular Material 20 reference',
    'stepper', ...(!active ? ['1'] : []), 'Details', '2', 'Review', active ? 'Review changes' : 'Project details']);
  const rn = key => one(reference.nodes.filter(n => n.key === 'frame/' + key));
  const an = key => one(candidate.nodes.filter(n => n.key === 'root/0/' + key));
  for (const [i, id] of [[0, 'step-details'], [2, 'step-review']]) {
    const r = rn(`2/0/0/0/${i}`), a = an(`2/0/0/${i}`);
    assert.equal(r.type, 'mat-step-header'); assert.equal(r.attributes.role, 'tab');
    assert.equal(a.authored.id, id); assert.equal(a.authored.role, 'tab');
    assert.equal(r.attributes['aria-selected'], String(a.authored.ariaSelected));
    assert.equal(rn(`2/0/0/0/${i}/2/0/0`).attributes.id, id + '-text');
  }
  const specifications = ['', '0', '1', '2', '2/0'].map(key => ({ label: 'shared-owner:' + key, reference: [key], candidate: [key] }));
  specifications.push({ label: 'native-horizontal-wrapper', reference: ['2/0/0'], candidate: [] },
    { label: 'header-row', reference: ['2/0/0/0'], candidate: ['2/0/0'] });
  for (const i of [0, 2]) {
    const r = `2/0/0/0/${i}`, a = `2/0/0/${i}`;
    const descendants = (tree, key, prefix) => tree.nodes.filter(n => n.key === prefix + key || n.key.startsWith(prefix + key + '/')).map(n => n.key.slice(prefix.length));
    const ripples = descendants(reference, r + '/0', 'frame/');
    assert.ok(ripples.every(key => rn(key).type === 'div' && /mat-ripple/.test(rn(key).attributes.class)));
    specifications.push({ label: `header:${i}`, reference: [r], candidate: [a] },
      { label: `native-ripple:${i}`, reference: ripples, candidate: [] },
      { label: `numeric-or-edit-icon-versus-badge:${i}`, reference: descendants(reference, r + '/1', 'frame/'), candidate: descendants(candidate, a + '/0', 'root/0/') },
      { label: `native-label-wrappers:${i}`, reference: [r + '/2', r + '/2/0'], candidate: [] },
      { label: `label:${i}`, reference: [r + '/2/0/0'], candidate: [a + '/1'] });
  }
  specifications.push({ label: 'connector', reference: ['2/0/0/0/1'], candidate: ['2/0/0/1'] },
    { label: 'content-container', reference: ['2/0/0/1'], candidate: ['2/0/1'] },
    { label: 'two-native-panels-versus-one-replaced-panel', reference: ['2/0/0/1/0', '2/0/0/1/0/0', '2/0/0/1/1', '2/0/0/1/1/0'], candidate: ['2/0/1/0'] });
  const seen = { reference: new Set(), candidate: new Set(['root']) };
  const groups = specifications.map(spec => ({ label: spec.label, ...Object.fromEntries(
    [['reference', reference, 'frame'], ['candidate', candidate, 'root/0']].map(([side, tree, prefix]) => [side, spec[side].map(relative => {
      const key = prefix + (relative ? '/' + relative : ''); assert.ok(!seen[side].has(key)); seen[side].add(key);
      const n = one(tree.nodes.filter(n => n.key === key));
      return { key, parent: n.parent, type: n.type ?? n.authored.type,
        text: side === 'reference' ? n.ownText : n.authored.textContent ?? '' };
    })])) }));
  for (const [side, tree] of [['reference', reference], ['candidate', candidate]]) assert.deepEqual([...seen[side]].sort(), tree.nodes.map(n => n.key).sort());
  return groups;
}
let controls = 0, referenceNodes = 0, candidateNodes = 0;
const patterns = { ordinary: 0, held: 0, activated: 0 };
const observations = rows.map(row => {
  const pair = {};
  for (const side of ['reference', 'astylar']) {
    const r = row.evidence.pairedTrees[side], bytes = fs.readFileSync(r.file);
    assert.equal(hash(bytes), r.sha256); pair[side] = JSON.parse(bytes);
  }
  const active = /\/(activate|activate-leave)$/.test(row.case), held = row.case.endsWith('/held');
  patterns[active ? 'activated' : held ? 'held' : 'ordinary']++;
  const groups = inspect(pair.reference, pair.astylar, active, held);
  for (const mutate of [p => p.reference.nodes.pop(), p => { p.astylar.nodes[7].parent = 'root'; },
    p => { p.reference.nodes[2].ownText += ' '; }, p => p.astylar.nodes.push(p.astylar.nodes[1])]) {
    const forged = structuredClone(pair); mutate(forged);
    assert.throws(() => inspect(forged.reference, forged.astylar, active, held)); controls++;
  }
  referenceNodes += pair.reference.nodes.length; candidateNodes += pair.astylar.nodes.length;
  return { case: row.case, evidence: row.evidence.pairedTrees, groups };
});
assert.deepEqual(patterns, { ordinary: 44, held: 8, activated: 16 }); assert.equal(controls, 272);
console.log(JSON.stringify({ producer: { file: 'scripts/check-stepper-recorded-nodes.mjs', sha256: hash(fs.readFileSync('scripts/check-stepper-recorded-nodes.mjs')) },
  review: { file: reviewFile, reviewSha256: reviewId }, cases: 68, referenceNodes, candidateNodes, patterns,
  negativeControlsRejected: controls, existingFindings: findings, observations,
  boundary: 'All retained elements accounted for,including ripple records,number/edit glyphs,label wrappers,connector and both native panels. Explicit unequal groups reuse existing authoring findings,not structural equivalence. Anonymous boxes,pseudo paint,complete style/AX/event/resource/currentness obligations remain open. No new core finding or case closure.',
  canonicalPublication: false, inspectionComplete: false, renderingAccepted: false }));
