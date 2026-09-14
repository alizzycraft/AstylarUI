import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { buildMaterialInputAudit, validateMaterialInputAudit } from './input-equivalence-audit.mjs';
import { collectFieldHostWeightTrackingInputs as collect, classifyFieldHostWeightTrackingInput as classify,
  fieldHostWeightTrackingAttribution, fieldHostWeightTrackingProperties } from './field-host-weight-tracking-evidence.mjs';

const index = JSON.parse(readFileSync('docs/material-field-host-typography-audit.json'));
const bytes = readFileSync(index.capture.file);
assert.equal(createHash('sha256').update(bytes).digest('hex'), index.capture.sha256);
const raw = JSON.parse(bytes);
const selected = raw.results.find(e => e.family === 'autocomplete' && e.profile === 'light' && e.viewport.id === 'desktop');
assert.ok(selected);
const auditOptions = { root: process.cwd(), supplementalRoot: 'artifacts/material-parity/supplemental-current-ancestry-audit' };
const seed = buildMaterialInputAudit({ ...raw, results: [selected], interactions: [] }, auditOptions);
const base = seed.fieldHostTypographyInputs.find(p => p.property === 'fontFamily');
const scalar = selected.styleInputs.find(i => i.id === base.element);
const clone = () => structuredClone(base);

test('field host weight/tracking independently preserves exact token requests and omission stages', () => {
  const before = JSON.stringify(base), proofs = collect([base]);
  assert.equal(proofs.length, 2);
  for (const p of proofs) {
    assert.equal(p.values.reference, fieldHostWeightTrackingProperties[p.property].reference);
    assert.equal(p.values.candidateLocalDeclaration, '<omitted>');
    assert.equal(p.classification, 'application-plugin-authoring-defect');
    for (const flag of ['computedCandidateVerified', 'themeTokenOriginVerified', 'descendantConsumersVerified', 'finalRasterVerified']) assert.equal(p[flag], false);
    assert.equal(classify(scalar, p.property, p.values.reference, undefined, p).attribution, fieldHostWeightTrackingAttribution);
  }
  assert.equal(JSON.stringify(base), before);
  assert.deepEqual(collect([base, base]), [], 'duplicate base case must not double count');
  assert.deepEqual(collect(null), []);
});

test('field host weight/tracking rejects conflicting requests, malformed evidence and changed ancestry', () => {
  const mutations = [
    p => { p.source = 'fixture'; }, p => { p.revision = -1; }, p => { p.family = 'chips'; },
    p => { p.element = 'other'; }, p => { p.case = 'static:other@light/desktop'; }, p => { p.finalRasterVerified = true; },
    p => { p.referencePath.pop(); }, p => { p.candidatePath.pop(); },
    p => { p.referencePath[2].parent = 'wrong'; }, p => { p.candidatePath[2].parent = 'wrong'; },
    p => { p.referencePath[0].attributes.class = []; }, p => { p.candidatePath[2].authored.class = []; },
    p => { p.referencePath[2].computed.fontWeight = '500'; }, p => { p.referencePath[2].computed.letterSpacing = 'normal'; },
    p => { p.referencePath[2].rules.find(r => r.selector === '.mat-mdc-form-field').declarations['font-weight'].important = true; },
    p => { delete p.referencePath[2].rules.find(r => r.selector === '.mat-mdc-form-field').declarations['letter-spacing']; },
    p => { p.referencePath[2].rules.find(r => r.selector === '.mat-mdc-form-field').declarations['font-weight'].value = '400'; },
    p => { p.referencePath[2].rules[0].active = false; }, p => { delete p.referencePath[2].rules[0].conditions; },
    p => { p.referencePath[0].inline.fontWeight = { value: '700', important: false }; },
    p => { p.referencePath[1].attributes.style = 'letter-spacing:2px'; },
    p => { p.referencePath[1].attributes.style = 'f\\6fnt-weight:700'; },
    p => { p.referencePath[1].rules.push({ selector: 'section', active: true, conditions: [], declarations: { 'font-weight': { value: '700', important: false } } }); },
    p => { p.candidatePath[0].authored.style = { fontWeight: '700' }; },
    p => { p.candidatePath[2].authored.attributes = { style: 'letter-spacing:2px' }; },
    p => { p.candidatePath[2].rules.push({ selector: ':is(.field-shell)', declarations: { letterSpacing: '1px' } }); },
    p => { p.candidatePath[2].rules = []; }, p => { p.candidatePath[2].authored.textContent = 'text'; },
  ];
  for (const stage of ['normal', 'comparison', 'effective']) for (const property of ['fontWeight', 'letterSpacing', 'font', 'all', 'transition']) {
    mutations.push(p => { p.candidatePath[2][stage][property] = 'inherit'; });
  }
  for (const [i, mutate] of mutations.entries()) { const p = clone(); mutate(p); assert.deepEqual(collect([p]), [], `mutation ${i}`); }
});

test('field host weight/tracking scalar joins reject mismapped values and expanded claims', () => {
  for (const proof of collect([base])) {
    for (const mutate of [
      i => { i.id = 'other'; }, i => { i.reference[proof.property] = 'other'; },
      i => { i.astylar[proof.property] = proof.values.reference; }, i => { delete i.astylarNormalResolvedStyle; },
      i => { i.astylarInteractionResolvedStyle.all = 'initial'; }, i => { i.astylarResolvedStyleEvidenceVersion = 1; },
      i => { i.referenceStructure.type = 'div'; }, i => { i.astylarStructure.ownText = 'text'; },
      i => { i.referenceAuthored[0].active = false; },
      i => { i.astylarAuthored.push({ selector: '.field-shell', declarations: { font: 'inherit' } }); },
    ]) { const input = structuredClone(scalar); mutate(input); assert.equal(classify(input, proof.property, proof.values.reference, undefined, proof), undefined); }
    for (const flag of ['computedCandidateVerified', 'themeTokenOriginVerified', 'descendantConsumersVerified', 'finalRasterVerified']) {
      assert.equal(classify(scalar, proof.property, proof.values.reference, undefined, { ...proof, [flag]: true }), undefined);
    }
  }
});

