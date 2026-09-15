import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { collectOriginStageEvidence, classifyOriginStageInput, validateOriginStageEvidence, originStageTrees } from './origin-stage-inventory-evidence.mjs';
import { bindOriginStageSource, validateOriginStageSource } from './origin-stage-source-binding.mjs';

const sha = x => createHash('sha256').update(x).digest('hex');
const survey = JSON.parse(readFileSync('docs/material-transform-origin-stage-survey.json'));
const bytes = readFileSync(survey.capturePath);
assert.equal(sha(bytes), survey.captureSha256);
const raw = JSON.parse(bytes), inactive = v => v === undefined || ['none', 'matrix(1,0,0,1,0,0)'].includes(v.replace(/\s/g, ''));
const cases = [['static', raw.results], ['interaction', raw.interactions]].flatMap(([kind, entries]) => entries.map(e => ({ ...e, kind,
  styleInputs: e.styleInputs.filter(i => i.reference?.transformOrigin !== undefined && i.astylar?.transformOrigin === undefined &&
    inactive(i.reference?.transform) && inactive(i.astylar?.transform)) })).filter(e => e.styleInputs.length));
const inventory = collectFullTreeInventory(cases);
const evidence = collectOriginStageEvidence(cases, inventory);
const toDifferences = ev => ev.observations.filter(o => o.status === 'observed-declaration-stage-gap').map(p => ({
  element: p.element, property: p.property, reference: p.comparisonOrigin,
  classification: p.classification, attribution: p.attribution, justification: p.justification,
  recommendedOwner: p.owner, reviewEvidence: p, reviewedCases: [p.case], occurrences: 1,
}));

test('origin stage inventory bridge preserves every captured disposition without equivalence', () => {
  assert.deepEqual(inventory.errors, []);
  assert.equal(evidence.observations.length, 6938);
  const expected = new Map(survey.observations.map(o => [o.case + '#' + o.element, o]));
  assert.equal(expected.size, 6938);
  for (const actual of evidence.observations) {
    const prior = expected.get(actual.case + '#' + actual.element);
    assert.ok(prior); assert.equal(actual.status, prior.status); assert.equal(actual.reason, prior.reason);
    if (actual.status !== 'observed-declaration-stage-gap') continue;
    for (const key of ['classification', 'attribution', 'referenceNode', 'candidateNode', 'referenceOrigin', 'mapping',
      'inputEquivalent', 'candidateComputedOriginVerified', 'referenceBoxEqualityVerified', 'finalRasterVerified'])
      assert.deepEqual(actual[key], prior[key], key);
    // Pool indices legitimately differ. The referenced owner/rule contents must
    // not: the bridge reuses the validated raw declaration proof at those indices.
    assert.deepEqual(actual.referencePath.map(n => n.key), prior.referencePath.map(n => n.key));
    const capture = evidence.captures.find(c => `${c.kind}:${c.family}@${c.profile}/${c.viewport.id}${c.state ? '/' + c.state : ''}` === actual.case);
    const input = capture.styleInputs.find(i => i.id === actual.element);
    assert.equal(classifyOriginStageInput(input, 'transformOrigin', actual.referenceOrigin, undefined, actual)?.classification, 'parity-harness-defect');
    assert.equal(classifyOriginStageInput(input, 'transform', actual.referenceOrigin, undefined, actual), undefined);
  }
  assert.equal(evidence.observations.filter(o => o.status === 'observed-declaration-stage-gap').length, 5570);
  assert.deepEqual(validateOriginStageEvidence(evidence, inventory, toDifferences(evidence)), []);
  assert.deepEqual(validateOriginStageEvidence(JSON.parse(JSON.stringify(evidence)), inventory, JSON.parse(JSON.stringify(toDifferences(evidence)))), []);
});

