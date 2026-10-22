import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { sourceAuditDefinitions } from '../tests/material-parity/input-equivalence-policy.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const reviewId = 'ff305b14217b7123b98a2e00f3ecb9ad443cd89606eaf688ea11f6118b7fb069';
const reviewFile = `artifacts/material-parity/working-audit/proposals/${reviewId}.json`;
const review = JSON.parse(fs.readFileSync(reviewFile)).review; assert.equal(hash(JSON.stringify(review)), reviewId);
const rows = review.groups.filter(r => r.family === 'datepicker'); assert.equal(rows.length, 111);
const wrapperFile = 'artifacts/material-parity/filled-field-structure-ledger-review-20261020.log';
const bytes = fs.readFileSync(wrapperFile); assert.equal(hash(bytes), '5fadba044b06bd7dd601687ab0f30ecde740413623feaf55d6bd2d0a2e5b6a09');
const lines = bytes.toString().split(/\r?\n/), start = lines.findIndex(l => l.startsWith('# FIELD_STRUCTURE_REVIEW '));
const end = lines.findIndex((l, i) => i > start && l.startsWith('# Subtest:')); assert.ok(start >= 0 && end > start);
const serialized = lines.slice(start, end).map(l => { assert.ok(l.startsWith('# ')); return l.slice(2); }).join('').slice('FIELD_STRUCTURE_REVIEW '.length);
const proof = JSON.parse(serialized.replace(/\\([\\#])/g, '$1')); assert.equal(proof.rows.length, 577);
assert.ok(lines.includes('# pass 1') && lines.includes('# fail 0'));
for (const r of [proof.report, proof.source, proof.proof]) assert.equal(hash(fs.readFileSync(r.file)), r.sha256);
const cellFile = 'artifacts/material-parity/datepicker-cell-input-review-final-20261022.log';
const cellBytes = fs.readFileSync(cellFile), cells = JSON.parse(cellBytes);
assert.equal(hash(cellBytes), 'b20a22fcd4f27dc5f967d307192fcf4ce1817f674ab224d4a196f9d7a3004bc9');
assert.equal(hash(fs.readFileSync(cells.producer.file)), cells.producer.sha256);
assert.equal(cells.review.reviewSha256, reviewId); assert.equal(cells.negativeControlsRejected, 164);
const prior = new Map(proof.rows.map(r => [r.case, r])), cellRows = new Map(cells.observations.map(r => [r.case, r]));
const one = values => { assert.equal(values.length, 1); return values[0]; };
const findings = ['fixture-calendar-close-control-omitted', 'fixture-calendar-accessibility-labels-omitted',
  'fixture-calendar-navigation-svg-icons-replaced-by-text-glyphs', 'fixture-calendar-period-vector-flattened-into-text',
  'fixture-calendar-weekday-structure-and-token-substitution', ...cells.existingFindings];
for (const id of findings) assert.ok(sourceAuditDefinitions.some(f => f.id === id));
function inspect(row, native, candidate) {
  const m = prior.get(row.case), c = cellRows.get(row.case); assert.ok(m && c);
  assert.deepEqual(row.obligations.inputStyleStructure.retainedFilledFieldStructure.observation, m);
  assert.deepEqual(m.inputTrees, row.evidence.pairedTrees); assert.deepEqual(c.evidence, row.evidence.pairedTrees);
  const nk = ['frame', 'frame/0', 'frame/1', 'frame/2', ...['host', 'wrapper', 'flex', 'infix', 'control', 'floatingLabel', 'label'].map(k => m.reference[k]),
    ...(m.reference.focusLayer ? [m.reference.focusLayer.key] : []), m.reference.underline.key];
  const ak = ['root/0', 'root/0/0', 'root/0/1', 'root/0/2', ...['shell', 'surface', 'region', 'label', 'control', 'genericLine', 'alternateLine'].map(k => m.astylar[k]).filter(Boolean)];
  for (const [side, tree] of [['reference', native], ['candidate', candidate]]) {
    assert.deepEqual(tree.errors, []); assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
    for (const n of tree.nodes) {
      const root = side === 'reference' ? ['frame', 'overlay:0'].includes(n.key) : n.key === 'root';
      assert.equal(n.parent, root ? null : n.key.slice(0, n.key.lastIndexOf('/')));
      if (side === 'reference') assert.ok(tree.styles[n.style]);
      else if (!root) for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']) assert.ok(n[stage]);
    }
  }
  assert.equal(candidate.nodes[0].key, 'root'); assert.deepEqual(candidate.nodes[0].authored, {});
  const nn = key => one(native.nodes.filter(n => n.key === key)), an = id => one(candidate.nodes.filter(n => n.authored.id === id));
  const groups = [{ owner: 'authenticated-page-filled-field-and-focus-line-proof', reference: nk, candidate: ak }];
  const caption = one(native.nodes.filter(n => n.parent === m.reference.host && n.attributes.class?.startsWith('mat-mdc-form-field-subscript-wrapper')));
  const hint = one(native.nodes.filter(n => n.parent === caption.key)), spacer = one(native.nodes.filter(n => n.parent === hint.key));
  assert.equal(hint.attributes.class, 'mat-mdc-form-field-hint-wrapper'); assert.equal(spacer.attributes.class, 'mat-mdc-form-field-hint-spacer');
  const template = one(native.nodes.filter(n => n.type === 'mat-datepicker')); assert.equal(template.parent, m.reference.infix);
  assert.equal(native.nodes.filter(n => n.parent === template.key).length, 0);
  groups.push({ owner: 'empty-native-caption-and-dormant-datepicker-template', reference: [caption.key, hint.key, spacer.key, template.key], candidate: [] });
  const suffix = one(native.nodes.filter(n => n.attributes.class === 'mat-mdc-form-field-icon-suffix')); assert.equal(suffix.parent, m.reference.flex);
  const toggle = one(native.nodes.filter(n => n.type === 'mat-datepicker-toggle')); assert.equal(toggle.parent, suffix.key);
  const button = one(native.nodes.filter(n => n.parent === toggle.key)); assert.equal(button.type, 'button');
  const parts = native.nodes.filter(n => n.parent === button.key); assert.ok([4, 5].includes(parts.length));
  assert.deepEqual(parts.slice(0, 4).map(n => n.type), ['span', 'svg', 'span', 'span']);
  assert.equal(parts[1].attributes.class, 'mat-datepicker-toggle-default-icon');
  if (parts.length === 5) assert.equal(parts[4].attributes.class, 'mat-ripple mat-mdc-button-ripple');
  const path = one(native.nodes.filter(n => n.parent === parts[1].key)); assert.equal(path.type, 'path');
  const iconIds = ['datepicker-icon', 'datepicker-icon-visual', 'datepicker-calendar-icon', 'datepicker-calendar-line', 'datepicker-calendar-day', 'datepicker-calendar-binding-first', 'datepicker-calendar-binding-last'];
  assert.deepEqual(iconIds.map(id => an(id).authored.type), ['button', 'span', 'span', 'span', 'span', 'span', 'span']);
  groups.push({ owner: 'native-toggle-svg-interaction-owners-versus-css-calendar-icon', reference: [suffix.key, toggle.key, button.key, ...parts.map(n => n.key), path.key], candidate: iconIds.map(id => an(id).key) });
  const portal = native.nodes.filter(n => n.key.startsWith('overlay:'));
  if (c.kind === 'closed') {
    assert.ok(portal.length <= 1); if (portal.length) assert.equal(portal[0].attributes.class, 'cdk-overlay-container');
    groups.push({ owner: 'closed-empty-native-portal-not-visible-calendar', reference: portal.map(n => n.key), candidate: [] });
  } else {
    const popup = an('datepicker-popup'), header = an('datepicker-header'); assert.equal(header.parent, popup.key);
    const headerNodes = candidate.nodes.filter(n => n.parent === header.key);
    assert.deepEqual(headerNodes.map(n => n.authored.id), ['datepicker-month', 'datepicker-previous', 'datepicker-next']);
    headerNodes.forEach(n => assert.equal(n.authored.type, 'button'));
    const nativeHeader = one(portal.filter(n => n.type === 'mat-calendar-header'));
    const nativeHeaderNodes = portal.filter(n => n.key === nativeHeader.key || n.key.startsWith(`${nativeHeader.key}/`));
    const nav = nativeHeaderNodes.filter(n => n.type === 'button'); assert.equal(nav.length, 3);
    for (const name of ['period', 'previous', 'next']) assert.equal(nav.filter(n => n.attributes.class.includes(`mat-calendar-${name}-button`)).length, 1);
    assert.equal(nativeHeaderNodes.filter(n => n.type === 'path').length, 2); assert.equal(nativeHeaderNodes.filter(n => n.type === 'polygon').length, 1);
    groups.push({ owner: 'native-calendar-navigation-svg-state-touch-and-label-descendants-versus-text-buttons', reference: nativeHeaderNodes.map(n => n.key), candidate: [header.key, ...headerNodes.map(n => n.key)] });
    const nativeCellKeys = c.cells.flatMap(x => [x.reference.cell, x.reference.button, x.reference.ink, x.reference.preview]);
    for (const x of c.cells) {
      const ink = nn(x.reference.ink), target = one(candidate.nodes.filter(n => n.key === x.candidate.key));
      assert.equal(ink.ownText, x.reference.rawText); assert.deepEqual(nn(x.reference.button).attributes, x.reference.attributes); assert.deepEqual(target.authored, x.candidate.authored);
    }
    groups.push({ owner: 'authenticated-day-or-year-cell-ink-preview-versus-direct-value-buttons', reference: nativeCellKeys, candidate: c.cells.map(x => x.candidate.key) });
    const grid = an(c.kind === 'year' ? 'datepicker-year-grid' : 'datepicker-grid'); assert.equal(grid.parent, popup.key);
    const weekday = candidate.nodes.filter(n => /^datepicker-weekday-\d+$/.test(n.authored.id ?? ''));
    assert.equal(weekday.length, c.kind === 'year' ? 0 : 7);
    weekday.forEach((n, i) => { assert.equal(n.parent, grid.key); assert.equal(n.authored.textContent, ['S', 'M', 'T', 'W', 'T', 'F', 'S'][i]); });
    const marker = candidate.nodes.filter(n => n.authored.id === 'datepicker-month-marker' || /^datepicker-leading-\d+$/.test(n.authored.id ?? ''));
    assert.equal(marker.length, c.kind === 'year' ? 0 : 5);
    const rings = candidate.nodes.filter(n => n.authored.id === 'datepicker-selected'); assert.deepEqual(rings.map(n => ({ key: n.key, authored: n.authored, resolvedStyle: n.resolvedStyle })), c.ring);
    groups.push({ owner: 'candidate-popup-grid-weekday-marker-leading-cells-and-independent-ring', reference: [], candidate: [popup.key, grid.key, ...weekday.map(n => n.key), ...marker.map(n => n.key), ...rings.map(n => n.key)] });
    const used = new Set(groups.flatMap(g => g.reference));
    const remaining = portal.filter(n => !used.has(n.key));
    const expected = {
      'div|cdk-overlay-container': 1,
      'div|cdk-overlay-backdrop cdk-overlay-backdrop-noop-animation mat-overlay-transparent-backdrop mat-datepicker-0-backdrop cdk-overlay-backdrop-showing': 1,
      'div|cdk-overlay-connected-position-bounding-box': 1, 'div|cdk-overlay-pane mat-datepicker-popup': 1,
      'mat-datepicker-content|mat-datepicker-content mat-primary': 1, 'div|cdk-visually-hidden cdk-focus-trap-anchor': 2,
      'div|mat-datepicker-content-container': 1, 'mat-calendar|mat-calendar': 1,
      [`${c.kind === 'year' ? 'mat-multi-year-view' : 'mat-month-view'}|`]: 1,
      'table|mat-calendar-table': 1, 'thead|mat-calendar-table-header': 1, 'tr|': 7,
      'th|mat-calendar-table-header-divider': 1, 'tbody|mat-calendar-body': 1, 'span|mat-calendar-body-hidden-label': 4,
      'button|mdc-button mat-mdc-button-base mat-datepicker-close-button mdc-button--raised mat-mdc-raised-button cdk-visually-hidden mat-primary _mat-animation-noopable': 1,
      'span|mat-mdc-button-persistent-ripple mdc-button__ripple': 1, 'span|mdc-button__label': 1,
      'span|mat-focus-indicator': 1, 'span|mat-mdc-button-touch-target': 1
    };
    const content = one(remaining.filter(n => n.attributes.class?.startsWith('mat-calendar-content ')));
    assert.ok(['mat-calendar-content cdk-focused cdk-program-focused', 'mat-calendar-content cdk-focused cdk-mouse-focused'].includes(content.attributes.class));
    expected[`div|${content.attributes.class}`] = 1;
    if (c.kind === 'month') Object.assign(expected, { 'th|': 7, 'span|cdk-visually-hidden': 7, 'span|': 7, 'td|mat-calendar-body-label': 1 });
    const actual = {}; for (const n of remaining) { const key = `${n.type}|${n.attributes.class ?? ''}`; actual[key] = (actual[key] ?? 0) + 1; }
    assert.deepEqual(actual, expected);
    const close = one(remaining.filter(n => n.type === 'button')); assert.ok(close.attributes.class.includes('mat-datepicker-close-button'));
    const closeDesc = portal.filter(n => n.key.startsWith(`${close.key}/`));
    assert.equal(closeDesc.length, 4); assert.deepEqual(closeDesc.map(n => n.type), ['span', 'span', 'span', 'span']);
    assert.equal(remaining.filter(n => n.attributes.class === 'cdk-visually-hidden cdk-focus-trap-anchor').length, 2);
    assert.equal(remaining.filter(n => n.attributes.class === 'mat-calendar-body-hidden-label').length, 4);
    const weekdayHeads = remaining.filter(n => n.type === 'th' && n.attributes.scope === 'col'); assert.equal(weekdayHeads.length, c.kind === 'year' ? 0 : 7);
    const markerNative = remaining.filter(n => n.attributes.class === 'mat-calendar-body-label'); assert.equal(markerNative.length, c.kind === 'year' ? 0 : 1);
    groups.push({ owner: 'native-portal-backdrop-focus-trap-table-rows-weekday-hidden-labels-and-close-control', reference: remaining.map(n => n.key), candidate: [],
      unmatchedInputs: remaining.map(n => ({ key: n.key, type: n.type, attributes: n.attributes, ownText: n.ownText })) });
  }
  assert.deepEqual(groups.flatMap(g => g.reference).sort(), native.nodes.map(n => n.key).sort());
  assert.deepEqual(groups.flatMap(g => g.candidate).sort(), candidate.nodes.slice(1).map(n => n.key).sort());
  return { kind: c.kind, shape: `${native.nodes.length}/${candidate.nodes.length}`, caption: caption.key, groups };
}
let referenceNodes = 0, candidateNodes = 0, negativeControlsRejected = 0; const shapes = {};
const observations = rows.map(row => {
  const p = {}; for (const side of ['reference', 'astylar']) { const r = row.evidence.pairedTrees[side], b = fs.readFileSync(r.file); assert.equal(hash(b), r.sha256); p[side] = JSON.parse(b); }
  const result = inspect(row, p.reference, p.astylar); shapes[result.shape] = (shapes[result.shape] ?? 0) + 1;
  for (const mutate of [v => v.reference.nodes.pop(), v => v.astylar.nodes.pop(), v => { v.reference.nodes.find(n => n.key === result.caption).attributes.class = 'forged'; }, v => { v.astylar.nodes[5].parent = 'root'; }]) {
    const forged = structuredClone(p); mutate(forged); assert.throws(() => { const altered = inspect(row, forged.reference, forged.astylar); assert.equal(altered.shape, result.shape); }); negativeControlsRejected++;
  }
  referenceNodes += p.reference.nodes.length; candidateNodes += p.astylar.nodes.length;
  return { case: row.case, evidence: row.evidence.pairedTrees, ...result };
});
assert.equal(negativeControlsRejected, 444);
assert.deepEqual(shapes, { '25/17': 12, '25/18': 16, '26/17': 16, '228/67': 33, '179/47': 8, '27/17': 18, '24/17': 8 });
console.log(JSON.stringify({ producer: { file: 'scripts/check-datepicker-recorded-nodes.mjs', sha256: hash(fs.readFileSync('scripts/check-datepicker-recorded-nodes.mjs')) },
  review: { file: reviewFile, reviewSha256: reviewId }, reusedProofs: [{ file: wrapperFile, sha256: hash(bytes) }, { file: cellFile, sha256: hash(cellBytes) }],
  cases: 111, shapes, referenceNodes, candidateNodes, negativeControlsRejected, existingFindings: findings, observations,
  boundary: 'All retained datepicker element records assigned to explicit owner groups using authenticated wrapper and cell proofs. Group membership is not full-style equivalence,anonymous/pseudo coverage,AX or first-divergent runtime-stage proof. Existing composition/accessibility findings reused;no current rendering or whole-case closure. Frozen873 source batch unchanged.',
  canonicalPublication: false, inspectionComplete: false, renderingAccepted: false }));
