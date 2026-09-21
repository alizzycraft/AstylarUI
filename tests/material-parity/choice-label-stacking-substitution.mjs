import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const hash = b => createHash('sha256').update(b).digest('hex');
const ids = ['checkbox-label', 'radio-solo-label', 'radio-team-label'];
const one = ns => { assert.equal(ns.length, 1); return ns[0]; };
export function proveChoiceLabelStacking(r, a, id) {
  assert.ok(ids.includes(id));
  for (const t of [r, a]) { assert.deepEqual(t.errors, []); assert.equal(new Set(t.nodes.map(n => n.key)).size, t.nodes.length); }
  const rn = one(r.nodes.filter(n => n.attributes?.id === id));
  const an = one(a.nodes.filter(n => n.authored?.id === id));
  const rp = one(r.nodes.filter(n => n.key === rn.parent));
  const ap = one(a.nodes.filter(n => n.key === an.parent));
  assert.equal(rn.type, 'span'); assert.equal(an.authored.type, 'span'); assert.equal(rp.type, 'label');
  const input = one(r.nodes.filter(n => n.attributes?.id === rp.attributes.for));
  assert.equal(input.type, 'input');
  const checkbox = id === 'checkbox-label', stem = checkbox ? 'checkbox' : id.replace(/-label$/, '');
  assert.equal(input.attributes.type, checkbox ? 'checkbox' : 'radio');
  assert.equal(ap.authored.id, checkbox ? 'checkbox-primary' : stem);
  assert.equal(ap.authored.role, checkbox ? 'checkbox' : 'radio');
  assert.equal(r.styles[rn.style].position, 'static'); assert.equal(r.styles[rn.style].zIndex, 'auto');
  assert.equal(rn.ownText, an.authored.textContent);
  const layer = one(a.nodes.filter(n => n.authored?.id === `${stem}-state-layer`));
  assert.equal(layer.parent, ap.key);
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    assert.equal(an[stage].position, 'relative'); assert.equal(an[stage].zIndex, '2');
    for (const inset of ['top', 'right', 'bottom', 'left']) assert.ok(!Object.hasOwn(an[stage], inset));
    assert.equal(layer[stage].position, 'absolute'); assert.equal(layer[stage].zIndex, checkbox ? '3' : '1');
  }
  return { element: id, reference: { label: rn.key, associatedLabel: rp.key, control: input.key, position: 'static', zIndex: 'auto' },
    candidate: { label: an.key, control: ap.key, position: 'relative', zIndex: '2', stateLayer: layer.key,
      stateLayerZIndex: layer.resolvedStyle.zIndex, explicitInsets: false },
    classification: 'application-plugin-authoring-defect',
    firstDivergence: 'fixture replaces native associated-label structure with explicitly positioned and stacked text beside a custom interaction layer',
    rendererCauseProven: false, inputEquivalent: false, renderingEquivalent: false };
}
export function collectChoiceLabelStacking() {
  const file = 'docs/material-position-input-population.json', bytes = readFileSync(file);
  assert.equal(hash(bytes), '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff');
  const groups = JSON.parse(bytes).groups.filter(g => ids.includes(g.element)); assert.deepEqual(groups.map(g => g.element), ids);
  return { schemaVersion: 1, kind: 'choice-label-stacking-substitution', population: { file, sha256: hash(bytes) },
    groups: groups.map(g => {
      assert.equal(g.observations.length, 68); assert.equal(new Set(g.observations.map(o => o.case)).size, 68);
      return { element: g.element, priorRowSha256: g.priorRowSha256, observations: g.observations.map(o => {
        const trees = ['reference', 'astylar'].map(side => { const receipt = o.inputTrees[side], b = readFileSync(receipt.file);
          assert.equal(hash(b), receipt.sha256); return JSON.parse(b); });
        return { case: o.case, inputTrees: o.inputTrees, proof: proveChoiceLabelStacking(...trees, g.element) };
      }) };
    }), counts: { groups: 3, observations: 204 }, canonicalAttributionChanged: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = collectChoiceLabelStacking();
  writeFileSync('docs/material-choice-label-stacking-substitution.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.counts));
}
