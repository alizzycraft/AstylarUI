import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { applyOverlayPositionReviews, proveOverlayPositionRequests } from './overlay-position-request-review.mjs';
import { applyOverlayFlowReviews, proveOverlayFlowRequests, validateOverlayFlowReviews } from './overlay-position-request-review.mjs';

test('overlay flow preserves 329 observations and separates authoring from alignment observation stages', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const c = JSON.parse(bytes), families = ['bottom-sheet', 'snack-bar'];
  const cases = [...c.results.map(e => ({ ...e, kind: 'static' })), ...c.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => families.includes(e.family));
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization(); assert.deepEqual(inventory.errors, []);
  const rows = families.flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: '9b827bb2b09ae9d20d35e1640f987c9a4972aeab04676d595d7dd5f7d6ee01ab',
    indexSha256: 'cd3d3c45aab1db7095753132870a660f456dc80e5334787f6f4508e8d30d9486',
  })).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyOverlayFlowReviews(rows, cases, inventory, normalize), changed = applied.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 11); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 329);
  assert.equal(changed.filter(r => r.classification === 'application-plugin-authoring-defect').length, 7);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  applied.forEach((r, i) => { assert.deepEqual(raw(r), raw(rows[i])); if (!changed.includes(r)) assert.deepEqual(r, rows[i]); });
  assert.deepEqual(validateOverlayFlowReviews(applied, rows, cases, inventory, normalize), []);
  const forged = structuredClone(applied); forged.find(r => r.attribution === 'reviewed-overlay-flow-composition-substitution').reviewedCases.pop();
  assert.equal(validateOverlayFlowReviews(forged, rows, cases, inventory, normalize).length, 1);
  const key = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
  for (const family of families) {
    const row = changed.find(r => r.family === family), caseId = row.reviewedCases[0];
    assert.equal(row.reviewedCases.length, family === 'bottom-sheet' ? 25 : 34);
    assert.throws(() => applyOverlayFlowReviews(rows, cases.filter(e => key(e) !== caseId), inventory, normalize));
    const entry = cases.find(e => key(e) === caseId), pair = modalInventoryTrees(inventory, caseId);
    const proof = proveOverlayFlowRequests(entry, ...pair); assert.equal(proof.renderingEquivalent, null);
    for (const mutate of [
      ([r]) => { r.nodes.find(n => n.key === proof.referenceNode).inline['align-items'].value = 'center'; },
      ([r]) => { r.nodes.find(n => n.key === proof.referenceChild).attributes.class = 'unrelated'; },
      ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).normalResolvedStyle.flexDirection = 'row'; },
      ([, a]) => { a.rules.push({ selector: '#' + family + '-overlay', textAlign: 'start' }); },
      ([, a]) => { a.nodes.find(n => n.key === proof.candidateChild).resolvedStyle.flexShrink = '0'; },
    ]) { const altered = structuredClone(pair); mutate(altered); assert.throws(() => proveOverlayFlowRequests(entry, ...altered)); }
  }
});

test('overlay positioning distinguishes requested fixed/absolute and computed/local observations', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const c = JSON.parse(bytes), families = ['bottom-sheet', 'snack-bar', 'dialog'];
  const cases = [...c.results.map(e => ({ ...e, kind: 'static' })), ...c.interactions.map(e => ({ ...e, kind: 'interaction' }))]
    .filter(e => families.includes(e.family));
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const rows = families.flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: '7ffd3a4832d90e185be9d234b3d022f276db113767a6fcb0c3c965c51c14d592',
    indexSha256: 'b37363024107a9aeca949a701837764fdfe96e17b0aedca1549e187573dc8df4',
  })).filter(r => r.evidence.section === 'discrepancies');
  const reviewed = applyOverlayPositionReviews(rows, cases, inventory, bindPreciseAuditNormalization());
  const changed = reviewed.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 5); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 141);
  assert.equal(changed.filter(r => r.classification === 'application-plugin-authoring-defect').length, 1);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  reviewed.forEach((r, i) => { assert.deepEqual(raw(r), raw(rows[i])); if (!changed.includes(r)) assert.deepEqual(r, rows[i]); });
  for (const element of ['bottom-sheet-overlay', 'snack-bar-surface', 'dialog-copy']) {
    const key = changed.find(r => r.element === element).reviewedCases[0];
    const entry = cases.find(c => `${c.kind}:${c.family}@${c.profile}/${c.viewport.id}${c.state ? '/' + c.state : ''}` === key);
    const [r, a] = modalInventoryTrees(inventory, key), proof = proveOverlayPositionRequests(entry, r, a, element);
    assert.equal(proof.popupVisibilityCauseProven, false); assert.equal(proof.containingBlockEquivalenceProven, false);
    const candidate = structuredClone(a); candidate.rules.push({ selector: '#' + element, position: 'static' });
    assert.throws(() => proveOverlayPositionRequests(entry, r, candidate, element));
    const native = structuredClone(r); native.nodes.find(n => n.key === proof.referenceNode).inline.right = { value: '0px', important: false };
    assert.throws(() => proveOverlayPositionRequests(entry, native, a, element));
  }
});
