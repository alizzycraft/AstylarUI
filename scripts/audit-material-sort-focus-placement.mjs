import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const one = nodes => { assert.equal(nodes.length, 1); return nodes[0]; };
export function collectSortFocusPlacement() {
const file = 'docs/material-position-input-population.json';
const bytes = readFileSync(file);
assert.equal(hash(bytes), '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff');
const group = JSON.parse(bytes).groups.find(g => g.element === 'sort-primary');
assert.equal(group.observations.length, 60);
assert.equal(new Set(group.observations.map(o => o.case)).size, 60);
const observations = group.observations.map(observation => {
  const trees = {};
  for (const side of ['reference', 'astylar']) {
    const receipt = observation.inputTrees[side], source = readFileSync(receipt.file);
    assert.equal(hash(source), receipt.sha256); trees[side] = JSON.parse(source);
  }
  return { case: observation.case, inputTrees: observation.inputTrees,
    ...proveSortFocusPlacement(trees.reference, trees.astylar, observation.case) };
});
assert.equal(observations.filter(o => o.focused).length, 8);
return { kind: 'sort-focus-placement-inspection', population: { file, sha256: hash(bytes) },
  observations, counts: { observations: 60, focus: 8 }, canonicalAttributionChanged: false,
  rendererCauseProven: false, inputEquivalent: false };
}

export function proveSortFocusPlacement(r, a, caseKey) {
  assert.match(caseKey, /^(?:static|interaction):sort@/);
  for (const tree of [r, a]) {
    assert.equal(tree.errors.length, 0);
    assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
  }
  const rh = one(r.nodes.filter(n => n.attributes?.id === 'sort-primary'));
  const rt = one(r.nodes.filter(n => n.attributes?.id === 'sort-trigger'));
  const rc = one(r.nodes.filter(n => n.attributes?.class?.split(/\s+/).includes('mat-sort-header-container')));
  assert.equal(rt.parent, rh.key); assert.equal(rc.parent, rt.key);
  const ah = one(a.nodes.filter(n => n.authored?.id === 'sort-primary'));
  const at = one(a.nodes.filter(n => n.authored?.id === 'sort-trigger'));
  assert.equal(r.styles[rh.style].position, 'static');
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    assert.equal(ah[stage].position, 'relative');
  }
  assert.equal(at.parent, ah.key);
  const lines = a.nodes.filter(n => n.authored?.id === 'sort-focus-line');
  assert.ok(lines.length <= 1);
  const focused = caseKey.endsWith('/focus');
  assert.equal(lines.length, focused ? 1 : 0);
  const rs = r.styles[rc.style];
  assert.equal(rs.borderBottomWidth, focused ? '1px' : '0px');
  let candidateLine = null;
  if (focused) {
    const line = lines[0], s = line.resolvedStyle;
    assert.equal(line.parent, ah.key);
    assert.equal(s.position, 'absolute'); assert.equal(s.height, '1px');
    assert.equal(s.top, ah.resolvedStyle.height);
    assert.equal(rs.borderBottomStyle, 'solid');
    candidateLine = { position: s.position, top: s.top, height: s.height, background: s.background };
  }
  return { focused,
    reference: { hostPosition: 'static', focusOwner: rc.key, borderBottomWidth: rs.borderBottomWidth,
      borderBottomStyle: rs.borderBottomStyle, borderBottomColor: rs.borderBottomColor },
    candidate: { hostPosition: 'relative', trigger: at.key, line: candidateLine } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = collectSortFocusPlacement();
  if (process.argv.includes('--write')) {
    assert.equal(process.argv.length, 3);
    writeFileSync('docs/material-sort-focus-placement.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report.counts));
  } else {
    assert.equal(process.argv.length, 2); console.log(JSON.stringify(report, null, 2));
  }
}
