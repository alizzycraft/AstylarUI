import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { clippingOwners, proveControlClippingRequests, applyControlClippingRequests,
  validateControlClippingRequests } from './control-overflow-observation.mjs';

test('330 control owners preserve clipping requests, competing visible rules and the progress computed axis', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const captured = JSON.parse(bytes);
  const cases = [...captured.results.map(e => ({ ...e, kind: 'static' })),
    ...captured.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => clippingOwners[e.family]);
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const trees = e => modalInventoryTrees(inventory,
    `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`);
  const counts = {}, samples = new Map();
  for (const entry of cases) for (const element of Object.keys(clippingOwners[entry.family])) {
    const pair = trees(entry), proof = proveControlClippingRequests(entry, ...pair, element);
    assert.equal(proof.clippingVerified, false); assert.equal(proof.candidateComputedOverflowVerified, false);
    counts[element] = (counts[element] ?? 0) + 1;
    if (!samples.has(element)) samples.set(element, { entry, pair, proof });
  }
  assert.deepEqual(counts, { 'core-primary': 52, 'sidenav-primary': 62, 'grid-tile-one': 52,
    'grid-tile-two': 52, 'badge-count': 52, 'icon-primary': 20, 'progress-bar-primary': 20,
    'progress-spinner-primary': 20 });
  for (const [element, { entry, pair, proof }] of samples) {
    const ref = r => r.nodes.find(n => n.key === proof.referenceNode);
    const ast = a => a.nodes.find(n => n.key === proof.astylarNode);
    for (const mutate of [
      ([r]) => { r.ruleEvidenceComplete = false; },
      ([r]) => { ref(r).inline = { overflow: { value: 'visible' } }; },
      ([r]) => { ref(r).attributes.style = 'overflow-inline:visible'; },
      ([r]) => { r.rules[ref(r).rules[0]].cssText += ';all:initial'; },
      ([r]) => { r.styles[ref(r).style].overflowY = 'forged'; },
      ([, a]) => { a.rules.push({ selector: '#' + element, overflowBlock: 'hidden' }); },
      ([, a]) => { a.rules.push({ selector: '[unknown]', overflow: 'hidden' }); },
      ([, a]) => { ast(a).authored.style = { overflow: 'hidden' }; },
      ([, a]) => { ast(a).interactionResolvedStyle.overflowY = 'hidden'; },
      ([, a]) => { a.nodes.push(structuredClone(ast(a))); },
      ([, a]) => { ast(a).authored.type = 'other'; },
    ]) {
      const altered = structuredClone(pair); mutate(altered);
      assert.throws(() => proveControlClippingRequests(entry, ...altered, element), undefined, element);
    }
  }
  const rows = Object.keys(clippingOwners).flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, {
    generation: 'fea569edc8edf1e05d1686bcb7c2a8eecc0bfb53bff5d5b8baeb6fbb59602040',
    indexSha256: '672b4d61922a8ef775f4e2c723ca09c9ab70684d93822cd3fe3b53d0df6c9d57',
  })).filter(r => r.evidence.section === 'discrepancies');
  const before = structuredClone(rows), applied = applyControlClippingRequests(rows, cases, inventory, normalize);
  assert.deepEqual(rows, before);
  const changed = applied.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 16); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 660);
  assert.deepEqual(changed.filter(r => r.attribution === 'reviewed-progress-overflow-computed-axis')
    .map(r => [r.element, r.property, r.reference, r.occurrences]), [['progress-bar-primary', 'overflowY', 'auto', 20]]);
  for (const row of changed) {
    assert.equal(row.reviewedCases.length, row.occurrences);
    assert.equal(new Set(row.reviewedCases).size, row.occurrences);
    const restored = { ...row };
    for (const key of ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']) delete restored[key];
    Object.assign(restored, row.reviewEvidence.priorMetadata);
    assert.deepEqual(restored, rows.find(r => r.id === row.id));
  }
  const validate = values => validateControlClippingRequests(values, rows, cases, inventory, normalize);
  assert.deepEqual(validate(applied), []);
  for (const mutate of [r => { r.reference = 'forged'; }, r => r.reviewedCases.pop(),
    r => { r.reviewEvidence.observations[0].clippingVerified = true; }]) {
    const altered = structuredClone(applied);
    mutate(altered.find(r => r.attribution === 'reviewed-control-clipping-request-omission'));
    assert.ok(validate(altered).length);
  }
  assert.throws(() => applyControlClippingRequests(rows, cases.slice(1), inventory, normalize));
  assert.throws(() => applyControlClippingRequests(rows, [...cases, cases[0]], inventory, normalize));
});
