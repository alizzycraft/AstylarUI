import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const populationBytes = readFileSync('docs/material-position-input-population.json');
assert.equal(hash(populationBytes), '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff');
const population = JSON.parse(populationBytes);
const groups = population.groups.filter(g => ['bottom-sheet-overlay', 'snack-bar-overlay'].includes(g.element));
assert.equal(groups.length, 2);
const results = [];
for (const group of groups) {
  const rows = [];
  for (const observation of group.observations) {
    const trees = {};
    for (const side of ['reference', 'astylar']) {
      const receipt = observation.inputTrees[side], bytes = readFileSync(receipt.file);
      assert.equal(hash(bytes), receipt.sha256);
      trees[side] = JSON.parse(bytes);
    }
    const reference = trees.reference;
    const wrappers = reference.nodes.filter(n => n.attributes?.class?.split(' ').includes('cdk-global-overlay-wrapper'));
    assert.equal(wrappers.length, 1);
    const wrapper = wrappers[0], parent = reference.nodes.find(n => n.key === wrapper.parent);
    assert.ok(parent.attributes.class.split(' ').includes('cdk-overlay-container'));
    assert.equal(reference.styles[wrapper.style].position, 'absolute');
    assert.equal(reference.styles[parent.style].position, 'fixed');
    const candidate = trees.astylar;
    const owners = candidate.nodes.filter(n => n.authored?.id === group.element);
    assert.equal(owners.length, 1);
    assert.equal(owners[0].resolvedStyle.position, 'fixed');
    const chain = [], seen = new Set();
    let cursor = candidate.nodes.find(n => n.key === owners[0].parent);
    while (cursor) {
      assert.ok(!seen.has(cursor.key)); seen.add(cursor.key);
      chain.push({ id: cursor.authored?.id ?? null, position: cursor.resolvedStyle?.position ?? null,
        transform: cursor.resolvedStyle?.transform ?? null });
      const key = cursor.parent;
      cursor = candidate.nodes.find(n => n.key === key);
      if (key !== null && key !== undefined) assert.ok(cursor, 'missing captured parent');
    }
    rows.push({ case: observation.case, referenceParent: parent.key,
      referenceParentPosition: reference.styles[parent.style].position,
      referenceParentTransform: reference.styles[parent.style].transform, candidateChain: chain });
  }
  assert.equal(rows.length, group.family === 'bottom-sheet' ? 25 : 34);
  assert.equal(new Set(rows.map(r => r.case)).size, rows.length);
  results.push({ family: group.family, count: rows.length,
    chains: [...new Set(rows.map(r => JSON.stringify(r.candidateChain)))],
    referenceParentTransforms: [...new Set(rows.map(r => r.referenceParentTransform))],
    rowsSha256: hash(JSON.stringify(rows)) });
}
console.log(JSON.stringify({ results, classificationChanged: false, containingBlockEquivalenceProven: false,
  missingSnackbarCauseProven: false }, null, 2));
