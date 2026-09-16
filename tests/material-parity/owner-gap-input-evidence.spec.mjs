import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { inspectOwnerGapInput } from './owner-gap-input-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reportFile = 'docs/material-owner-gap-input-survey.json';
const report = JSON.parse(readFileSync(reportFile));
const bytes = readFileSync(report.capture.file); assert.equal(hash(bytes), report.capture.sha256);
const raw = JSON.parse(bytes);
function original(family, element) {
  const entry = [...raw.results, ...raw.interactions].find(e => e.family === family && e.styleInputs.some(i => i.id === element));
  const trees = {};
  for (const side of ['reference', 'astylar']) {
    const descriptor = entry.inputTrees[side], bytes = readFileSync(descriptor.file);
    assert.equal(hash(bytes), descriptor.sha256); trees[side] = JSON.parse(bytes);
  }
  return { input: entry.styleInputs.find(i => i.id === element), reference: trees.reference, candidate: trees.astylar };
}
const base = original('autocomplete', 'autocomplete-primary');
const inspect = (v, property = 'rowGap') => inspectOwnerGapInput(v.input, property, v.reference, v.candidate);
const rn = v => v.reference.nodes.find(n => n.attributes?.id === v.input.id);
const an = v => v.candidate.nodes.find(n => n.authored?.id === v.input.id);

test('gap survey preserves normal and omission without equating different formatting contexts', () => {
  const before = JSON.stringify(base);
  for (const property of ['rowGap', 'columnGap']) {
    const proof = inspect(base, property);
    assert.equal(proof.disposition, 'captured-normal-versus-local-omission');
    assert.deepEqual(proof.issues, []);
    assert.equal(proof.referenceComputed, 'normal'); assert.equal(proof.candidateLocal, '<omitted>');
    assert.deepEqual(proof.formatting, { reference: 'inline-flex', astylar: 'block' });
    assert.equal(proof.computedCandidateVerified, false); assert.equal(proof.inputEquivalent, false);
    assert.equal(proof.renderingEquivalent, false); assert.deepEqual(proof.requests, { reference: [], astylar: [] });
  }
  assert.equal(JSON.stringify(base), before);
});

test('gap survey retains explicit shorthand and each original style stage instead of treating omitted longhands as absent intent', () => {
  const value = original('button-toggle', 'button-toggle-one');
  const proof = inspect(value);
  assert.equal(value.input.astylar.rowGap, undefined);
  assert.equal(proof.candidateLocal, '<omitted>');
  assert.equal(proof.disposition, 'requires-specific-review');
  assert.deepEqual(proof.requests.astylar, [{ source: '.button-toggle-option', declarations: { gap: '8px' } }]);
  assert.deepEqual(proof.requests.reference, []);
  for (const stage of Object.values(proof.candidateStages)) assert.deepEqual(stage, { gap: '8px' });
  assert.deepEqual(proof.formatting, { reference: 'block', astylar: 'flex' });
  assert.equal(proof.inputEquivalent, false);
});

