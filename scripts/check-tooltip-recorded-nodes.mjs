import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { sourceAuditDefinitions } from '../tests/material-parity/input-equivalence-policy.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reviewId = 'ff305b14217b7123b98a2e00f3ecb9ad443cd89606eaf688ea11f6118b7fb069';
const reviewFile = `artifacts/material-parity/working-audit/proposals/${reviewId}.json`;
const review = JSON.parse(fs.readFileSync(reviewFile)).review; assert.equal(hash(JSON.stringify(review)), reviewId);
const rows = review.groups.filter(row => row.family === 'tooltip');
assert.equal(rows.length, 62); assert.equal(new Set(rows.map(row => row.case)).size, 62);
const findings = ['fixture-shared-button-touch-descendant-omission', 'fixture-tooltip-replaces-connected-overlay-with-flow',
  'fixture-tooltip-benchmark-hover-suppression', 'fixture-tooltip-benchmark-click-forces-open',
  'harness-tooltip-open-popup-checks-omitted', 'fixture-tooltip-persistent-description-association-conditioned-on-popup',
  'fixture-tooltip-text-alignment-omission'];
for (const id of findings) assert.ok(sourceAuditDefinitions.some(row => row.id === id));
function inspect(reference, candidate) {
  const one = rows => { assert.equal(rows.length, 1); return rows[0]; };
  const rn = key => one(reference.nodes.filter(n => n.key === key)), an = id => one(candidate.nodes.filter(n => n.authored.id === id));
  const trigger = reference.nodes.filter(n => n.parent === 'frame/2/0'), portal = reference.nodes.filter(n => n.key.startsWith('overlay:'));
  const nativePopup = portal.length === 6, candidatePopup = candidate.nodes.some(n => n.authored.id === 'tooltip-popup');
  assert.ok([4, 5].includes(trigger.length)); assert.ok([0, 1, 6].includes(portal.length));
  assert.equal(reference.nodes.length, 5 + trigger.length + portal.length); assert.equal(candidate.nodes.length, candidatePopup ? 8 : 7);
  assert.deepEqual(candidate.nodes.slice(1).map(n => n.authored.id), ['page', 'eyebrow', 'title', 'tooltip-root', 'tooltip-anchor', 'tooltip-primary', ...(candidatePopup ? ['tooltip-popup'] : [])]);
  assert.equal(candidate.nodes[0].key, 'root'); assert.deepEqual(candidate.nodes[0].authored, {});
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
  assert.equal(rn('frame/0').ownText, an('eyebrow').authored.textContent); assert.equal(rn('frame/1').ownText, an('title').authored.textContent);
  assert.equal(rn('frame/2/0/1').ownText, 'Hover for help'); assert.equal(an('tooltip-primary').authored.value, 'Hover for help');
  assert.equal(an('tooltip-primary').authored.type, 'button'); assert.equal(an('tooltip-anchor').authored.type, 'div');
  assert.ok(rn('frame/2/0').attributes['aria-describedby']);
  assert.equal(an('tooltip-primary').authored.ariaDescribedby, candidatePopup ? 'tooltip-popup' : undefined);
  assert.deepEqual(trigger.slice(0, 4).map(n => n.attributes.class), ['mat-mdc-button-persistent-ripple mdc-button__ripple', 'mdc-button__label', 'mat-focus-indicator', 'mat-mdc-button-touch-target']);
  if (trigger.length === 5) assert.equal(trigger[4].attributes.class, 'mat-ripple mat-mdc-button-ripple');
  const groups = [
    { owner: 'page-and-trigger', reference: reference.nodes.slice(0, 5).map(n => n.key), candidate: [...candidate.nodes.slice(1, 5).map(n => n.key), an('tooltip-primary').key],
      descriptionInputs: { reference: rn('frame/2/0').attributes['aria-describedby'], candidate: an('tooltip-primary').authored.ariaDescribedby ?? null } },
    { owner: 'native-trigger-label-state-focus-touch-and-ripple-versus-value', reference: trigger.map(n => n.key), candidate: [] },
    { owner: 'candidate-flow-anchor-without-native-counterpart', reference: [], candidate: [an('tooltip-anchor').key] },
  ];
  if (portal.length) assert.equal(rn('overlay:0').attributes.class, 'cdk-overlay-container');
  if (nativePopup) {
    assert.equal(rn('overlay:0/0').attributes.class, 'cdk-overlay-connected-position-bounding-box');
    assert.equal(rn('overlay:0/0/0/0').type, 'mat-tooltip-component'); assert.equal(rn('overlay:0/0/0/0').attributes['aria-hidden'], 'true');
    assert.equal(rn('overlay:0/0/0/0/0/0').ownText, 'Create a project');
  }
  if (candidatePopup) { assert.equal(an('tooltip-popup').authored.role, 'tooltip'); assert.equal(an('tooltip-popup').authored.textContent, 'Create a project'); }
  if (portal.length || candidatePopup) groups.push({ owner: nativePopup ? 'native-connected-visual-tooltip-versus-flow-popup' : candidatePopup ? 'candidate-only-popup-versus-empty-native-portal' : 'empty-native-portal-not-visible-tooltip',
    reference: portal.map(n => n.key), candidate: candidatePopup ? [an('tooltip-popup').key] : [] });
  assert.deepEqual(groups.flatMap(g => g.reference).sort(), reference.nodes.map(n => n.key).sort());
  assert.deepEqual(groups.flatMap(g => g.candidate).sort(), candidate.nodes.slice(1).map(n => n.key).sort());
  return { pattern: `${reference.nodes.length}/${candidate.nodes.length}`, nativePopup, candidatePopup, groups };
}
let controls = 0, referenceNodes = 0, candidateNodes = 0, nativePopupCases = 0, candidatePopupCases = 0; const patterns = {};
const observations = rows.map(row => {
  const pair = {}; for (const side of ['reference', 'astylar']) { const r = row.evidence.pairedTrees[side], bytes = fs.readFileSync(r.file); assert.equal(hash(bytes), r.sha256); pair[side] = JSON.parse(bytes); }
  const result = inspect(pair.reference, pair.astylar); patterns[result.pattern] = (patterns[result.pattern] ?? 0) + 1;
  for (const mutate of [p => p.reference.nodes.pop(), p => p.astylar.nodes.pop(), p => { p.reference.nodes[6].ownText += ' '; }, p => { p.astylar.nodes[6].parent = 'root'; }]) {
    const forged = structuredClone(pair); mutate(forged); assert.throws(() => { const altered = inspect(forged.reference, forged.astylar); assert.equal(altered.pattern, result.pattern); }); controls++;
  }
  referenceNodes += pair.reference.nodes.length; candidateNodes += pair.astylar.nodes.length;
  nativePopupCases += Number(result.nativePopup); candidatePopupCases += Number(result.candidatePopup);
  return { case: row.case, evidence: row.evidence.pairedTrees, groups: result.groups };
});
assert.deepEqual(patterns, { '9/7': 12, '10/7': 8, '16/8': 18, '11/7': 16, '11/8': 8 });
assert.equal(controls, 248); assert.equal(nativePopupCases, 18); assert.equal(candidatePopupCases, 26);
console.log(JSON.stringify({ producer: { file: 'scripts/check-tooltip-recorded-nodes.mjs', sha256: hash(fs.readFileSync('scripts/check-tooltip-recorded-nodes.mjs')) },
  review: { file: reviewFile, reviewSha256: reviewId }, cases: 62, referenceNodes, candidateNodes, patterns, nativePopupCases, candidatePopupCases,
  negativeControlsRejected: controls, existingFindings: findings, observations,
  boundary: 'All retained element records accounted for. Native visual tooltip is aria-hidden;its persistent described-by target is outside the retained tree,not proven absent. Candidate association/popup conditionality and8 candidate-only open states reuse known authoring/harness findings. No hidden description nodes invented,no absence or AX diagnosis from visual-tree omission. Full styles,anonymous/pseudo/paint/position/sharpness/events/resources/currentness and whole-case closure remain open. No frozen-export input changed.',
  canonicalPublication: false, inspectionComplete: false, renderingAccepted: false }));
