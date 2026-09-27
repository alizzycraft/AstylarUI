import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { applyControlStatePaintReview, proveControlStatePaint, controlStatePaintAttribution, cardSurfacePaintAttribution, opaqueSurfacePaintAttribution } from './control-state-paint-review.mjs';

test('control paint preserves owner boundaries and all 283 captured observations', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes), cases = [...original.results.map(e => ({ ...e, kind: 'static' })),
    ...original.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const snapshot = { generation: 'd25a9078972edf1884a4e56a7c17f4a7b3d249d3ed22933811f69daa4aafda9a',
    indexSha256: 'c1934e90c7ca80ff121da83a6871d10da201f798f37cdb92f8badce7c24529ad' };
  const rows = ['tabs', 'card', 'dialog', 'toolbar', 'grid-list', 'button-toggle'].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, snapshot))
    .filter(r => r.evidence.section === 'discrepancies');
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []);
  const result = applyControlStatePaintReview(rows, cases, inventory, normalize);
  const reviewed = result.filter(r => [controlStatePaintAttribution, cardSurfacePaintAttribution, opaqueSurfacePaintAttribution].includes(r.attribution));
  assert.equal(reviewed.length, 46); assert.equal(reviewed.reduce((n, r) => n + r.occurrences, 0), 283);
  const observations = reviewed.flatMap(r => r.reviewEvidence.observations);
  const tabs = observations.filter(o => o.element.startsWith('tab-'));
  assert.deepEqual(['0', '0.04', '0.12'].map(opacity => tabs.filter(o => o.nativeLayerOpacity === opacity).length), [8, 26, 8]);
  const cancel = observations.filter(o => o.element === 'dialog-cancel');
  assert.deepEqual(['0.08', '0.12'].map(opacity => cancel.filter(o => o.nativeLayerOpacity === opacity).length), [3, 5]);
  assert.equal(observations.filter(o => o.element === 'card-open').length, 24);
  assert.equal(observations.filter(o => o.element === 'card-primary').length, 13);
  const toolbar = observations.filter(o => o.element === 'toolbar-action');
  assert.equal(toolbar.length, 24); assert.ok(toolbar.every(o => o.candidateAuthoredRuleProjectionGaps.length === 1));
  assert.equal(toolbar.filter(o => o.candidateMatchedStateRules.length === 2).length, 8);
  assert.equal(observations.filter(o => o.nativeOwnPaintRequestAbsent).length, 172);
  const metadata = new Set(['classification', 'attribution', 'recommendedOwner', 'justification', 'reviewEvidence', 'reviewedCases']);
  const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !metadata.has(key)));
  for (let i = 0; i < rows.length; i++) {
    assert.deepEqual(raw(result[i]), raw(rows[i]));
    if (!reviewed.includes(result[i])) assert.deepEqual(result[i], rows[i]);
    else assert.equal(result[i].reviewEvidence.originalRowSha256, hash(JSON.stringify(rows[i])));
  }
  for (const element of ['tab-activity', 'card-open', 'dialog-cancel', 'card-primary', 'toolbar-action', 'grid-tile-one', 'button-toggle-primary']) {
    const observation = observations.find(o => o.element === element);
    const entry = cases.find(e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === observation.case);
    const input = entry.styleInputs.find(i => i.id === element);
    const [r, a] = modalInventoryTrees(inventory, observation.case);
    const altered = structuredClone(a);
    altered.nodes.find(n => n.key === observation.astylarNode).resolvedStyle.background = '#000000';
    assert.throws(() => proveControlStatePaint(entry, input, r, altered, normalize));
    const changedRules = structuredClone(a);
    const selector = element === 'card-primary' ? '.material-card' : observation.candidatePaintRequest?.selector ?? observation.candidateMatchedStateRules[0].selector;
    changedRules.rules.find(rule => rule.selector === selector).background = '#000000';
    assert.throws(() => proveControlStatePaint(entry, input, r, changedRules, normalize));
    if (observation.nativeLayer) {
      const changedNative = structuredClone(r);
      const layer = changedNative.nodes.find(n => n.key === observation.nativeLayer);
      changedNative.styles[layer.pseudoElements.find(p => p.pseudo === '::before').style].opacity = '0.5';
      assert.throws(() => proveControlStatePaint(entry, input, changedNative, a, normalize));
    }
    if (observation.nativeOwnPaintRequestAbsent) {
      const changedNative = structuredClone(r);
      changedNative.nodes.find(n => n.key === observation.referenceNode).inline.background = { value: 'white', important: false };
      assert.throws(() => proveControlStatePaint(entry, input, changedNative, a, normalize));
    }
  }
  const incomplete = structuredClone(rows), changedIndex = rows.findIndex(r => r.element === reviewed[0].element && r.property === 'backgroundColor' && r.attribution === 'unresolved');
  incomplete[changedIndex].occurrences++;
  assert.throws(() => applyControlStatePaintReview(incomplete, cases, inventory, normalize));
});
