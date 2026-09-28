import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { applyGridOffsetReviews, proveGridOffsetRequests } from './grid-position-request-review.mjs';

test('grid offsets preserve authored calc intent and computed/local boundaries in all 52 cases', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes), cases = [...capture.results.map(e => ({ ...e, kind: 'static' })),
    ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => e.family === 'grid-list');
  assert.equal(cases.length, 52);
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const rows = queryFindings('artifacts/material-parity/working-audit', 'grid-list', {
    generation: '7ffd3a4832d90e185be9d234b3d022f276db113767a6fcb0c3c965c51c14d592',
    indexSha256: 'b37363024107a9aeca949a701837764fdfe96e17b0aedca1549e187573dc8df4',
  }).filter(r => r.evidence.section === 'discrepancies');
  const reviewed = applyGridOffsetReviews(rows, cases, inventory, bindPreciseAuditNormalization());
  const changed = reviewed.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 16); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 624);
  const authored = changed.filter(r => r.classification === 'application-plugin-authoring-defect');
  assert.equal(authored.length, 6); assert.equal(authored.reduce((n, r) => n + r.occurrences, 0), 208);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  reviewed.forEach((r, i) => { assert.deepEqual(raw(r), raw(rows[i])); if (!changed.includes(r)) assert.deepEqual(r, rows[i]); });
  for (const element of ['grid-list-primary', 'grid-tile-one', 'grid-tile-two']) {
    const key = changed.find(r => r.element === element).reviewedCases[0];
    const entry = cases.find(c => `${c.kind}:${c.family}@${c.profile}/${c.viewport.id}${c.state ? '/' + c.state : ''}` === key);
    const [r, a] = modalInventoryTrees(inventory, key), proof = proveGridOffsetRequests(entry, r, a, element);
    assert.equal(proof.rendererCauseProven, false); assert.equal(proof.candidateUsedOffsetsVerified, false);
    const candidate = structuredClone(a); candidate.rules.push({ selector: '#' + element, insetInline: '0' });
    assert.throws(() => proveGridOffsetRequests(entry, r, candidate, element));
    const native = structuredClone(r); native.nodes.find(n => n.key === proof.referenceNode).inline.bottom = { value: '0px', important: false };
    assert.throws(() => proveGridOffsetRequests(entry, native, a, element));
    const altered = structuredClone(entry); altered.styleInputs.find(i => i.id === element).reference.left = '999px';
    assert.throws(() => proveGridOffsetRequests(altered, r, a, element));
  }
});
