import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { collectFullTreeInventory, buildMaterialInputAudit, validateMaterialInputAudit } from './input-equivalence-audit.mjs';
import { collectRootInitialStyleInputs, classifyRootInitialStyleInput } from './root-initial-style-evidence.mjs';

// Captured observation-stage evidence, not an equal-input renderer reproduction.
const expected = { fontStyle: 'normal', letterSpacing: 'normal', wordSpacing: '0px',
  textTransform: 'none', whiteSpace: 'normal', overflowWrap: 'normal', wordBreak: 'normal',
  pointerEvents: 'auto', visibility: 'visible' };
const compared = (property, value) => ['letterSpacing', 'wordSpacing'].includes(property) ? '0' : value;
const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
const raw = JSON.parse(bytes);
const entry = raw.results.find(e => e.family === 'chips' && e.profile === 'light' && e.viewport.id === 'desktop');
assert.ok(entry);
const seed = collectFullTreeInventory([{ ...entry, kind: 'static' }]);
assert.deepEqual(seed.errors, []);
const scalar = entry.styleInputs.find(i => i.id === 'chips-root');
const proofs = inventory => collectRootInitialStyleInputs(inventory).filter(p => Object.hasOwn(expected, p.property));
const trees = inventory => Object.fromEntries(['reference', 'astylar'].map(side =>
  [side, inventory.variants[inventory.cases.find(c => c.side === side).variant]]));
const css = property => property.replace(/[A-Z]/g, c => '-' + c.toLowerCase());

test('root inherited-property stage proof covers all nine omissions without computed equivalence', () => {
  const before = JSON.stringify(seed), found = proofs(seed);
  assert.equal(found.length, 9, 'The full captured root ancestry must support the grouped observation-stage investigation');
  for (const p of found) {
    const value = expected[p.property], comparison = compared(p.property, value);
    assert.equal(p.case, 'static:chips@light/desktop');
    assert.equal(p.values.reference, comparison);
    assert.equal(p.values.candidateLocalDeclaration, '<omitted>');
    assert.deepEqual(p.referencePath.map(n => n.computed[p.property]), [value, value], 'Preserve raw browser serializations');
    for (const n of p.candidatePath) for (const stage of ['normal', 'comparison', 'effective'])
      assert.equal(n[stage][p.property], undefined);
    for (const flag of ['computedCandidateVerified', 'descendantConsumersVerified', 'finalRasterVerified'])
      assert.equal(p[flag], false);
    const c = classifyRootInitialStyleInput(scalar, p.property, comparison, undefined, p);
    assert.equal(c?.attribution, 'reviewed-root-initial-style-declaration-stage');
    assert.equal(c.classification, 'parity-harness-defect');
  }
  assert.equal(JSON.stringify(seed), before);
});

test('root inherited-property proof rejects each changed ancestor, explicit request and local stage', () => {
  assert.equal(proofs(seed).length, 9, 'A positive baseline is required before rejection tests');
  for (const [property, value] of Object.entries(expected)) {
    const mutations = [
      ...['main', 'section'].map(type => inv => {
        const n = trees(inv).reference.nodes.find(n => n.type === type); inv.styles[n.style].value[property] = 'changed';
      }),
      inv => { const n = trees(inv).reference.nodes.find(n => n.type === 'main'); n.inline[css(property)] = { value, important: false }; },
      inv => { const n = trees(inv).reference.nodes.find(n => n.type === 'section'); n.attributes.style = css(property) + ': ' + value; },
      inv => { const n = trees(inv).reference.nodes.find(n => n.type === 'main'); inv.rules[n.rules[0]].value.declarations[css(property)] = { value, important: false }; },
      inv => { const n = trees(inv).astylar.nodes.find(n => n.authored?.id === 'page'); n.authored.style = { [property]: value }; },
      inv => { const a = trees(inv).astylar; inv.rules[a.rules.find(i => inv.rules[i].value.selector === '#page')].value[property] = value; },
      ...['normalStyle', 'style', 'interactionStyle'].flatMap(stage => ['page', 'chips-root'].map(id => inv => {
        const n = trees(inv).astylar.nodes.find(n => n.authored?.id === id); inv.styles[n[stage]].value[property] = value;
      })),
    ];
    for (const [index, mutate] of mutations.entries()) {
      const inv = structuredClone(seed); mutate(inv);
      assert.equal(proofs(inv).length, 0, property + ' mutation ' + index);
    }
  }
});

