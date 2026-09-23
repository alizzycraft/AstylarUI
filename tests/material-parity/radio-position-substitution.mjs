import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { auditReadFileSync as readFileSync } from './audit-evidence-session.mjs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const hash = b => createHash('sha256').update(b).digest('hex');
const one = ns => { assert.equal(ns.length, 1); return ns[0]; };
export function proveRadioPositionSubstitution(r, a) {
  assert.deepEqual(r.errors, []); assert.deepEqual(a.errors, []);
  const rh = one(r.nodes.filter(n => n.attributes?.id === 'radio-primary'));
  assert.equal(r.styles[rh.style].position, 'static'); assert.equal(r.styles[rh.style].display, 'inline');
  const referenceOptions = ['solo', 'team'].map(value => {
    const n = one(r.nodes.filter(n => n.type === 'mat-radio-button' && n.attributes.value === value));
    assert.equal(n.parent, rh.key); assert.equal(r.styles[n.style].position, 'static');
    assert.equal(r.styles[n.style].display, 'inline'); return n.key;
  });
  const pick = id => one(a.nodes.filter(n => n.authored?.id === id));
  const ah = pick('radio-primary');
  const options = ['solo', 'team'].map(value => {
    const node = pick(`radio-${value}`); assert.equal(node.parent, ah.key);
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
      assert.equal(ah[stage].position, 'relative'); assert.equal(node[stage].position, 'absolute');
    }
    const s = node.resolvedStyle;
    assert.equal(s.top, '-10px'); assert.equal(s.height, '40px');
    assert.equal(s.left, value === 'solo' ? '0' : '73px');
    assert.equal(s.width, value === 'solo' ? '68px' : '80px');
    return { key: node.key, top: s.top, left: s.left, width: s.width, height: s.height };
  });
  return { referenceHost: rh.key, referenceOptions, candidateHost: ah.key, options,
    classification: 'application-plugin-authoring-defect', firstDivergence: 'inline option flow replaced by absolute authored placement',
    rendererCauseProven: false, inputEquivalent: false, renderingEquivalent: false };
}
export function collectRadioPositionSubstitution() {
  const file = 'docs/material-position-input-population.json', bytes = readFileSync(file);
  assert.equal(hash(bytes), '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff');
  const group = JSON.parse(bytes).groups.find(g => g.element === 'radio-primary');
  assert.equal(group.observations.length, 68);
  assert.equal(new Set(group.observations.map(o => o.case)).size, 68);
  return { schemaVersion: 1, kind: 'radio-position-substitution', population: { file, sha256: hash(bytes) },
    priorRowSha256: group.priorRowSha256, observations: group.observations.map(o => {
      const trees = ['reference', 'astylar'].map(s => { const receipt = o.inputTrees[s], b = readFileSync(receipt.file);
        assert.equal(hash(b), receipt.sha256); return JSON.parse(b); });
      return { case: o.case, inputTrees: o.inputTrees, proof: proveRadioPositionSubstitution(...trees) };
    }), counts: { groups: 1, observations: 68 }, canonicalAttributionChanged: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = collectRadioPositionSubstitution();
  writeFileSync('docs/material-radio-position-substitution.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.counts));
}
