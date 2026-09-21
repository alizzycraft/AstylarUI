import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const hash = b => createHash('sha256').update(b).digest('hex');
const selected = ['badge-label', 'divider-above', 'divider-below', 'step-details-text',
  'step-review-text', 'table-primary', 'toolbar-title'];
const one = ns => { assert.equal(ns.length, 1); return ns[0]; };
export function proveStaticPositionObservation(r, a, element) {
  assert.ok(selected.includes(element));
  assert.deepEqual(r.errors, []); assert.deepEqual(a.errors, []);
  assert.equal(r.contextStyleEvidenceVersion, 1);
  assert.equal(a.resolvedStyleEvidenceVersion, 2);
  assert.equal(a.resolvedStyleSource, 'core-style-inspection');
  const rn = one(r.nodes.filter(n => n.attributes?.id === element));
  const an = one(a.nodes.filter(n => n.authored?.id === element));
  assert.equal(rn.type, an.authored.type);
  assert.ok(!an.authored.type.includes(':'));
  assert.equal(r.styles[rn.style].position, 'static');
  for (const name of ['position', 'all']) {
    assert.ok(!Object.hasOwn(rn.inline, name));
    for (const index of rn.rules) {
      const rule = r.rules[index]; assert.ok(rule);
      if (rule.active) assert.ok(!Object.hasOwn(rule.declarations, name));
    }
    assert.ok(!Object.hasOwn(an.authored, name));
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
      assert.ok(an[stage]); assert.ok(!Object.hasOwn(an[stage], name));
    }
  }
  assert.ok(!Object.hasOwn(an.authored, 'style'));
  // Reset support must not be guessed from omission in the stage output.
  assert.ok(a.rules.every(rule => !Object.hasOwn(rule, 'all')));
  return { element, referenceOwner: rn.key, candidateOwner: an.key, elementType: rn.type,
    referenceComputed: 'static', candidatePositionPresent: false,
    classification: 'parity-harness-defect', attribution: 'reviewed-static-position-observation-stage',
    justification: 'This scalar comparison mixes browser computed static with an omitted candidate style-stage value. The mapped same-type owners have no captured explicit position request; candidate computed position and containing-block behavior remain unproven.',
    computedCandidateVerified: false, inputEquivalent: false, renderingEquivalent: false,
    rendererCauseProven: false };
}
export function collectStaticPositionObservations() {
  const file = 'docs/material-position-input-population.json', bytes = readFileSync(file);
  assert.equal(hash(bytes), '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff');
  const groups = JSON.parse(bytes).groups.filter(g => selected.includes(g.element));
  assert.deepEqual(groups.map(g => g.element), selected);
  const reviewed = groups.map(g => {
    assert.equal(g.reference, 'static'); assert.equal(g.candidateOmitted, true);
    assert.equal(g.referenceExplicitPositionObservations, 0);
    assert.equal(g.candidateExplicitPositionObservations, 0);
    assert.equal(g.differingElementTypes, 0);
    return { family: g.family, element: g.element, priorRowSha256: g.priorRowSha256,
      observations: g.observations.map(o => {
        const trees = ['reference', 'astylar'].map(side => {
          const receipt = o.inputTrees[side], source = readFileSync(receipt.file);
          assert.equal(hash(source), receipt.sha256); return JSON.parse(source);
        });
        assert.deepEqual(o.referenceDeclarations, []); assert.deepEqual(o.candidateDeclarations, []);
        return { case: o.case, inputSha256: o.inputSha256, inputTrees: o.inputTrees,
          proof: proveStaticPositionObservation(...trees, g.element) };
      }) };
  });
  const count = reviewed.reduce((n, g) => n + g.observations.length, 0); assert.equal(count, 340);
  return { schemaVersion: 1, kind: 'static-position-observation-review', population: { file, sha256: hash(bytes) },
    reviewed, counts: { groups: 7, observations: count }, canonicalAttributionChanged: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = collectStaticPositionObservations();
  writeFileSync('docs/material-static-position-observation.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.counts));
}
