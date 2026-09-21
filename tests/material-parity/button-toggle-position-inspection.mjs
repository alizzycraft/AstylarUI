import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const hash = b => createHash('sha256').update(b).digest('hex');
const ids = ['button-toggle-one', 'button-toggle-primary', 'button-toggle-two'];
const one = ns => { assert.equal(ns.length, 1); return ns[0]; };
export function proveTogglePositionInspection(r, a) {
  for (const tree of [r, a]) {
    assert.deepEqual(tree.errors, []);
    assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
  }
  const reference = id => one(r.nodes.filter(n => n.attributes?.id === id));
  const candidate = id => one(a.nodes.filter(n => n.authored?.id === id));
  const rh = reference('button-toggle-primary'), ah = candidate('button-toggle-primary');
  const rs = r.styles[rh.style], as = ah.resolvedStyle;
  assert.equal(rs.display, 'inline-flex'); assert.equal(rs.overflowX, 'hidden'); assert.equal(rs.overflowY, 'hidden');
  assert.equal(as.display, 'flex'); assert.equal(as.overflow, 'hidden');
  assert.equal(as.width, '130px'); assert.equal(as.boxSizing, 'border-box');
  const owners = ids.map(id => {
    const rn = reference(id), an = candidate(id);
    assert.equal(r.styles[rn.style].position, 'relative');
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
      assert.ok(!Object.hasOwn(an[stage], 'position'));
    }
    if (id !== 'button-toggle-primary') {
      assert.equal(rn.parent, rh.key); assert.equal(an.parent, ah.key);
      const children = r.nodes.filter(n => n.parent === rn.key);
      for (const cls of ['mat-button-toggle-focus-overlay', 'mat-button-toggle-ripple']) {
        const layer = one(children.filter(n => n.attributes.class?.split(/\s+/).includes(cls)));
        assert.equal(r.styles[layer.style].position, 'absolute');
      }
      const button = one(children.filter(n => n.type === 'button'));
      assert.equal(button.attributes.role, 'radio'); assert.equal(an.authored.role, 'radio');
      assert.equal(String(an.authored.ariaChecked), button.attributes['aria-checked']);
      const ac = a.nodes.filter(n => n.parent === an.key);
      assert.ok(ac.every(n => ['span', 'showcase.material:check-mark'].includes(n.authored.type)));
      assert.equal(ac.filter(n => n.authored.type === 'span').length, 1);
      assert.equal(ac.filter(n => n.authored.type === 'showcase.material:check-mark').length, an.authored.ariaChecked ? 1 : 0);
    }
    return { id, referenceOwner: rn.key, candidateOwner: an.key, referencePosition: 'relative', candidatePositionPresent: false };
  });
  return { owners, reference: { radius: rs.borderTopLeftRadius, width: rs.width, height: rs.height,
      boxSizing: rs.boxSizing, transform: rs.transform },
    candidate: { radius: as.borderRadius, width: as.width, height: as.height, boxSizing: as.boxSizing },
    classification: 'unresolved', rendererCauseProven: false, inputEquivalenceProven: false,
    remainingQuestion: 'Flattened native-button/focus/ripple composition requires paint, containing-block and interaction proof; position omission alone is not equivalent or a confirmed cause.' };
}
export function collectTogglePositionInspection() {
  const file = 'docs/material-position-input-population.json', bytes = readFileSync(file);
  assert.equal(hash(bytes), '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff');
  const groups = JSON.parse(bytes).groups.filter(g => ids.includes(g.element));
  assert.deepEqual(groups.map(g => g.element), ids);
  const cases = groups[0].observations.map(o => o.case);
  assert.equal(cases.length, 68); assert.equal(new Set(cases).size, 68);
  for (const g of groups) assert.deepEqual(g.observations.map(o => o.case), cases);
  const observations = groups[0].observations.map((o, i) => {
    for (const g of groups) assert.deepEqual(g.observations[i].inputTrees, o.inputTrees);
    const trees = ['reference', 'astylar'].map(side => { const receipt = o.inputTrees[side], b = readFileSync(receipt.file);
      assert.equal(hash(b), receipt.sha256); return JSON.parse(b); });
    return { case: o.case, inputTrees: o.inputTrees, proof: proveTogglePositionInspection(...trees) };
  });
  return { schemaVersion: 1, kind: 'button-toggle-position-inspection', population: { file, sha256: hash(bytes) },
    groups: groups.map(g => ({ element: g.element, priorRowSha256: g.priorRowSha256, cases })),
    observations, counts: { groups: 3, observations: 204, distinctCases: 68 }, canonicalAttributionChanged: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = collectTogglePositionInspection();
  writeFileSync('docs/material-button-toggle-position-inspection.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.counts));
}
