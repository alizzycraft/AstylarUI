import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { resolveGeneratedReferenceNode } from './generated-node-mapping-evidence.mjs';
import { collectModalPositionInspection, proveModalPositionInspection } from './modal-position-inspection.mjs';

test('retained open overlays do not reproduce off-screen projected placement', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes);
  const entries = [...capture.results, ...capture.interactions];
  for (const [family, target, count] of [
    ['snack-bar', 'snack-bar-surface', 34],
    ['tooltip', 'tooltip-popup', 18],
    ['bottom-sheet', 'bottom-sheet-panel', 25],
  ]) {
    const cases = entries.filter(e => e.family === family && e.overlayPlacement?.targetId);
    assert.equal(cases.length, count);
    let maximumProjectedDelta = 0;
    for (const entry of cases) {
      const p = entry.overlayPlacement;
      assert.equal(p.targetId, target);
      assert.equal(p.withinCanvas, true);
      // Check recorded coordinates directly: the historical `matches` flag
      // does not require all four rectangle values to agree for every family.
      for (const key of ['x', 'y', 'width', 'height']) {
        assert.ok(Number.isFinite(p.astylar[key]) && Number.isFinite(p.reference[key]));
        const delta = Math.abs(p.astylar[key] - p.reference[key]);
        maximumProjectedDelta = Math.max(maximumProjectedDelta, delta);
        assert.ok(delta < 0.04, `${family}/${entry.profile}/${entry.viewport.id}/${entry.state}/${key}: ${delta}`);
      }
    }
    console.log(JSON.stringify({ family, retainedOpenStates: count, maximumProjectedDelta,
      usedCssBoxesProven: false, paintVisibilityProven: false, inputEquivalenceProven: false }));
  }
});

test('overlay position tokens belong to different compositions in all 59 original states', () => {
  const readBound = (file, digest) => {
    const bytes = readFileSync(file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), digest);
    return JSON.parse(bytes);
  };
  const population = readBound('docs/material-position-input-population.json',
    '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff');
  const groups = population.groups.filter(g => g.reference === 'absolute' && g.candidate === 'fixed');
  assert.deepEqual(groups.map(g => [g.element, g.occurrences]),
    [['bottom-sheet-overlay', 25], ['snack-bar-overlay', 34]]);
  for (const group of groups) {
    assert.equal(group.observations.length, group.occurrences);
    assert.equal(new Set(group.observations.map(o => o.case)).size, group.occurrences);
    for (const observation of group.observations) {
      const r = readBound(observation.inputTrees.reference.file, observation.inputTrees.reference.sha256);
      const a = readBound(observation.inputTrees.astylar.file, observation.inputTrees.astylar.sha256);
      const mapping = resolveGeneratedReferenceNode(r, group.element, group.family);
      assert.equal(mapping.status, 'mapped', observation.case);
      const reference = r.styles[mapping.styleIndex];
      const parent = r.nodes.find(n => n.key === mapping.node.parent);
      assert.ok(parent.attributes.class.split(/\s+/).includes('cdk-overlay-container'));
      const parentStyle = r.styles[parent.style];
      assert.equal(parentStyle.position, 'fixed');
      assert.equal(parentStyle.transform, 'none');
      assert.equal(reference.position, 'absolute');
      assert.deepEqual([reference.width, reference.height], [parentStyle.width, parentStyle.height]);
      assert.deepEqual([reference.display, reference.flexDirection, reference.justifyContent,
        reference.alignItems, reference.padding], ['flex', 'row', 'center', 'flex-end', '0px']);
      const owners = a.nodes.filter(n => n.authored?.id === group.element);
      assert.equal(owners.length, 1);
      const owner = owners[0], candidateParent = a.nodes.find(n => n.key === owner.parent);
      assert.equal(candidateParent.authored.id, `${group.family}-root`);
      assert.equal(candidateParent.resolvedStyle.position, 'relative');
      for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle']) {
        const style = owner[stage];
        assert.deepEqual([style.position, style.width, style.height, style.display,
          style.flexDirection, style.justifyContent, style.alignItems, style.padding],
        ['fixed', '100%', '100%', 'flex', 'column', 'flex-end', 'center',
          group.family === 'snack-bar' ? '0 0 8px' : '0']);
      }
    }
  }
  // No candidate used box or projection is captured here. A fixed viewport
  // wrapper containing an absolute child cannot be compared to a flattened
  // fixed wrapper by position tokens alone. Axis/padding differences remain.
  console.log(JSON.stringify({ overlayStates: 59, referenceFixedParent: 59,
    candidateFixedOwner: 59, flowAxisSubstitutions: 59, snackPaddingSubstitutions: 34,
    inputEquivalenceProven: false, rendererCauseProven: false }));
});
test('modal inspection authenticates all nine generated owner groups', () => {
  assert.deepEqual(collectModalPositionInspection(), JSON.parse(readFileSync('docs/material-modal-position-inspection.json')));
});
test('modal inspection refuses inconsistent scalar, style-stage, alias and owner data', () => {
  const report = JSON.parse(readFileSync('docs/material-modal-position-inspection.json'));
  const group = report.groups.find(g => g.element === 'dialog-panel'), o = group.observations[0];
  const capture = JSON.parse(readFileSync(report.capture.file));
  const [kind, suffix] = o.case.split(':');
  const entry = (kind === 'static' ? capture.results : capture.interactions).find(e =>
    `${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === suffix);
  assert.ok(entry);
  for (const mutate of [
    (e) => { e.styleInputs.find(i => i.id === group.element).reference.position = 'static'; },
    (e, r) => { r.nodes.find(n => n.key === o.proof.mapping.referenceNode).attributes.id = group.element; },
    (e, r, a) => { a.nodes.find(n => n.authored?.id === group.element).normalResolvedStyle.position = 'relative'; },
    (e, r, a) => { a.nodes.find(n => n.authored?.id === group.element).parent = 'missing'; },
  ]) {
    const e = structuredClone(entry), trees = ['reference', 'astylar'].map(s => JSON.parse(readFileSync(o.inputTrees[s].file)));
    mutate(e, ...trees); assert.throws(() => proveModalPositionInspection(e, ...trees, group.element));
  }
});
