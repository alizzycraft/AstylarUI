import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { sourceAuditDefinitions } from '../tests/material-parity/input-equivalence-policy.mjs';

// Existing bounded recorded-element accounting contract,including portal roots.
// Ownership groups describe unequal inputs,not structural or paint equivalence.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reviewId = '5caa57e5f2254471d9d082ff0831db36704f73997b41ae48aa4b4064b45c4c99';
const reviewFile = `artifacts/material-parity/working-audit/proposals/${reviewId}.json`;
const review = JSON.parse(fs.readFileSync(reviewFile)).review;
assert.equal(hash(JSON.stringify(review)), reviewId);
const rows = review.groups.filter(row => row.family === 'menu');
assert.equal(rows.length, 94); assert.equal(new Set(rows.map(row => row.case)).size, 94);
const findings = ['fixture-shared-button-touch-descendant-omission', 'fixture-menu-label-composition-substitution',
  'fixture-menu-label-font-token-omission', 'fixture-menu-label-density-offset'];
for (const id of findings) assert.ok(sourceAuditDefinitions.some(row => row.id === id));
const one = rows => { assert.equal(rows.length, 1); return rows[0]; };
function inspect(reference, candidate) {
  const rn = key => one(reference.nodes.filter(n => n.key === key));
  const an = key => one(candidate.nodes.filter(n => n.key === 'root/0/' + key));
  const opened = an('2/0').authored.ariaExpanded;
  assert.equal(typeof opened, 'boolean');
  const triggerChildren = reference.nodes.filter(n => n.parent === 'frame/2/0');
  assert.ok([4, 5].includes(triggerChildren.length));
  const portal = reference.nodes.filter(n => n.key.startsWith('overlay:'));
  assert.ok(opened ? portal.length === 12 : [0, 1].includes(portal.length));
  assert.equal(reference.nodes.length, 6 + triggerChildren.length + portal.length);
  assert.equal(candidate.nodes.length, opened ? 11 : 6);
  assert.deepEqual(candidate.nodes.slice(1).map(n => n.authored.id), ['page', 'eyebrow', 'title', 'menu-root', 'menu-primary',
    ...(opened ? ['menu-popup', 'menu-rename', 'menu-rename-label', 'menu-delete', 'menu-delete-label'] : [])]);
  assert.equal(candidate.nodes[0].key, 'root'); assert.deepEqual(candidate.nodes[0].authored, {});
  for (const [side, tree] of [['reference', reference], ['candidate', candidate]]) {
    assert.deepEqual(tree.errors, []); assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
    for (const n of tree.nodes) {
      const root = side === 'reference' ? ['frame', 'overlay:0'].includes(n.key) : n.key === 'root';
      assert.equal(n.parent, root ? null : n.key.slice(0, n.key.lastIndexOf('/')));
      if (side === 'reference') assert.ok(tree.styles[n.style]);
      else if (n.key !== 'root') for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']) assert.ok(n[stage]);
    }
  }
  assert.equal(rn('frame/2/0').type, 'button'); assert.equal(an('2/0').authored.type, 'button');
  assert.equal(rn('frame/2/0').attributes['aria-expanded'], String(opened));
  assert.equal(rn('frame/2/0').attributes['aria-haspopup'], 'menu'); assert.equal(an('2/0').authored.ariaHaspopup, 'menu');
  assert.equal(rn('frame/2/0/1').ownText, 'Open menu'); assert.equal(an('2/0').authored.value, 'Open menu');
  assert.equal(rn('frame/2/1').type, 'mat-menu');
  assert.deepEqual(triggerChildren.map(n => n.key), Array.from({ length: triggerChildren.length }, (_, i) => `frame/2/0/${i}`));
  assert.deepEqual(triggerChildren.slice(0, 4).map(n => n.attributes.class), [
    'mat-mdc-button-persistent-ripple mdc-button__ripple', 'mdc-button__label', 'mat-focus-indicator', 'mat-mdc-button-touch-target']);
  if (triggerChildren.length === 5) assert.equal(triggerChildren[4].attributes.class, 'mat-ripple mat-mdc-button-ripple');
  assert.deepEqual(reference.nodes.map(n => n.ownText).filter(Boolean), ['Angular Material 20 reference', 'menu', 'Open menu', ...(opened ? ['Rename', 'Delete'] : [])]);
  assert.deepEqual(candidate.nodes.map(n => n.authored.textContent).filter(Boolean), ['Angular Material 20 reference', 'menu', ...(opened ? ['Rename', 'Delete'] : [])]);
  const specifications = ['', '/0', '/1', '/2', '/2/0'].map(suffix => ({ label: 'shared-owner:frame' + suffix,
    reference: ['frame' + suffix], candidate: ['root/0' + suffix] }));
  specifications.push({ label: 'native-trigger-descendants-versus-button-value', reference: triggerChildren.map(n => n.key), candidate: [] },
    { label: 'native-menu-template-host', reference: ['frame/2/1'], candidate: [] });
  if (portal.length) {
    assert.equal(rn('overlay:0').attributes.class, 'cdk-overlay-container');
    specifications.push({ label: opened ? 'native-overlay-root' : 'retained-empty-native-overlay-root', reference: ['overlay:0'], candidate: [] });
  }
  if (opened) {
    const panel = 'overlay:0/1/0/0', content = panel + '/0';
    assert.equal(rn(panel).attributes.role, 'menu'); assert.equal(an('2/1').authored.role, 'menu');
    assert.equal(rn('frame/2/0').attributes['aria-controls'], rn(panel).attributes.id);
    assert.equal(an('2/0').authored.ariaControls, an('2/1').authored.id);
    specifications.push({ label: 'native-backdrop-and-connected-overlay-wrappers', reference: ['overlay:0/0', 'overlay:0/1', 'overlay:0/1/0'], candidate: [] },
      { label: 'native-portal-panel-versus-authored-local-popup', reference: [panel], candidate: ['root/0/2/1'] },
      { label: 'native-menu-content-wrapper', reference: [content], candidate: [] });
    for (const [i, id, text] of [[0, 'rename', 'Rename'], [1, 'delete', 'Delete']]) {
      const r = content + '/' + i, a = `root/0/2/1/${i}`;
      assert.equal(rn(r).type, 'button'); assert.equal(rn(r).attributes.role, 'menuitem');
      assert.equal(an(`2/1/${i}`).authored.role, 'menuitem');
      assert.equal(an(`2/1/${i}`).authored.id, 'menu-' + id);
      assert.equal(rn(r + '/0').ownText, text); assert.equal(an(`2/1/${i}/0`).authored.textContent, text);
      assert.equal(rn(r + '/1').attributes.class, 'mat-ripple mat-mdc-menu-ripple');
      specifications.push({ label: 'menu-item:' + id, reference: [r], candidate: [a] },
        { label: 'native-label-versus-offset-authored-label:' + id, reference: [r + '/0'], candidate: [a + '/0'] },
        { label: 'native-menu-ripple:' + id, reference: [r + '/1'], candidate: [] });
    }
  }
  const seen = { reference: new Set(), candidate: new Set(['root']) };
  const groups = specifications.map(spec => ({ label: spec.label, ...Object.fromEntries(
    [['reference', reference], ['candidate', candidate]].map(([side, tree]) => [side, spec[side].map(key => {
      assert.ok(!seen[side].has(key)); seen[side].add(key); const n = one(tree.nodes.filter(n => n.key === key));
      return { key, parent: n.parent, type: n.type ?? n.authored.type,
        text: side === 'reference' ? n.ownText : n.authored.textContent ?? '',
        ...(side === 'candidate' && n.authored.value ? { value: n.authored.value } : {}) };
    })])) }));
  for (const [side, tree] of [['reference', reference], ['candidate', candidate]]) assert.deepEqual([...seen[side]].sort(), tree.nodes.map(n => n.key).sort());
  return { groups, pattern: `${triggerChildren.length}-${portal.length}` };
}
let controls = 0, referenceNodes = 0, candidateNodes = 0; const patterns = {};
const observations = rows.map(row => {
  const pair = {};
  for (const side of ['reference', 'astylar']) {
    const r = row.evidence.pairedTrees[side], bytes = fs.readFileSync(r.file);
    assert.equal(hash(bytes), r.sha256); pair[side] = JSON.parse(bytes);
  }
  const { groups, pattern } = inspect(pair.reference, pair.astylar); patterns[pattern] = (patterns[pattern] ?? 0) + 1;
  for (const mutate of [p => p.reference.nodes.pop(), p => { p.astylar.nodes[5].parent = 'root'; },
    p => { p.reference.nodes[2].ownText += ' '; }, p => p.astylar.nodes.push(p.astylar.nodes[1])]) {
    const forged = structuredClone(pair); mutate(forged);
    assert.throws(() => { const result = inspect(forged.reference, forged.astylar); assert.equal(result.pattern, pattern); }); controls++;
  }
  referenceNodes += pair.reference.nodes.length; candidateNodes += pair.astylar.nodes.length;
  return { case: row.case, evidence: row.evidence.pairedTrees, groups };
});
assert.deepEqual(patterns, { '4-0': 20, '5-0': 24, '5-12': 32, '5-1': 18 }); assert.equal(controls, 376);
console.log(JSON.stringify({ producer: { file: 'scripts/check-menu-recorded-nodes.mjs', sha256: hash(fs.readFileSync('scripts/check-menu-recorded-nodes.mjs')) },
  review: { file: reviewFile, reviewSha256: reviewId }, cases: 94, referenceNodes, candidateNodes, patterns,
  negativeControlsRejected: controls, existingFindings: findings, observations,
  boundary: 'Every retained element record accounted for,including native portal/backdrop/positioning/content/ripple owners versus local authored popup/labels. Eighteen empty retained portal roots are not open menu or painted-leak evidence. Known descendant/composition/font/density causes are reused,not structural equivalence. Actual AX,anonymous/pseudo/full-style/paint,event histories,resources,current applicability and whole-case closure remain open. No frozen-batch,renderer or fixture changes.',
  canonicalPublication: false, inspectionComplete: false, renderingAccepted: false }));
