import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

// Recorded-element accounting only, following check-card-recorded-nodes.mjs.
// It does not manufacture browser anonymous boxes or accept unequal structures.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reviewId = '5caa57e5f2254471d9d082ff0831db36704f73997b41ae48aa4b4064b45c4c99';
const reviewFile = `artifacts/material-parity/working-audit/proposals/${reviewId}.json`;
const review = JSON.parse(fs.readFileSync(reviewFile)).review;
assert.equal(hash(JSON.stringify(review)), reviewId);
const rows = review.groups.filter(row => row.family === 'expansion');
assert.equal(rows.length, 68); assert.equal(new Set(rows.map(row => row.case)).size, 68);
const referenceTypes = ['main', 'p', 'h1', 'section', 'mat-expansion-panel',
  'mat-expansion-panel-header', 'span', 'mat-panel-title'];
const candidateIds = ['page', 'eyebrow', 'title', 'expansion-root', 'expansion-shell',
  'expansion-primary', 'expansion-title', 'expansion-chevron', 'expansion-content', 'expansion-content-label'];
function inspect(reference, candidate, disabled) {
  assert.deepEqual(reference.nodes.map(n => n.type), [...referenceTypes,
    ...(!disabled ? ['span', 'svg', 'path'] : []), 'div', 'div', 'div', 'p']);
  assert.deepEqual(candidate.nodes.slice(1).map(n => n.authored.id), candidateIds);
  assert.equal(candidate.nodes[0].key, 'root'); assert.deepEqual(candidate.nodes[0].authored, {});
  for (const [side, tree] of [['reference', reference], ['candidate', candidate]]) {
    assert.deepEqual(tree.errors, []);
    assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
    for (const node of tree.nodes) {
      const root = side === 'reference' ? 'frame' : 'root';
      assert.equal(node.parent, node.key === root ? null : node.key.slice(0, node.key.lastIndexOf('/')));
      if (side === 'reference') assert.ok(tree.styles[node.style]);
      else if (node.key !== 'root') for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle'])
        assert.ok(node[stage]);
    }
  }
  assert.deepEqual(reference.nodes.map(n => n.ownText).filter(Boolean),
    ['Angular Material 20 reference', 'expansion', 'Advanced settings', 'Additional options.']);
  assert.deepEqual(candidate.nodes.map(n => n.authored.textContent).filter(Boolean),
    ['Angular Material 20 reference', 'expansion', 'Advanced settings', 'Additional options.']);
  const trigger = candidate.nodes.find(n => n.authored.id === 'expansion-primary');
  assert.equal(trigger.authored.ariaDisabled, disabled);
  const indicator = candidate.nodes.find(n => n.authored.id === 'expansion-chevron');
  assert.equal(indicator.authored.class.includes('disabled'), disabled);
  if (disabled) for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle'])
    assert.equal(indicator[stage].display, 'none');
  const specifications = ['', '0', '1', '2', '2/0', '2/0/0'].map(key => ({
    label: `owner:${key || 'page'}`, reference: [key], candidate: [key] }));
  specifications.push(
    { label: 'native-header-content-wrapper', reference: ['2/0/0/0'], candidate: [] },
    { label: 'title', reference: ['2/0/0/0/0'], candidate: ['2/0/0/0'] },
    { label: 'indicator-svg-versus-border-owner', reference: disabled ? [] : ['2/0/0/1', '2/0/0/1/0', '2/0/0/1/0/0'], candidate: ['2/0/1'] },
    { label: 'native-grid-and-labelled-region-wrappers', reference: ['2/0/1', '2/0/1/0'], candidate: [] },
    { label: 'native-padded-body-wrapper', reference: ['2/0/1/0/0'], candidate: [] },
    { label: 'paragraph-and-candidate-offset-label', reference: ['2/0/1/0/0/0'], candidate: ['2/0/2', '2/0/2/0'] });
  const seen = { reference: new Set(), candidate: new Set(['root']) };
  const groups = specifications.map(spec => ({ label: spec.label, ...Object.fromEntries(
    [['reference', reference, 'frame'], ['candidate', candidate, 'root/0']].map(([side, tree, prefix]) =>
      [side, spec[side].map(relative => {
        const key = prefix + (relative ? '/' + relative : '');
        assert.ok(!seen[side].has(key)); seen[side].add(key);
        const matches = tree.nodes.filter(n => n.key === key); assert.equal(matches.length, 1);
        const node = matches[0];
        return { key, parent: node.parent, type: node.type ?? node.authored.type,
          text: side === 'reference' ? node.ownText : node.authored.textContent ?? '' };
      })])) }));
  for (const [side, tree] of [['reference', reference], ['candidate', candidate]])
    assert.deepEqual([...seen[side]].sort(), tree.nodes.map(n => n.key).sort());
  return groups;
}
let controls = 0, referenceNodes = 0, candidateNodes = 0, disabledCases = 0;
const observations = rows.map(row => {
  const pair = {};
  for (const side of ['reference', 'astylar']) {
    const receipt = row.evidence.pairedTrees[side], bytes = fs.readFileSync(receipt.file);
    assert.equal(hash(bytes), receipt.sha256); pair[side] = JSON.parse(bytes);
  }
  const disabled = row.case.endsWith('/disabled'); disabledCases += Number(disabled);
  const groups = inspect(pair.reference, pair.astylar, disabled);
  const mutations = [p => p.reference.nodes.pop(), p => { p.astylar.nodes[7].parent = 'root'; },
    p => { p.reference.nodes[7].ownText += ' '; }, p => p.astylar.nodes.push(p.astylar.nodes[1])];
  if (disabled) mutations.push(p => { p.astylar.nodes[8].resolvedStyle.display = 'block'; });
  for (const mutate of mutations) {
    const forged = structuredClone(pair); mutate(forged);
    assert.throws(() => inspect(forged.reference, forged.astylar, disabled)); controls++;
  }
  referenceNodes += pair.reference.nodes.length; candidateNodes += pair.astylar.nodes.length;
  return { case: row.case, disabled, evidence: row.evidence.pairedTrees, groups };
});
assert.equal(disabledCases, 8); assert.equal(controls, 280);
console.log(JSON.stringify({ producer: { file: 'scripts/check-expansion-recorded-nodes.mjs',
  sha256: hash(fs.readFileSync('scripts/check-expansion-recorded-nodes.mjs')) }, review: { file: reviewFile, reviewSha256: reviewId },
  cases: 68, referenceNodes, candidateNodes, disabledCases, negativeControlsRejected: controls, observations,
  boundary: 'Every retained element is accounted for. Disabled candidate indicator remains authored but all three captured resolved stages use display:none; native indicator is omitted. Other groups preserve unequal header, SVG/border, collapse/region and offset-label composition, not structural equivalence. Existing flow/semantic causes remain separate. No anonymous formatting boxes, complete styles, hit testing, actual AX, paint, runtime currentness or whole-case closure are inferred.',
  canonicalPublication: false, inspectionComplete: false, renderingAccepted: false }));
