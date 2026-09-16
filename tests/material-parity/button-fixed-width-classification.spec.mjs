import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collectButtonFixedWidthInputs } from './button-fixed-width-source-binding.mjs';
import { classifyButtonFixedWidthInput, validateButtonFixedWidthClassifications,
  buttonFixedWidthAttribution } from './button-fixed-width-classification.mjs';
import { selectedButtonInputs } from './button-pill-radius-evidence.mjs';

const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const raw = JSON.parse(readFileSync(parityPath));
const evidence = collectButtonFixedWidthInputs(raw, { parityPath });
const inputs = new Map();
for (const [kind, entries] of [['static', raw.results], ['interaction', raw.interactions]])
  for (const e of entries) for (const input of selectedButtonInputs(e))
    inputs.set(JSON.stringify([`${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`, input.id]), input);
const inputOf = o => inputs.get(JSON.stringify([o.case, o.element]));
// Direct arithmetic diagnostic only. Production integration must separately
// exercise the unchanged actual normalizer and existing classifier precedence.
const canonical = style => ({ ...style, width: `${Math.round(parseFloat(style.width) * 1000) / 1000}px` });
const equivalent = (_property, r, a) => r === a;
function rowsOf() {
  const groups = new Map();
  for (const o of evidence.observations) {
    const input = inputOf(o), r = canonical(input.reference), a = canonical(input.astylar);
    const c = classifyButtonFixedWidthInput(input, 'width', r.width, a.width, o, canonical); assert.ok(c);
    if (equivalent('width', r.width, a.width)) continue;
    const key = JSON.stringify([o.family, o.element, r.width, a.width]);
    if (!groups.has(key)) groups.set(key, { family: o.family, element: o.element, property: 'width',
      reference: r.width, astylar: a.width, attribution: c.attribution, classification: c.classification,
      recommendedOwner: c.owner, justification: c.justification, reviewEvidence: c.reviewEvidence,
      reviewedCases: [], cases: [], states: [], occurrences: 0 });
    const row = groups.get(key); row.reviewedCases.push(o.case); row.occurrences++;
    if (row.cases.length < 12) row.cases.push(o.case);
    if (!row.states.includes(o.state)) row.states.push(o.state);
  }
  // Match the main report's group ordering, not the source capture's order.
  return [...groups.values()].sort((a, b) => a.family.localeCompare(b.family) ||
    a.element.localeCompare(b.element) || a.property.localeCompare(b.property));
}

test('button width attribution keeps all authoring owners while classifying only unequal scalars', () => {
  assert.equal(evidence.binding.status, 'bound');
  const rows = rowsOf(); assert.equal(rows.length, 8);
  assert.equal(rows.reduce((n, r) => n + r.occurrences, 0), 548);
  assert.ok(rows.every(r => r.attribution === buttonFixedWidthAttribution));
  assert.equal(evidence.groups.length, 9); assert.equal(evidence.observations.length, 600);
  assert.equal(evidence.observations.filter(o => o.element === 'core-primary').length, 52);
  assert.deepEqual(validateButtonFixedWidthClassifications(evidence, JSON.parse(JSON.stringify(rows)), canonical, equivalent), []);
});

test('button width attribution rejects detached values properties provenance composition and inflated claims', () => {
  const o = evidence.observations.find(o => o.element === 'button-primary'), input = inputOf(o);
  const r = canonical(input.reference).width, a = canonical(input.astylar).width;
  assert.equal(classifyButtonFixedWidthInput(input, 'height', r, a, o, canonical), undefined);
  assert.equal(classifyButtonFixedWidthInput(input, 'width', r, r, o, canonical), undefined);
  const changed = structuredClone(input); changed.astylar.width = r;
  assert.equal(classifyButtonFixedWidthInput(changed, 'width', r, r, o, canonical), undefined);
  const mutations = [v => { v.inputSha256 = '0'.repeat(64); }, v => { v.element = 'foreign'; },
    v => { v.proof.source = 'mesh-guess'; }, v => { v.proof.revision = -1; },
    v => { v.proof.referenceAuthoredWidth = r; }, v => { v.proof.candidateAuthoredWidth = r; },
    v => { v.proof.referenceLabel.ownText = 'invented'; }, v => { v.proof.candidateRules = []; }];
  for (const flag of ['inputEquivalent', 'candidateUsedLayoutVerified', 'originalRasterCauseProven',
    'structuralEquivalenceVerified', 'renderingEquivalent']) mutations.push(v => { v.proof[flag] = true; });
  for (const mutate of mutations) {
    const copy = structuredClone(o); mutate(copy);
    assert.equal(classifyButtonFixedWidthInput(input, 'width', r, a, copy, canonical), undefined);
  }
});

test('button width classification replay rejects incomplete rows and dropped scalar-matching authoring cases', () => {
  const rows = rowsOf();
  const mutations = [r => r.pop(), r => { r[0].reviewedCases.pop(); }, r => { r[0].cases = []; },
    r => { r[0].states = []; }, r => { r[0].occurrences++; }, r => { r[0].astylar = 'auto'; },
    r => { r[0].classification = 'equivalent-representation'; }, r => { r[0].recommendedOwner = 'core renderer'; },
    r => { r[0].reviewEvidence.renderingEquivalent = true; }, r => { r[0].family = 'other'; },
    r => { r[0].reviewedCases[1] = r[0].reviewedCases[0]; }, r => { r[0].justification = 'fixed and auto are equivalent'; }];
  for (const mutate of mutations) {
    const copy = structuredClone(rows); mutate(copy);
    assert.ok(validateButtonFixedWidthClassifications(evidence, copy, canonical, equivalent).length);
  }
  const noCore = structuredClone(evidence);
  noCore.observations = noCore.observations.filter(o => o.element !== 'core-primary');
  noCore.groups = noCore.groups.filter(g => g.element !== 'core-primary');
  assert.ok(validateButtonFixedWidthClassifications(noCore, rows, canonical, equivalent)
    .some(e => e.includes('scalar-matching owners')));
  const changed = structuredClone(evidence); changed.binding.sha256 = '0'.repeat(64);
  assert.ok(validateButtonFixedWidthClassifications(changed, rows, canonical, equivalent).length);
});
