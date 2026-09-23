import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { collectSliderInputBoxes, classifySliderInputBox, sliderInputBoxAttribution, validateSliderInputBoxes, validateSliderInputBoxClassifications } from './slider-input-box-source-binding.mjs';
import { hash, canonical, equivalent, withCapture, rowsOf } from './slider-input-box-test-support.mjs';
import { buildMaterialInputAudit, validateMaterialInputAudit } from './input-equivalence-audit.mjs';

test('slider box canonical integration uses production normalization without changing values or other rows', () => withCapture(({ raw, root, options }) => {
  const before = structuredClone(raw), unbound = buildMaterialInputAudit(raw, { root });
  const report = buildMaterialInputAudit(raw, options);
  const rows = report.discrepancies.filter(r => r.attribution === sliderInputBoxAttribution);
  assert.equal(rows.length, 14); assert.equal(rows.reduce((n, r) => n + r.occurrences, 0), 20);
  assert.ok(rows.some(r => r.property === 'paddingLeft' && r.reference === '0' && r.astylar === '8px'));
  assert.ok(rows.some(r => r.property === 'paddingLeft' && r.reference === '16px' && r.astylar === '8px'));
  assert.ok(rows.some(r => r.property === 'boxSizing' && r.reference === 'content-box' && r.astylar === undefined));
  assert.deepEqual(raw, before);
  const projection = r => [r.family, r.element, r.property, r.reference, r.astylar, r.occurrences, r.cases, r.states];
  assert.deepEqual(report.discrepancies.map(projection), unbound.discrepancies.map(projection));
  const keys = new Set(rows.map(r => JSON.stringify(projection(r))));
  assert.deepEqual(report.discrepancies.filter(r => !keys.has(JSON.stringify(projection(r)))),
    unbound.discrepancies.filter(r => !keys.has(JSON.stringify(projection(r)))));
  assert.ok(!validateMaterialInputAudit(report, { root, requireComplete: false }).some(e => e.includes('slider box')));
}, true));
test('slider box canonical validation rejects missing binding changed rows and false equivalence', () => withCapture(({ raw, root, options }) => {
  const original = buildMaterialInputAudit(raw, options);
  for (const mutate of [
    (r, d) => { delete r.sliderInputBoxes; },
    (r, d) => { r.sliderInputBoxes.captures = []; r.sliderInputBoxes.observations = []; },
    (r, d) => { r.discrepancies = r.discrepancies.filter(row => row !== d); },
    (r, d) => { d.attribution = 'unresolved'; },
    (r, d) => { d.classification = 'equivalent-representation'; },
    (r, d) => { d.reference = '8px'; },
    (r, d) => { d.reviewEvidence.inputEquivalent = true; },
    (r, d) => { r.discrepancies.push(structuredClone(d)); },
  ]) {
    const r = structuredClone(original); mutate(r, r.discrepancies.find(d => d.attribution === sliderInputBoxAttribution));
    assert.ok(validateMaterialInputAudit(r, { root, requireComplete: false }).some(e => e.includes('slider box')));
  }
}, true));
