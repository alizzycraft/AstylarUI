import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

// Bounded counterpart of the existing passive recorded-node accounting proof.
// Unequal groups describe ownership; they do not assert structural equivalence.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceFile = 'artifacts/material-parity/card-recorded-header-topology-20261021.log';
const sourceBytes = fs.readFileSync(sourceFile), source = JSON.parse(sourceBytes);
const referenceTypes = ['main', 'p', 'h1', 'section', 'mat-card', 'mat-card-header',
  'div', 'mat-card-title', 'mat-card-content', 'mat-card-actions', 'button',
  'span', 'span', 'span', 'span'];
const candidateIds = ['page', 'eyebrow', 'title', 'card-root', 'card-primary',
  'card-header', 'card-title', 'card-copy', 'card-actions', 'card-open'];
function inspect(reference, candidate, interaction) {
  assert.deepEqual(reference.nodes.map(n => n.type),
    [...referenceTypes, ...(interaction ? ['span'] : [])]);
  assert.deepEqual(candidate.nodes.slice(1).map(n => n.authored.id), candidateIds);
  assert.equal(candidate.nodes[0].key, 'root');
  assert.deepEqual(candidate.nodes[0].authored, {});
  for (const [side, tree] of [['reference', reference], ['candidate', candidate]]) {
    assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
    for (const node of tree.nodes) {
      const root = side === 'reference' ? 'frame' : 'root';
      assert.equal(node.parent, node.key === root ? null : node.key.slice(0, node.key.lastIndexOf('/')));
      if (side === 'reference') assert.ok(tree.styles[node.style]);
      else if (node.key !== 'root') for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle'])
        assert.ok(node[stage]);
    }
  }
  const common = ['', '0', '1', '2', '2/0', '2/0/0'];
  const pairs = common.map(key => [[key], [key]]);
  pairs.push([['2/0/0/0'], []], [['2/0/0/0/0'], ['2/0/0/0']],
    [['2/0/1'], ['2/0/1']], [['2/0/2'], ['2/0/2']],
    [['2/0/2/0', ...Array.from({ length: interaction ? 5 : 4 }, (_, i) => `2/0/2/0/${i}`)], ['2/0/2/0']]);
  const seen = { reference: new Set(), candidate: new Set(['root']) };
  const groups = pairs.map(([left, right]) => Object.fromEntries([
    ['reference', left, reference, 'frame'], ['candidate', right, candidate, 'root/0'],
  ].map(([side, keys, tree, prefix]) => [side, keys.map(relative => {
    const key = prefix + (relative ? '/' + relative : '');
    assert.ok(!seen[side].has(key)); seen[side].add(key);
    const nodes = tree.nodes.filter(n => n.key === key); assert.equal(nodes.length, 1);
    const n = nodes[0];
    return { key, parent: n.parent, type: n.type ?? n.authored.type,
      text: side === 'reference' ? n.ownText : n.authored.textContent ?? '' };
  })])));
  for (const [side, tree] of [['reference', reference], ['candidate', candidate]])
    assert.deepEqual([...seen[side]].sort(), tree.nodes.map(n => n.key).sort());
  assert.deepEqual(reference.nodes.map(n => n.ownText).filter(Boolean),
    ['Angular Material 20 reference', 'card', 'Project Atlas', 'Material surface content.', 'OPEN']);
  assert.deepEqual(candidate.nodes.map(n => n.authored.textContent).filter(Boolean),
    ['Angular Material 20 reference', 'card', 'Project Atlas', 'Material surface content.']);
  assert.equal(candidate.nodes.at(-1).authored.value, 'OPEN');
  return groups;
}
let controls = 0, referenceNodes = 0, candidateNodes = 0;
const observations = source.observed.map(row => {
  const pair = {};
  for (const side of ['reference', 'astylar']) {
    const receipt = row.evidence[side], bytes = fs.readFileSync(receipt.file);
    assert.equal(hash(bytes), receipt.sha256); pair[side] = JSON.parse(bytes);
  }
  const interaction = row.case.startsWith('interaction:');
  const groups = inspect(pair.reference, pair.astylar, interaction);
  for (const mutate of [p => p.reference.nodes.pop(), p => { p.astylar.nodes[6].parent = 'root'; },
    p => { p.reference.nodes[7].ownText += ' '; }, p => p.astylar.nodes.push(p.astylar.nodes[1])]) {
    const forged = structuredClone(pair); mutate(forged);
    assert.throws(() => inspect(forged.reference, forged.astylar, interaction)); controls++;
  }
  referenceNodes += pair.reference.nodes.length; candidateNodes += pair.astylar.nodes.length;
  return { case: row.case, evidence: row.evidence, groups };
});
assert.equal(observations.length, 52); assert.equal(controls, 208);
console.log(JSON.stringify({ producer: { file: 'scripts/check-card-recorded-nodes.mjs',
  sha256: hash(fs.readFileSync('scripts/check-card-recorded-nodes.mjs')) },
  predecessorEvidence: { file: sourceFile, sha256: hash(sourceBytes) },
  cases: 52, referenceNodes, candidateNodes, negativeControlsRejected: controls, observations,
  boundary: 'Every retained element is accounted for. Native header-text wrapper omission and title tag/flex-role substitution remain unequal inputs. Button children versus value-label authoring is already classified. No anonymous-box, complete style/AX/paint, live resource or current rendering equivalence is inferred.',
  canonicalPublication: false, inspectionComplete: false, renderingAccepted: false }));
