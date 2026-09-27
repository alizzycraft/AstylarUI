import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { fixedHeightOwners, proveFixedHeightRequest, proveOmittedHeightRequest,
  applyHeightRequestReviews, heightReviewAttributions } from './control-height-request-review.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';

test('all 43 remaining height groups preserve owner requests and stage boundaries', () => {
  const hash = b => createHash('sha256').update(b).digest('hex');
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const raw = JSON.parse(bytes), cases = [...raw.results.map(e => ({ ...e, kind: 'static' })),
    ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const snapshot = { generation: 'd25a9078972edf1884a4e56a7c17f4a7b3d249d3ed22933811f69daa4aafda9a',
    indexSha256: 'c1934e90c7ca80ff121da83a6871d10da201f798f37cdb92f8badce7c24529ad' };
  const allRows = [...new Set(cases.map(e => e.family))].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, snapshot))
    .filter(r => r.evidence.section === 'discrepancies');
  const rows = allRows.filter(r => r.attribution === 'unresolved' && r.property === 'height');
  assert.equal(rows.length, 43);
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const cache = new Map(), read = d => {
    if (!cache.has(d.file)) { const b = readFileSync(d.file); cache.set(d.file, { sha: hash(b), tree: JSON.parse(b) }); }
    const v = cache.get(d.file); assert.equal(v.sha, d.sha256); return v.tree;
  };
  let total = 0, token = 0, omitted = 0;
  for (const row of rows) {
    const prove = row.astylar === undefined ? proveOmittedHeightRequest : proveFixedHeightRequest;
    if (row.astylar !== undefined) assert.ok(Object.hasOwn(fixedHeightOwners, row.element));
    const members = cases.filter(e => e.family === row.family && row.states.includes(e.state ?? 'static') &&
      e.styleInputs.some(i => i.id === row.element && i.astylar.height === row.astylar &&
        (i.reference.height === row.reference || i.reference.height === '0px' && row.reference === '0')));
    assert.equal(members.length, row.occurrences);
    for (const entry of members) {
      read(entry.inputTrees.reference); read(entry.inputTrees.astylar);
      const input = entry.styleInputs.find(i => i.id === row.element);
      const [r, a] = modalInventoryTrees(inventory,
        `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
      const proof = prove(entry, input, r, a); total++;
      if (row.astylar === undefined) omitted++;
      if (row.family === 'progress-bar') token++;
      assert.equal(proof.candidateUsedLayoutVerified, false); assert.equal(proof.inputEquivalent, false);
      if (entry === members[0]) {
        const changed = structuredClone(a); changed.rules.push({ selector: '#' + row.element, blockSize: '10px' });
        assert.throws(() => prove(entry, input, r, changed));
        const changedReference = structuredClone(r);
        changedReference.nodes.find(n => n.key === proof.referenceNode).inline.height = { value: '10px', important: false };
        assert.throws(() => prove(entry, input, changedReference, a));
        const changedStage = structuredClone(a);
        changedStage.nodes.find(n => n.key === proof.astylarNode).normalResolvedStyle.height = '999px';
        assert.throws(() => prove(entry, input, r, changedStage));
      }
    }
  }
  assert.equal(total, 1414); assert.equal(omitted, 1076); assert.equal(token, 20);
  const joined = applyHeightRequestReviews(allRows, cases, inventory, bindPreciseAuditNormalization());
  const metadata = new Set(['classification', 'attribution', 'recommendedOwner', 'justification', 'reviewEvidence', 'reviewedCases']);
  const rawRow = row => Object.fromEntries(Object.entries(row).filter(([key]) => !metadata.has(key)));
  const counts = [[0, 0], [0, 0]];
  assert.equal(allRows.length, 8483); assert.equal(joined.length, allRows.length);
  for (let index = 0; index < allRows.length; index++) {
    const before = allRows[index], after = joined[index];
    assert.deepEqual(rawRow(after), rawRow(before));
    const kind = heightReviewAttributions.indexOf(after.attribution);
    if (kind < 0) { assert.deepEqual(after, before); continue; }
    counts[kind][0]++; counts[kind][1] += before.occurrences;
    assert.equal(after.reviewEvidence.originalRowSha256, hash(JSON.stringify(before)));
    assert.equal(after.reviewEvidence.observations.length, before.occurrences);
    assert.equal(after.reviewEvidence.inputEquivalent, false);
    assert.equal(after.reviewEvidence.renderingEquivalent, false);
  }
  assert.deepEqual(counts, [[14, 338], [29, 1076]]);
});
