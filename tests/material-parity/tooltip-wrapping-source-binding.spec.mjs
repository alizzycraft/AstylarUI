import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collectTooltipWrappingInputs, classifyTooltipWrappingInput, tooltipWrappingAttribution,
  validateTooltipWrappingInputs, validateTooltipWrappingClassifications } from './tooltip-wrapping-source-binding.mjs';
import { inspectTooltipWrappingInput } from './tooltip-wrapping-input-evidence.mjs';

const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const raw = JSON.parse(readFileSync(parityPath));
const evidence = collectTooltipWrappingInputs(raw, { parityPath });
// Identity callbacks exercise binding/classification only. Integration must
// separately prove the production canonicalizer and classification precedence.
const canonical = value => ({ ...value }), equivalent = (_p, a, b) => a === b;
function rowsOf(source) {
  const rows = new Map();
  for (const o of source.observations) for (const p of o.proof.properties) {
    const r = o.input.reference[p.property], a = o.input.astylar[p.property];
    const c = classifyTooltipWrappingInput(o.input, p.property, r, a, o, canonical); assert.ok(c);
    if (!rows.has(p.property)) rows.set(p.property, { family: 'tooltip', element: o.element, property: p.property,
      reference: r, astylar: a, classification: c.classification, attribution: c.attribution,
      recommendedOwner: c.owner, justification: c.justification, reviewEvidence: c.reviewEvidence,
      reviewedCases: [], cases: [], states: [], occurrences: 0 });
    const row = rows.get(p.property); row.reviewedCases.push(o.case); row.occurrences++;
    if (row.cases.length < 12) row.cases.push(o.case);
    if (!row.states.includes(o.state)) row.states.push(o.state);
  }
  return [...rows.values()];
}

test('tooltip wrapping binds the complete original family population and all 36 observed differences', () => {
  assert.equal(evidence.binding.status, 'bound');
  assert.equal(evidence.captures.length, [...raw.results, ...raw.interactions].filter(e => e.family === 'tooltip').length);
  assert.equal(evidence.observations.length, 18);
  assert.equal(evidence.observations.flatMap(o => o.proof.properties).length, 36);
  assert.ok(evidence.observations.every(o => ['hover', 'held'].includes(o.state)));
  assert.deepEqual(validateTooltipWrappingInputs(evidence), []);
  const reviewed = JSON.parse(readFileSync('docs/material-remaining-overlay-ancestry-review.json'));
  const keys = reviewed.groups.find(g => g.element === 'tooltip-popup' && g.property === 'whiteSpace').variants.flatMap(v => v.cases);
  assert.deepEqual(evidence.observations.map(o => o.case).sort(), keys.sort());
});

test('classification covers exactly the original states and retains non-equivalence obligations', () => {
  const rows = rowsOf(evidence); assert.equal(rows.length, 2);
  assert.ok(rows.every(r => r.occurrences === 18 && r.attribution === tooltipWrappingAttribution));
  assert.deepEqual(validateTooltipWrappingClassifications(evidence, rows, canonical, equivalent), []);
  for (const row of rows) for (const flag of ['inputEquivalent', 'candidateComputedVerified', 'originalVisualSymptomCauseProven', 'finalRasterVerified'])
    assert.equal(row.reviewEvidence[flag], false);
  const mutations = [rs => rs.pop(), rs => rs[0].reviewedCases.pop(), rs => { rs[0].states = []; },
    rs => { rs[0].astylar = 'invented'; }, rs => { rs[0].reviewEvidence.finalRasterVerified = true; },
    rs => { rs[0].recommendedOwner = 'invented'; }, rs => { rs[0].reviewedCases[1] = rs[0].reviewedCases[0]; },
    rs => { rs[0].justification = 'different claim'; }, rs => { rs[0].classification = 'equivalent-representation'; }];
  for (const mutate of mutations) { const copy = structuredClone(rows); mutate(copy);
    assert.ok(validateTooltipWrappingClassifications(evidence, copy, canonical, equivalent).length); }
});

test('source binding rejects unbound input and caller-selected or changed original populations', () => {
  assert.equal(collectTooltipWrappingInputs(raw).binding.status, 'unbound');
  const index = raw.interactions.findIndex(e => e.family === 'tooltip');
  const removed = { ...raw, interactions: raw.interactions.filter((_e, i) => i !== index) };
  assert.equal(collectTooltipWrappingInputs(removed, { parityPath }).binding.status, 'invalid');
  const altered = { ...raw, interactions: [...raw.interactions] };
  altered.interactions[index] = { ...raw.interactions[index], state: 'invented' };
  assert.equal(collectTooltipWrappingInputs(altered, { parityPath }).binding.status, 'invalid');
  assert.equal(collectTooltipWrappingInputs(raw, { parityPath: 'package.json' }).binding.status, 'invalid');
});

test('source replay rejects retained-evidence removal, altered traces and overclaims', () => {
  const mutations = [e => { e.observations.pop(); e.captures.pop(); },
    e => { e.observations[0].proof.properties.pop(); },
    e => { e.observations[0].proof.finalRasterVerified = true; },
    e => { e.binding.sha256 = '0'.repeat(64); }];
  for (const mutate of mutations) { const copy = structuredClone(evidence); mutate(copy);
    assert.ok(validateTooltipWrappingInputs(copy).length); }
});

test('inspector preserves public wordWrap aliases and does not accept unrelated states or owners', () => {
  const o = evidence.observations[0], entry = evidence.captures.find(e =>
    `${e.kind}:tooltip@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === o.case);
  assert.ok(entry, 'use the exact original case rather than a representative theme/state');
  const reference = JSON.parse(readFileSync(entry.inputTrees.reference.file)), candidate = JSON.parse(readFileSync(entry.inputTrees.astylar.file));
  const input = entry.styleInputs.find(i => i.id === 'tooltip-popup');
  assert.equal(inspectTooltipWrappingInput({ ...entry, state: 'open' }, input, reference, candidate), undefined);
  assert.equal(inspectTooltipWrappingInput({ ...entry, family: 'dialog' }, input, reference, candidate), undefined);
  const mutated = structuredClone(input); mutated.reference.fontStyle = 'italic';
  assert.equal(inspectTooltipWrappingInput(entry, mutated, reference, candidate), undefined);
  const changed = structuredClone(candidate), scalar = structuredClone(input);
  const node = changed.nodes.find(n => n.key === o.proof.identity.candidateNode);
  for (const [stage, field] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'], ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
    node[stage].wordWrap = 'anywhere'; scalar[field].wordWrap = 'anywhere';
  }
  const proof = inspectTooltipWrappingInput(entry, scalar, reference, changed);
  assert.ok(proof); assert.deepEqual(proof.properties.map(p => p.property), ['whiteSpace']);
});

test('classification rejects changed scalar values and forged computed/raster claims', () => {
  const o = evidence.observations[0];
  assert.equal(classifyTooltipWrappingInput(o.input, 'whiteSpace', 'normal', 'normal', o, canonical), undefined);
  assert.equal(classifyTooltipWrappingInput(o.input, 'width', 'normal', 'nowrap', o, canonical), undefined);
  for (const flag of ['inputEquivalent', 'candidateComputedVerified', 'originalVisualSymptomCauseProven', 'finalRasterVerified']) {
    const copy = structuredClone(o); copy.proof[flag] = true;
    assert.equal(classifyTooltipWrappingInput(copy.input, 'whiteSpace', 'normal', 'nowrap', copy, canonical), undefined);
  }
});
