import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { applyCustomOwnerBorderReviews, proveCustomOwnerBorder } from './custom-owner-border-review.mjs';

test('custom host initial colors retain all observations without claiming generated paint equivalence', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes), families = ['icon', 'slider', 'tabs', 'table', 'divider', 'progress-bar', 'progress-spinner'];
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })), ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => families.includes(e.family));
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []);
  const rows = families.flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, {
    generation: '8635694f2f111b71b50ed25ce0de8947ecb16baa3aada405163b6a8be5339f49',
    indexSha256: 'd0446d1c61bec60527c34459da6a28e4af1699793c50b38fef93846627cd6aca',
  })).filter(r => r.evidence.section === 'discrepancies');
  const reviewed = applyCustomOwnerBorderReviews(rows, cases, inventory, normalize), changed = reviewed.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 71); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 1696);
  const dividerTop = changed.filter(r => r.family === 'divider' && r.property === 'borderTopColor');
  assert.equal(dividerTop.length, 1); assert.equal(dividerTop[0].occurrences, 24);
  assert.equal(dividerTop[0].classification, 'application-plugin-authoring-defect');
  const tableRows = changed.filter(r => r.family === 'table');
  assert.equal(tableRows.length, 8); assert.equal(tableRows.reduce((n, r) => n + r.occurrences, 0), 208);
  assert.ok(tableRows.every(r => r.classification === 'application-plugin-authoring-defect'));
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  reviewed.forEach((r, i) => { assert.deepEqual(raw(r), raw(rows[i])); if (!changed.includes(r)) assert.deepEqual(r, rows[i]); });
  for (const family of families) {
    const row = changed.find(r => r.family === family && (family !== 'tabs' || r.element === 'tab-panel')), key = row.reviewedCases[0];
    const e = cases.find(e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === key);
    const [r, a] = modalInventoryTrees(inventory, key), proof = proveCustomOwnerBorder(e, r, a, normalize);
    assert.equal(proof.generatedChildPaintVerified, false);
    const native = structuredClone(r); native.nodes.find(n => n.key === proof.referenceNode).inline.border = { value: '0 solid currentcolor', important: false };
    assert.throws(() => proveCustomOwnerBorder(e, native, a, normalize));
    const candidate = structuredClone(a); candidate.rules.push({ selector: '#' + row.element, borderColor: 'currentcolor' });
    assert.throws(() => proveCustomOwnerBorder(e, r, candidate, normalize));
    const wrongType = structuredClone(a); wrongType.nodes.find(n => n.key === proof.astylarNode).authored.type = 'button';
    assert.throws(() => proveCustomOwnerBorder(e, r, wrongType, normalize));
    if (family.startsWith('progress-')) {
      assert.equal(proof.motionSettlementVerified, false);
      const changedMotion = structuredClone(r);
      const node = changedMotion.nodes.find(n => n.key === proof.referenceNode);
      const rule = node.rules.map(i => changedMotion.rules[i]).find(rule => rule.declarations['transition-property']);
      rule.declarations['transition-property'].value = 'all';
      assert.throws(() => proveCustomOwnerBorder(e, changedMotion, a, normalize));
      const changedSerialized = structuredClone(r);
      changedSerialized.rules[node.rules.find(i => changedSerialized.rules[i].declarations['transition-property'])].cssText += ' transition: border-color 250ms;';
      assert.throws(() => proveCustomOwnerBorder(e, changedSerialized, a, normalize));
    }
    if (family === 'divider') {
      const changedPaint = structuredClone(a);
      changedPaint.rules.find(rule => rule.selector === '.divider').background = '#7b757f';
      assert.throws(() => proveCustomOwnerBorder(e, r, changedPaint, normalize));
    }
    if (family === 'table') {
      const changedReset = structuredClone(r);
      const owner = changedReset.nodes.find(n => n.key === proof.referenceNode);
      const reset = owner.rules.map(i => changedReset.rules[i]).find(rule => rule.selector === '.mat-mdc-table');
      reset.declarations['border-top-color'].value = 'transparent';
      assert.throws(() => proveCustomOwnerBorder(e, changedReset, a, normalize));
      const missingWidth = structuredClone(a);
      delete missingWidth.rules.find(rule => rule.selector === '.material-table').borderWidth;
      assert.throws(() => proveCustomOwnerBorder(e, r, missingWidth, normalize));
    }
  }
  for (const element of ['tab-overview', 'tab-activity']) {
    const row = changed.find(r => r.element === element), key = row.reviewedCases[0];
    assert.equal(row.classification, 'parity-harness-defect');
    const e = cases.find(e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === key);
    const [r, a] = modalInventoryTrees(inventory, key);
    const proof = proveCustomOwnerBorder(e, r, a, normalize, element);
    assert.ok(proof.composition); assert.equal(proof.renderingEquivalent, false);
    const mutated = structuredClone(a);
    mutated.rules.push({ selector: '#' + element, borderColor: 'currentcolor' });
    assert.throws(() => proveCustomOwnerBorder(e, r, mutated, normalize, element));
    const native = structuredClone(r);
    native.nodes.find(n => n.key === proof.referenceNode).inline.border = { value: '0', important: false };
    assert.throws(() => proveCustomOwnerBorder(e, native, a, normalize, element));
  }
});
