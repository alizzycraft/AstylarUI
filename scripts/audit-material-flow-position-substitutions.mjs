import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { auditReadFileSync as readFileSync } from '../tests/material-parity/audit-evidence-session.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const hash = v => createHash('sha256').update(v).digest('hex');
const selected = ['divider-primary', 'slide-toggle-label', 'slide-toggle-primary'];
const pick = (tree, side, id) => {
  const matches = tree.nodes.filter(n => (side === 'reference' ? n.attributes?.id : n.authored?.id) === id);
  assert.equal(matches.length, 1); return matches[0];
};
const parent = (tree, node) => {
  const matches = tree.nodes.filter(n => n.key === node.parent); assert.equal(matches.length, 1); return matches[0];
};
export function proveFlowPositionSubstitution(reference, candidate, id) {
  assert.ok(selected.includes(id));
  const ref = pick(reference, 'reference', id), ast = pick(candidate, 'astylar', id);
  const style = reference.styles[ref.style]; assert.equal(style.position, 'static');
  const candidatePosition = id === 'slide-toggle-primary' ? 'relative' : 'absolute';
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    assert.equal(ast[stage].position, candidatePosition);
  }
  let context;
  if (id === 'divider-primary') {
    assert.equal(style.height, '0px'); assert.equal(style.borderTopWidth, '1px');
    assert.equal(style.borderTopStyle, 'solid');
    assert.equal(parent(reference, ref).attributes.id, 'divider-root');
    assert.equal(parent(candidate, ast).authored.id, 'divider-root');
    assert.equal(ast.resolvedStyle.height, '1px'); assert.equal(ast.resolvedStyle.borderWidth, '0');
    assert.equal(ast.resolvedStyle.left, '28px'); assert.equal(ast.resolvedStyle.right, '28px');
    assert.match(ast.resolvedStyle.top, /^\d+(\.\d+)?px$/);
    context = { reference: 'in-flow zero-height block with one-pixel top border',
      candidate: 'absolute one-pixel background strip', candidateTop: ast.resolvedStyle.top,
      referenceBorderColor: style.borderTopColor, candidateBackground: ast.resolvedStyle.background };
  } else {
    const referenceHost = pick(reference, 'reference', 'slide-toggle-primary');
    assert.equal(reference.styles[referenceHost.style].display, 'inline-block');
    assert.equal(reference.styles[referenceHost.style].position, 'static');
    const label = pick(reference, 'reference', 'slide-toggle-label');
    assert.equal(label.type, 'span'); assert.equal(reference.styles[label.style].position, 'static');
    const labelParent = parent(reference, label), field = parent(reference, labelParent);
    assert.equal(labelParent.type, 'label');
    assert.equal(reference.styles[labelParent.style].position, 'static');
    assert.equal(reference.styles[field.style].display, 'inline-flex');
    assert.equal(reference.styles[field.style].alignItems, 'center');
    assert.equal(parent(reference, field).attributes.id, 'slide-toggle-primary');
    const astLabel = pick(candidate, 'astylar', 'slide-toggle-label');
    const astHost = pick(candidate, 'astylar', 'slide-toggle-primary');
    assert.equal(astLabel.parent, astHost.key);
    assert.equal(astLabel.resolvedStyle.position, 'absolute');
    assert.equal(astLabel.resolvedStyle.top, '6px'); assert.equal(astLabel.resolvedStyle.left, '60px');
    assert.equal(astHost.resolvedStyle.position, 'relative'); assert.equal(astHost.resolvedStyle.height, '32px');
    context = { reference: 'static label in centered inline-flex field', candidate: 'absolute label in relative fixed-height host',
      referenceLabelPaddingLeft: reference.styles[labelParent.style].paddingLeft,
      candidateLabelTop: '6px', candidateLabelLeft: '60px', candidateHostHeight: '32px' };
  }
  return { element: id, referenceKey: ref.key, candidateKey: ast.key, referencePosition: 'static', candidatePosition,
    context, classification: 'application-plugin-authoring-defect', firstDivergence: 'authored composition before layout',
    rendererCauseProven: false, renderingEquivalent: false };
}
export function collectFlowPositionSubstitutions() {
  const file = 'docs/material-position-input-population.json', bytes = readFileSync(file);
  assert.equal(hash(bytes), '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff');
  const groups = JSON.parse(bytes).groups.filter(g => selected.includes(g.element));
  assert.deepEqual(groups.map(g => g.element), selected);
  const reviewed = groups.map(group => ({ element: group.element, priorRowSha256: group.priorRowSha256,
    occurrences: group.occurrences, observations: group.observations.map(observation => {
      const trees = {};
      for (const side of ['reference', 'astylar']) {
        const receipt = observation.inputTrees[side];
        assert.ok(receipt.file.startsWith('artifacts/material-parity/current-ancestry-audit/'));
        const source = readFileSync(receipt.file); assert.equal(hash(source), receipt.sha256);
        trees[side] = JSON.parse(source);
      }
      const proof = proveFlowPositionSubstitution(trees.reference, trees.astylar, group.element);
      assert.equal(proof.referencePosition, group.reference); assert.equal(proof.candidatePosition, group.candidate);
      return { case: observation.case, inputSha256: observation.inputSha256, inputTrees: observation.inputTrees, proof };
    }) }));
  assert.deepEqual(reviewed.map(g => g.observations.length), [24, 68, 68]);
  for (const group of reviewed) assert.equal(new Set(group.observations.map(o => o.case)).size, group.occurrences);
  return { schemaVersion: 1, kind: 'flow-position-authoring-substitutions', population: { file, sha256: hash(bytes) },
    groups: reviewed, counts: { groups: 3, scalarObservations: 160 }, canonicalAttributionChanged: false,
    rendererCauseProven: false, renderingEquivalent: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.equal(process.argv.length, 2);
  const result = collectFlowPositionSubstitutions(), output = JSON.stringify(result, null, 2) + '\n';
  writeFileSync('docs/material-flow-position-substitutions.json', output);
  console.log(JSON.stringify({ ...result.counts, sha256: hash(output), canonicalAttributionChanged: false }));
}
