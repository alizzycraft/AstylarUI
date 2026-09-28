import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory, collectRetainedTypographyEvidence } from './input-equivalence-audit.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { applyComponentColorRequests, proveComponentColorRequest } from './component-color-request-review.mjs';

test('component color requests bind all 77 measured owners without borrowing child ink', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const captured = JSON.parse(bytes), cases = [...captured.results.map(e => ({ ...e, kind: 'static' })),
    ...captured.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const retained = collectRetainedTypographyEvidence(cases.filter(e => ['sort', 'sidenav'].includes(e.family)), inventory);
  const snapshot = { generation: '04ec615b0e97cdc75f44b817efca421d24a79cb04d7bc1f2f22969b99a4c4240',
    indexSha256: '7698638b57da8d8c8f4bf50902886f11c3d3304e45078771917b804c6c30a075' };
  const rows = ['sort', 'sidenav'].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, snapshot))
    .filter(r => r.evidence.section === 'discrepancies');
  const result = applyComponentColorRequests(rows, cases, inventory, retained, normalize);
  const changed = result.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 2); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 77);
  const metadata = new Set(['classification', 'attribution', 'recommendedOwner', 'justification', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  result.forEach((r, i) => assert.deepEqual(raw(r), raw(rows[i])));
  for (const row of changed) {
    const observation = row.reviewEvidence.observations[0];
    const entry = cases.find(e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === observation.case);
    const [reference, candidate] = modalInventoryTrees(inventory, observation.case);
    const mutated = structuredClone(candidate);
    mutated.rules.push({ selector: '#' + row.element, color: 'red' });
    assert.throws(() => proveComponentColorRequest(entry, reference, mutated, retained, normalize));
    const missing = structuredClone(retained);
    missing.differences = missing.differences.filter(p => p.case !== observation.case);
    assert.throws(() => proveComponentColorRequest(entry, reference, candidate, missing, normalize));
    const changedReference = structuredClone(reference);
    changedReference.nodes.find(n => n.key === observation.referenceNode).inline.color = { value: 'red', important: false };
    assert.throws(() => proveComponentColorRequest(entry, changedReference, candidate, retained, normalize));
    if (row.family === 'sidenav') {
      assert.ok(row.reviewEvidence.observations.every(o => o.candidateLocalColor === null && !o.childValueAppliedToContainer));
      const filled = structuredClone(entry);
      filled.styleInputs.find(i => i.id === row.element).astylar.color = '#1d1b20';
      assert.throws(() => proveComponentColorRequest(filled, reference, candidate, retained, normalize));
    }
  }
  const incomplete = structuredClone(rows); incomplete.find(r => r.attribution === 'unresolved' && r.property === 'color').occurrences++;
  assert.throws(() => applyComponentColorRequests(incomplete, cases, inventory, retained, normalize));
});