test('origin stage inventory replay rejects forged claims and incomplete attribution', () => {
  // Use a full real captured case so mutation tests retain the original 89-field
  // scalar schema, ancestry, declaration stages and provenance.
  const capture = evidence.captures.find(c => c.family === 'sidenav');
  const small = collectOriginStageEvidence([capture], inventory), differences = toDifferences(small);
  assert.ok(differences.length); assert.deepEqual(validateOriginStageEvidence(small, inventory, differences), []);
  const mutations = [
    (e, d) => { e.observations[0].inputEquivalent = true; },
    (e, d) => { d[0].classification = 'equivalent-representation'; },
    (e, d) => { d[0].recommendedOwner = 'core paint'; },
    (e, d) => { d[0].reviewEvidence.finalRasterVerified = true; },
    (e, d) => { d[0].reviewedCases = []; },
    (e, d) => { d[0].reference = '999px 999px'; },
    (e, d) => { d.pop(); },
    (e, d) => { d.push(structuredClone(d[0])); },
    (e, d) => { e.captures[0].styleInputs[0].reference.transformOrigin = '999px 999px'; },
    (e, d) => { e.captures[0].styleInputs[0].astylarResolvedStyleEvidenceVersion = 1; },
    (e, d) => { e.observations.pop(); },
  ];
  for (const mutate of mutations) {
    const e = structuredClone(small), d = structuredClone(differences); mutate(e, d);
    assert.ok(validateOriginStageEvidence(e, inventory, d).length, mutate.toString());
  }
  const p = small.observations[0], i = capture.styleInputs.find(i => i.id === p.element);
  for (const key of ['inputEquivalent', 'candidateComputedOriginVerified', 'referenceBoxEqualityVerified', 'finalRasterVerified'])
    assert.equal(classifyOriginStageInput(i, 'transformOrigin', p.referenceOrigin, undefined, { ...p, [key]: true }), undefined);
});

test('origin stage inventory bridge refuses incomplete or duplicate case provenance', () => {
  const key = evidence.observations[0].case;
  for (const field of ['errors', 'cases', 'variants', 'styles', 'rules'])
    assert.equal(originStageTrees({ ...inventory, [field]: undefined }, key), undefined);
  assert.equal(originStageTrees({ ...inventory, errors: [{ case: key, error: 'changed tree hash' }] }, key), undefined);
  const duplicate = inventory.cases.find(c => c.case === key);
  assert.equal(originStageTrees({ ...inventory, cases: [...inventory.cases, duplicate] }, key), undefined);
  const capture = evidence.captures[0];
  const missing = collectOriginStageEvidence([capture], { schemaVersion: 1 });
  assert.ok(missing.observations.length);
  assert.ok(missing.observations.every(o => o.status === 'unresolved' && o.reason === 'missing paired inventory evidence'));
});

test('origin stage source binding rejects self-consistent deletion and altered original provenance', () => {
  const binding = bindOriginStageSource(raw, { parityPath: survey.capturePath });
  assert.equal(binding.status, 'bound'); assert.equal(binding.observations, 6938);
  assert.deepEqual(validateOriginStageSource(binding, evidence), []);
  assert.deepEqual(validateOriginStageSource(binding, JSON.parse(JSON.stringify(evidence))), []);
  // This smaller report is internally consistent. Only independent original
  // capture binding can establish that most observed cases have been removed.
  const reduced = collectOriginStageEvidence([evidence.captures[0]], inventory);
  assert.deepEqual(validateOriginStageEvidence(reduced, inventory, toDifferences(reduced)), []);
  assert.match(validateOriginStageSource(binding, reduced).join('\n'), /coverage differs from original capture/);
  for (const changed of [{ ...binding, sha256: '0'.repeat(64) }, { ...binding, observations: 1 },
    { ...binding, file: 'package.json' }, { ...binding, status: 'unbound' }])
    assert.ok(validateOriginStageSource(changed, evidence).length);
  const forged = { ...evidence, observations: evidence.observations.map((o, index) => index ? o : { ...o, status: 'unresolved', reason: 'invented' }) };
  assert.match(validateOriginStageSource(binding, forged).join('\n'), /proof differs from original source/);
  const changedRaw = { ...raw, results: raw.results.slice(1) };
  assert.equal(bindOriginStageSource(changedRaw, { parityPath: survey.capturePath }).status, 'invalid');
  assert.equal(bindOriginStageSource(raw).status, 'unbound');
});
