import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const owner = (tree, id, side) => {
  const nodes = tree.nodes.filter(n => (side === 'reference' ? n.attributes?.id : n.authored?.id) === id);
  assert.equal(nodes.length, 1, `ambiguous ${side} owner ${id}`); return nodes[0];
};
export function proveGridPositionSubstitution(reference, candidate) {
  const refRoot = owner(reference, 'grid-list-primary', 'reference');
  const astRoot = owner(candidate, 'grid-list-primary', 'astylar');
  const refStyle = reference.styles[refRoot.style];
  assert.equal(refStyle.position, 'relative'); assert.equal(refStyle.display, 'block');
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    const style = astRoot[stage]; assert.ok(style);
    assert.equal(Object.hasOwn(style, 'position'), false);
    assert.equal(style.display, 'grid'); assert.equal(style.gridTemplateColumns, '1fr 1fr');
    assert.equal(style.gap, '0');
  }
  const tiles = ['grid-tile-one', 'grid-tile-two'].map((id, i) => {
    const ref = owner(reference, id, 'reference'), ast = owner(candidate, id, 'astylar');
    assert.equal(ast.parent, astRoot.key);
    const seen = new Set(); let cursor = ref;
    while (cursor.key !== refRoot.key) {
      assert.ok(!seen.has(cursor.key), 'cyclic ancestry'); seen.add(cursor.key);
      const parents = reference.nodes.filter(n => n.key === cursor.parent);
      assert.equal(parents.length, 1); cursor = parents[0];
    }
    assert.equal(reference.styles[ref.style].position, 'absolute');
    assert.equal(ref.inline.width.value, 'calc(50% - 0.5px)');
    assert.equal(ref.inline.height.value, 'calc(80px)');
    assert.equal(ref.inline.left.value, i === 0 ? '0px' : 'calc(50% + 0.5px)');
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
      assert.equal(ast[stage].position, 'relative'); assert.equal(ast[stage].display, 'flex');
      assert.equal(ast[stage].height, '80px');
    }
    return { id, referenceKey: ref.key, candidateKey: ast.key, referenceInline: ref.inline,
      referencePosition: 'absolute', candidatePosition: 'relative' };
  });
  return { referenceRootKey: refRoot.key, candidateRootKey: astRoot.key,
    referenceRootPosition: 'relative', candidateRootPositionOmitted: true,
    referenceLayout: 'block with absolute tiles and calc sizing', candidateLayout: 'zero-gap two-track grid with relative flex tiles',
    tiles, classification: 'application-plugin-authoring-defect',
    firstDivergence: 'authored layout requests before core layout and projection',
    usedCandidateRootPositionProven: false, rendererCauseProven: false, renderingEquivalent: false };
}
export function collectGridPositionSubstitution() {
  const file = 'docs/material-position-input-population.json', bytes = readFileSync(file);
  assert.equal(hash(bytes), '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff');
  const groups = JSON.parse(bytes).groups.filter(g => g.family === 'grid-list');
  assert.deepEqual(groups.map(g => g.element), ['grid-list-primary', 'grid-tile-one', 'grid-tile-two']);
  const observations = [];
  for (const entry of groups[0].observations) {
    const trees = {};
    for (const side of ['reference', 'astylar']) {
      const receipt = entry.inputTrees[side];
      assert.ok(receipt.file.startsWith('artifacts/material-parity/current-ancestry-audit/'));
      const source = readFileSync(receipt.file); assert.equal(hash(source), receipt.sha256);
      trees[side] = JSON.parse(source);
    }
    for (const group of groups) {
      const matches = group.observations.filter(o => o.case === entry.case);
      assert.equal(matches.length, 1); assert.deepEqual(matches[0].inputTrees, entry.inputTrees);
    }
    observations.push({ case: entry.case, inputTrees: entry.inputTrees,
      proof: proveGridPositionSubstitution(trees.reference, trees.astylar) });
  }
  assert.equal(observations.length, 52); assert.equal(new Set(observations.map(o => o.case)).size, 52);
  for (const group of groups) assert.equal(group.observations.length, 52);
  const sourcePath = 'examples/material-showcase/src/app/astylar.component.ts';
  const history = ['2f440115', 'd3ff236', '2f63b523'].map(commit => {
    const source = execFileSync('git', ['show', `${commit}:${sourcePath}`], { maxBuffer: 4 * 1024 * 1024 }).toString().replaceAll('\r\n', '\n');
    return { commit, sourcePath, sourceSha256: hash(source), gridRules: source.split('\n').filter(line =>
      line.includes("selector: '.grid-list'") || line.includes("selector: '.grid-tile'") || line.includes("selector: '.grid-tile-label'")) };
  });
  return { schemaVersion: 1, kind: 'grid-position-authored-substitution', population: { file, sha256: hash(bytes) },
    classification: 'application-plugin-authoring-defect', owner: 'showcase grid-list translation',
    groups: groups.map(g => ({ element: g.element, property: g.property, reference: g.reference, candidate: g.candidate,
      candidateOmitted: g.candidateOmitted, occurrences: g.occurrences, priorRowSha256: g.priorRowSha256,
      reviewedCases: g.observations.map(o => o.case), originalInputsSha256: digest(g.observations.map(o => o.inputSha256)) })),
    counts: { groups: 3, scalarObservations: 156, completeTreePairs: 52 }, history, observations,
    canonicalAttributionChanged: false, rendererCauseProven: false, renderingEquivalent: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.equal(process.argv.length, 2);
  const result = collectGridPositionSubstitution();
  const output = JSON.stringify(result, null, 2) + '\n';
  writeFileSync('docs/material-grid-position-substitution.json', output);
  console.log(JSON.stringify({ ...result.counts, sha256: hash(output), canonicalAttributionChanged: false }));
}
