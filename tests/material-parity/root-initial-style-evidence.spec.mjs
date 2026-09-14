import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { collectFullTreeInventory, buildMaterialInputAudit, validateMaterialInputAudit } from './input-equivalence-audit.mjs';
import { collectRootInitialStyleInputs, classifyRootInitialStyleInput, rootInitialStyleValues,
  rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

function inventory(family = 'chips', state = 'hover') {
  const context = { ...rootInitialStyleValues, display: 'block', direction: 'ltr', writingMode: 'horizontal-tb', unicodeBidi: 'isolate', textAlignLast: 'auto' };
  const ref = { side: 'reference', ruleEvidenceComplete: true, contextStyleEvidenceVersion: 1,
    contextStyleProperties: ['textAlign', 'direction', 'writingMode', 'unicodeBidi', 'textAlignLast'],
    nodes: [{ key: 'frame', parent: null, type: 'main', attributes: { class: 'frame' }, ownText: '', inline: {}, style: 0, rules: [0] },
      { key: 'frame/section', parent: 'frame', type: 'section', attributes: { id: `${family}-root` }, ownText: '', inline: {}, style: 0, rules: [] }] };
  const ast = { side: 'astylar', ruleEvidenceComplete: true, resolvedStyleEvidenceVersion: 2, resolvedStyleSource: 'core-style-inspection', rules: [1, 2],
    nodes: [{ key: 'root', parent: null, authored: {} },
      { key: 'page', parent: 'root', authored: { type: 'main', id: 'page' }, style: 1, normalStyle: 1, interactionStyle: 1 },
      { key: 'section', parent: 'page', authored: { type: 'section', id: `${family}-root` }, style: 1, normalStyle: 1, interactionStyle: 1 }] };
  const key = `interaction:${family}@light/desktop-dpr1/${state}`;
  return { styles: [{ side: 'reference', value: context }, { side: 'astylar', value: { display: 'block' } }],
    rules: [{ side: 'reference', value: { selector: '.frame', active: true, conditions: [], declarations: { 'font-size': { value: '16px', important: false } } } },
      { side: 'astylar', value: { selector: '#page', fontSize: '16px' } },
      { side: 'astylar', value: { selector: '.unrelated th', textAlign: 'left' } }],
    variants: [ref, ast], cases: [{ case: key, side: 'reference', variant: 0 }, { case: key, side: 'astylar', variant: 1, resolvedStyleRevision: 3 }], errors: [] };
}

function input(family = 'chips') {
  return { id: `${family}-root`, reference: { ...rootInitialStyleValues }, astylar: { display: 'block' },
    astylarNormalResolvedStyle: { display: 'block' }, astylarInteractionResolvedStyle: { display: 'block' },
    referenceStructure: { schemaVersion: 2, type: 'section', ownText: '' },
    astylarStructure: { schemaVersion: 2, type: 'section', ownText: '' }, astylarResolvedStyleEvidenceVersion: 2,
    referenceAuthored: [], astylarAuthored: [] };
}

test('root initial-style proof preserves omissions and property-specific observation stages', () => {
  for (const family of ['chips', 'datepicker', 'dialog']) for (const state of ['hover', 'held', 'focus', 'disabled', 'selected']) {
    const raw = inventory(family, state), before = structuredClone(raw), proofs = collectRootInitialStyleInputs(raw);
    assert.equal(proofs.length, 13);
    for (const proof of proofs) {
      const c = classifyRootInitialStyleInput(input(family), proof.property, proof.values.reference, undefined, proof);
      assert.equal(c.classification, 'parity-harness-defect');
      assert.equal(proof.computedCandidateVerified, false); assert.equal(proof.descendantConsumersVerified, false); assert.equal(proof.finalRasterVerified, false);
      assert.equal(proof.candidatePath[1].comparison[proof.property], undefined);
      assert.match(c.justification, /formatting-context/);
    }
    assert.deepEqual(raw, before);
  }
});

test('root initial-style proof rejects incomplete ancestry, contexts, requests and state provenance', () => {
  const mutations = [
    a => { a.errors.push({ case: a.cases[0].case, error: 'capture incomplete' }); },
    a => { a.cases.push(structuredClone(a.cases[0])); }, a => { a.cases.push(structuredClone(a.cases[1])); },
    a => { a.cases[1].resolvedStyleRevision = -1; }, a => { delete a.cases[1].resolvedStyleRevision; },
    a => { a.variants[0].ruleEvidenceComplete = false; }, a => { a.variants[1].ruleEvidenceComplete = false; },
    a => { a.variants[0].contextStyleEvidenceVersion = 0; }, a => { a.variants[0].contextStyleProperties = []; },
    a => { a.variants[1].resolvedStyleEvidenceVersion = 1; }, a => { a.variants[1].resolvedStyleSource = 'mesh-metadata'; },
    a => { a.variants[0].nodes.push(structuredClone(a.variants[0].nodes[1])); },
    a => { a.variants[1].nodes.push({ ...structuredClone(a.variants[1].nodes[2]), key: 'duplicate-id' }); },
    a => { a.variants[0].nodes[1].parent = 'missing'; }, a => { a.variants[0].nodes[0].parent = 'outside'; },
    a => { a.variants[0].nodes[0].attributes.class = 'other'; }, a => { a.variants[0].nodes[1].type = 'div'; },
    a => { a.variants[0].nodes[1].ownText = 'direct text'; }, a => { delete a.variants[0].nodes[1].ownText; },
    a => { a.variants[1].nodes[0].authored = { fontWeight: '700' }; }, a => { a.variants[1].nodes[0].parent = 'cycle'; },
    a => { a.variants[1].nodes[1].authored.id = 'other-page'; }, a => { a.variants[1].nodes[2].authored.textContent = ''; },
    a => { a.variants[0].nodes[0].inline.font = { value: 'inherit', important: false }; },
    a => { a.variants[0].nodes[1].attributes.style = 'font-weight:700'; },
    a => { a.variants[0].nodes[1].attributes.dir = 'rtl'; },
    a => { a.variants[0].nodes[1].attributes.style = 'font\\2d weight:700'; },
    a => { a.rules[0].value.declarations.all = { value: 'unset', important: false }; },
    a => { a.rules[0].value.declarations['font-weight'] = { value: 'inherit', important: false }; },
    a => { a.rules[0].value.declarations['animation-name'] = { value: 'none', important: true }; },
    a => { delete a.rules[0].value.active; }, a => { a.rules[0].side = 'astylar'; },
    a => { a.styles[0].side = 'astylar'; }, a => { a.styles[0].value.fontWeight = '700'; },
    a => { a.styles[0].value.textAlign = 'left'; }, a => { a.styles[0].value.verticalAlign = 'middle'; },
    a => { a.styles[0].value.direction = 'rtl'; }, a => { a.styles[0].value.writingMode = 'vertical-rl'; },
    a => { a.styles[0].value.unicodeBidi = 'normal'; }, a => { a.styles[0].value.textAlignLast = 'center'; },
    a => { a.variants[1].nodes[1].authored.style = { fontWeight: 'inherit' }; },
    a => { a.variants[1].nodes[2].authored.dir = 'rtl'; }, a => { a.variants[1].nodes[2].authored.class = ['x']; },
    a => { a.rules[1].value.textAlign = 'start'; }, a => { a.rules[1].value.nested = { verticalAlign: 'baseline' }; },
    a => { a.rules[2].value.selector = '.unknown section:hover'; },
    a => { a.rules[2].value.selector = ':is(section)'; }, a => { a.rules[2].value.selector = '.unrelated th, #chips-root'; },
    a => { a.styles[1].value.fontWeight = '400'; }, a => { delete a.variants[1].nodes[2].normalStyle; },
    a => { delete a.variants[1].nodes[2].interactionStyle; },
  ];
  for (const [i, mutate] of mutations.entries()) { const a = inventory(); mutate(a); assert.deepEqual(collectRootInitialStyleInputs(a), [], `mutation ${i}`); }
});

test('root initial-style scalar guard rejects synthetic computed values and broader claims', () => {
  const proofs = collectRootInitialStyleInputs(inventory());
  for (const proof of proofs) {
    for (const mutate of [i => { i.reference[proof.property] = 'other'; }, i => { i.astylar[proof.property] = proof.values.reference; },
      i => { i.astylarNormalResolvedStyle.font = 'inherit'; }, i => { delete i.astylarInteractionResolvedStyle; },
      i => { i.referenceStructure.ownText = 'text'; }, i => { i.referenceStructure.ownText = null; },
      i => { i.astylarStructure.type = 'div'; }, i => { i.astylarResolvedStyleEvidenceVersion = 1; },
      i => { i.referenceAuthored.push({ declarations: { all: 'initial' } }); }, i => { i.astylarAuthored.push({ declarations: { textAlign: 'start' } }); }]) {
      const i = input(); mutate(i); assert.equal(classifyRootInitialStyleInput(i, proof.property, proof.values.reference, undefined, proof), undefined);
    }
    for (const flag of ['computedCandidateVerified', 'descendantConsumersVerified', 'finalRasterVerified']) {
      assert.equal(classifyRootInitialStyleInput(input(), proof.property, proof.values.reference, undefined, { ...proof, [flag]: true }), undefined);
    }
  }
  assert.equal(rootInitialSelectorCanApply('.table th, .table td', { type: 'section' }), false);
  assert.equal(rootInitialSelectorCanApply(':is(th, section)', { type: 'section' }), true);
  assert.equal(rootInitialSelectorCanApply('.ancestor section:hover', { type: 'section' }), true);
});

test('root initial-style collector covers the full captured root survey without changing raw evidence', () => {
  const index = JSON.parse(readFileSync('docs/material-root-initial-style-survey-audit.json'));
  const bytes = readFileSync(index.capture.file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), index.capture.sha256);
  const raw = JSON.parse(bytes), entries = [...raw.results.map(e => ({ ...e, kind: 'static' })), ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const pooled = collectFullTreeInventory(entries), proofs = collectRootInitialStyleInputs(pooled);
  assert.deepEqual(pooled.errors, []);
  assert.equal(proofs.length, 2311 * 13);
  const actual = proofs.map(p => `${p.case}/${p.property}`).sort();
  const expected = index.groups.flatMap(g => g.cases.flatMap(c => Object.keys(rootInitialStyleValues).map(p => `${c}/${p}`))).sort();
  assert.deepEqual(actual, expected); assert.equal(new Set(actual).size, actual.length);
  const durable = JSON.parse(readFileSync('docs/material-root-initial-style-audit.json'));
  const hash = value => createHash('sha256').update(value).digest('hex');
  assert.deepEqual(durable.capture, index.capture);
  assert.equal(hash(readFileSync(durable.caseSource.file, 'utf8').replaceAll('\r\n', '\n')), durable.caseSource.sha256);
  assert.equal(durable.caseCount, entries.length);
  assert.equal(durable.propertyObservations, proofs.length);
  assert.equal(durable.groups.length, durable.groupCount);
  const indexed = durable.groups.flatMap(g => {
    const source = index.groups[g.sourceGroupIndex];
    assert.ok(source); assert.equal(g.family, source.family);
    assert.equal(g.element, `${g.family}-root`);
    assert.equal(g.occurrences, source.cases.length);
    assert.equal(g.reference, ['letterSpacing', 'wordSpacing'].includes(g.property) ? '0' : rootInitialStyleValues[g.property]);
    assert.equal(g.candidate, '<omitted>');
    assert.equal(g.classification, 'parity-harness-defect');
    return source.cases.map(c => `${c}/${g.property}`);
  }).sort();
  assert.deepEqual(indexed, actual, 'The durable index must cover every independently collected observation exactly once');
  for (const source of durable.sourceFingerprints)
    assert.equal(hash(readFileSync(source.file, 'utf8').replaceAll('\r\n', '\n')), source.sha256, source.file);
  for (const p of proofs) assert.equal(p.candidatePath[1].comparison[p.property], undefined);
});

test('root initial-style report joins exact scalars and rejects forged proof or coverage', () => {
  const raw = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
  const selected = raw.results.find(e => e.family === 'chips' && e.profile === 'light' && e.viewport.id === 'desktop');
  assert.ok(selected);
  const seed = { ...raw, results: [selected], interactions: [] };
  const report = buildMaterialInputAudit(seed);
  const eligible = a => a.discrepancies.filter(d => d.attribution === 'reviewed-root-initial-style-declaration-stage');
  assert.equal(eligible(report).length, 13);
  assert.equal(report.rootInitialStyleInputs.length, 13);
  for (const d of eligible(report)) {
    assert.deepEqual(d.reviewedCases, ['static:chips@light/desktop']); assert.equal(d.occurrences, 1);
    assert.equal(d.astylar, undefined); assert.equal(d.classification, 'parity-harness-defect');
  }
  assert.deepEqual(validateMaterialInputAudit(report, { requireComplete: false }).filter(e => /root initial-style/.test(e)), []);
  for (const mutate of [
    a => { a.rootInitialStyleInputs[0].computedCandidateVerified = true; },
    a => { a.rootInitialStyleInputs[0].candidatePath[1].normal.fontWeight = '400'; },
    a => { a.rootInitialStyleInputs[0].referencePath[0].computed.textAlign = 'left'; },
    a => { eligible(a)[0].reviewedCases = []; }, a => { eligible(a)[0].classification = 'equivalent-representation'; },
    a => { eligible(a)[0].astylar = '400'; }, a => { eligible(a)[0].reviewEvidence.finalRasterVerified = true; },
  ]) {
    const copy = structuredClone(report); mutate(copy);
    assert.ok(validateMaterialInputAudit(copy, { requireComplete: false }).some(e => /root initial-style/.test(e)));
  }
  for (const property of Object.keys(rootInitialStyleValues)) {
    const changed = structuredClone(seed), scalar = changed.results[0].styleInputs.find(i => i.id === 'chips-root');
    scalar.astylarInteractionResolvedStyle[property] = rootInitialStyleValues[property];
    assert.equal(eligible(buildMaterialInputAudit(changed)).length, 0, 'all local stages must remain independently omitted');
  }
});
