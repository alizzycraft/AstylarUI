import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { applySliderPositionReviews, proveSliderPositionRequests } from './slider-position-request-review.mjs';

test('slider positions separate authored edges from computed auto offsets across all 78 states', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const c = JSON.parse(bytes), cases = [...c.results.map(e => ({ ...e, kind: 'static' })),
    ...c.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => e.family === 'slider');
  assert.equal(cases.length, 78);
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []);
  const rows = queryFindings('artifacts/material-parity/working-audit', 'slider', {
    generation: '7ffd3a4832d90e185be9d234b3d022f276db113767a6fcb0c3c965c51c14d592',
    indexSha256: 'b37363024107a9aeca949a701837764fdfe96e17b0aedca1549e187573dc8df4',
  }).filter(r => r.evidence.section === 'discrepancies');
  const reviewed = applySliderPositionReviews(rows, cases, inventory, normalize), changed = reviewed.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 16); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 780);
  assert.equal(changed.filter(r => r.classification === 'application-plugin-authoring-defect').length, 3);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  reviewed.forEach((r, i) => { assert.deepEqual(raw(r), raw(rows[i])); if (!changed.includes(r)) assert.deepEqual(r, rows[i]); });
  for (const element of ['slider-start', 'slider-primary', 'slider-visual']) {
    const row = changed.find(r => r.element === element), key = row.reviewedCases[0];
    const entry = cases.find(c => `${c.kind}:${c.family}@${c.profile}/${c.viewport.id}${c.state ? '/' + c.state : ''}` === key);
    const [reference, candidate] = modalInventoryTrees(inventory, key), proof = proveSliderPositionRequests(entry, reference, candidate, element);
    assert.equal(proof.dragCauseProven, false); assert.equal(proof.candidateUsedOffsetsVerified, false);
    const altered = structuredClone(candidate); altered.rules.push({ selector: '#' + element, bottom: '2px' });
    assert.throws(() => proveSliderPositionRequests(entry, reference, altered, element));
    const native = structuredClone(reference); native.nodes.find(n => n.key === proof.referenceNode).inline.bottom = { value: '2px', important: false };
    assert.throws(() => proveSliderPositionRequests(entry, native, candidate, element));
  }
});
