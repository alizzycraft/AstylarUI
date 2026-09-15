import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { collectFieldHostInitialStyleInputs as collect, classifyFieldHostInitialStyleInput as classify,
  fieldHostInitialStyleValues, fieldHostInitialStyleAttribution } from './field-host-initial-style-evidence.mjs';

const index = JSON.parse(readFileSync('docs/material-field-host-typography-audit.json'));
const bytes = readFileSync(index.capture.file);
const hash = value => createHash('sha256').update(value).digest('hex');
assert.equal(hash(bytes), index.capture.sha256);
const raw = JSON.parse(bytes);
const selected = raw.results.find(e => e.family === 'autocomplete' && e.profile === 'light' && e.viewport.id === 'desktop');
assert.ok(selected);
// Only the three typography mapping tokens need canonicalization here. Preserve
// every other raw field; this does not infer candidate computed values.
const canonical = value => ({ ...value, fontFamily: value.fontFamily?.toLowerCase().replaceAll(' ', '').replaceAll('"', '') });
const inventory = collectFullTreeInventory([{ ...selected, kind: 'static' }]);
assert.deepEqual(inventory.errors, []);
const scalar = selected.styleInputs.find(i => i.id === 'autocomplete-primary');

test('field host initial-style review preserves raw omissions and limits its claim to observation stages', () => {
  const before = JSON.stringify(inventory), proofs = collect(inventory, canonical);
  assert.equal(proofs.length, 8);
  assert.deepEqual(proofs.map(p => p.property).sort(), Object.keys(fieldHostInitialStyleValues).sort());
  for (const proof of proofs) {
    const result = classify(scalar, proof.property, proof.values.reference, undefined, proof);
    assert.equal(result?.attribution, fieldHostInitialStyleAttribution, proof.property);
    assert.equal(result.classification, 'parity-harness-defect');
    assert.equal(proof.values.candidateLocalDeclaration, '<omitted>');
    for (const flag of ['computedCandidateVerified', 'descendantConsumersVerified', 'finalRasterVerified']) assert.equal(proof[flag], false);
  }
  assert.equal(JSON.stringify(inventory), before);
});

test('field host initial-style review rejects ancestry requests, unknown selectors and incomplete evidence', () => {
  const mutations = [
    i => { i.errors.push({ case: i.cases[0].case, error: 'incomplete' }); },
    i => { i.cases.push(structuredClone(i.cases[0])); },
    i => { i.cases.find(c => c.side === 'astylar').resolvedStyleRevision = -1; },
    i => { i.variants.find(v => v.side === 'reference').ruleEvidenceComplete = false; },
    i => { i.variants.find(v => v.side === 'astylar').resolvedStyleSource = 'fixture'; },
    i => { i.variants.find(v => v.side === 'reference').nodes.find(n => n.attributes?.id === 'autocomplete-primary').parent = 'wrong'; },
    i => { i.variants.find(v => v.side === 'astylar').nodes.find(n => n.authored?.id === 'page').authored.style = { visibility: 'hidden' }; },
    i => { i.variants.find(v => v.side === 'reference').nodes.find(n => n.attributes?.id === 'autocomplete-root').attributes.style = 'word-spacing:2px'; },
    i => { const v = i.variants.find(v => v.side === 'astylar'); v.rules.push(i.rules.length); i.rules.push({ side: 'astylar', value: { selector: ':is(.field-shell)', whiteSpace: 'nowrap' } }); },
  ];
  for (const property of Object.keys(fieldHostInitialStyleValues)) {
    mutations.push(i => { const n = i.variants.find(v => v.side === 'reference').nodes.find(n => n.attributes?.id === 'autocomplete-primary'); i.styles[n.style].value[property] = 'changed'; });
    for (const stage of ['style', 'normalStyle', 'interactionStyle']) mutations.push(i => {
      const n = i.variants.find(v => v.side === 'astylar').nodes.find(n => n.authored?.id === 'autocomplete-primary');
      i.styles[n[stage]].value[property] = 'inherit';
    });
  }
  for (const [n, mutate] of mutations.entries()) { const changed = structuredClone(inventory); mutate(changed); assert.deepEqual(collect(changed, canonical), [], `mutation ${n}`); }
});

test('field host initial-style scalar join rejects changed stages and exaggerated claims', () => {
  for (const proof of collect(inventory, canonical)) {
    for (const change of [i => { i.id = 'wrong'; }, i => { i.reference[proof.property] = 'changed'; },
      i => { i.astylarInteractionResolvedStyle[proof.property] = 'inherit'; }, i => { delete i.astylarNormalResolvedStyle; },
      i => { i.astylarStructure.ownText = 'text'; }, i => { i.astylarResolvedStyleEvidenceVersion = 1; }]) {
      const input = structuredClone(scalar); change(input);
      assert.equal(classify(input, proof.property, proof.values.reference, undefined, proof), undefined);
    }
    for (const flag of ['computedCandidateVerified', 'descendantConsumersVerified', 'finalRasterVerified'])
      assert.equal(classify(scalar, proof.property, proof.values.reference, undefined, { ...proof, [flag]: true }), undefined);
  }
});

test('field host initial-style survey accounts for every original field case and scalar', t => {
  const families = new Set(index.groups.map(g => g.family));
  const entries = [...raw.results.map(e => ({ ...e, kind: 'static' })), ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => families.has(e.family));
  const pooled = collectFullTreeInventory(entries), proofs = collect(pooled, canonical);
  assert.deepEqual(pooled.errors, []);
  assert.equal(entries.length, 577); assert.equal(proofs.length, 4616);
  const expected = index.groups.flatMap(g => g.cases).sort();
  assert.deepEqual([...new Set(proofs.map(p => p.case))].sort(), expected);
  const byKey = new Map(proofs.map(p => [`${p.case}/${p.property}`, p]));
  assert.equal(byKey.size, 4616);
  for (const e of entries) {
    const key = `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? `/${e.state}` : ''}`;
    const input = e.styleInputs.find(i => i.id === `${e.family}-primary`);
    for (const property of Object.keys(fieldHostInitialStyleValues)) {
      const proof = byKey.get(`${key}/${property}`); assert.ok(proof);
      assert.equal(classify(input, property, proof.values.reference, input.astylar[property], proof)?.attribution, fieldHostInitialStyleAttribution, `${key}/${property}`);
    }
  }
  assert.equal(hash(readFileSync(index.capture.file)), index.capture.sha256);
  t.diagnostic(JSON.stringify({ cases: entries.length, propertyObservations: proofs.length, families: [...families].sort(), canonicalIntegration: false, computedCandidateVerified: false }));
});
