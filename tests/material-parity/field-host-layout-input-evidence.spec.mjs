import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import test from 'node:test';
import { loadFieldHostLayoutEvidence, buildFieldHostLayoutReport } from '../../scripts/audit-material-field-host-layout-inputs.mjs';
import { inspectFieldHostLayout, collectFieldHostLayoutInputs, fieldHostLayoutCaseKey } from './field-host-layout-input-evidence.mjs';

let loaded;
const evidence = () => loaded ??= loadFieldHostLayoutEvidence();
test('all original field hosts retain layout request differences even when static measured boxes match', () => {
  const data = evidence(), report = buildFieldHostLayoutReport(data);
  assert.equal(report.caseCount, 577);
  assert.equal(report.groupCount, 72);
  assert.equal(report.propertyObservations, 4616);
  assert.equal(report.measuredCases, 72);
  assert.equal(report.geometryGapCases, 505);
  assert.deepEqual([...new Set(report.groups.map(g => g.family))].sort(), ['autocomplete', 'datepicker', 'form-field', 'input', 'select', 'timepicker']);
  assert.equal(report.groups.filter(g => g.disposition === 'different-host-layout-request').length, 54);
  assert.equal(report.groups.filter(g => g.disposition === 'same-percentage-request-compared-at-different-stages').length, 18);
  for (const p of data.proofs) {
    assert.equal(p.children.reference.length, 2);
    assert.ok(p.children.reference.every(c => c.computed.position === 'relative'));
    assert.ok(p.children.astylar.every(c => c.comparison.position === 'absolute'));
    for (const v of p.properties) for (const flag of ['inputEquivalent', 'computedCandidateVerified', 'rendererCauseProven']) assert.equal(v[flag], false);
    if (p.geometry.status === 'measured-original-static-box') {
      const { expected, actual } = p.geometry.evidence;
      assert.equal(actual.height, expected.height);
      assert.equal(actual.width, expected.width);
      const height = p.properties.find(p => p.property === 'height');
      assert.ok([2, 6].includes(parseFloat(height.candidateAuthored) - actual.height));
    }
  }
  assert.ok(isDeepStrictEqual(report, JSON.parse(readFileSync('docs/material-field-host-layout-inputs.json'))), 'complete saved survey must replay from original scalar/tree/geometry evidence');
});

test('layout survey rejects altered declarations, observation stages, identity, coverage and geometry', () => {
  const data = evidence(), p = data.proofs[0];
  const originalInput = data.entries.find(e => fieldHostLayoutCaseKey(e) === p.case).styleInputs.find(i => i.id === p.element);
  const make = () => ({ base: { ...structuredClone(p), property: 'fontFamily' }, input: structuredClone(originalInput) });
  const changes = [
    ({ base }) => { base.referencePath[2].rules.find(r => r.selector === '.mat-mdc-form-field').declarations.display.value = 'block'; },
    ({ base }) => { base.referencePath[2].rules[0].declarations.width.value = '720px'; },
    ({ base }) => { base.referencePath[2].rules[0].active = false; },
    ({ base }) => { base.referencePath[2].inline.height = { value: '76px', important: false }; },
    ({ base }) => { base.referencePath[2].rules[0].declarations['inline-size'] = { value: '720px', important: false }; },
    ({ base }) => { base.candidatePath[2].rules[0].declarations.display = 'inline-flex'; },
    ({ base }) => { base.candidatePath[2].rules.push({ selector: ':is(.field-shell)', declarations: { height: '76px' } }); },
    ({ base }) => { base.candidatePath[2].rules[0].declarations.transition = 'all 1s'; },
    ({ base }) => { base.candidatePath[2].authored.style = { height: '76px' }; },
    ({ base }) => { base.candidatePath[2].authored.attributes = { style: 'height:76px' }; },
    ({ input }) => { input.reference.height = '78px'; },
    ({ input }) => { delete input.reference.width; },
    ({ input }) => { input.referenceAuthored[0].active = false; },
    ({ input }) => { input.astylar.height = '76px'; },
    ({ input }) => { input.astylarNormalResolvedStyle.minWidth = '0px'; },
    ({ input }) => { input.astylarInteractionResolvedStyle.flexDirection = 'column'; },
    ({ input }) => { input.astylarResolvedStyleEvidenceVersion = 1; },
    ({ input }) => { input.id = 'other-primary'; },
    ({ input }) => { input.referenceStructure.type = 'div'; },
    ({ input }) => { input.astylarStructure.type = 'button'; },
  ];
  changes.forEach((change, i) => { const altered = make(); change(altered); assert.throws(() => inspectFieldHostLayout(altered.base, altered.input), `mutation ${i} must be rejected`); });
  assert.throws(() => collectFieldHostLayoutInputs(data.inventory, [...data.entries, data.entries[0]]), /duplicate original case/);
  assert.throws(() => collectFieldHostLayoutInputs(data.inventory, data.entries.slice(1)), /every original field-host case/);
  const missingGeometry = data.entries.map((e, i) => i ? e : { ...e, geometry: { elements: [] } });
  assert.throws(() => collectFieldHostLayoutInputs(data.inventory, missingGeometry), /static measurement unexpectedly missing/);
  const brokenGeometry = data.entries.map((e, i) => i ? e : structuredClone(e));
  delete brokenGeometry[0].geometry.elements.find(g => g.id === p.element).actual.height;
  assert.throws(() => collectFieldHostLayoutInputs(data.inventory, brokenGeometry), /incomplete measured geometry/);
});
