import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { sourceAuditDefinitions } from '../tests/material-parity/input-equivalence-policy.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const reviewId = 'ff305b14217b7123b98a2e00f3ecb9ad443cd89606eaf688ea11f6118b7fb069';
const reviewFile = `artifacts/material-parity/working-audit/proposals/${reviewId}.json`;
const review = JSON.parse(fs.readFileSync(reviewFile)).review; assert.equal(hash(JSON.stringify(review)), reviewId);
const rows = review.groups.filter(r => r.family === 'timepicker'); assert.equal(rows.length, 110);
const logFile = 'artifacts/material-parity/filled-field-structure-ledger-review-20261020.log', bytes = fs.readFileSync(logFile);
assert.equal(hash(bytes), '5fadba044b06bd7dd601687ab0f30ecde740413623feaf55d6bd2d0a2e5b6a09');
const lines = bytes.toString().split(/\r?\n/), start = lines.findIndex(l => l.startsWith('# FIELD_STRUCTURE_REVIEW ')); assert.ok(start >= 0);
const end = lines.findIndex((l, i) => i > start && l.startsWith('# Subtest:')); assert.ok(end > start);
const serialized = lines.slice(start, end).map(l => { assert.ok(l.startsWith('# ')); return l.slice(2); }).join('').slice('FIELD_STRUCTURE_REVIEW '.length);
const proof = JSON.parse(serialized.replace(/\\([\\#])/g, '$1')); assert.equal(proof.rows.length, 577);
assert.ok(lines.includes('# pass 1') && lines.includes('# fail 0'));
for (const r of [proof.report, proof.source, proof.proof]) assert.equal(hash(fs.readFileSync(r.file)), r.sha256);
const findings = ['fixture-timepicker-option-structure-and-selection-substitution', 'fixture-timepicker-option-ink-substitution', 'fixture-tooltip-timepicker-focus-popup-state-mismatch'];
for (const id of findings) assert.ok(sourceAuditDefinitions.some(r => r.id === id));
const prior = new Map(proof.rows.map(r => [r.case, r])), one = a => { assert.equal(a.length, 1); return a[0]; };
const label = i => `${Math.floor(i / 2) % 12 || 12}:${i % 2 ? '30' : '00'} ${i < 24 ? 'AM' : 'PM'}`;
function inspect(row, native, candidate) {
  const m = prior.get(row.case); assert.deepEqual(row.obligations.inputStyleStructure.retainedFilledFieldStructure.observation, m); assert.deepEqual(m.inputTrees, row.evidence.pairedTrees);
  const an = id => one(candidate.nodes.filter(n => n.authored.id === id));
  const nk = ['frame', 'frame/0', 'frame/1', 'frame/2', ...['host', 'wrapper', 'flex', 'infix', 'control', 'floatingLabel', 'label'].map(k => m.reference[k]),
    ...(m.reference.focusLayer ? [m.reference.focusLayer.key] : []), m.reference.underline.key];
  const ak = ['root/0', 'root/0/0', 'root/0/1', 'root/0/2', ...['shell', 'surface', 'region', 'label', 'control', 'genericLine', 'alternateLine'].map(k => m.astylar[k]).filter(Boolean)];
  for (const [side, tree, known] of [['reference', native, nk], ['candidate', candidate, ak]]) {
    assert.deepEqual(tree.errors, []); assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length); assert.equal(new Set(known).size, known.length);
    for (const key of known) one(tree.nodes.filter(n => n.key === key));
    for (const n of tree.nodes) {
      const root = side === 'reference' ? ['frame', 'overlay:0'].includes(n.key) : n.key === 'root';
      assert.equal(n.parent, root ? null : n.key.slice(0, n.key.lastIndexOf('/')));
      if (side === 'reference') assert.ok(tree.styles[n.style]);
      else if (!root) for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']) assert.ok(n[stage]);
    }
  }
  assert.equal(candidate.nodes[0].key, 'root'); assert.deepEqual(candidate.nodes[0].authored, {});
  const groups = [{ owner: 'reused-authenticated-filled-field-page-and-focus-line-owners', reference: nk, candidate: ak }];
  const caption = one(native.nodes.filter(n => n.parent === m.reference.host && n.attributes.class?.startsWith('mat-mdc-form-field-subscript-wrapper')));
  const hint = one(native.nodes.filter(n => n.parent === caption.key)), spacer = one(native.nodes.filter(n => n.parent === hint.key));
  assert.equal(hint.attributes.class, 'mat-mdc-form-field-hint-wrapper'); assert.equal(spacer.attributes.class, 'mat-mdc-form-field-hint-spacer');
  groups.push({ owner: 'native-empty-subscript-branch', reference: [caption.key, hint.key, spacer.key], candidate: [] });
  const template = one(native.nodes.filter(n => n.type === 'mat-timepicker')); assert.equal(template.parent, m.reference.infix);
  assert.equal(native.nodes.filter(n => n.parent === template.key).length, 0);
  groups.push({ owner: 'dormant-native-timepicker-template-not-visible-panel', reference: [template.key], candidate: [] });
  const suffix = one(native.nodes.filter(n => n.attributes.class === 'mat-mdc-form-field-icon-suffix'));
  assert.equal(suffix.parent, m.reference.flex);
  const toggle = one(native.nodes.filter(n => n.type === 'mat-timepicker-toggle')); assert.equal(toggle.parent, suffix.key);
  const button = one(native.nodes.filter(n => n.parent === toggle.key)); assert.equal(button.type, 'button');
  const parts = native.nodes.filter(n => n.parent === button.key); assert.ok([4, 5].includes(parts.length));
  assert.deepEqual(parts.slice(0, 4).map(n => n.type), ['span', 'svg', 'span', 'span']);
  assert.deepEqual(parts.slice(0, 4).map(n => n.attributes.class), ['mat-mdc-button-persistent-ripple mdc-icon-button__ripple', 'mat-timepicker-toggle-default-icon', 'mat-focus-indicator', 'mat-mdc-button-touch-target']);
  if (parts.length === 5) assert.equal(parts[4].attributes.class, 'mat-ripple mat-mdc-button-ripple');
  const path = one(native.nodes.filter(n => n.parent === parts[1].key)); assert.equal(path.type, 'path');
  const iconIds = ['timepicker-icon', 'timepicker-icon-visual', 'timepicker-clock-icon', 'timepicker-clock-hour', 'timepicker-clock-minute'];
  assert.deepEqual(iconIds.map(id => an(id).authored.type), ['button', 'span', 'span', 'span', 'span']);
  groups.push({ owner: 'native-icon-suffix-toggle-button-svg-and-interaction-descendants-versus-css-clock-composition',
    reference: [suffix.key, toggle.key, button.key, ...parts.map(n => n.key), path.key], candidate: iconIds.map(id => an(id).key),
    nativeButtonAttributes: button.attributes, candidateButton: an('timepicker-icon').authored });
  const portal = native.nodes.filter(n => n.key.startsWith('overlay:')), options = portal.filter(n => n.type === 'mat-option');
  const popup = candidate.nodes.filter(n => n.authored.id === 'timepicker-options'); assert.ok(popup.length <= 1);
  const optionInputs = [];
  if (portal.length > 1) {
    assert.equal(options.length, 48); const panel = one(portal.filter(n => n.attributes.class === 'mat-timepicker-panel'));
    assert.ok(options.every(n => n.parent === panel.key));
    const owned = new Set(); options.forEach((option, i) => {
      const children = native.nodes.filter(n => n.parent === option.key); assert.equal(children.length, 2);
      assert.equal(children[0].attributes.class, 'mdc-list-item__primary-text'); assert.equal(children[0].ownText, label(i));
      assert.equal(children[1].attributes.class, 'mat-ripple mat-mdc-option-ripple mat-focus-indicator');
      assert.ok(['true', 'false'].includes(option.attributes['aria-selected']));
      const keys = [option.key, ...children.map(n => n.key)]; keys.forEach(k => owned.add(k));
      groups.push({ owner: 'native-half-hour-option-label-and-ripple', reference: keys, candidate: [], label: label(i) });
      optionInputs.push({ label: label(i), nativeAttributes: option.attributes });
    });
    const wrappers = portal.filter(n => !owned.has(n.key)); assert.equal(wrappers.length, 4);
    assert.deepEqual(wrappers.map(n => n.attributes.class), ['cdk-overlay-container', 'cdk-overlay-connected-position-bounding-box', 'cdk-overlay-pane', 'mat-timepicker-panel']);
    groups.push({ owner: 'native-connected-scroll-panel-owners-not-scrollbar-chrome-elements', reference: wrappers.map(n => n.key), candidate: [], panelStyle: panel.style });
  } else if (portal.length) { assert.equal(portal[0].attributes.class, 'cdk-overlay-container'); groups.push({ owner: 'empty-native-portal-not-visible-options', reference: [portal[0].key], candidate: [] }); }
  if (popup.length) {
    assert.equal(popup[0].authored.role, 'listbox'); const children = candidate.nodes.filter(n => n.parent === popup[0].key); assert.equal(children.length, 48);
    children.forEach((n, i) => {
      assert.equal(n.authored.id, `timepicker-option-${i}`); assert.equal(n.authored.role, 'option'); assert.equal(n.authored.textContent, label(i));
      assert.equal(typeof n.authored.ariaSelected, 'boolean'); assert.equal(candidate.nodes.filter(c => c.parent === n.key).length, 0);
      const existing = optionInputs.find(o => o.label === label(i)); if (existing) existing.candidate = n.authored;
    });
    groups.push({ owner: 'candidate-local-scroll-panel-and-flattened-value-options', reference: [], candidate: [popup[0].key, ...children.map(n => n.key)] });
  }
  assert.deepEqual(groups.flatMap(g => g.reference).sort(), native.nodes.map(n => n.key).sort());
  assert.deepEqual(groups.flatMap(g => g.candidate).sort(), candidate.nodes.slice(1).map(n => n.key).sort());
  return { groups, optionInputs, caption: caption.key, shape: `${native.nodes.length}/${candidate.nodes.length}`, nativeOpen: !!options.length, candidateOpen: !!popup.length };
}
let controls = 0, referenceNodes = 0, candidateNodes = 0, openPairs = 0; const shapes = {};
const observations = rows.map(row => {
  const p = {}; for (const side of ['reference', 'astylar']) { const r = row.evidence.pairedTrees[side], b = fs.readFileSync(r.file); assert.equal(hash(b), r.sha256); p[side] = JSON.parse(b); }
  const result = inspect(row, p.reference, p.astylar); shapes[result.shape] = (shapes[result.shape] ?? 0) + 1;
  assert.equal(result.nativeOpen, result.candidateOpen); openPairs += Number(result.nativeOpen);
  for (const mutate of [v => v.reference.nodes.pop(), v => v.astylar.nodes.pop(), v => { v.reference.nodes.find(n => n.key === result.caption).attributes.class = 'forged'; }, v => { v.astylar.nodes[5].parent = 'root'; }]) {
    const forged = structuredClone(p); mutate(forged); assert.throws(() => { const altered = inspect(row, forged.reference, forged.astylar); assert.equal(altered.shape, result.shape); }); controls++;
  }
  referenceNodes += p.reference.nodes.length; candidateNodes += p.astylar.nodes.length;
  return { case: row.case, evidence: row.evidence.pairedTrees, groups: result.groups, optionInputs: result.optionInputs };
});
assert.equal(controls, 440); assert.equal(openPairs, 48);
assert.deepEqual(shapes, { '25/15': 12, '173/66': 8, '26/15': 16, '174/65': 40, '27/15': 18, '24/15': 8, '25/16': 8 });
console.log(JSON.stringify({ producer: { file: 'scripts/check-timepicker-recorded-nodes.mjs', sha256: hash(fs.readFileSync('scripts/check-timepicker-recorded-nodes.mjs')) },
  review: { file: reviewFile, reviewSha256: reviewId }, reusedStructureProof: { file: logFile, sha256: hash(bytes) }, cases: 110, shapes, openPairs,
  referenceNodes, candidateNodes, negativeControlsRejected: controls, existingFindings: findings, observations,
  boundary: 'All110 retained timepicker element records account by reusing prior wrapper/focus-line mappings and inspecting caption/template/icon/SVG/button/option/ripple/portal/local-panel owners. All48 open pairs retain48 half-hour labels each;active/selected input differences remain explicit under existing findings. Browser scrollbar chrome is not a missing DOM element;no scrollbar behavior or visibility claim follows. Full styles,anonymous/pseudo,actual AX,editing/caret,scroll/paint/events/resources/currentness and whole-case closure remain open. No frozen source changed.',
  canonicalPublication: false, inspectionComplete: false, renderingAccepted: false }));
