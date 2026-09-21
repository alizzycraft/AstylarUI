import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const hash = b => createHash('sha256').update(b).digest('hex');
const one = ns => { assert.equal(ns.length, 1); return ns[0]; };
const cls = (n, c) => n.attributes?.class?.split(/\s+/).includes(c);
export function proveTabPositionSubstitution(r, a) {
  for (const tree of [r, a]) {
    assert.equal(tree.errors.length, 0);
    assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
  }
  const rh = one(r.nodes.filter(n => n.attributes?.id === 'tabs-primary'));
  const baseline = one(r.nodes.filter(n => cls(n, 'mat-mdc-tab-label-container')));
  const header = one(r.nodes.filter(n => n.key === baseline.parent));
  assert.equal(header.parent, rh.key);
  assert.equal(r.styles[rh.style].position, 'static');
  const rs = r.styles[baseline.style];
  assert.equal(rs.position, 'static');
  assert.equal(rs.borderBottomWidth, '1px'); assert.equal(rs.borderBottomStyle, 'solid');
  const ah = one(a.nodes.filter(n => n.authored?.id === 'tabs-primary'));
  const ab = one(a.nodes.filter(n => n.authored?.id === 'tab-baseline'));
  const ai = one(a.nodes.filter(n => n.authored?.id === 'tab-indicator'));
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    assert.equal(ah[stage].position, 'relative');
    for (const node of [ab, ai]) assert.equal(node[stage].position, 'absolute');
  }
  assert.equal(ab.parent, ah.key); assert.equal(ai.parent, ah.key);
  assert.ok(['50.7%', '51%', '51.9%'].includes(ai.resolvedStyle.width));
  return { reference: { host: rh.key, baseline: baseline.key, position: 'static',
    borderBottomWidth: rs.borderBottomWidth, borderBottomColor: rs.borderBottomColor },
  candidate: { host: ah.key, position: 'relative', baseline: { top: ab.resolvedStyle.top,
    height: ab.resolvedStyle.height, background: ab.resolvedStyle.background },
    indicator: { top: ai.resolvedStyle.top, left: ai.resolvedStyle.left,
      width: ai.resolvedStyle.width, height: ai.resolvedStyle.height } },
  classification: 'application-plugin-authoring-defect',
  firstDivergence: 'authored border/indicator ownership before layout',
  rendererCauseProven: false, inputEquivalent: false, renderingEquivalent: false };
}
export function collectTabPositionSubstitution() {
  const file = 'docs/material-position-input-population.json', bytes = readFileSync(file);
  assert.equal(hash(bytes), '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff');
  const group = JSON.parse(bytes).groups.find(g => g.element === 'tabs-primary');
  assert.equal(group.observations.length, 70);
  assert.equal(new Set(group.observations.map(o => o.case)).size, 70);
  return { schemaVersion: 1, kind: 'tab-position-substitution', population: { file, sha256: hash(bytes) },
    priorRowSha256: group.priorRowSha256, observations: group.observations.map(o => {
      const trees = ['reference', 'astylar'].map(side => {
        const receipt = o.inputTrees[side], source = readFileSync(receipt.file);
        assert.equal(hash(source), receipt.sha256); return JSON.parse(source);
      });
      return { case: o.case, inputTrees: o.inputTrees, proof: proveTabPositionSubstitution(...trees) };
    }), counts: { groups: 1, observations: 70 }, canonicalAttributionChanged: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert.equal(process.argv.length, 2);
  const report = collectTabPositionSubstitution();
  writeFileSync('docs/material-tab-position-substitution.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.counts));
}
