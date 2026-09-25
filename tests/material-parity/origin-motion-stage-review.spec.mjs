import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { inspectTransformOriginDeclarationStage } from './transform-origin-stage-evidence.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const readBound = (file, sha256) => {
  const bytes = readFileSync(file); assert.equal(hash(bytes), sha256, file); return JSON.parse(bytes);
};

test('origin motion review binds the complete remaining population and rejects unsafe extensions', t => {
  const contexts = readBound('docs/material-origin-request-contexts.json',
    '8cd9950f3dc692509f1b8fd897fe60b9239281acfeac482c07e48e62a4d55696');
  const raw = readBound(contexts.capture.file, contexts.capture.sha256);
  const cases = new Map([['static', raw.results], ['interaction', raw.interactions]].flatMap(([kind, entries]) =>
    entries.map(e => [`${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`, e])));
  const directory = 'artifacts/material-parity/working-audit';
  // This is the pinned pre-classification population, not whichever index is current later.
  const snapshot = { generation: 'ed555089857385f46871703032b3fda742ce58f47a081b44200bc1133e8d3a2f',
    indexSha256: '2da3f7843d9b033afc86a29608c1a4865304094552eb4ad18822d46559bfaf48' };
  const rows = [...new Set(contexts.observations.map(o => o.family))].flatMap(f => queryFindings(directory, f, snapshot))
    .filter(r => r.property === 'transformOrigin' && r.attribution === 'unresolved');
  const canonical = bindPreciseAuditNormalization();
  const key = r => JSON.stringify([r.family, r.element, canonical({ transformOrigin: r.reference ?? r.referenceOrigin }).transformOrigin]);
  const expected = new Map(rows.map(r => [key(r), r.occurrences])), actual = new Map(), accepted = new Map();
  const controls = new Map(); let loadedCase, reference, candidate, checked = 0;
  for (const observation of contexts.observations) {
    const entry = cases.get(observation.case); assert.ok(entry);
    assert.deepEqual(entry.inputTrees, observation.inputTrees);
    if (loadedCase !== observation.case) {
      reference = readBound(entry.inputTrees.reference.file, entry.inputTrees.reference.sha256);
      candidate = readBound(entry.inputTrees.astylar.file, entry.inputTrees.astylar.sha256);
      loadedCase = observation.case;
    }
    const inputs = entry.styleInputs.filter(i => i.id === observation.element); assert.equal(inputs.length, 1);
    const input = inputs[0], before = hash(JSON.stringify([reference, candidate, input]));
    const original = inspectTransformOriginDeclarationStage(entry, reference, candidate, input);
    assert.equal(original.status, 'unresolved'); assert.equal(original.reason, observation.reason);
    const proof = inspectTransformOriginDeclarationStage(entry, reference, candidate, input, { reviewedDisjointMotion: true });
    const eligible = [0, 1, 4].includes(observation.context);
    assert.equal(proof.status, eligible ? 'observed-declaration-stage-gap' : 'unresolved');
    assert.equal(hash(JSON.stringify([reference, candidate, input])), before, 'inspection changed captured inputs');
    const identity = key(observation); assert.ok(expected.has(identity));
    actual.set(identity, (actual.get(identity) ?? 0) + 1);
    if (!eligible) continue;
    accepted.set(identity, (accepted.get(identity) ?? 0) + 1); checked++;
    assert.equal(proof.referenceOrigin, observation.referenceOrigin);
    for (const flag of ['inputEquivalent', 'candidateComputedOriginVerified', 'referenceBoxEqualityVerified', 'finalRasterVerified'])
      assert.equal(proof[flag], false);
    assert.equal(proof.motionReview.animationSettlementVerified, false);
    assert.equal(proof.motionReview.indirectEffectsExcluded, false);
    if (!controls.has(observation.context)) controls.set(observation.context,
      { entry, reference: structuredClone(reference), candidate: structuredClone(candidate), input: structuredClone(input), proof });
  }
  assert.deepEqual(actual, expected);
  assert.equal(actual.size, 59); assert.equal(checked, 704); assert.equal(accepted.size, 36);
  for (const [identity, count] of accepted) assert.equal(count, expected.get(identity), 'partially reviewed group');
  let mutations = 0;
  for (const control of controls.values()) {
    const mutateCases = [
      ...['transform-origin', 'transform', 'all', 'var(--target)', 'unknown-property'].map(value =>
        [value, (r, a, i, target) => { target.inline['transition-property'] = { value, important: false }; }]),
      ['missing-target', (r, a, i, target) => { target.inline['transition-duration'] = { value: '1s', important: false }; }],
      ['named-animation', (r, a, i, target) => { target.inline['animation-name'] = { value: 'move', important: false }; }],
      ['unknown-field', (r, a, i, target) => { target.inline['animation-unknown'] = { value: 'none', important: false }; }],
      ['explicit-origin', (r, a, i, target) => { target.inline['transform-origin'] = { value: '0 0', important: false }; }],
      ['ancestor-origin', (r, a) => { r.nodes.find(n => n.key === control.proof.referencePath[0].key).inline['transform-origin'] = { value: '0 0', important: false }; }],
      ['missing-ancestor', (r, a, i, target) => { target.parent = 'missing'; }],
      ['candidate-motion', (r, a) => { a.nodes.find(n => n.key === control.proof.candidateNode).authored.style = { transition: 'none' }; }],
      ['changed-scalar', (r, a, i) => { i.reference.transformOrigin = '999px 999px'; }],
      ['missing-provenance', (r, a) => { delete a.resolvedStyleEvidenceVersion; }],
    ];
    for (const [name, mutate] of mutateCases) {
      const r = structuredClone(control.reference), a = structuredClone(control.candidate), i = structuredClone(control.input);
      mutate(r, a, i, r.nodes.find(n => n.key === control.proof.referenceNode));
      assert.equal(inspectTransformOriginDeclarationStage(control.entry, r, a, i, { reviewedDisjointMotion: true }).status,
        'unresolved', name); mutations++;
    }
  }
  assert.equal(mutations, 42);
  t.diagnostic(`59 groups / 1368 observations conserved; 36 / 704 eligible; 23 / 664 guarded; ${mutations} negative controls`);
});
