import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { inspectOwnerInitialStyle } from './owner-initial-style-survey.mjs';

const raw = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
const load = (family, element) => {
  const e = raw.results.find(e => e.family === family);
  return { family, input: e.styleInputs.find(i => i.id === element),
    reference: JSON.parse(readFileSync(e.inputTrees.reference.file)),
    candidate: JSON.parse(readFileSync(e.inputTrees.astylar.file)) };
};
const inspect = v => inspectOwnerInitialStyle(v.input, 'fontStyle', v.reference, v.candidate,
  { family: v.family, reviewedGeneratedOwners: true });
const badge = load('badge', 'badge-count');

test('mapped survey reuses the exact generated badge path without rewriting IDs or accepting motion', () => {
  const before = JSON.stringify(badge), proof = inspect(badge);
  assert.equal(proof.mapping.kind, 'reviewed-showcase-template-text');
  assert.equal(proof.mapping.referenceNode, 'frame/2/0/1');
  assert.equal(proof.mapping.astylarNode, 'root/0/2/0/1');
  assert.ok(proof.issues.some(i => i.reason === 'motion-request-needs-review'));
  assert.ok(!proof.issues.some(i => i.reason === 'owner-mapping'));
  assert.equal(proof.computedCandidateVerified, false); assert.equal(proof.renderingEquivalent, false);
  assert.equal(JSON.stringify(badge), before);
  assert.ok(badge.reference.nodes.some(n => n.attributes?.id === 'mat-badge-content-0'));
  assert.ok(!badge.reference.nodes.some(n => n.attributes?.id === 'badge-count'));
});

test('mapped survey accepts a unique real data-parity alias', () => {
  const slider = load('slider', 'slider-visual'), proof = inspect(slider);
  assert.equal(proof.mapping.kind, 'unique-captured-data-parity-id');
  assert.equal(proof.mapping.referenceNode, 'frame/2/0');
});

test('mapped survey disambiguates retained stepper panels only through the reviewed active path', () => {
  const entries = [...raw.results, ...raw.interactions].filter(e => e.family === 'stepper');
  assert.equal(entries.length, 68);
  const texts = new Set();
  for (const e of entries) {
    const v = { family: e.family, input: e.styleInputs.find(i => i.id === 'stepper-content'),
      reference: JSON.parse(readFileSync(e.inputTrees.reference.file)),
      candidate: JSON.parse(readFileSync(e.inputTrees.astylar.file)) };
    const before = JSON.stringify(v), proof = inspect(v);
    assert.equal(v.reference.nodes.filter(n => n.attributes?.['data-parity-id'] === 'stepper-content').length, 2);
    assert.equal(proof.mapping?.kind, 'reviewed-showcase-template-text');
    const owner = v.reference.nodes.find(n => n.key === proof.mapping.referenceNode);
    texts.add(owner.ownText);
    assert.ok(v.reference.nodes.find(n => n.key === owner.parent).attributes.class.split(/\s+/)
      .includes('mat-horizontal-stepper-content-current'));
    assert.ok(!proof.issues.some(i => ['owner-mapping', 'scalar-tree-content-disagreement'].includes(i.reason)));
    assert.equal(proof.computedCandidateVerified, false);
    assert.equal(proof.renderingEquivalent, false);
    assert.equal(JSON.stringify(v), before);
    const reordered = structuredClone(v);
    reordered.reference.nodes.reverse();
    assert.equal(inspect(reordered).mapping?.referenceNode, owner.key, 'identity must not depend on capture order');
    for (const mutation of ['both-active', 'neither-active', 'foreign-parent', 'wrong-active-text']) {
      const changed = structuredClone(v);
      const aliases = changed.reference.nodes.filter(n => n.attributes?.['data-parity-id'] === 'stepper-content');
      const active = aliases.find(n => n.key === owner.key);
      const inactive = aliases.find(n => n.key !== owner.key);
      const panel = changed.reference.nodes.find(n => n.key === active.parent);
      if (mutation === 'both-active') changed.reference.nodes.find(n => n.key === inactive.parent)
        .attributes.class += ' mat-horizontal-stepper-content-current';
      if (mutation === 'neither-active') panel.attributes.class = panel.attributes.class
        .replace('mat-horizontal-stepper-content-current', 'mat-horizontal-stepper-content-next');
      if (mutation === 'foreign-parent') active.parent = 'frame';
      if (mutation === 'wrong-active-text') active.ownText = 'unrelated text';
      assert.ok(inspect(changed).issues.some(i => i.reason === 'owner-mapping'), mutation);
    }
  }
  assert.deepEqual([...texts].sort(), ['Project details', 'Review changes']);
});

test('mapped survey rejects fabricated, conflicting or transplanted generated owners', () => {
  const mutations = [
    v => { v.family = 'card'; },
    v => { v.reference.nodes.find(n => n.attributes?.id === 'mat-badge-content-0').attributes.id = 'foreign'; },
    v => { v.reference.nodes.find(n => n.attributes?.id === 'mat-badge-content-0').attributes.class = ''; },
    v => { v.reference.nodes.find(n => n.attributes?.id === 'mat-badge-content-0').ownText = 'wrong'; },
    v => { v.reference.nodes.find(n => n.attributes?.id === 'mat-badge-content-0').parent = 'frame'; },
    v => { const n = v.reference.nodes.find(n => n.attributes?.id === 'mat-badge-content-0'); v.reference.nodes.push({ ...structuredClone(n), key: 'duplicate' }); },
    v => { v.reference.nodes.find(n => n.attributes?.id === 'badge-primary').attributes.id = 'badge-count'; },
    v => { v.candidate.nodes.find(n => n.authored?.id === 'badge-count').authored.textContent = 'wrong'; },
    v => { v.input.referenceStructure.type = 'div'; },
  ];
  for (const [i, mutate] of mutations.entries()) {
    const v = structuredClone(badge); mutate(v);
    assert.equal(inspect(v).disposition, 'requires-specific-review', `mutation ${i}`);
    assert.ok(inspect(v).issues.some(x => ['owner-mapping', 'incomplete-surface-ancestry', 'scalar-tree-disagreement', 'scalar-tree-content-disagreement'].includes(x.reason)), `mutation ${i}`);
  }
});

test('mapped survey replays exact unresolved membership and all original trees without writes', () => {
  const file = 'docs/material-owner-initial-style-mappings.json', hash = b => createHash('sha256').update(b).digest('hex');
  const before = hash(readFileSync(file)), report = JSON.parse(readFileSync(file));
  const output = JSON.parse(execFileSync(process.execPath, ['scripts/audit-material-owner-initial-mappings.mjs', '--check'],
    { encoding: 'utf8', timeout: 300000 }));
  assert.equal(output.groups, 600); assert.equal(output.observations, 31508);
  assert.equal(output.canonicalAttributionChanged, false);
  assert.equal(report.groups.reduce((n, g) => n + g.preservedStaticCases.length, 0), 636);
  for (const group of report.groups) {
    assert.deepEqual(group.reviewedCases, group.cases);
    assert.deepEqual([...new Set(Object.values(group.reasons).flat())].sort(), [...group.cases].sort());
  }
  assert.equal(hash(readFileSync(file)), before);
});
