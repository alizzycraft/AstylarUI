import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { applySheetPointerOwnerReview, proveSheetPointerOwners, applyBadgePointerRequestReview, proveBadgePointerRequest } from './component-pointer-events-review.mjs';
import { applyDisabledPointerRequestReviews, proveDisabledPointerRequest } from './component-pointer-events-review.mjs';
import { applySliderPointerRequestReview, proveSliderPointerRequest, collectSliderPointerSource } from './component-pointer-events-review.mjs';
import { applyOmittedPointerBoundaryReviews, proveOmittedPointerBoundary } from './component-pointer-events-review.mjs';
import { applyOverlayPointerPolicyReviews, proveOverlayPointerPolicy } from './component-pointer-events-review.mjs';
import { applyTabPointerBoundaryReviews, proveTabPointerBoundary } from './component-pointer-events-review.mjs';

test('pointer reviews distinguish sheet ownership, badge requests and disabled ancestor suppression', () => {
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

  const disabledRows = ['button', 'checkbox', 'radio'].flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: '7ffd3a4832d90e185be9d234b3d022f276db113767a6fcb0c3c965c51c14d592',
    indexSha256: 'b37363024107a9aeca949a701837764fdfe96e17b0aedca1549e187573dc8df4',
  }).filter(r => r.evidence.section === 'discrepancies'));
  const disabledReview = applyDisabledPointerRequestReviews(disabledRows, cases, inventory, normalize);
  const changedDisabled = disabledReview.filter((r, i) => r !== disabledRows[i]);
  assert.equal(changedDisabled.length, 5);
  assert.equal(changedDisabled.reduce((n, r) => n + r.occurrences, 0), 92);
  disabledReview.forEach((r, i) => {
    assert.deepEqual(raw(r), raw(disabledRows[i]));
    if (!changedDisabled.includes(r)) assert.deepEqual(r, disabledRows[i]);
  });
  for (const row of changedDisabled) {
    assert.ok(row.reviewEvidence.observations.every(p => !p.actualHitTargetVerified && !p.disabledGuardEquivalentToPointerSuppression));
    const key = row.reviewedCases[0];
    const entry = cases.find(c => `${c.kind}:${c.family}@${c.profile}/${c.viewport.id}${c.state ? '/' + c.state : ''}` === key);
    const [r, a] = modalInventoryTrees(inventory, key);
    assert.deepEqual(proveDisabledPointerRequest(entry, r, a, row.element), row.reviewEvidence.observations[0]);
    const altered = structuredClone(a); altered.rules.push({ selector: `#${row.element}`, pointerEvents: 'none' });
    assert.throws(() => proveDisabledPointerRequest(entry, r, altered, row.element));
    const reference = structuredClone(r);
    for (const rule of reference.rules) if (rule.declarations) delete rule.declarations['pointer-events'];
    assert.throws(() => proveDisabledPointerRequest(entry, reference, a, row.element));
  }
  const sliderRows = queryFindings('artifacts/material-parity/working-audit', 'slider', {
    generation: '7ffd3a4832d90e185be9d234b3d022f276db113767a6fcb0c3c965c51c14d592',
    indexSha256: 'b37363024107a9aeca949a701837764fdfe96e17b0aedca1549e187573dc8df4',
  }).filter(r => r.evidence.section === 'discrepancies');
  const sliderReview = applySliderPointerRequestReview(sliderRows, cases, inventory, normalize);
  const changedSlider = sliderReview.filter((r, i) => r !== sliderRows[i]);
  assert.equal(changedSlider.length, 1); assert.equal(changedSlider[0].occurrences, 8);
  sliderReview.forEach((r, i) => { assert.deepEqual(raw(r), raw(sliderRows[i])); if (r !== changedSlider[0]) assert.deepEqual(r, sliderRows[i]); });
  const sk = changedSlider[0].reviewedCases[0];
  const se = cases.find(c => `${c.kind}:${c.family}@${c.profile}/${c.viewport.id}${c.state ? '/' + c.state : ''}` === sk);
  const [sr, sa] = modalInventoryTrees(inventory, sk), evidence = collectSliderPointerSource();
  assert.deepEqual(proveSliderPointerRequest(se, sr, sa, evidence), changedSlider[0].reviewEvidence.observations[0]);
  assert.ok(changedSlider[0].reviewEvidence.observations.every(o => !o.dragCauseVerified));
  const peer = structuredClone(sr), end = peer.nodes.find(n => n.attributes?.id === 'slider-primary');
  peer.styles[end.style].pointerEvents = 'none';
  assert.throws(() => proveSliderPointerRequest(se, peer, sa, evidence));
  const alteredCandidate = structuredClone(sa); alteredCandidate.rules.push({ selector: '#slider-start', pointerEvents: 'none' });
  assert.throws(() => proveSliderPointerRequest(se, sr, alteredCandidate, evidence));
  assert.throws(() => proveSliderPointerRequest({ ...se, state: 'released' }, sr, sa, evidence));
  const omittedRows = ['chips', 'tabs'].flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: '7ffd3a4832d90e185be9d234b3d022f276db113767a6fcb0c3c965c51c14d592',
    indexSha256: 'b37363024107a9aeca949a701837764fdfe96e17b0aedca1549e187573dc8df4',
  }).filter(r => r.evidence.section === 'discrepancies'));
  const omittedReview = applyOmittedPointerBoundaryReviews(omittedRows, cases, inventory, normalize);
  const changedOmitted = omittedReview.filter((r, i) => r !== omittedRows[i]);
  assert.equal(changedOmitted.length, 3); assert.equal(changedOmitted.reduce((n, r) => n + r.occurrences, 0), 222);
  omittedReview.forEach((r, i) => { assert.deepEqual(raw(r), raw(omittedRows[i])); if (!changedOmitted.includes(r)) assert.deepEqual(r, omittedRows[i]); });
  for (const row of changedOmitted) {
    const key = row.reviewedCases[0];
    const entry = cases.find(c => `${c.kind}:${c.family}@${c.profile}/${c.viewport.id}${c.state ? '/' + c.state : ''}` === key);
    const [r, a] = modalInventoryTrees(inventory, key);
    assert.deepEqual(proveOmittedPointerBoundary(entry, r, a, row.element), row.reviewEvidence.observations[0]);
    const altered = structuredClone(a); altered.rules.push({ selector: '#page', pointerEvents: 'none' });
    assert.throws(() => proveOmittedPointerBoundary(entry, r, altered, row.element));
    const native = structuredClone(r); native.nodes.find(n => n.parent === null).inline['pointer-events'] = { value: 'none', important: false };
    assert.throws(() => proveOmittedPointerBoundary(entry, native, a, row.element));
  }
  const overlayRows = ['dialog', 'bottom-sheet', 'tooltip'].flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: '7ffd3a4832d90e185be9d234b3d022f276db113767a6fcb0c3c965c51c14d592',
    indexSha256: 'b37363024107a9aeca949a701837764fdfe96e17b0aedca1549e187573dc8df4',
  }).filter(r => r.evidence.section === 'discrepancies'));
  const overlayReview = applyOverlayPointerPolicyReviews(overlayRows, cases, inventory, normalize);
  const changedOverlays = overlayReview.filter((r, i) => r !== overlayRows[i]);
  assert.equal(changedOverlays.length, 10); assert.equal(changedOverlays.reduce((n, r) => n + r.occurrences, 0), 285);
  overlayReview.forEach((r, i) => { assert.deepEqual(raw(r), raw(overlayRows[i])); if (!changedOverlays.includes(r)) assert.deepEqual(r, overlayRows[i]); });
  for (const row of changedOverlays) {
    const key = row.reviewedCases[0];
    const entry = cases.find(c => `${c.kind}:${c.family}@${c.profile}/${c.viewport.id}${c.state ? '/' + c.state : ''}` === key);
    const [r, a] = modalInventoryTrees(inventory, key);
    const proof = proveOverlayPointerPolicy(entry, r, a, row.element);
    assert.deepEqual(proof, row.reviewEvidence.observations[0]);
    assert.equal(proof.modalScopeCauseProven, false);
    const altered = structuredClone(a); altered.rules.push({ selector: '#page', pointerEvents: 'none' });
    assert.throws(() => proveOverlayPointerPolicy(entry, r, altered, row.element));
    const native = structuredClone(r);
    const paneIndex = proof.trace.referencePath.find(n => n.node === proof.nativePickingPane)
      .rules.find(r => r.active && r.selector === '.cdk-overlay-pane').index;
    const pane = native.rules[paneIndex];
    pane.declarations['pointer-events'].value = 'none';
    assert.throws(() => proveOverlayPointerPolicy(entry, native, a, row.element));
  }
  const tabReview = applyTabPointerBoundaryReviews(omittedRows, cases, inventory, normalize);
  const changedTabs = tabReview.filter((r, i) => r !== omittedRows[i]);
  assert.equal(changedTabs.length, 2); assert.equal(changedTabs.reduce((n, r) => n + r.occurrences, 0), 140);
  tabReview.forEach((r, i) => { assert.deepEqual(raw(r), raw(omittedRows[i])); if (!changedTabs.includes(r)) assert.deepEqual(r, omittedRows[i]); });
  for (const row of changedTabs) {
    const key = row.reviewedCases[0];
    const entry = cases.find(c => `${c.kind}:${c.family}@${c.profile}/${c.viewport.id}${c.state ? '/' + c.state : ''}` === key);
    const [r, a] = modalInventoryTrees(inventory, key), proof = proveTabPointerBoundary(entry, r, a, row.element);
    assert.deepEqual(proof, row.reviewEvidence.observations[0]);
    const native = structuredClone(r), ruleIndex = proof.trace.referencePath[2].rules.find(r => r.selector === '.mat-mdc-tab .mdc-tab__content').index;
    native.rules[ruleIndex].declarations['pointer-events'].value = 'none';
    assert.throws(() => proveTabPointerBoundary(entry, native, a, row.element));
    const altered = structuredClone(a); altered.rules.push({ selector: '#page', pointerEvents: 'none' });
    assert.throws(() => proveTabPointerBoundary(entry, r, altered, row.element));
  }
  const population = [changed, badges, changedDisabled, changedSlider, changedOmitted, changedOverlays, changedTabs].flat();
  assert.equal(population.length, 23); assert.equal(population.reduce((n, r) => n + r.occurrences, 0), 824);
  assert.equal(new Set(population.map(r => `${r.family}/${r.element}/${r.property}`)).size, 23);
});
