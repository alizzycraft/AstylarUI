import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { proveOverlayOverflowRequests, applyOverlayOverflowRequests, validateOverlayOverflowRequests } from './overlay-overflow-observation.mjs';

test('overlay overflow review distinguishes three authored-axis groups from dialog computed X', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes);
  const cases = [...report.results.map(e => ({ ...e, kind: 'static' })),
    ...report.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => ['tooltip', 'dialog'].includes(e.family));
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const snapshot = { generation: '77595d08eb0f857cf058eb072074a433702f11e022dac2f1bfb666375d923752',
    indexSha256: 'd84236477a9da75dc58de0e5d3d48db58c98bab5232d746cdf5d88501ced2459' };
  const rows = ['tooltip', 'dialog'].flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, snapshot))
    .filter(row => row.evidence.section === 'discrepancies');
  const before = structuredClone(rows), applied = applyOverlayOverflowRequests(rows, cases, inventory, normalize);
  assert.deepEqual(rows, before); assert.equal(applied.length, rows.length);
  const changed = applied.filter((row, i) => row !== rows[i]);
  assert.equal(changed.length, 4); assert.equal(changed.reduce((sum, row) => sum + row.occurrences, 0), 100);
  for (const row of changed) {
    const computedOnly = row.element === 'dialog-panel' && row.property === 'overflowX';
    assert.equal(row.classification, computedOnly ? 'parity-harness-defect' : 'application-plugin-authoring-defect');
    assert.equal(row.occurrences, row.family === 'tooltip' ? 18 : 32);
    assert.equal(row.reviewedCases.length, row.occurrences); assert.equal(new Set(row.reviewedCases).size, row.occurrences);
    for (const proof of row.reviewEvidence.observations) {
      assert.equal(proof.explicitAxes.includes(row.property), !computedOnly);
      assert.equal(proof.computedOnlyAxes.includes(row.property), computedOnly);
      for (const flag of ['inputEquivalent', 'candidateComputedOverflowVerified', 'clippingVerified',
        'scrollingVerified', 'renderingEquivalent', 'originalRasterCauseProven']) assert.equal(proof[flag], false);
    }
    const restored = { ...row };
    for (const key of ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']) delete restored[key];
    Object.assign(restored, row.reviewEvidence.priorMetadata);
    assert.deepEqual(restored, rows.find(original => original.id === row.id));
  }
  for (const [family, element] of [['tooltip', 'tooltip-popup'], ['dialog', 'dialog-panel']]) {
    const entry = cases.find(e => e.family === family && e.styleInputs.some(i => i.id === element) &&
      (family !== 'tooltip' || e.state === 'hover'));
    const key = `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    const trees = modalInventoryTrees(inventory, key), proof = proveOverlayOverflowRequests(entry, ...trees, element);
    for (const mutate of [
      ([r]) => { r.ruleEvidenceComplete = false; },
      ([r]) => { r.nodes.find(n => n.key === proof.referenceNode).inline.overflow = { value: 'auto' }; },
      ([r]) => { const owner = r.nodes.find(n => n.key === proof.referenceNode); owner.rules.push(r.rules.length);
        r.rules.push({ active: true, cssText: '', conditions: [], selector: 'extra', declarations: { 'overflow-x': { value: 'auto', important: false } } }); },
      ([, a]) => { a.rules.push({ selector: '#' + element, overflowBlock: 'hidden' }); },
      ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).normalResolvedStyle.overflowY = 'auto'; },
      ([r]) => { r.styles[r.nodes.find(n => n.key === proof.referenceNode).style].overflowX = 'visible'; },
    ]) {
      const altered = structuredClone(trees); mutate(altered);
      assert.throws(() => proveOverlayOverflowRequests(entry, ...altered, element));
    }
  }
  const validate = values => validateOverlayOverflowRequests(values, rows, cases, inventory, normalize);
  assert.deepEqual(validate(applied), []);
  const forged = structuredClone(applied);
  forged.find(row => row.attribution === 'reviewed-dialog-overflow-computed-axis').reviewEvidence.observations[0].explicitAxes.push('overflowX');
  assert.ok(validate(forged).length);
});

test('native computed horizontal auto does not imply a horizontal auto declaration', async t => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    t.diagnostic(`Browser ${browser.version()}; native CSSOM sensitivity only, not Astylar parity`);
    const page = await browser.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
    await page.setContent('<div id="box" style="width:100px;height:100px"><div style="width:200px;height:200px"></div></div>');
    const observations = await page.evaluate(() => {
      const box = document.getElementById('box');
      return ['', 'overflow-y:auto', 'overflow-x:visible;overflow-y:auto', 'overflow-x:clip;overflow-y:auto',
        'overflow:hidden'].map(request => {
        box.style.cssText = `width:100px;height:100px;${request}`;
        const style = getComputedStyle(box);
        return { authoredX: box.style.overflowX, authoredY: box.style.overflowY, x: style.overflowX, y: style.overflowY };
      });
    });
    assert.deepEqual(observations, [
      { authoredX: '', authoredY: '', x: 'visible', y: 'visible' },
      { authoredX: '', authoredY: 'auto', x: 'auto', y: 'auto' },
      { authoredX: 'visible', authoredY: 'auto', x: 'auto', y: 'auto' },
      { authoredX: 'clip', authoredY: 'auto', x: 'hidden', y: 'auto' },
      { authoredX: 'hidden', authoredY: 'hidden', x: 'hidden', y: 'hidden' },
    ]);
  } finally { await browser.close(); }
});
