import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const hash = b => createHash('sha256').update(b).digest('hex');
const reviewId = 'ff305b14217b7123b98a2e00f3ecb9ad443cd89606eaf688ea11f6118b7fb069';
const reviewFile = `artifacts/material-parity/working-audit/proposals/${reviewId}.json`;
const review = JSON.parse(fs.readFileSync(reviewFile)).review; assert.equal(hash(JSON.stringify(review)), reviewId);
const rows = review.groups.filter(r => ['autocomplete', 'select'].includes(r.family)); assert.equal(rows.length, 204);
const logFile = 'artifacts/material-parity/filled-field-structure-ledger-review-20261020.log', bytes = fs.readFileSync(logFile);
assert.equal(hash(bytes), '5fadba044b06bd7dd601687ab0f30ecde740413623feaf55d6bd2d0a2e5b6a09');
const lines = bytes.toString().split(/\r?\n/), start = lines.findIndex(l => l.startsWith('# FIELD_STRUCTURE_REVIEW ')); assert.ok(start >= 0);
const end = lines.findIndex((l, i) => i > start && l.startsWith('# Subtest:')); assert.ok(end > start);
const serialized = lines.slice(start, end).map(l => { assert.ok(l.startsWith('# ')); return l.slice(2); }).join('').slice('FIELD_STRUCTURE_REVIEW '.length);
const proof = JSON.parse(serialized.replace(/\\([\\#])/g, '$1')); assert.equal(proof.rows.length, 577);
assert.ok(lines.includes('# pass 1') && lines.includes('# fail 0'));
for (const r of [proof.report, proof.source, proof.proof]) assert.equal(hash(fs.readFileSync(r.file)), r.sha256);
const prior = new Map(proof.rows.map(r => [r.case, r])), one = a => { assert.equal(a.length, 1); return a[0]; };
function inspect(row, native, candidate) {
  const m = prior.get(row.case); assert.deepEqual(row.obligations.inputStyleStructure.retainedFilledFieldStructure.observation, m);
  assert.deepEqual(m.inputTrees, row.evidence.pairedTrees);
  const rn = key => one(native.nodes.filter(n => n.key === key));
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
  const groups = [{ owner: 'reused-authenticated-filled-field-and-page-owners', reference: nk, candidate: ak }];
  const caption = one(native.nodes.filter(n => n.parent === m.reference.host && n.attributes.class?.startsWith('mat-mdc-form-field-subscript-wrapper')));
  const hint = one(native.nodes.filter(n => n.parent === caption.key)), spacer = one(native.nodes.filter(n => n.parent === hint.key));
  assert.equal(hint.attributes.class, 'mat-mdc-form-field-hint-wrapper'); assert.equal(spacer.attributes.class, 'mat-mdc-form-field-hint-spacer');
  for (const n of [caption, hint, spacer]) { assert.equal(n.type, 'div'); assert.equal(n.ownText, ''); }
  groups.push({ owner: 'native-empty-subscript-branch', reference: [caption.key, hint.key, spacer.key], candidate: [] });
  if (row.family === 'autocomplete') {
    const template = one(native.nodes.filter(n => n.type === 'mat-autocomplete'));
    assert.equal(template.parent, m.reference.infix); assert.equal(native.nodes.filter(n => n.parent === template.key).length, 0);
    groups.push({ owner: 'dormant-native-autocomplete-template-not-visible-panel', reference: [template.key], candidate: [] });
  } else {
    const internal = native.nodes.filter(n => n.key.startsWith(m.reference.control + '/')); assert.equal(internal.length, 8);
    assert.deepEqual(internal.map(n => n.type), ['div', 'div', 'span', 'span', 'div', 'div', 'svg', 'path']);
    assert.deepEqual(internal.slice(0, 6).map(n => n.attributes.class), ['mat-mdc-select-trigger', 'mat-mdc-select-value', 'mat-mdc-select-value-text', 'mat-mdc-select-min-line', 'mat-mdc-select-arrow-wrapper', 'mat-mdc-select-arrow']);
    assert.ok(['Solo', 'Team'].includes(internal[3].ownText)); assert.ok(['Solo', 'Team'].includes(an('select-value').authored.textContent));
    assert.equal(an('select-caret').authored.textContent, '▼');
    groups.push({ owner: 'native-trigger-value-and-svg-arrow-versus-value-span-and-text-caret', reference: internal.map(n => n.key), candidate: [an('select-value').key, an('select-caret').key],
      referenceValue: internal[3].ownText, candidateValue: an('select-value').authored.textContent });
  }
  const portal = native.nodes.filter(n => n.key.startsWith('overlay:'));
  const nativeOptions = portal.filter(n => n.type === 'mat-option');
  if (portal.length > 1) {
    assert.equal(nativeOptions.length, 2);
    const panel = one(portal.filter(n => n.attributes.role === 'listbox'));
    assert.ok(nativeOptions.every(n => n.parent === panel.key));
    for (const option of nativeOptions) {
      const children = native.nodes.filter(n => n.parent === option.key); assert.ok([2, 3].includes(children.length));
      const label = one(children.filter(n => n.type === 'span')), ripple = one(children.filter(n => n.type === 'div'));
      assert.equal(label.attributes.class, 'mdc-list-item__primary-text'); assert.equal(ripple.attributes.class, 'mat-ripple mat-mdc-option-ripple mat-focus-indicator');
      assert.ok((row.family === 'select' ? ['Solo', 'Team'] : ['Cape Town', 'Johannesburg']).includes(label.ownText));
      const check = children.filter(n => n.type === 'mat-pseudo-checkbox'); assert.equal(check.length, children.length - 2);
      groups.push({ owner: 'native-option-label-selection-marker-and-ripple', reference: [option.key, ...children.map(n => n.key)], candidate: [], label: label.ownText });
    }
    const optionKeys = new Set(groups.filter(g => g.owner === 'native-option-label-selection-marker-and-ripple').flatMap(g => g.reference));
    const wrappers = portal.filter(n => !optionKeys.has(n.key)); assert.equal(wrappers.length, row.family === 'select' ? 5 : 4);
    for (const n of wrappers) assert.ok(/^(cdk-overlay-container|cdk-overlay-backdrop .+|cdk-overlay-connected-position-bounding-box|cdk-overlay-pane|mat-mdc-autocomplete-panel .+|mat-mdc-select-panel .+)$/.test(n.attributes.class));
    groups.push({ owner: 'native-connected-panel-and-portal-owners', reference: wrappers.map(n => n.key), candidate: [] });
  } else if (portal.length) { assert.equal(portal[0].attributes.class, 'cdk-overlay-container'); groups.push({ owner: 'empty-native-portal-not-visible-options', reference: [portal[0].key], candidate: [] }); }
  const popupId = row.family === 'select' ? 'select-options' : 'field-options', popup = candidate.nodes.filter(n => n.authored.id === popupId);
  assert.ok(popup.length <= 1);
  if (popup.length) {
    assert.equal(popup[0].authored.role, 'listbox');
    const options = candidate.nodes.filter(n => n.parent === popup[0].key); assert.equal(options.length, 2);
    for (const option of options) {
      assert.equal(option.authored.role, 'option'); assert.equal(typeof option.authored.ariaSelected, 'boolean');
      const children = candidate.nodes.filter(n => n.parent === option.key), label = one(children.filter(n => n.authored.type === 'span'));
      const checks = children.filter(n => n.authored.type === 'showcase.material:check-mark'); assert.equal(checks.length, Number(option.authored.ariaSelected));
      assert.equal(children.length, checks.length + 1);
      assert.ok((row.family === 'select' ? ['Solo', 'Team'] : ['Cape Town', 'Johannesburg']).includes(label.authored.textContent));
      groups.push({ owner: 'candidate-option-label-and-vector-selection-mark', reference: [], candidate: [option.key, ...children.map(n => n.key)], label: label.authored.textContent });
    }
    groups.push({ owner: 'candidate-local-listbox-with-unequal-connected-overlay-inputs', reference: [], candidate: [popup[0].key] });
  }
  assert.deepEqual(groups.flatMap(g => g.reference).sort(), native.nodes.map(n => n.key).sort());
  assert.deepEqual(groups.flatMap(g => g.candidate).sort(), candidate.nodes.slice(1).map(n => n.key).sort());
  return { groups, caption: caption.key, shape: `${native.nodes.length}/${candidate.nodes.length}` };
}
let controls = 0, referenceNodes = 0, candidateNodes = 0; const counts = {}, shapes = {};
const observations = rows.map(row => {
  const p = {}; for (const side of ['reference', 'astylar']) { const r = row.evidence.pairedTrees[side], b = fs.readFileSync(r.file); assert.equal(hash(b), r.sha256); p[side] = JSON.parse(b); }
  const result = inspect(row, p.reference, p.astylar); counts[row.family] = (counts[row.family] ?? 0) + 1;
  const key = `${row.family}:${result.shape}`; shapes[key] = (shapes[key] ?? 0) + 1;
  for (const mutate of [v => v.reference.nodes.pop(), v => v.astylar.nodes.pop(), v => { v.reference.nodes.find(n => n.key === result.caption).attributes.class = 'forged'; }, v => { v.astylar.nodes[5].parent = 'root'; }]) {
    const forged = structuredClone(p); mutate(forged); assert.throws(() => {
      const altered = inspect(row, forged.reference, forged.astylar); assert.equal(altered.shape, result.shape);
    }); controls++;
  }
  referenceNodes += p.reference.nodes.length; candidateNodes += p.astylar.nodes.length;
  return { case: row.case, evidence: row.evidence.pairedTrees, groups: result.groups };
});
assert.deepEqual(counts, { autocomplete: 110, select: 94 }); assert.equal(controls, 816);
assert.deepEqual(shapes, { 'autocomplete:17/10': 20, 'autocomplete:27/16': 48, 'autocomplete:28/17': 8, 'autocomplete:18/10': 16,
  'autocomplete:16/10': 8, 'autocomplete:17/11': 8, 'autocomplete:18/11': 2, 'select:24/12': 28, 'select:24/13': 16,
  'select:36/19': 40, 'select:23/12': 8, 'select:25/13': 2 });
console.log(JSON.stringify({ producer: { file: 'scripts/check-choice-field-recorded-nodes.mjs', sha256: hash(fs.readFileSync('scripts/check-choice-field-recorded-nodes.mjs')) },
  review: { file: reviewFile, reviewSha256: reviewId }, reusedStructureProof: { file: logFile, sha256: hash(bytes) }, counts, shapes,
  referenceNodes, candidateNodes, negativeControlsRejected: controls, observations,
  boundary: 'All204 retained autocomplete/select element trees account by reusing prior wrapper mappings and inspecting caption/template/trigger/SVG/options/portal/local-popup owners. Empty portals/templates are not painted options. Unequal structures and selection-marker ownership remain explicit,not equal layout/semantics or a new core diagnosis. Full styles,anonymous/pseudo,actual AX,editing/caret,scroll/paint/event/resource/currentness and whole-case closure remain open. No frozen source changed.',
  canonicalPublication: false, inspectionComplete: false, renderingAccepted: false }));
