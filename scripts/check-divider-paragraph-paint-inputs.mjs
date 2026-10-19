import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Inspect only the finite retained wrapper-input gap, not a new CSS normalizer.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reviewSha = '33a0bd8b71e92c7ededcc6f8e2cbf9ef1f5e981034362793c0531851672fe617';
const file = `artifacts/material-parity/working-audit/proposals/${reviewSha}.json`;
const review = JSON.parse(readFileSync(file)).review;
assert.equal(hash(JSON.stringify(review)), reviewSha);
const read = receipt => {
  const bytes = readFileSync(receipt.file);
  assert.equal(hash(bytes), receipt.sha256);
  return JSON.parse(bytes);
};
const sides = ['Top', 'Right', 'Bottom', 'Left'];
const corners = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'];
function inspect(reference, candidate) {
  assert.equal(reference.backgroundColor, 'rgba(0, 0, 0, 0)');
  assert.equal(candidate.background, 'transparent');
  assert.equal(reference.opacity, '1');
  assert.equal(candidate.opacity, '1.0');
  for (const side of sides) {
    assert.equal(reference[`padding${side}`], '0px');
    assert.equal(reference[`border${side}Width`], '0px');
    assert.equal(reference[`border${side}Style`], 'none');
  }
  for (const corner of corners) assert.equal(reference[`border${corner}Radius`], '0px');
  assert.equal(candidate.padding, '0');
  assert.equal(candidate.borderWidth, '0');
  assert.equal(candidate.borderStyle, 'none');
  assert.equal(candidate.borderRadius, '0');
  // Border color is a known UNEQUAL input, even though these widths are zero.
  assert.equal(candidate.borderColor, 'transparent');
  for (const side of sides) assert.equal(reference[`border${side}Color`], reference.color);
  assert.notEqual(reference.color, 'rgba(0, 0, 0, 0)');
}
const observations = [];
let stages = 0, rejectedControls = 0;
for (const group of review.groups.filter(group => group.family === 'divider')) {
  const reference = read(group.evidence.pairedTrees.reference);
  const candidate = read(group.evidence.pairedTrees.astylar);
  for (const id of ['divider-above', 'divider-below']) {
    const leaves = reference.nodes.filter(node => node.attributes?.id === id);
    assert.equal(leaves.length, 1);
    const parents = reference.nodes.filter(node => node.key === leaves[0].parent);
    assert.equal(parents.length, 1); assert.equal(parents[0].type, 'p');
    const owners = candidate.nodes.filter(node => node.authored.id === `${id}-row`);
    assert.equal(owners.length, 1); assert.equal(owners[0].authored.type, 'p');
    const style = reference.styles[parents[0].style];
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
      inspect(style, owners[0][stage]); stages++;
    }
    for (const [property, value] of [['background', '#ffffff'], ['opacity', '0.5'],
      ['padding', '1px'], ['borderWidth', '1px'], ['borderStyle', 'solid'], ['borderRadius', '1px']]) {
      assert.throws(() => inspect(style, { ...owners[0].resolvedStyle, [property]: value })); rejectedControls++;
    }
    assert.throws(() => inspect({ ...style, borderTopColor: 'rgba(0, 0, 0, 0)' }, owners[0].resolvedStyle));
    rejectedControls++;
    observations.push({ case: group.case, target: id, referenceOwner: parents[0].key,
      candidateOwner: owners[0].key, evidence: group.evidence.pairedTrees,
      matchingRequests: ['transparent background color', 'unit opacity', 'zero padding',
        'zero border widths', 'none border styles', 'zero corner radii'],
      unequalBorderColor: { reference: style.color, candidate: 'transparent',
        sourceFinding: 'core-border-initial-color-differs-from-css' } });
  }
}
assert.equal(observations.length, 48); assert.equal(stages, 144); assert.equal(rejectedControls, 336);
console.log(JSON.stringify({ producer: { file: 'scripts/check-divider-paragraph-paint-inputs.mjs',
  sha256: hash(readFileSync(import.meta.filename)) }, reviewSha, cases: 24,
  paragraphPairs: observations.length, stages, rejectedControls, observations,
  conclusion: 'These retained wrapper background-color/inset/border-shape/opacity requests match through all three candidate stages; known currentColor versus transparent border initial inputs remain unequal.',
  boundary: 'Finite recorded input correspondence only. No background-layer completeness,used geometry,anonymous baseline,ancestor compositing,material/shader execution,raster causality,current browser or whole-case acceptance.' }));
