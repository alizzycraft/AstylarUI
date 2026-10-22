import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { sourceAuditDefinitions } from '../tests/material-parity/input-equivalence-policy.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reviewId = 'ff305b14217b7123b98a2e00f3ecb9ad443cd89606eaf688ea11f6118b7fb069';
const reviewFile = `artifacts/material-parity/working-audit/proposals/${reviewId}.json`;
const review = JSON.parse(fs.readFileSync(reviewFile)).review;
assert.equal(hash(JSON.stringify(review)), reviewId);
const rows = review.groups.filter(r => r.family === 'datepicker'); assert.equal(rows.length, 111);
const one = values => { assert.equal(values.length, 1); return values[0]; };
const findings = ['fixture-calendar-month-marker-table-grid-substitution', 'fixture-calendar-accessibility-labels-omitted',
  'fixture-calendar-selection-ring-coordinates', 'fixture-calendar-day-typography-substitution', 'fixture-calendar-year-typography-substitution'];
for (const id of findings) assert.ok(sourceAuditDefinitions.some(f => f.id === id));
function inspect(native, candidate) {
  const cells = native.nodes.filter(n => n.attributes.class === 'mat-calendar-body-cell-container');
  const values = candidate.nodes.filter(n => /^datepicker-(day|year)-\d+$/.test(n.authored.id ?? ''));
  if (!cells.length) { assert.equal(values.length, 0); return { kind: 'closed', cells: [] }; }
  const year = native.nodes.some(n => n.type === 'mat-multi-year-view');
  assert.equal(native.nodes.filter(n => n.type === (year ? 'mat-multi-year-view' : 'mat-month-view')).length, 1);
  assert.equal(cells.length, year ? 24 : 31); assert.equal(values.length, cells.length);
  const grid = one(candidate.nodes.filter(n => n.authored.id === (year ? 'datepicker-year-grid' : 'datepicker-grid')));
  const popup = one(candidate.nodes.filter(n => n.authored.id === 'datepicker-popup'));
  assert.equal(grid.parent, popup.key);
  const mapped = cells.map((cell, i) => {
    assert.equal(cell.type, 'td'); assert.equal(cell.attributes.role, 'gridcell');
    const button = one(native.nodes.filter(n => n.parent === cell.key)); assert.equal(button.type, 'button');
    const descendants = native.nodes.filter(n => n.parent === button.key); assert.equal(descendants.length, 2);
    const ink = descendants[0], preview = descendants[1];
    assert.ok(ink.attributes.class.startsWith('mat-calendar-body-cell-content mat-focus-indicator'));
    assert.equal(preview.attributes.class, 'mat-calendar-body-cell-preview'); assert.equal(preview.attributes['aria-hidden'], 'true');
    assert.equal(native.nodes.filter(n => n.parent === ink.key || n.parent === preview.key).length, 0);
    const value = String(year ? 2016 + i : 1 + i), target = values[i];
    assert.equal(ink.ownText.trim(), value); assert.equal(target.authored.value, value);
    assert.equal(target.authored.id, `datepicker-${year ? 'year' : 'day'}-${value}`);
    assert.equal(target.authored.type, 'button'); assert.equal(target.parent, grid.key);
    assert.equal(candidate.nodes.filter(n => n.parent === target.key).length, 0);
    assert.equal(button.attributes['aria-label'], year ? value : `October ${value}, 2026`);
    assert.equal(cell.attributes['data-mat-row'], String(year ? Math.floor(i / 4) : Math.floor((i + 4) / 7)));
    assert.equal(cell.attributes['data-mat-col'], String(year ? i % 4 : i < 3 ? i : (i + 4) % 7));
    return { value, reference: { cell: cell.key, button: button.key, ink: ink.key, preview: preview.key,
      rawText: ink.ownText, attributes: button.attributes, cellAttributes: cell.attributes, inkClass: ink.attributes.class },
      candidate: { key: target.key, authored: target.authored } };
  });
  const ring = candidate.nodes.filter(n => n.authored.id === 'datepicker-selected');
  if (year) assert.equal(ring.length, 0);
  else {
    assert.equal(ring.length, 1); assert.equal(ring[0].parent, popup.key);
    assert.equal(ring[0].authored.type, 'span'); assert.equal(candidate.nodes.filter(n => n.parent === ring[0].key).length, 0);
  }
  const marker = native.nodes.filter(n => n.attributes.class === 'mat-calendar-body-label');
  if (year) assert.equal(marker.length, 0);
  else {
    assert.equal(marker.length, 1); assert.equal(marker[0].attributes.colspan, '4'); assert.equal(marker[0].ownText.trim(), 'OCT');
    const candidateMarker = one(candidate.nodes.filter(n => n.authored.id === 'datepicker-month-marker'));
    assert.equal(candidateMarker.authored.textContent, 'OCT'); assert.equal(candidateMarker.parent, grid.key);
    const leading = candidate.nodes.filter(n => /^datepicker-leading-\d+$/.test(n.authored.id ?? ''));
    assert.equal(leading.length, 4); leading.forEach(n => { assert.equal(n.parent, grid.key); assert.equal(n.authored.textContent, ''); });
  }
  return { kind: year ? 'year' : 'month', cells: mapped, ring: ring.map(n => ({ key: n.key, authored: n.authored, resolvedStyle: n.resolvedStyle })),
    marker: marker.map(n => ({ key: n.key, attributes: n.attributes, rawText: n.ownText })) };
}
let negativeControlsRejected = 0; const counts = { closed: 0, month: 0, year: 0 };
const observations = rows.map(row => {
  const pair = {}; for (const side of ['reference', 'astylar']) {
    const receipt = row.evidence.pairedTrees[side], bytes = fs.readFileSync(receipt.file);
    assert.equal(hash(bytes), receipt.sha256); pair[side] = JSON.parse(bytes);
  }
  const result = inspect(pair.reference, pair.astylar); counts[result.kind]++;
  if (result.kind !== 'closed') {
    for (const mutate of [p => { p.astylar.nodes.find(n => /^datepicker-(day|year)-\d+$/.test(n.authored.id ?? '')).authored.value = 'forged'; },
      p => { p.reference.nodes.find(n => n.attributes.class?.startsWith('mat-calendar-body-cell-content')).ownText = 'wrong'; },
      p => { p.astylar.nodes.find(n => /^datepicker-(day|year)-\d+$/.test(n.authored.id ?? '')).parent = 'root'; },
      p => { p.reference.nodes.find(n => n.attributes.class === 'mat-calendar-body-cell-preview').attributes['aria-hidden'] = 'false'; }]) {
      const forged = structuredClone(pair); mutate(forged); assert.throws(() => inspect(forged.reference, forged.astylar)); negativeControlsRejected++;
    }
  }
  return { case: row.case, evidence: row.evidence.pairedTrees, ...result };
});
assert.deepEqual(counts, { closed: 70, month: 33, year: 8 }); assert.equal(negativeControlsRejected, 164);
console.log(JSON.stringify({ producer: { file: 'scripts/check-datepicker-cell-inputs.mjs', sha256: hash(fs.readFileSync('scripts/check-datepicker-cell-inputs.mjs')) },
  review: { file: reviewFile, reviewSha256: reviewId }, counts, negativeControlsRejected, existingFindings: findings, observations,
  boundary: 'Retained cell value/order and native ink/preview versus direct candidate value-button owners checked. Native row/column are row-local indices,not equal CSS grid placement. Raw text,labels,marker colspan and independent candidate ring preserved. Not complete datepicker node accounting,style equivalence,first divergent runtime stage,paint,AX,current applicability or whole-case acceptance.',
  canonicalPublication: false, inspectionComplete: false, renderingAccepted: false }));
