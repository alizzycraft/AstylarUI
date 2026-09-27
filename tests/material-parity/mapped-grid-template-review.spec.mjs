import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { inspectOwnerGridInitial } from './owner-grid-initial-evidence.mjs';
import { proveMappedGridTemplateOmission, proveDirectGridTemplateMotionBoundary, applyGridTemplateReviews,
  gridTemplateReviewAttributions, applyGridHeightReviews, validateGridHeightReviews } from './mapped-grid-template-review.mjs';
import { heightReviewAttributions } from './control-height-request-review.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';

test('grid omission boundaries preserve mapped owners and direct motion uncertainty', () => {
  const hash = b => createHash('sha256').update(b).digest('hex');
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const raw = JSON.parse(bytes), cases = [...raw.results.map(e => ({ ...e, kind: 'static' })),
    ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const snapshot = { generation: 'd25a9078972edf1884a4e56a7c17f4a7b3d249d3ed22933811f69daa4aafda9a',
    indexSha256: 'c1934e90c7ca80ff121da83a6871d10da201f798f37cdb92f8badce7c24529ad' };
  const rows = [...new Set(cases.map(e => e.family))].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, snapshot))
    .filter(r => r.attribution === 'unresolved' && ['gridTemplateColumns', 'gridTemplateRows'].includes(r.property) && r.astylar === undefined);
  const cache = new Map();
  const read = d => {
    if (!cache.has(d.file)) { const b = readFileSync(d.file); cache.set(d.file, { hash: hash(b), tree: JSON.parse(b) }); }
    const item = cache.get(d.file); assert.equal(item.hash, d.sha256); return item.tree;
  };
  let total = 0, gaps = 0, direct = 0, disjoint = 0, uncertain = 0;
  const tested = new Set();
  for (const row of rows) {
    const members = cases.filter(e => e.family === row.family && row.states.includes(e.state ?? 'static') &&
      e.styleInputs.some(i => i.id === row.element && i.reference[row.property] === 'none' && i.astylar[row.property] === undefined));
    assert.equal(members.length, row.occurrences);
    for (const entry of members) {
      const input = entry.styleInputs.find(i => i.id === row.element), r = read(entry.inputTrees.reference), a = read(entry.inputTrees.astylar);
      const survey = inspectOwnerGridInitial(input, row.property, r, a);
      if (survey.issues.length && survey.issues.every(i => i.reason === 'motion-request-needs-review')) {
        const proof = proveDirectGridTemplateMotionBoundary(input, r, a, row.property); direct++;
        assert.equal(proof.animationSettlementVerified, false); assert.equal(proof.inputEquivalent, false);
        if (proof.declaredTargetsDisjoint) disjoint++;
        else { uncertain++; assert.ok(['chip-0', 'chip-1'].includes(row.element)); }
        const key = 'direct/' + row.element + '/' + row.property;
        if (!tested.has(key)) {
          tested.add(key);
          const changed = structuredClone(a); changed.rules.push({ selector: '#' + row.element, gridTemplateRows: '1fr' });
          assert.throws(() => proveDirectGridTemplateMotionBoundary(input, r, changed, row.property));
          const changedReference = structuredClone(r);
          const native = changedReference.nodes.find(n => n.key === proof.referenceNode);
          native.inline['transition-property'] = { value: 'grid-template-rows', important: false };
          assert.equal(proveDirectGridTemplateMotionBoundary(input, changedReference, a, row.property).declaredTargetsDisjoint, false);
        }
        continue;
      }
      if (!survey.issues.some(i => i.reason === 'owner-mapping')) continue;
      const proof = proveMappedGridTemplateOmission(entry, input, r, a, row.property);
      total++; if (proof.identity.status === 'mapped-with-scalar-rule-gap') gaps++;
      assert.equal(proof.inputEquivalent, false); assert.equal(proof.gridLayoutEquivalent, false);
      assert.equal(proof.motionTargetsVerified, false); assert.equal(proof.candidateComputedVerified, false);
      const key = row.element + '/' + row.property;
      if (!tested.has(key)) {
        tested.add(key);
        for (const declaration of [{ gridTemplateRows: '1fr' }, { grid: 'none' }, { all: 'initial' }]) {
          const changed = structuredClone(a); changed.rules.push({ selector: '#' + row.element, ...declaration });
          assert.throws(() => proveMappedGridTemplateOmission(entry, input, r, changed, row.property));
        }
        const changedReference = structuredClone(r);
        changedReference.nodes.find(n => n.key === proof.referenceNode).inline.grid = { value: 'none', important: false };
        assert.throws(() => proveMappedGridTemplateOmission(entry, input, changedReference, a, row.property));
      }
    }
  }
  assert.equal(total, 884); assert.equal(gaps, 118);
  assert.equal(direct, 1920); assert.equal(disjoint, 1616); assert.equal(uncertain, 304);
  const allRows = [...new Set(cases.map(e => e.family))].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, snapshot))
    .filter(r => r.evidence.section === 'discrepancies');
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const joined = applyGridTemplateReviews(allRows, cases, inventory, bindPreciseAuditNormalization());
  const metadata = new Set(['classification', 'attribution', 'recommendedOwner', 'justification', 'reviewEvidence', 'reviewedCases']);
  const rawRow = row => Object.fromEntries(Object.entries(row).filter(([k]) => !metadata.has(k)));
  const counts = new Map(); let changed = 0;
  for (let i = 0; i < allRows.length; i++) {
    const before = allRows[i], after = joined[i]; assert.deepEqual(rawRow(after), rawRow(before));
    if (!gridTemplateReviewAttributions.includes(after.attribution)) { assert.deepEqual(after, before); continue; }
    changed++;
    assert.equal(after.reviewEvidence.originalRowSha256, hash(JSON.stringify(before)));
    assert.equal(after.reviewEvidence.observations.length, before.occurrences);
    assert.equal(after.reviewEvidence.inputEquivalent, false); assert.equal(after.reviewEvidence.renderingEquivalent, false);
    const count = counts.get(after.attribution) ?? [0, 0]; count[0]++; count[1] += before.occurrences; counts.set(after.attribution, count);
  }
  assert.equal(changed, 60);
  assert.deepEqual(gridTemplateReviewAttributions.map(k => counts.get(k)), [[2, 104], [24, 884], [34, 1920]]);
  const normalize = bindPreciseAuditNormalization();
  const combined = applyGridHeightReviews(allRows, cases, inventory, normalize);
  const attributions = [...gridTemplateReviewAttributions, ...heightReviewAttributions];
  let reviewed = 0, observations = 0;
  for (let index = 0; index < allRows.length; index++) {
    const before = allRows[index], after = combined[index];
    assert.deepEqual(rawRow(after), rawRow(before));
    if (!attributions.includes(after.attribution)) assert.deepEqual(after, before);
    else { reviewed++; observations += after.occurrences; }
  }
  assert.equal(reviewed, 103); assert.equal(observations, 4322);
  const persisted = JSON.parse(JSON.stringify(combined));
  assert.deepEqual(validateGridHeightReviews(persisted, allRows, cases, inventory, normalize), []);
  const target = persisted.find(r => attributions.includes(r.attribution));
  target.reviewEvidence.inputEquivalent = true;
  assert.ok(validateGridHeightReviews(persisted, allRows, cases, inventory, normalize).length);
  assert.ok(validateGridHeightReviews(combined.slice(1), allRows, cases, inventory, normalize).length);
});
