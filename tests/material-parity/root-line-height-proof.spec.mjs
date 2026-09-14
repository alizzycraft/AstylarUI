import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { collectRootInitialStyleInputs, classifyRootInitialStyleInput } from './root-initial-style-evidence.mjs';

// A captured diagnostic-stage proof, not an equal-input renderer reproduction.
const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
const raw = JSON.parse(bytes);
const entry = raw.results.find(e => e.family === 'chips' && e.profile === 'light' && e.viewport.id === 'desktop');
assert.ok(entry);
const seed = collectFullTreeInventory([{ ...entry, kind: 'static' }]);
assert.deepEqual(seed.errors, []);
const scalar = entry.styleInputs.find(i => i.id === 'chips-root');
const lineProofs = inventory => collectRootInitialStyleInputs(inventory).filter(p => p.property === 'lineHeight');

test('root line-height omission is attributed only through captured ancestry and request stages', () => {
  const before = JSON.stringify(seed), proofs = lineProofs(seed);
  assert.equal(proofs.length, 1, 'The complete root ancestry already distinguishes computed normal from local omission');
  const p = proofs[0];
  assert.equal(p.case, 'static:chips@light/desktop');
  assert.equal(p.values.reference, 'normal');
  assert.equal(p.values.candidateLocalDeclaration, '<omitted>');
  assert.equal(p.computedCandidateVerified, false);
  assert.equal(p.descendantConsumersVerified, false);
  assert.equal(p.finalRasterVerified, false);
  assert.deepEqual(p.referencePath.map(n => n.computed.lineHeight), ['normal', 'normal']);
  for (const n of p.candidatePath) for (const stage of ['normal', 'comparison', 'effective'])
    assert.equal(n[stage].lineHeight, undefined);
  const classification = classifyRootInitialStyleInput(scalar, 'lineHeight', 'normal', undefined, p);
  assert.equal(classification?.attribution, 'reviewed-root-initial-style-declaration-stage');
  assert.equal(classification.classification, 'parity-harness-defect');
  assert.equal(JSON.stringify(seed), before);
});

test('root line-height attribution rejects ancestor values, explicit requests and incomplete local stages', () => {
  assert.equal(lineProofs(seed).length, 1, 'A working positive baseline is required before checking rejection');
  const trees = inv => Object.fromEntries(['reference', 'astylar'].map(side => [side, inv.variants[inv.cases.find(c => c.side === side).variant]]));
  const mutations = [
    inv => { const r = trees(inv).reference; inv.styles[r.nodes.find(n => n.type === 'main').style].value.lineHeight = '40px'; },
    inv => { const r = trees(inv).reference; inv.styles[r.nodes.find(n => n.attributes?.id === 'chips-root').style].value.lineHeight = '40px'; },
    inv => { const r = trees(inv).reference; r.nodes.find(n => n.type === 'main').inline['line-height'] = { value: 'normal', important: false }; },
    inv => { const r = trees(inv).reference; const n = r.nodes.find(n => n.attributes?.id === 'chips-root'); n.attributes.style = 'line-height: normal'; },
    inv => { const r = trees(inv).reference; inv.rules[r.nodes.find(n => n.type === 'main').rules[0]].value.declarations['line-height'] = { value: 'normal', important: false }; },
    inv => { const a = trees(inv).astylar; a.nodes.find(n => n.authored?.id === 'page').authored.style = { lineHeight: 'normal' }; },
    inv => { const a = trees(inv).astylar; const rule = inv.rules[a.rules.find(i => inv.rules[i].value.selector === '#page')]; rule.value.lineHeight = 'normal'; },
    ...['normalStyle', 'style', 'interactionStyle'].flatMap(stage => ['page', 'chips-root'].map(id => inv => {
      const n = trees(inv).astylar.nodes.find(n => n.authored?.id === id); inv.styles[n[stage]].value.lineHeight = 'normal';
    })),
    inv => { const n = trees(inv).astylar.nodes.find(n => n.authored?.id === 'page'); delete n.interactionStyle; },
  ];
  for (const [i, mutate] of mutations.entries()) {
    const inv = structuredClone(seed); mutate(inv);
    assert.equal(lineProofs(inv).length, 0, `mutation ${i}`);
  }
});

test('root line-height scalar joins never invent computed candidate values or rendering proof', () => {
  const proofs = lineProofs(seed); assert.equal(proofs.length, 1);
  for (const change of [
    s => { s.reference.lineHeight = '40px'; },
    s => { s.astylar.lineHeight = 'normal'; },
    s => { s.astylarNormalResolvedStyle.lineHeight = 'normal'; },
    s => { s.astylarInteractionResolvedStyle.lineHeight = 'normal'; },
    s => { s.referenceAuthored.push({ declarations: { 'line-height': { value: 'normal', important: false } } }); },
    s => { s.astylarAuthored.push({ declarations: { lineHeight: 'normal' } }); },
  ]) {
    const s = structuredClone(scalar); change(s);
    assert.equal(classifyRootInitialStyleInput(s, 'lineHeight', 'normal', undefined, proofs[0]), undefined);
  }
  for (const flag of ['computedCandidateVerified', 'descendantConsumersVerified', 'finalRasterVerified'])
    assert.equal(classifyRootInitialStyleInput(scalar, 'lineHeight', 'normal', undefined, { ...proofs[0], [flag]: true }), undefined);
});
