import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { sourceAuditDefinitions } from '../tests/material-parity/input-equivalence-policy.mjs';
// Same bounded element-record accounting as menu/tabs;not used-layout or paint.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reviewId = 'ff305b14217b7123b98a2e00f3ecb9ad443cd89606eaf688ea11f6118b7fb069';
const reviewFile = `artifacts/material-parity/working-audit/proposals/${reviewId}.json`;
const review = JSON.parse(fs.readFileSync(reviewFile)).review;
assert.equal(hash(JSON.stringify(review)), reviewId);
const rows = review.groups.filter(row => row.family === 'bottom-sheet');
assert.equal(rows.length, 63); assert.equal(new Set(rows.map(row => row.case)).size, 63);
const findings = ['fixture-shared-button-touch-descendant-omission', 'fixture-bottom-sheet-fixed-constraints',
  'fixture-bottom-sheet-list-structure-and-token-substitution'];
for (const id of findings) assert.ok(sourceAuditDefinitions.some(row => row.id === id));
const one = rows => { assert.equal(rows.length, 1); return rows[0]; };
function inspect(reference, candidate) {
  const rn = key => one(reference.nodes.filter(n => n.key === key));
  const an = id => one(candidate.nodes.filter(n => n.authored.id === id));
  const opened = candidate.nodes.some(n => n.authored.id === 'bottom-sheet-overlay');
  const trigger = reference.nodes.filter(n => n.parent === 'frame/2/0');
  const portal = reference.nodes.filter(n => n.key.startsWith('overlay:'));
  assert.ok([4, 5].includes(trigger.length));
  assert.ok(opened ? portal.length === 16 : [0, 1].includes(portal.length));
  assert.equal(reference.nodes.length, 5 + trigger.length + portal.length);
  assert.equal(candidate.nodes.length, opened ? 10 : 6);
  assert.deepEqual(candidate.nodes.slice(1).map(n => n.authored.id), ['page', 'eyebrow', 'title', 'bottom-sheet-root', 'bottom-sheet-primary',
    ...(opened ? ['bottom-sheet-overlay', 'bottom-sheet-panel', 'bottom-sheet-dismiss', 'bottom-sheet-copy'] : [])]);
  assert.deepEqual(candidate.nodes[0].authored, {}); assert.equal(candidate.nodes[0].key, 'root');
  for (const [side, tree] of [['reference', reference], ['candidate', candidate]]) {
    assert.deepEqual(tree.errors, []); assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
    for (const n of tree.nodes) {
      const root = side === 'reference' ? ['frame', 'overlay:0'].includes(n.key) : n.key === 'root';
      assert.equal(n.parent, root ? null : n.key.slice(0, n.key.lastIndexOf('/')));
      if (side === 'reference') assert.ok(tree.styles[n.style]);
      else if (!root) for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']) assert.ok(n[stage]);
    }
  }
  assert.deepEqual(reference.nodes.slice(0, 5).map(n => n.type), ['main', 'p', 'h1', 'section', 'button']);
  assert.deepEqual(candidate.nodes.slice(1, 6).map(n => n.authored.type), ['main', 'p', 'h1', 'section', 'button']);
  assert.equal(rn('frame/0').ownText, an('eyebrow').authored.textContent);
  assert.equal(rn('frame/1').ownText, an('title').authored.textContent);
  assert.equal(rn('frame/2/0/1').ownText, 'Open bottom sheet');
  assert.equal(an('bottom-sheet-primary').authored.value, 'Open bottom sheet');
  assert.deepEqual(trigger.slice(0, 4).map(n => n.attributes.class), [
    'mat-mdc-button-persistent-ripple mdc-button__ripple', 'mdc-button__label', 'mat-focus-indicator', 'mat-mdc-button-touch-target']);
  if (trigger.length === 5) assert.equal(trigger[4].attributes.class, 'mat-ripple mat-mdc-button-ripple');
  const groups = [
    { owner: 'page-and-trigger', reference: reference.nodes.slice(0, 5).map(n => n.key), candidate: candidate.nodes.slice(1, 6).map(n => n.key) },
    { owner: 'native-trigger-label-state-focus-touch-and-ripple-versus-value', reference: trigger.map(n => n.key), candidate: [] },
  ];
  if (portal.length) assert.equal(rn('overlay:0').attributes.class, 'cdk-overlay-container');
  if (opened) {
    assert.equal(rn('overlay:0/1/0/1').type, 'mat-bottom-sheet-container');
    assert.equal(rn('overlay:0/1/0/1').attributes.role, 'dialog');
    assert.equal(an('bottom-sheet-overlay').authored.role, 'dialog');
    assert.equal(rn('overlay:0/1/0/1/0').attributes.role, 'navigation');
    for (const [i, id, label] of [[0, 'bottom-sheet-dismiss', 'Share'], [1, 'bottom-sheet-copy', 'Copy link']]) {
      const key = `overlay:0/1/0/1/0/${i}`;
      assert.equal(rn(key).type, 'a'); assert.equal(rn(key).attributes.href, '#');
      assert.equal(rn(key + '/0').attributes.class, 'mdc-list-item__content');
      assert.equal(rn(key + '/0/0').ownText, label); assert.equal(rn(key + '/1').attributes.class, 'mat-focus-indicator');
      assert.equal(an(id).authored.type, 'button'); assert.equal(an(id).authored.value, label);
      groups.push({ owner: 'native-link-list-content-label-focus-versus-value-button', label,
        reference: [key, key + '/0', key + '/0/0', key + '/1'], candidate: [an(id).key] });
    }
    for (const key of ['overlay:0/1/0/0', 'overlay:0/1/0/2']) {
      assert.equal(rn(key).attributes.class, 'cdk-visually-hidden cdk-focus-trap-anchor');
      assert.equal(rn(key).attributes['aria-hidden'], 'true');
    }
    groups.push({ owner: 'native-portal-backdrop-positioning-panel-navigation-focus-trap-versus-local-overlay-panel',
      reference: portal.filter(n => !n.key.startsWith('overlay:0/1/0/1/0/')).map(n => n.key),
      candidate: [an('bottom-sheet-overlay').key, an('bottom-sheet-panel').key],
      panelNames: { reference: rn('overlay:0/1/0/1').attributes['aria-label'], candidate: an('bottom-sheet-overlay').authored.ariaLabel } });
  } else if (portal.length) groups.push({ owner: 'empty-retained-native-portal-not-open-sheet', reference: ['overlay:0'], candidate: [] });
  assert.deepEqual(groups.flatMap(g => g.reference).sort(), reference.nodes.map(n => n.key).sort());
  assert.deepEqual(groups.flatMap(g => g.candidate).sort(), candidate.nodes.slice(1).map(n => n.key).sort());
  return { pattern: `${reference.nodes.length}/${candidate.nodes.length}`, groups };
}
let controls = 0, referenceNodes = 0, candidateNodes = 0; const patterns = {};
const observations = rows.map(row => {
  const pair = {};
  for (const side of ['reference', 'astylar']) {
    const r = row.evidence.pairedTrees[side], bytes = fs.readFileSync(r.file);
    assert.equal(hash(bytes), r.sha256); pair[side] = JSON.parse(bytes);
  }
  const result = inspect(pair.reference, pair.astylar); patterns[result.pattern] = (patterns[result.pattern] ?? 0) + 1;
  for (const mutate of [p => p.reference.nodes.pop(), p => p.astylar.nodes.pop(),
    p => { p.reference.nodes[6].ownText += ' '; }, p => { p.astylar.nodes[5].parent = 'root'; }]) {
    const forged = structuredClone(pair); mutate(forged);
    assert.throws(() => { const altered = inspect(forged.reference, forged.astylar); assert.equal(altered.pattern, result.pattern); }); controls++;
  }
  referenceNodes += pair.reference.nodes.length; candidateNodes += pair.astylar.nodes.length;
  return { case: row.case, evidence: row.evidence.pairedTrees, groups: result.groups };
});
assert.deepEqual(patterns, { '9/6': 12, '10/6': 24, '26/10': 25, '11/6': 2 }); assert.equal(controls, 252);
console.log(JSON.stringify({ producer: { file: 'scripts/check-bottom-sheet-recorded-nodes.mjs', sha256: hash(fs.readFileSync('scripts/check-bottom-sheet-recorded-nodes.mjs')) },
  review: { file: reviewFile, reviewSha256: reviewId }, cases: 63, referenceNodes, candidateNodes, patterns,
  negativeControlsRejected: controls, existingFindings: findings, observations,
  boundary: 'Every retained element accounted for,including both native links/labels,state/focus/touch owners,portal/backdrop/positioning/navigation/focus-trap records versus local overlay/panel/value buttons. Two empty native portal roots are not open or painted sheets. Reuses known composition/fixed-constraint causes;panel naming observations still need semantic classification. Not anonymous boxes,pseudo paint,full styles,used layout,visibility/reachability,actual AX,event/resource histories,current rendering or case closure. No frozen-export source changed.',
  canonicalPublication: false, inspectionComplete: false, renderingAccepted: false }));