test('gap survey rejects provenance, mapping, alias, shorthand, reset, motion and stage ambiguities', () => {
  const mutations = [
    v => { v.reference.errors.push('missing sheet'); },
    v => { v.candidate.resolvedStyleSource = 'guessed'; },
    v => { v.candidate.resolvedStyleRevision = -1; },
    v => { delete v.input.astylarResolvedStyleEvidenceVersion; },
    v => { v.reference.nodes.push(structuredClone(rn(v))); },
    v => { v.candidate.nodes.push(structuredClone(an(v))); },
    v => { v.reference.nodes.push({ ...structuredClone(rn(v)), key: 'duplicate-owner-id' }); },
    v => { v.candidate.nodes.push({ ...structuredClone(an(v)), key: 'duplicate-owner-id' }); },
    v => { v.input.referenceStructure.type = 'unrelated'; },
    v => { v.input.reference.rowGap = '0px'; },
    v => { v.reference.styles[rn(v).style].rowGap = '0px'; },
    v => { delete an(v).normalResolvedStyle; },
    v => { v.input.astylarInteractionResolvedStyle.gap = '9px'; },
    v => { rn(v).inline['grid-gap'] = { value: 'inherit', important: false }; },
    v => { rn(v).inline.all = { value: 'initial', important: false }; },
    v => { an(v).authored.style = { gap: '0' }; },
    v => { v.candidate.rules.push({ selector: ':is(#autocomplete-primary)', columnGap: '9px' }); },
    v => { v.candidate.rules.push({ selector: '#autocomplete-primary', gridColumnGap: '9px' }); },
    v => { v.candidate.rules.push({ selector: '#autocomplete-primary', animationName: 'gap-animation' }); },
    v => { v.candidate.rules.push({ selector: '#autocomplete-primary', transitionProperty: 'gap' }); },
    v => { an(v).authored.attributes = { style: 'gap: 5px' }; },
    v => { an(v).authored.attributes = { style: 'grid/**/-gap: 5px' }; },
    v => { rn(v).rules.push(999999); },
    v => { delete rn(v).inline; },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const value = structuredClone(base); mutate(value);
    assert.equal(inspect(value).disposition, 'requires-specific-review', `mutation ${index}`);
  }
  const unrelated = structuredClone(base);
  unrelated.candidate.rules.push({ selector: '#unrelated', gap: '99px' });
  unrelated.candidate.rules.push({ selector: '#autocomplete-primary', fontSize: '99px' });
  assert.equal(inspect(unrelated).disposition, 'captured-normal-versus-local-omission');
  assert.equal(inspect(base, 'fontSize').disposition, 'requires-specific-review');
  const alias = structuredClone(base), owner = rn(alias);
  owner.attributes['data-parity-id'] = owner.attributes.id; delete owner.attributes.id;
  assert.equal(inspect(alias).mapping, 'unique-reference-data-parity-id');
  alias.reference.nodes.push({ ...structuredClone(owner), key: 'ambiguous-alias' });
  assert.equal(inspect(alias).disposition, 'requires-specific-review');
});

test('full original gap population replays with explicit review cases and no canonical mutation', () => {
  assert.equal(report.groupCount, 162); assert.equal(report.originalCaseCount, 2311);
  assert.equal(report.observations, 9254); assert.equal(report.canonicalOccurrences, 9254);
  assert.equal(report.exactCountGroups, 162); assert.equal(report.localOmissionGroupsWithMatchingCount, 108);
  assert.equal(report.canonicalIntegration, false); assert.equal(report.computedCandidateVerified, false);
  assert.equal(report.renderingEquivalent, false); assert.equal(report.inputEquivalent, false);
  for (const g of report.groups) {
    assert.equal(g.originalCases.length, g.canonicalOccurrences);
    assert.equal(new Set(g.originalCases).size, g.originalCases.length);
    assert.deepEqual([...new Set(Object.values(g.reasons).flat())].sort(), [...g.originalCases].sort());
  }
  const canonicalFiles = ['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz', 'docs/material-input-equivalence-audit.md'];
  const before = canonicalFiles.map(file => hash(readFileSync(file))), surveyBefore = hash(readFileSync(reportFile));
  const output = JSON.parse(execFileSync(process.execPath, ['scripts/audit-material-owner-gap-inputs.mjs', '--check'],
    { encoding: 'utf8', timeout: 300000 }));
  assert.equal(output.observations, 9254); assert.equal(output.exactCountGroups, 162);
  assert.deepEqual(canonicalFiles.map(file => hash(readFileSync(file))), before);
  assert.equal(hash(readFileSync(reportFile)), surveyBefore);
});

