import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { collectBoundFieldHostLayout, validateBoundFieldHostLayout, classifyFieldHostLayoutInput,
  validateFieldHostLayoutClassifications, fieldHostLayoutAttribution, fieldHostWidthAttribution } from './field-host-layout-source-binding.mjs';

const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const original = JSON.parse(readFileSync(file)), survey = JSON.parse(readFileSync('docs/material-field-host-layout-inputs.json'));
const options = { parityPath: file, collectInventory: collectFullTreeInventory };
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Isolated eight-property contract only. Production-normalizer/precedence proof
// is a separate integration obligation; this does not replace that gate.
const canonical = style => Object.fromEntries(Object.entries(style).map(([key, value]) => [key, value === '0px' ? '0' : value]));
let bound;
const evidence = () => bound ??= collectBoundFieldHostLayout(original, options);
const inputFor = o => [...original.results, ...original.interactions].find(e =>
  `${e.state ? 'interaction' : 'static'}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === o.case)
  .styleInputs.find(i => i.id === o.proof.element);

function classifiedRows(data) {
  const groups = new Map();
  for (const o of data.observations) {
    const input = inputFor(o), ref = canonical(input.reference), ast = canonical(input.astylar);
    for (const p of o.proof.properties) {
      const c = classifyFieldHostLayoutInput(input, p.property, ref[p.property], ast[p.property], o, canonical); assert.ok(c);
      const signature = JSON.stringify([o.family, input.id, p.property, ref[p.property], ast[p.property]]);
      if (!groups.has(signature)) groups.set(signature, { family: o.family, element: input.id, property: p.property,
        reference: ref[p.property], astylar: ast[p.property], classification: c.classification, attribution: c.attribution,
        recommendedOwner: c.owner, justification: c.justification, reviewEvidence: c.reviewEvidence,
        reviewedCases: [], occurrences: 0, cases: [], states: [] });
      const row = groups.get(signature); row.reviewedCases.push(o.case); row.occurrences++;
      if (row.cases.length < 12) row.cases.push(o.case);
      if (!row.states.includes(o.state)) row.states.push(o.state);
    }
  }
  return [...groups.values()].sort((a, b) => a.family.localeCompare(b.family) || a.element.localeCompare(b.element) || a.property.localeCompare(b.property));
}

test('field-host binder independently replays all original trees and preserves every selected and negative case', () => {
  const before = hash(original), data = evidence();
  assert.equal(data.binding.status, 'bound', data.binding.error);
  assert.equal(hash(original), before); assert.equal(data.binding.sha256, survey.capture.sha256);
  assert.equal(data.captures.length, 2311); assert.equal(data.observations.length, 577); assert.equal(data.groups.length, 72);
  assert.equal(data.captures.filter(c => c.selectedOwners.length === 0).length, 1734);
  assert.equal(data.observations.filter(o => o.proof.geometry.status === 'measured-original-static-box').length, 72);
  assert.equal(data.observations.filter(o => o.proof.geometry.status === 'original-capture-host-geometry-gap').length, 505);
  const proofs = new Map(survey.cases.map(c => [c.case, c.proofSha256]));
  for (const o of data.observations) assert.equal(o.proofSha256, proofs.get(o.case), 'full original proof digest, not a reconstructed scalar-only substitute');
  assert.deepEqual(validateBoundFieldHostLayout(data, options), []);
  const rows = classifiedRows(data);
  assert.equal(rows.filter(r => r.attribution === fieldHostLayoutAttribution).length, 54);
  assert.equal(rows.filter(r => r.attribution === fieldHostWidthAttribution).length, 18);
  assert.equal(rows.reduce((n, r) => n + r.occurrences, 0), 4616);
  assert.deepEqual(validateFieldHostLayoutClassifications(data, rows, canonical), []);
});

test('source binding rejects modified populations and proof mutations rather than laundering them into reviewed input', () => {
  const data = evidence();
  assert.equal(collectBoundFieldHostLayout(original).binding.status, 'unbound');
  const dropped = { ...original, results: original.results.slice(1) };
  assert.equal(collectBoundFieldHostLayout(dropped, options).binding.status, 'invalid');
  const duplicated = { ...original, interactions: [...original.interactions, original.interactions[0]] };
  assert.equal(collectBoundFieldHostLayout(duplicated, options).binding.status, 'invalid');
  const target = original.results.findIndex(e => e.family === 'form-field');
  const mutated = { ...original, results: original.results.map((e, i) => i === target ? structuredClone(e) : e) };
  mutated.results[target].styleInputs.find(i => i.id === 'form-field-primary').astylar.height = '76px';
  assert.equal(collectBoundFieldHostLayout(mutated, options).binding.status, 'invalid');
  for (const alter of [
    e => { e.observations[0].proof.properties[0].referenceAuthored = 'invented'; },
    e => { e.captures.pop(); },
    e => { e.observations.find(o => o.state !== 'static').proof.geometry = e.observations.find(o => o.state === 'static').proof.geometry; },
  ]) {
    const copy = structuredClone(data); alter(copy); assert.ok(validateBoundFieldHostLayout(copy, options).length);
  }
});

test('classification and coverage guards reject incorrect owners, values, case membership and equivalence upgrades', () => {
  const data = evidence(), o = data.observations[0], input = inputFor(o);
  const classify = (i, observation, ref = canonical(i.reference).minWidth, ast = canonical(i.astylar).minWidth) =>
    classifyFieldHostLayoutInput(i, 'minWidth', ref, ast, observation, canonical);
  const correct = classify(input, o); assert.equal(correct.classification, 'application-plugin-authoring-defect');
  assert.equal(correct.reviewEvidence.referenceAuthored, '0px'); assert.equal(correct.reviewEvidence.candidateAuthored, '<omitted>');
  for (const change of [
    p => { p.inputSha256 = 'wrong'; }, p => { p.proof.element = 'other'; },
    p => { p.proof.inputEquivalent = true; }, p => { p.proof.computedCandidateVerified = true; },
    p => { p.proof.originalRendererCauseProven = true; }, p => { p.proof.revision = -1; },
    p => { p.proof.properties.find(v => v.property === 'minWidth').rendererCauseProven = true; },
  ]) { const copy = structuredClone(o); change(copy); assert.equal(classify(input, copy), undefined); }
  assert.equal(classify(input, o, 'auto'), undefined);
  const changed = structuredClone(input); changed.astylarNormalResolvedStyle.minWidth = '0px';
  assert.equal(classify(changed, o), undefined);
  const rows = classifiedRows(data);
  for (const change of [
    r => { r.pop(); }, r => { r.push(r[0]); }, r => { r[0].reviewedCases.pop(); },
    r => { r[0].occurrences--; }, r => { r[0].states.reverse(); },
    r => { r[0].reviewEvidence.wholeElementInputEquivalent = true; },
    r => { r.find(x => x.property === 'minWidth').classification = 'equivalent-representation'; },
  ]) { const copy = structuredClone(rows); change(copy); assert.ok(validateFieldHostLayoutClassifications(data, copy, canonical).length); }
});
