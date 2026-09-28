import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { textTransformOwners, proveTextTransformBoundary, applyTextTransformBoundaryReviews } from './text-transform-boundary-review.mjs';

test('text-transform observation boundary preserves tokens, ancestry and exact original populations', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes);
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })), ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const rows = Object.keys(textTransformOwners).flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: 'a593d4c7e804b6cf5ba863163122fde6cb31774c88c5fe6f97f6504cee2fa948',
    indexSha256: 'c5224eea34da7aa30570bcad482ac04e55c39ba0a8988a0d7ec0b88629f350c1',
  })).filter(r => r.evidence.section === 'discrepancies');
  const reviewed = applyTextTransformBoundaryReviews(rows, cases, inventory, bindPreciseAuditNormalization());
  const changed = reviewed.filter((r, i) => r !== rows[i]); assert.equal(changed.length, 27);
  assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 1304);
  assert.equal(changed.flatMap(r => r.reviewEvidence.observations).filter(p => p.nativeRequests.length).length, 768);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !metadata.has(key)));
  reviewed.forEach((r, i) => {
    assert.deepEqual(raw(r), raw(rows[i]));
    if (r !== rows[i]) {
      assert.equal(rows[i].attribution, 'unresolved'); assert.equal(r.reviewEvidence.renderingEquivalent, false);
      assert.equal(r.reviewEvidence.observations.length, r.occurrences);
    }
  });
  for (const row of changed) {
    const key = row.reviewedCases[0], entry = cases.find(e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === key);
    const [r, a] = modalInventoryTrees(inventory, key), proof = proveTextTransformBoundary(entry, r, a, row.element);
    const native = structuredClone(r); native.nodes.find(n => n.key === proof.referencePath.at(-1)).inline['text-transform'] = { value: 'uppercase', important: false };
    assert.throws(() => proveTextTransformBoundary(entry, native, a, row.element));
    const candidate = structuredClone(a); candidate.nodes.find(n => n.key === proof.candidatePath[1]).authored.style = { textTransform: 'uppercase' };
    assert.throws(() => proveTextTransformBoundary(entry, r, candidate, row.element));
    const stage = structuredClone(a); stage.nodes.find(n => n.key === proof.astylarNode).interactionResolvedStyle.textTransform = 'none';
    assert.throws(() => proveTextTransformBoundary(entry, r, stage, row.element));
    const missing = structuredClone(r); missing.nodes = missing.nodes.filter(n => n.key !== proof.referencePath.at(-1));
    assert.throws(() => proveTextTransformBoundary(entry, missing, a, row.element));
    const cascade = structuredClone(a); cascade.rules.push({ selector: '*', textTransform: 'uppercase' });
    assert.throws(() => proveTextTransformBoundary(entry, r, cascade, row.element));
    const serialized = structuredClone(r), owner = serialized.nodes.find(n => n.key === proof.referenceNode);
    owner.rules.push(serialized.rules.length);
    serialized.rules.push({ selector: '#injected-transform', active: true, conditions: [], declarations: {}, cssText: 'text-transform: uppercase;' });
    assert.throws(() => proveTextTransformBoundary(entry, serialized, a, row.element));
  }
});
