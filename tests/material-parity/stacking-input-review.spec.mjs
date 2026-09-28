import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { stackingOwners, proveStackingOwner, applyStackingOwnerReviews, applyStackingReviews } from './stacking-input-review.mjs';

test('nine stacking groups preserve added versus omitted owner requests across 590 observations', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes), families = [...new Set(stackingOwners.map(r => r[0])), 'tooltip'];
  const cases = [...report.results.map(e => ({ ...e, kind: 'static' })), ...report.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => families.includes(e.family));
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const snapshot = { generation: '6f0a4c1c3c214695abe87bb185f6c6c392acd5fa6452d2315891854f85cc9de9', indexSha256: 'a28657efd56dc23b707d09cd3148c55b4974c9385f8d47fd38cfc8cdb5754a96' };
  const rows = families.flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, snapshot)).filter(r => r.evidence.section === 'discrepancies');
  const before = structuredClone(rows), normalize = bindPreciseAuditNormalization();
  const reviewed = applyStackingOwnerReviews(rows, cases, inventory, normalize), changed = reviewed.filter((r, i) => r !== rows[i]);
  assert.deepEqual(rows, before); assert.equal(changed.length, 9);
  assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 590);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  reviewed.forEach((r, i) => assert.deepEqual(raw(r), raw(rows[i])));
  for (const [family, element, , , , count] of stackingOwners) {
    const row = changed.find(r => r.element === element); assert.equal(row.occurrences, count);
    assert.equal(row.reviewEvidence.observations.length, count); assert.equal(new Set(row.reviewedCases).size, count);
    const entry = cases.find(e => e.family === family && e.styleInputs.some(i => i.id === element));
    const key = `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    const pair = modalInventoryTrees(inventory, key);
    for (const mutate of [
      ([r]) => { r.ruleEvidenceComplete = false; },
      ([r]) => { r.nodes.find(n => n.attributes?.id === element).inline['z-index'] = { value: '4', important: false }; },
      ([, a]) => { a.nodes.find(n => n.authored?.id === element).normalResolvedStyle.zIndex = '999'; },
      ([, a]) => { a.rules.push({ selector: '*', zIndex: '999' }); },
    ]) { const copy = structuredClone(pair); mutate(copy); assert.throws(() => proveStackingOwner(entry, ...copy, element)); }
  }
  assert.throws(() => applyStackingOwnerReviews(rows, cases.slice(1), inventory, normalize));
  const combined = applyStackingReviews(rows, cases, inventory, normalize);
  const allChanged = combined.filter((r, i) => r !== rows[i]);
  assert.equal(allChanged.length, 10); assert.equal(allChanged.reduce((n, r) => n + r.occurrences, 0), 608);
  combined.forEach((r, i) => assert.deepEqual(raw(r), raw(rows[i])));
  assert.equal(allChanged.find(r => r.family === 'tooltip').reviewEvidence.observations.length, 18);
});
