import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveGeneratedReferenceNode } from '../tests/material-parity/generated-node-mapping-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function collectTooltipPositionAncestry() {
const file = 'docs/material-position-input-population.json';
const bytes = readFileSync(file);
assert.equal(hash(bytes), '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff');
const group = JSON.parse(bytes).groups.find(g => g.element === 'tooltip-popup');
assert.equal(group.occurrences, 18);
assert.equal(group.observations.length, 18);
assert.equal(new Set(group.observations.map(o => o.case)).size, 18);
const properties = ['position', 'display', 'flexDirection', 'top', 'left', 'right', 'bottom',
  'width', 'height', 'transform', 'alignItems', 'justifyContent', 'padding', 'margin'];
const observations = group.observations.map(observation => {
  const paths = {};
  for (const side of ['reference', 'astylar']) {
    const receipt = observation.inputTrees[side];
    assert.ok(receipt.file.startsWith('artifacts/material-parity/current-ancestry-audit/'));
    const source = readFileSync(receipt.file);
    assert.equal(hash(source), receipt.sha256);
    const tree = JSON.parse(source);
    assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
    let node;
    if (side === 'reference') {
      const mapping = resolveGeneratedReferenceNode(tree, 'tooltip-popup', 'tooltip');
      assert.equal(mapping.status, 'mapped');
      node = tree.nodes.find(n => n.key === mapping.node.key);
    } else {
      const matches = tree.nodes.filter(n => n.authored?.id === 'tooltip-popup');
      assert.equal(matches.length, 1);
      node = matches[0];
    }
    const visited = new Set(), chain = [];
    while (node) {
      assert.ok(!visited.has(node.key)); visited.add(node.key);
      const style = side === 'reference' ? tree.styles[node.style] : node.resolvedStyle;
      chain.push({ key: node.key, parent: node.parent, attributes: node.attributes ?? null,
        authored: node.authored ?? null, styles: Object.fromEntries(properties.map(property =>
          [property, { present: Object.hasOwn(style ?? {}, property), value: style?.[property] ?? null }])) });
      if (node.parent === null) break;
      const parent = tree.nodes.find(n => n.key === node.parent);
      assert.ok(parent, 'missing ancestor'); node = parent;
    }
    paths[side] = chain;
  }
  return { case: observation.case, inputTrees: observation.inputTrees, paths };
});
return { kind: 'tooltip-position-ancestry-inspection', population: { file, sha256: hash(bytes) },
  observations, canonicalAttributionChanged: false, rendererCauseProven: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(JSON.stringify(collectTooltipPositionAncestry(), null, 2));
}