test('root inherited-property proof rejects shorthand aliases and incomplete ancestry evidence', () => {
  assert.equal(proofs(seed).length, 9);
  for (const key of ['font', 'all', 'white-space-collapse', 'text-wrap', 'text-wrap-mode', 'text-wrap-style', 'word-wrap', 'animation-name', 'transition-property']) {
    const inv = structuredClone(seed), n = trees(inv).reference.nodes.find(n => n.type === 'main');
    inv.rules[n.rules[0]].value.declarations[key] = { value: 'inherit', important: false };
    assert.equal(proofs(inv).length, 0, key);
    const candidate = structuredClone(seed), a = trees(candidate).astylar;
    candidate.rules[a.rules.find(i => candidate.rules[i].value.selector === '#page')].value[key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = 'inherit';
    assert.equal(proofs(candidate).length, 0, 'candidate ' + key);
  }
  for (const change of [
    inv => { trees(inv).reference.ruleEvidenceComplete = false; },
    inv => { trees(inv).astylar.resolvedStyleEvidenceVersion = 1; },
    inv => { const n = trees(inv).astylar.nodes.find(n => n.authored?.id === 'page'); delete n.interactionStyle; },
    inv => { const n = trees(inv).reference.nodes.find(n => n.type === 'section'); n.parent = 'missing'; },
  ]) { const inv = structuredClone(seed); change(inv); assert.equal(proofs(inv).length, 0); }
});

test('root inherited-property scalar joins preserve omissions and reject broader claims', () => {
  const found = proofs(seed); assert.equal(found.length, 9);
  for (const p of found) {
    const property = p.property, value = expected[property], comparison = compared(property, value);
    for (const change of [
      i => { i.reference[property] = 'changed'; },
      ...['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'].map(stage => i => { i[stage][property] = value; }),
      i => { i.referenceAuthored.push({ declarations: { [css(property)]: { value, important: false } } }); },
      i => { i.astylarAuthored.push({ declarations: { [property]: value } }); },
    ]) { const i = structuredClone(scalar); change(i); assert.equal(classifyRootInitialStyleInput(i, property, comparison, undefined, p), undefined); }
    for (const flag of ['computedCandidateVerified', 'descendantConsumersVerified', 'finalRasterVerified'])
      assert.equal(classifyRootInitialStyleInput(scalar, property, comparison, undefined, { ...p, [flag]: true }), undefined);
  }
});

test('root proof validation does not serialize the aggregate evidence array', () => {
  const report = buildMaterialInputAudit({ ...raw, results: [entry], interactions: [] });
  assert.equal(report.rootInitialStyleInputs.length, 13);
  const stringify = JSON.stringify;
  // Reproduce the observed aggregate-string limit without allocating a giant
  // string in the focused suite. Individual proof serialization remains native.
  JSON.stringify = function (value, ...args) {
    if (value === report.rootInitialStyleInputs) throw new RangeError('Invalid string length: aggregate root proof array');
    return stringify.call(this, value, ...args);
  };
  try {
    assert.deepEqual(validateMaterialInputAudit(report, { requireComplete: false }).filter(e => /root initial-style/.test(e)), []);
  } finally { JSON.stringify = stringify; }
});

test('bounded root proof validation still checks every entry, order and nested value', () => {
  const report = buildMaterialInputAudit({ ...raw, results: [entry], interactions: [] });
  const errors = r => validateMaterialInputAudit(r, { requireComplete: false }).filter(e => /root initial-style/.test(e));
  assert.deepEqual(errors(report), []);
  assert.deepEqual(errors(JSON.parse(JSON.stringify(report))), [], 'JSON transport must retain the original validation semantics');
  for (const change of [
    ...[0, 6, 12].map(index => r => { r.rootInitialStyleInputs[index].candidatePath[1].normal.injected = 'changed'; }),
    r => { r.rootInitialStyleInputs.reverse(); },
    r => { r.rootInitialStyleInputs.pop(); },
    r => { r.rootInitialStyleInputs.push(structuredClone(r.rootInitialStyleInputs[0])); },
    r => { delete r.rootInitialStyleInputs[6]; },
    r => { r.rootInitialStyleInputs = {}; },
  ]) {
    const altered = structuredClone(report); change(altered);
    assert.ok(errors(altered).some(e => /does not replay/.test(e)));
  }
});