test('generated gap owners reuse component ownership and all 89 scalar fields while preserving rule gaps', () => {
  const owners = [['badge', 'badge-count'], ['bottom-sheet', 'bottom-sheet-copy'],
    ['bottom-sheet', 'bottom-sheet-dismiss'], ['bottom-sheet', 'bottom-sheet-overlay'],
    ['bottom-sheet', 'bottom-sheet-panel'], ['dialog', 'dialog-panel'],
    ['paginator', 'paginator-range'], ['paginator', 'paginator-size'],
    ['snack-bar', 'snack-bar-overlay'], ['snack-bar', 'snack-bar-surface'],
    ['stepper', 'stepper-content'], ['tooltip', 'tooltip-popup']];
  for (const [family, id] of owners) {
    const value = original(family, id), before = JSON.stringify(value);
    assert.equal(inspect(value).disposition, 'requires-specific-review', `${id} without reviewed identity`);
    const check = v => inspectOwnerGapInput(v.input, 'rowGap', v.reference, v.candidate, { family });
    const proof = check(value);
    assert.ok(['mapped', 'mapped-with-scalar-rule-gap'].includes(proof.generatedIdentity.status), id);
    assert.equal(proof.generatedIdentity.checkedReferenceProperties, 89);
    assert.equal(proof.generatedIdentity.inputEquivalent, false); assert.equal(proof.inputEquivalent, false);
    assert.equal(JSON.stringify(value), before, `${id} must not receive a synthetic identity`);
    for (const mutate of [
      v => { v.input.reference.fontStyle = '__changed__'; },
      v => { delete v.input.reference.fontStyle; },
      v => { v.candidate.nodes.push({ ...structuredClone(an(v)), key: 'duplicate-generated-owner' }); },
      v => { v.reference.nodes.find(n => n.key === proof.referenceNode).parent = '__missing__'; },
    ]) {
      const changed = structuredClone(value); mutate(changed);
      assert.equal(check(changed).disposition, 'requires-specific-review', `${id} forged identity`);
      assert.ok(check(changed).issues.some(i => i.reason === 'owner-mapping'), `${id} identity must reject independently of its other issues`);
    }
    if (id.endsWith('-overlay')) {
      assert.equal(proof.disposition, 'requires-specific-review');
      assert.ok(proof.issues.some(i => i.reason === 'scalar-authored-rule-gap'));
      assert.ok(proof.generatedIdentity.missingRules.length > 0);
    }
  }
});

test('reviewed mapping changes only the 24 previously unmapped groups and preserves every original membership', () => {
  const previous = JSON.parse(execFileSync('git', ['show', '61e52156817a923d0c890d08f3cd3fd4bfa23ec6:docs/material-owner-gap-input-survey.json'], { maxBuffer: 8 * 1024 * 1024 }));
  assert.deepEqual(report.cases, previous.cases); assert.deepEqual(report.capture, previous.capture);
  assert.deepEqual(report.productionNormalization, previous.productionNormalization);
  let changed = 0, observations = 0;
  for (const [index, group] of report.groups.entries()) {
    const prior = previous.groups[index];
    for (const p of ['family', 'element', 'property', 'reference', 'candidate', 'canonicalOccurrences', 'originalCases', 'originalCountMatchesCanonical'])
      assert.deepEqual(group[p], prior[p]);
    if (Object.hasOwn(prior.reasons, 'owner-mapping')) {
      changed++; observations += group.originalCases.length;
      assert.equal(Object.hasOwn(group.reasons, 'owner-mapping'), false);
      for (const witness of Object.values(group.witnesses)) {
        assert.ok(witness.proof.generatedIdentity); assert.equal(witness.proof.inputEquivalent, false);
      }
    } else assert.deepEqual(group, prior, 'all other complete group evidence must be conserved');
  }
  assert.equal(changed, 24); assert.equal(observations, 884);
  assert.equal(report.groups.filter(g => Object.hasOwn(g.reasons, 'scalar-authored-rule-gap')).length, 4);
});
