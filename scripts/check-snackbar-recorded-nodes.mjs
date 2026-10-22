import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { sourceAuditDefinitions } from '../tests/material-parity/input-equivalence-policy.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reviewId = 'ff305b14217b7123b98a2e00f3ecb9ad443cd89606eaf688ea11f6118b7fb069';
const reviewFile = `artifacts/material-parity/working-audit/proposals/${reviewId}.json`;
const review = JSON.parse(fs.readFileSync(reviewFile)).review; assert.equal(hash(JSON.stringify(review)), reviewId);
const rows = review.groups.filter(row => row.family === 'snack-bar');
assert.equal(rows.length, 71); assert.equal(new Set(rows.map(row => row.case)).size, 71);
const findings = ['fixture-shared-button-touch-descendant-omission', 'fixture-snackbar-message-composition-substitution',
  'fixture-snackbar-message-token-substitution', 'fixture-snackbar-fixed-width', 'fixture-snackbar-action-typography-substitution'];
for (const id of findings) assert.ok(sourceAuditDefinitions.some(row => row.id === id));
const one = rows => { assert.equal(rows.length, 1); return rows[0]; };
const nativeClasses = ['mat-mdc-button-persistent-ripple mdc-button__ripple', 'mdc-button__label', 'mat-focus-indicator', 'mat-mdc-button-touch-target'];
function inspect(reference, candidate) {
  const rn = key => one(reference.nodes.filter(n => n.key === key));
  const an = id => one(candidate.nodes.filter(n => n.authored.id === id));
  const opened = candidate.nodes.some(n => n.authored.id === 'snack-bar-overlay');
  const trigger = reference.nodes.filter(n => n.parent === 'frame/2/0'), portal = reference.nodes.filter(n => n.key.startsWith('overlay:'));
  assert.ok([4, 5].includes(trigger.length)); assert.ok(opened ? portal.length === 16 : [0, 1].includes(portal.length));
  assert.equal(reference.nodes.length, 5 + trigger.length + portal.length); assert.equal(candidate.nodes.length, opened ? 10 : 6);
  assert.deepEqual(candidate.nodes.slice(1).map(n => n.authored.id), ['page', 'eyebrow', 'title', 'snack-bar-root', 'snack-bar-primary',
    ...(opened ? ['snack-bar-overlay', 'snack-bar-surface', 'snack-bar-title', 'snack-bar-dismiss'] : [])]);
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
  assert.equal(rn('frame/2/0/1').ownText, 'Show snackbar'); assert.equal(an('snack-bar-primary').authored.value, 'Show snackbar');
  assert.deepEqual(trigger.slice(0, 4).map(n => n.attributes.class), nativeClasses);
  if (trigger.length === 5) assert.equal(trigger[4].attributes.class, 'mat-ripple mat-mdc-button-ripple');
  const groups = [
    { owner: 'page-and-trigger', reference: reference.nodes.slice(0, 5).map(n => n.key), candidate: candidate.nodes.slice(1, 6).map(n => n.key) },
    { owner: 'native-trigger-label-state-focus-touch-and-ripple-versus-value', reference: trigger.map(n => n.key), candidate: [] },
  ];
  if (portal.length) assert.equal(rn('overlay:0').attributes.class, 'cdk-overlay-container');
  if (opened) {
    const container = 'overlay:0/0/0/0', surface = container + '/0', live = surface + '/0/0', simple = live + '/0/0', action = simple + '/1/0';
    assert.equal(rn(container).type, 'mat-snack-bar-container'); assert.equal(rn(surface).attributes.class, 'mdc-snackbar__surface mat-mdc-snackbar-surface');
    assert.equal(rn(live).attributes['aria-live'], 'polite'); assert.equal(rn(simple).type, 'simple-snack-bar');
    assert.equal(an('snack-bar-surface').authored.role, 'status'); assert.equal(an('snack-bar-surface').authored.ariaLive, 'polite'); assert.equal(an('snack-bar-surface').authored.ariaAtomic, true);
    assert.equal(rn(simple + '/0').ownText, ' Project saved\n'); assert.equal(an('snack-bar-title').authored.textContent, 'Project saved');
    assert.equal(rn(action).type, 'button'); assert.equal(rn(action + '/1').ownText, ' UNDO '); assert.equal(an('snack-bar-dismiss').authored.value, 'UNDO');
    const children = reference.nodes.filter(n => n.parent === action); assert.equal(children.length, 4); assert.deepEqual(children.map(n => n.attributes.class), nativeClasses);
    groups.push({ owner: 'native-label-versus-span-raw-text-preserved', reference: [simple + '/0'], candidate: [an('snack-bar-title').key], rawText: { reference: rn(simple + '/0').ownText, candidate: an('snack-bar-title').authored.textContent } },
      { owner: 'native-actions-and-button-descendants-versus-value-button', reference: [simple + '/1', action, ...children.map(n => n.key)], candidate: [an('snack-bar-dismiss').key], rawText: { reference: rn(action + '/1').ownText, candidate: an('snack-bar-dismiss').authored.value } },
      { owner: 'native-portal-container-surface-live-label-simple-wrappers-versus-overlay-status-surface',
        reference: portal.filter(n => !n.key.startsWith(simple + '/')).map(n => n.key), candidate: [an('snack-bar-overlay').key, an('snack-bar-surface').key],
        liveInputs: { reference: rn(live).attributes, candidate: an('snack-bar-surface').authored } });
  } else if (portal.length) groups.push({ owner: 'empty-retained-native-portal-not-open-snackbar', reference: ['overlay:0'], candidate: [] });
  assert.deepEqual(groups.flatMap(g => g.reference).sort(), reference.nodes.map(n => n.key).sort());
  assert.deepEqual(groups.flatMap(g => g.candidate).sort(), candidate.nodes.slice(1).map(n => n.key).sort());
  return { pattern: `${reference.nodes.length}/${candidate.nodes.length}`, groups };
}
let controls = 0, referenceNodes = 0, candidateNodes = 0; const patterns = {};
const observations = rows.map(row => {
  const pair = {}; for (const side of ['reference', 'astylar']) { const r = row.evidence.pairedTrees[side], bytes = fs.readFileSync(r.file); assert.equal(hash(bytes), r.sha256); pair[side] = JSON.parse(bytes); }
  const result = inspect(pair.reference, pair.astylar); patterns[result.pattern] = (patterns[result.pattern] ?? 0) + 1;
  for (const mutate of [p => p.reference.nodes.pop(), p => p.astylar.nodes.pop(), p => { p.reference.nodes[6].ownText += ' '; }, p => { p.astylar.nodes[5].parent = 'root'; }]) {
    const forged = structuredClone(pair); mutate(forged); assert.throws(() => { const altered = inspect(forged.reference, forged.astylar); assert.equal(altered.pattern, result.pattern); }); controls++;
  }
  referenceNodes += pair.reference.nodes.length; candidateNodes += pair.astylar.nodes.length;
  return { case: row.case, evidence: row.evidence.pairedTrees, groups: result.groups };
});
assert.deepEqual(patterns, { '9/6': 12, '10/6': 24, '26/10': 34, '11/6': 1 }); assert.equal(controls, 284);
console.log(JSON.stringify({ producer: { file: 'scripts/check-snackbar-recorded-nodes.mjs', sha256: hash(fs.readFileSync('scripts/check-snackbar-recorded-nodes.mjs')) },
  review: { file: reviewFile, reviewSha256: reviewId }, cases: 71, referenceNodes, candidateNodes, patterns, negativeControlsRejected: controls,
  existingFindings: findings, observations, boundary: 'Every retained snackbar element accounted for,including message and action in all34 open pairs,native label/live/portal/surface/action descendants versus authored overlay/status/span/value button. Raw whitespace and live-owner attributes preserved. One empty native portal is not an open snackbar. Reuses known composition/token/sizing findings;not evidence of current visibility or a diagnosis of older missing screenshots. Anonymous/pseudo/full-style/AX/paint/reachability/event/resource/currentness and whole-case closure remain open. No frozen-export source changed.',
  canonicalPublication: false, inspectionComplete: false, renderingAccepted: false }));
