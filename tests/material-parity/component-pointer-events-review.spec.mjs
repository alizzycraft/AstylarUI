import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { applySheetPointerOwnerReview, proveSheetPointerOwners, applyBadgePointerRequestReview, proveBadgePointerRequest } from './component-pointer-events-review.mjs';

test('pointer reviews distinguish 25 sheet owner mismatches from 52 badge request omissions', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const captured = JSON.parse(bytes), cases = [...captured.results.map(c => ({ ...c, kind: 'static' })),
    ...captured.interactions.map(c => ({ ...c, kind: 'interaction' }))];
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const rows = queryFindings('artifacts/material-parity/working-audit', 'bottom-sheet', {
    generation: '5998d72bd0310ff4ddd8d3a44954fa5ade6655abb506f2bb85baa4935c3792d0',
    indexSha256: '8882ab9d062d52eeec3dcbadb1d72ee8518f3bb8bda8d8f4df7cc4466af89eef',
  }).filter(r => r.evidence.section === 'discrepancies');
  const reviewed = applySheetPointerOwnerReview(rows, cases, inventory, normalize), changed = reviewed.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 1); assert.equal(changed[0].occurrences, 25);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  reviewed.forEach((r, i) => { assert.deepEqual(raw(r), raw(rows[i])); if (r !== changed[0]) assert.deepEqual(r, rows[i]); });
  const row = changed[0], key = row.reviewedCases[0];
  const entry = cases.find(c => `${c.kind}:${c.family}@${c.profile}/${c.viewport.id}${c.state ? '/' + c.state : ''}` === key);
  const [reference, candidate] = modalInventoryTrees(inventory, key), proof = row.reviewEvidence.observations[0];
  assert.deepEqual(proveSheetPointerOwners(entry, reference, candidate, normalize), proof);
  assert.ok(row.reviewEvidence.observations.every(p => !p.actualHitTargetVerified && !p.modalScopeCauseProven && !p.candidateComputedPointerEventsVerified));
  const altered = structuredClone(reference), backdrop = altered.nodes.find(n => n.key === proof.nativeBackdrop);
  altered.styles[backdrop.style].pointerEvents = 'none';
  assert.throws(() => proveSheetPointerOwners(entry, altered, candidate, normalize));
  const missing = structuredClone(reference); missing.nodes = missing.nodes.filter(n => n.key !== proof.nativeBackdrop);
  assert.throws(() => proveSheetPointerOwners(entry, missing, candidate, normalize));
  const request = structuredClone(candidate); request.rules.push({ selector: '#bottom-sheet-overlay', pointerEvents: 'none' });
  assert.throws(() => proveSheetPointerOwners(entry, reference, request, normalize));

  const badgeRows = queryFindings('artifacts/material-parity/working-audit', 'badge', {
    generation: '5998d72bd0310ff4ddd8d3a44954fa5ade6655abb506f2bb85baa4935c3792d0',
    indexSha256: '8882ab9d062d52eeec3dcbadb1d72ee8518f3bb8bda8d8f4df7cc4466af89eef',
  }).filter(r => r.evidence.section === 'discrepancies');
  const badgeReview = applyBadgePointerRequestReview(badgeRows, cases, inventory, normalize);
  const badges = badgeReview.filter((r, i) => r !== badgeRows[i]);
  assert.equal(badges.length, 1); assert.equal(badges[0].occurrences, 52);
  badgeReview.forEach((r, i) => { assert.deepEqual(raw(r), raw(badgeRows[i])); if (r !== badges[0]) assert.deepEqual(r, badgeRows[i]); });
  const badgeKey = badges[0].reviewedCases[0];
  const badgeEntry = cases.find(c => `${c.kind}:${c.family}@${c.profile}/${c.viewport.id}${c.state ? '/' + c.state : ''}` === badgeKey);
  const [br, ba] = modalInventoryTrees(inventory, badgeKey);
  assert.deepEqual(proveBadgePointerRequest(badgeEntry, br, ba), badges[0].reviewEvidence.observations[0]);
  const extra = structuredClone(ba); extra.rules.push({ selector: '#badge-count', pointerEvents: 'none' });
  assert.throws(() => proveBadgePointerRequest(badgeEntry, br, extra));
  const missingRule = structuredClone(br);
  const badgeRule = missingRule.rules.find(r => r.selector === '.mat-badge-content');
  delete badgeRule.declarations['pointer-events'];
  assert.throws(() => proveBadgePointerRequest(badgeEntry, missingRule, ba));
});
