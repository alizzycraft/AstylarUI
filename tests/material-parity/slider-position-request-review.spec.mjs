import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { applySliderPositionReviews, proveSliderPositionRequests } from './slider-position-request-review.mjs';
import { applySliderMarginReviews, proveSliderMarginOwner, validateSliderMarginReviews } from './slider-position-request-review.mjs';
import { applyBadgeMarginReviews, validateBadgeMarginReviews } from './authored-anchor-review.mjs';

test('spacing reviews distinguish slider parent relocation from badge anchor substitution', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes), families = ['slider', 'badge'];
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })),
    ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => families.includes(e.family));
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []);
  const rows = families.flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: '0a30ca894170b342e4521c01e4fcb23ed990d70cea789fe89bd4eba0baf663fb',
    indexSha256: 'edf9c2de34728dc874460796853460dd5d39bafd71d4db41cba257366ec50cc0',
  })).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const result = applyBadgeMarginReviews(applySliderMarginReviews(rows, cases, inventory, normalize), cases, inventory, normalize);
  const changed = result.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 6); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 364);
  assert.equal(changed.filter(r => r.classification === 'parity-harness-defect').length, 2);
  assert.equal(changed.filter(r => r.classification === 'application-plugin-authoring-defect').length, 4);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(result.map(raw), rows.map(raw));
  for (let i = 0; i < rows.length; i++) if (!changed.includes(result[i])) assert.deepEqual(result[i], rows[i]);
  assert.deepEqual(validateSliderMarginReviews(result, rows, cases, inventory, normalize), []);
  assert.deepEqual(validateBadgeMarginReviews(result, rows, cases, inventory, normalize), []);
  for (const row of changed) {
    assert.equal(row.reviewEvidence.inputEquivalent, false); assert.equal(row.reviewEvidence.renderingEquivalent, false);
    const altered = structuredClone(result); altered.find(r => r.element === row.element && r.property === row.property).reviewedCases.pop();
    const validate = row.family === 'slider' ? validateSliderMarginReviews : validateBadgeMarginReviews;
    assert.equal(validate(altered, rows, cases, inventory, normalize).length, 1);
  }
  const entry = cases.find(e => e.family === 'slider');
  const pair = modalInventoryTrees(inventory, `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
  const proof = proveSliderMarginOwner(entry, ...pair);
  for (const mutate of [
    ([r]) => { r.ruleEvidenceComplete = false; },
    ([, a]) => { a.nodes.find(n => n.key === proof.candidateSpacingOwner).normalResolvedStyle.margin = '0'; },
    ([, a]) => { a.rules.push({ selector: '.range-stack', marginLeft: '9px' }); },
    ([, a]) => { a.nodes.find(n => n.authored?.id === 'slider-start').parent = a.nodes[0].key; },
    ([r]) => { r.nodes.find(n => n.attributes?.id === 'slider-start').parent = r.nodes[0].key; },
  ]) {
    const altered = structuredClone(pair); mutate(altered);
    assert.throws(() => proveSliderMarginOwner(entry, ...altered));
  }
});

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