test('field host weight/tracking report validation replays inventory and rejects forged claims', () => {
  assert.equal(seed.fieldHostWeightTrackingInputs.length, 2);
  const classified = seed.discrepancies.filter(d => d.attribution === fieldHostWeightTrackingAttribution);
  assert.equal(classified.length, 2);
  assert.deepEqual(validateMaterialInputAudit(seed, { requireComplete: false }), []);
  for (const mutate of [
    a => { a.fieldHostWeightTrackingInputs[0].computedCandidateVerified = true; },
    a => { a.fieldHostWeightTrackingInputs[0].themeTokenOriginVerified = true; },
    a => { a.fieldHostWeightTrackingInputs[0].candidatePath[2].normal.fontWeight = '400'; },
    a => { a.fieldHostWeightTrackingInputs.pop(); },
    a => { a.discrepancies.find(d => d.attribution === fieldHostWeightTrackingAttribution).classification = 'equivalent-representation'; },
    a => { a.discrepancies.find(d => d.attribution === fieldHostWeightTrackingAttribution).reviewedCases = []; },
    a => { a.discrepancies.find(d => d.attribution === fieldHostWeightTrackingAttribution).reference = '500'; },
  ]) {
    const changed = structuredClone(seed); mutate(changed);
    assert.ok(validateMaterialInputAudit(changed, { requireComplete: false }).some(e => e.includes('field host weight/tracking')));
  }
});

test('field host weight/tracking covers every captured host and joins all raw scalars', t => {
  const expectedCases = index.groups.flatMap(g => g.cases).sort();
  assert.equal(expectedCases.length, 577); assert.equal(new Set(expectedCases).size, 577);
  const families = new Set(index.groups.map(g => g.family));
  const filtered = { ...raw, results: raw.results.filter(e => families.has(e.family)), interactions: raw.interactions.filter(e => families.has(e.family)) };
  const audit = buildMaterialInputAudit(filtered, auditOptions), proofs = collect(audit.fieldHostTypographyInputs);
  assert.equal(audit.fieldHostTypographyInputs.length, 1731); assert.equal(proofs.length, 1154);
  assert.deepEqual(audit.fieldHostWeightTrackingInputs, proofs);
  const attributed = audit.discrepancies.filter(d => d.attribution === fieldHostWeightTrackingAttribution);
  assert.equal(attributed.length, 12); assert.equal(attributed.reduce((n, g) => n + g.occurrences, 0), 1154);
  for (const g of attributed) assert.equal(g.reviewedCases.length, g.occurrences);
  const expected = expectedCases.flatMap(c => Object.keys(fieldHostWeightTrackingProperties).map(p => `${c}/${p}`)).sort();
  assert.deepEqual(proofs.map(p => `${p.case}/${p.property}`).sort(), expected);
  const proofMap = new Map(proofs.map(p => [`${p.case}/${p.property}`, p])), groups = new Map();
  for (const [kind, entries] of [['static', filtered.results], ['interaction', filtered.interactions]]) for (const e of entries) {
    const key = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? `/${e.state}` : ''}`;
    const input = e.styleInputs.find(i => i.id === `${e.family}-primary`); assert.ok(input);
    for (const [property, spec] of Object.entries(fieldHostWeightTrackingProperties)) {
      const proof = proofMap.get(`${key}/${property}`); assert.ok(proof);
      const classified = classify(input, property, input.reference[property], input.astylar[property], proof);
      assert.equal(classified?.attribution, fieldHostWeightTrackingAttribution, `${key}/${property}`);
      const id = `${e.family}/${property}`;
      if (!groups.has(id)) groups.set(id, { family: e.family, element: input.id, property, reference: spec.reference,
        candidate: '<omitted>', classification: 'application-plugin-authoring-defect', cases: [] });
      groups.get(id).cases.push(key);
    }
  }
  assert.equal(groups.size, 12);
  const durable = JSON.parse(readFileSync('docs/material-field-host-weight-tracking-audit.json'));
  for (const s of durable.sourceFingerprints) assert.equal(createHash('sha256').update(readFileSync(s.file, 'utf8').replaceAll('\r\n', '\n')).digest('hex'), s.sha256, s.file);
  assert.deepEqual(durable.capture, index.capture);
  assert.equal(durable.caseCount, 577); assert.equal(durable.proofCount, 1154);
  const actualGroups = [...groups.values()].sort((a, b) => `${a.family}/${a.property}`.localeCompare(`${b.family}/${b.property}`)).map(g => ({ ...g, cases: g.cases.sort(), occurrences: g.cases.length }));
  assert.deepEqual(durable.groups, actualGroups);
  assert.equal(createHash('sha256').update(readFileSync(index.capture.file)).digest('hex'), index.capture.sha256);
  t.diagnostic(JSON.stringify({ scope: 'full captured field-family token-request attribution; complete all-family replay remains separate',
    capture: index.capture, caseCount: 577, proofCount: 1154,
    groups: actualGroups }));
});
