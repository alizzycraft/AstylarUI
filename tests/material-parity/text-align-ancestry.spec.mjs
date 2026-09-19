import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectTextAlignAncestry, inspectTextAlignAncestry } from '../../scripts/audit-material-text-align-ancestry.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const file = 'docs/material-text-align-ancestry.json';
const savedBytes = readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), saved = JSON.parse(savedBytes);
const captureBytes = readFileSync(saved.originalCapture.file);
assert.equal(hash(captureBytes), saved.originalCapture.sha256);
const capture = JSON.parse(captureBytes);
const entries = new Map([['static', capture.results], ['interaction', capture.interactions]].flatMap(([kind, entries]) =>
  entries.map(entry => [`${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`, entry])));
function fixture(finding = saved.findings.find(f => f.element === 'checkbox-label')) {
  assert.ok(finding);
  const entry = entries.get(finding.case), trees = {};
  for (const [side, descriptor] of Object.entries(finding.inputTrees)) {
    const bytes = readFileSync(descriptor.file); assert.equal(hash(bytes), descriptor.sha256); trees[side] = JSON.parse(bytes);
  }
  return { family: finding.family, input: structuredClone(entry.styleInputs.find(input => input.id === finding.element)),
    reference: trees.reference, candidate: trees.astylar };
}
const inspect = fixture => inspectTextAlignAncestry(fixture.input, fixture.reference, fixture.candidate, fixture.family);
const owner = fixture => fixture.candidate.nodes.find(node => node.authored?.id === fixture.input.id);

test('text alignment survey independently replays every original differing owner and preserves its sources', () => {
  assert.equal(entries.size, 2311); assert.equal(saved.casesScanned, 2311);
  const identities = [];
  for (const [key, entry] of entries) for (const input of entry.styleInputs)
    if (input.reference && input.astylar && input.reference.textAlign !== input.astylar.textAlign)
      identities.push([key, input.id]);
  assert.deepEqual(saved.findings.map(f => [f.case, f.element]), identities);
  assert.equal(saved.observations, identities.length);
  assert.equal(saved.groups.reduce((n, group) => n + group.cases.length, 0), identities.length);
  assert.equal(saved.missingScalarObservations.length, 8);
  const before = hash(savedBytes), actual = JSON.stringify(collectTextAlignAncestry(), null, 2) + '\n';
  assert.equal(hash(actual), before, 'complete source replay changed');
  assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), savedBytes);
  for (const pattern of saved.patterns) {
    assert.equal(hash(JSON.stringify(pattern.proof)), pattern.sha256);
    for (const claim of ['candidateComputedVerified', 'inputEquivalent', 'renderingEquivalent', 'rendererCauseProven'])
      assert.equal(pattern.proof[claim], false);
  }
});

test('inherited alignment requests and ambiguous selectors remain evidence, not synthesized computed values', () => {
  const f = fixture(), before = JSON.stringify(f), original = inspect(f);
  assert.equal(JSON.stringify(f), before, 'inspection mutated original evidence');
  assert.equal(original.candidate, '<omitted>');
  const a = owner(f), parent = f.candidate.nodes.find(node => node.key === a.parent);
  parent.authored.style = { ...parent.authored.style, textAlign: 'right' };
  parent.authored.attributes = { ...parent.authored.attributes, style: 'text-align: right !important' };
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) parent[stage].textAlign = 'right';
  f.candidate.rules.push({ selector: ':unreviewed(.some-state)', textAlign: 'center', mediaMaxWidth: '200px' });
  const proof = inspect(f);
  assert.equal(proof.status, 'omitted-owner-local-with-ancestor-request');
  assert.equal(proof.candidate, '<omitted>'); assert.equal(proof.candidateInheritanceResolved, false);
  assert.equal(proof.candidatePath.find(node => node.node === parent.key).authored.attributes.style, 'text-align: right !important');
  assert.ok(proof.candidatePath.some(node => node.possibleRules.some(rule =>
    rule.selector === ':unreviewed(.some-state)' && rule.declarations.textAlign === 'center' && rule.mediaMaxWidth === '200px')));
  assert.ok(proof.candidateRequestNodes.includes(parent.key));
  assert.equal(proof.inputEquivalent, false);
});

test('alignment ancestry rejects missing or cyclic parents and changed scalar identity', () => {
  const mutations = [
    f => { owner(f).parent = 'missing-parent'; },
    f => { owner(f).parent = owner(f).key; },
    f => { f.candidate.nodes.push(structuredClone(owner(f))); },
    f => { f.input.reference.textAlign = 'invented'; },
    f => { owner(f).resolvedStyle.textAlign = 'right'; },
    f => { f.candidate.resolvedStyleSource = 'fabricated'; },
    f => { f.reference.errors.push('capture error'); },
  ];
  for (const mutate of mutations) { const f = fixture(); mutate(f); assert.throws(() => inspect(f)); }
});

test('source population retains layer capture gaps and does not silently adopt previous classifications', () => {
  const gaps = saved.findings.filter(f => saved.patterns[f.pattern].proof.status === 'unresolved-alias-scalar-rule-gap');
  assert.equal(gaps.length, 59);
  assert.equal(gaps.filter(f => f.element === 'bottom-sheet-overlay').length, 25);
  assert.equal(gaps.filter(f => f.element === 'snack-bar-overlay').length, 34);
  for (const group of saved.groups) assert.equal(Object.hasOwn(group, 'classification'), false);
  assert.equal(saved.canonicalAttributionChanged, false);
  for (const f of gaps) {
    const proof = saved.patterns[f.pattern].proof;
    assert.equal(proof.identity.generatedIdentity.status, 'mapped-with-scalar-rule-gap');
    assert.equal(proof.candidatePath, undefined);
  }
});
