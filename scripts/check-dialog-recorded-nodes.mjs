import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { sourceAuditDefinitions } from '../tests/material-parity/input-equivalence-policy.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reviewId = 'ff305b14217b7123b98a2e00f3ecb9ad443cd89606eaf688ea11f6118b7fb069';
const reviewFile = `artifacts/material-parity/working-audit/proposals/${reviewId}.json`;
const review = JSON.parse(fs.readFileSync(reviewFile)).review;
assert.equal(hash(JSON.stringify(review)), reviewId);
const rows = review.groups.filter(row => row.family === 'dialog');
assert.equal(rows.length, 78); assert.equal(new Set(rows.map(row => row.case)).size, 78);
const findings = ['fixture-shared-button-touch-descendant-omission', 'fixture-dialog-text-flow-substitution',
  'fixture-dialog-action-font-tracking-tokens-omitted', 'fixture-dialog-sampled-panel-and-action-geometry',
  'fixture-dialog-text-metric-tokens-omitted', 'fixture-dialog-text-ink-substitution', 'fixture-dialog-fixed-content-boxes'];
for (const id of findings) assert.ok(sourceAuditDefinitions.some(row => row.id === id));
const one = rows => { assert.equal(rows.length, 1); return rows[0]; };
const nativeClasses = ['mat-mdc-button-persistent-ripple mdc-button__ripple', 'mdc-button__label', 'mat-focus-indicator', 'mat-mdc-button-touch-target'];
function inspect(reference, candidate) {
  const rn = key => one(reference.nodes.filter(n => n.key === key));
  const an = id => one(candidate.nodes.filter(n => n.authored.id === id));
  const opened = candidate.nodes.some(n => n.authored.id === 'dialog-overlay');
  const trigger = reference.nodes.filter(n => n.parent === 'frame/2/0');
  const portal = reference.nodes.filter(n => n.key.startsWith('overlay:'));
  assert.ok([4, 5].includes(trigger.length)); assert.ok(opened ? portal.length === 23 : [0, 1].includes(portal.length));
  assert.equal(reference.nodes.length, 5 + trigger.length + portal.length); assert.equal(candidate.nodes.length, opened ? 14 : 6);
  assert.deepEqual(candidate.nodes.slice(1).map(n => n.authored.id), ['page', 'eyebrow', 'title', 'dialog-root', 'dialog-primary',
    ...(opened ? ['dialog-overlay', 'dialog-panel', 'dialog-title', 'dialog-title-label', 'dialog-copy', 'dialog-actions', 'dialog-cancel', 'dialog-save'] : [])]);
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
  assert.equal(rn('frame/0').ownText, an('eyebrow').authored.textContent); assert.equal(rn('frame/1').ownText, an('title').authored.textContent);
  assert.equal(rn('frame/2/0/1').ownText, 'Open dialog'); assert.equal(an('dialog-primary').authored.value, 'Open dialog');
  assert.deepEqual(trigger.slice(0, 4).map(n => n.attributes.class), nativeClasses);
  if (trigger.length === 5) assert.equal(trigger[4].attributes.class, 'mat-ripple mat-mdc-button-ripple');
  const groups = [
    { owner: 'page-and-trigger', reference: reference.nodes.slice(0, 5).map(n => n.key), candidate: candidate.nodes.slice(1, 6).map(n => n.key) },
    { owner: 'native-trigger-label-state-focus-touch-and-ripple-versus-value', reference: trigger.map(n => n.key), candidate: [] },
  ];
  if (portal.length) assert.equal(rn('overlay:0').attributes.class, 'cdk-overlay-container');
  if (opened) {
    const panel = 'overlay:0/1/0/1', surface = panel + '/0/0';
    assert.equal(rn(panel).type, 'mat-dialog-container'); assert.equal(rn(panel).attributes.role, 'dialog');
    assert.equal(an('dialog-overlay').authored.type, 'dialog'); assert.equal(an('dialog-overlay').authored.open, true);
    assert.equal(an('dialog-overlay').authored.modal, true);
    assert.equal(rn(surface + '/0').type, 'h2'); assert.equal(rn(surface + '/0').ownText, 'Confirm action');
    assert.equal(an('dialog-title').authored.type, 'h2'); assert.equal(an('dialog-title-label').authored.textContent, 'Confirm action');
    assert.equal(rn(surface + '/1').type, 'mat-dialog-content'); assert.equal(rn(surface + '/1').ownText, 'Save Project Atlas?');
    assert.equal(an('dialog-copy').authored.type, 'p'); assert.equal(an('dialog-copy').authored.textContent, 'Save Project Atlas?');
    assert.equal(rn(surface + '/2').type, 'mat-dialog-actions'); assert.equal(an('dialog-actions').authored.type, 'div');
    assert.equal(rn(panel).attributes['aria-labelledby'], rn(surface + '/0').attributes.id);
    groups.push({ owner: 'native-direct-heading-versus-nested-title-span', reference: [surface + '/0'], candidate: [an('dialog-title').key, an('dialog-title-label').key] },
      { owner: 'native-content-owner-versus-paragraph', reference: [surface + '/1'], candidate: [an('dialog-copy').key] },
      { owner: 'native-actions-owner-versus-div', reference: [surface + '/2'], candidate: [an('dialog-actions').key] });
    for (const [i, id, label, length] of [[0, 'dialog-cancel', 'Cancel', 5], [1, 'dialog-save', 'Save', 4]]) {
      const key = `${surface}/2/${i}`, children = reference.nodes.filter(n => n.parent === key);
      assert.equal(rn(key).type, 'button'); assert.equal(children.length, length);
      assert.deepEqual(children.slice(0, 4).map(n => n.attributes.class), nativeClasses);
      if (length === 5) assert.equal(children[4].attributes.class, 'mat-ripple mat-mdc-button-ripple');
      assert.equal(rn(key + '/1').ownText, label); assert.equal(an(id).authored.type, 'button'); assert.equal(an(id).authored.value, label);
      groups.push({ owner: 'native-action-label-state-focus-touch-versus-value-button', label, reference: [key, ...children.map(n => n.key)], candidate: [an(id).key] });
    }
    for (const key of ['overlay:0/1/0/0', 'overlay:0/1/0/2']) {
      assert.equal(rn(key).attributes.class, 'cdk-visually-hidden cdk-focus-trap-anchor'); assert.equal(rn(key).attributes['aria-hidden'], 'true');
    }
    groups.push({ owner: 'native-portal-backdrop-pane-inner-surface-focus-traps-versus-modal-and-panel',
      reference: portal.filter(n => !n.key.startsWith(surface + '/')).map(n => n.key), candidate: [an('dialog-overlay').key, an('dialog-panel').key],
      semantics: { referenceLabelledby: rn(panel).attributes['aria-labelledby'], referenceModal: rn(panel).attributes['aria-modal'],
        candidateLabel: an('dialog-overlay').authored.ariaLabel, candidateModal: an('dialog-overlay').authored.modal } });
  } else if (portal.length) groups.push({ owner: 'empty-retained-native-portal-not-open-dialog', reference: ['overlay:0'], candidate: [] });
  assert.deepEqual(groups.flatMap(g => g.reference).sort(), reference.nodes.map(n => n.key).sort());
  assert.deepEqual(groups.flatMap(g => g.candidate).sort(), candidate.nodes.slice(1).map(n => n.key).sort());
  return { pattern: `${reference.nodes.length}/${candidate.nodes.length}`, groups };
}
let controls = 0, referenceNodes = 0, candidateNodes = 0; const patterns = {};
const observations = rows.map(row => {
  const pair = {};
  for (const side of ['reference', 'astylar']) { const r = row.evidence.pairedTrees[side], bytes = fs.readFileSync(r.file); assert.equal(hash(bytes), r.sha256); pair[side] = JSON.parse(bytes); }
  const result = inspect(pair.reference, pair.astylar); patterns[result.pattern] = (patterns[result.pattern] ?? 0) + 1;
  for (const mutate of [p => p.reference.nodes.pop(), p => p.astylar.nodes.pop(), p => { p.reference.nodes[6].ownText += ' '; }, p => { p.astylar.nodes[5].parent = 'root'; }]) {
    const forged = structuredClone(pair); mutate(forged);
    assert.throws(() => { const altered = inspect(forged.reference, forged.astylar); assert.equal(altered.pattern, result.pattern); }); controls++;
  }
  referenceNodes += pair.reference.nodes.length; candidateNodes += pair.astylar.nodes.length;
  return { case: row.case, evidence: row.evidence.pairedTrees, groups: result.groups };
});
assert.deepEqual(patterns, { '9/6': 12, '10/6': 24, '33/14': 32, '11/6': 10 }); assert.equal(controls, 312);
console.log(JSON.stringify({ producer: { file: 'scripts/check-dialog-recorded-nodes.mjs', sha256: hash(fs.readFileSync('scripts/check-dialog-recorded-nodes.mjs')) },
  review: { file: reviewFile, reviewSha256: reviewId }, cases: 78, referenceNodes, candidateNodes, patterns, negativeControlsRejected: controls,
  existingFindings: findings, observations, boundary: 'All retained dialog element records explicitly accounted for,including native direct heading/content/actions,button descendants,portal/surface/focus-trap owners versus candidate nested title and modal/panel/value buttons. Ten empty native portal roots are not open/painted dialogs. Existing authoring/geometry/typography causes reused. Retains unequal naming/modal inputs,not actual AX or focus-trap equivalence. Anonymous/pseudo/full-style/used-layout/paint/event/resource/currentness and whole-case closure remain open. No frozen-export input changed.',
  canonicalPublication: false, inspectionComplete: false, renderingAccepted: false }));
