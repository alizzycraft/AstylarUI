import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectChipPositionInspection, proveChipPositionInspection, collectChipPaintProposal, applyChipPaintProposal } from './chip-position-inspection.mjs';
import { queryFindings, loadFindingEvidence } from '../../scripts/audit-findings-store.mjs';
test('chips retain three complete source-backed owner groups across 76 states', () => {
  assert.deepEqual(collectChipPositionInspection(), JSON.parse(readFileSync('docs/material-chip-position-inspection.json')));
});
test('chip inspection rejects altered wrapper, selection, position, graphic and sizing', () => {
  const o = collectChipPositionInspection().observations[0];
  const pick = (t, id) => t.nodes.find(n => (n.authored?.id ?? n.attributes?.id) === id);
  for (const mutate of [
    ([r]) => { pick(r, 'chip-0').parent = 'unrelated'; },
    ([, a]) => { pick(a, 'chip-0').authored.ariaSelected = false; },
    ([, a]) => { pick(a, 'chip-0').normalResolvedStyle.position = 'static'; },
    ([, a]) => { pick(a, 'chip-1').resolvedStyle.width = 'auto'; },
    ([r]) => { const n = r.nodes.find(n => n.attributes?.class?.split(/\s+/).includes('mdc-evolution-chip__graphic')); r.styles[n.style].position = 'static'; },
  ]) {
    const trees = ['reference', 'astylar'].map(s => JSON.parse(readFileSync(o.inputTrees[s].file)));
    mutate(trees); assert.throws(() => proveChipPositionInspection(...trees));
  }
});

test('all retained chip states distinguish authored overlay paint from flat background substitution', () => {
  const report = collectChipPositionInspection(); // authenticates every paired tree
  const counts = { owners: 0, visibleLayers: 0, focusWithoutBackgroundChange: 0, selectedHover: 0, selectedHeld: 0 };
  for (const observation of report.observations) {
    const [r, a] = ['reference', 'astylar'].map(side => JSON.parse(readFileSync(observation.inputTrees[side].file)));
    const phase = observation.case.startsWith('static:') ? 'static' : observation.case.split('/').at(-1);
    for (const id of ['chip-0', 'chip-1']) {
      const ref = r.nodes.find(n => n.attributes?.id === id);
      const ast = a.nodes.find(n => n.authored?.id === id);
      const layers = r.nodes.filter(n => n.parent === ref.key && n.attributes?.class === 'mat-mdc-chip-focus-overlay');
      assert.equal(layers.length, 1);
      const style = r.styles[layers[0].style];
      assert.equal(style.position, 'absolute');
      assert.equal(style.pointerEvents, 'none');
      assert.equal(a.nodes.some(n => n.parent === ast.key && !['span', 'showcase.material:check-mark'].includes(n.authored.type)), false);
      counts.owners++;
      if (Number(style.opacity) > 0) counts.visibleLayers++;
      if (id !== 'chip-0') continue;
      if (phase === 'focus' || phase === 'activate-leave') {
        assert.equal(style.opacity, '0.12');
        assert.equal(ast.interactionResolvedStyle.background, ast.normalResolvedStyle.background);
        counts.focusWithoutBackgroundChange++;
      }
      if (phase === 'hover') {
        assert.equal(style.opacity, '0.08');
        assert.equal(style.backgroundColor, 'rgb(73, 69, 78)');
        assert.equal(r.styles[ref.style].backgroundColor, 'rgb(234, 222, 247)');
        assert.equal(ast.interactionResolvedStyle.background, '#ddd2ea');
        // Even the flat-color substitution uses different authored layer ink:
        // rounded native source-over channels would be #ddd2e9, not #ddd2ea.
        assert.deepEqual([234, 222, 247].map((v, i) => Math.round(v * .92 + [73, 69, 78][i] * .08)), [221, 210, 233]);
        counts.selectedHover++;
      }
      if (phase === 'held') {
        assert.equal(style.opacity, '0.12');
        assert.equal(style.backgroundColor, 'rgb(75, 67, 87)');
        assert.equal(ast.interactionResolvedStyle.background, '#d7cbe4');
        counts.selectedHeld++;
      }
    }
  }
  assert.deepEqual(counts, { owners: 152, visibleLayers: 48, focusWithoutBackgroundChange: 16, selectedHover: 8, selectedHeld: 8 });
  const source = readFileSync('examples/material-showcase/src/app/astylar.component.ts', 'utf8');
  assert.ok(source.includes("selector: '.chip.selected:hover', background: mixHex('#eadef7', '#4b4357', .08)"));
  assert.ok(source.includes("selector: '.chip.selected:active', background: mixHex('#eadef7', '#4b4357', .12)"));
  assert.equal(/selector:\s*['"][^'"]*\.chip[^'"]*:focus/.test(source), false);
});

test('chip paint proposal binds ten complete canonical rows without accepting rendering parity', async () => {
  const proposal = await collectChipPaintProposal();
  assert.equal(proposal.groups.length, 10);
  assert.equal(proposal.canonicalAttributionChanged, false);
  assert.equal(new Set(proposal.groups.map(g => g.reviewEvidence.originalCompleteRowSha256)).size, 10);
  for (const group of proposal.groups) {
    assert.equal(group.reviewedCases.length, group.occurrences);
    assert.deepEqual(group.reviewEvidence.observations.map(o => o.case), group.reviewedCases);
    assert.equal(group.reviewEvidence.rendererCauseProven, false);
  }
  const directory = 'artifacts/material-parity/working-audit';
  const compact = queryFindings(directory, 'chips');
  const original = [];
  for (const group of proposal.groups) {
    const finding = compact.find(row => row.evidence.completeRowSha256 === group.reviewEvidence.originalCompleteRowSha256);
    original.push(await loadFindingEvidence(directory, 'chips', finding.id));
  }
  const unrelatedFinding = compact.find(row => row.property === 'appearance');
  const unrelated = await loadFindingEvidence(directory, 'chips', unrelatedFinding.id);
  original.splice(4, 0, unrelated);
  const before = structuredClone(original);
  const result = await applyChipPaintProposal(original, proposal);
  assert.deepEqual(original, before, 'application mutated its input');
  assert.equal(result.length, original.length);
  assert.equal(result[4], unrelated, 'unrelated row must be passed through untouched');
  assert.equal(result.filter(row => row.attribution === 'reviewed-chip-state-layer-substitution').length, 10);
  for (const row of result.filter(row => row !== unrelated)) {
    const restored = structuredClone(row);
    for (const prior of row.reviewEvidence.priorMetadata) {
      if (prior.present) restored[prior.field] = prior.value; else delete restored[prior.field];
    }
    assert.deepEqual(restored, before.find(item => item.element === row.element && item.property === row.property && item.reference === row.reference && item.astylar === row.astylar));
  }
});
