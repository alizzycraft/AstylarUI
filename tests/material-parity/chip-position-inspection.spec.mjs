import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { proveChipPositionRequests, applyChipPositionRequests, validateChipPositionRequests } from './control-position-observation.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { collectChipPositionInspection, proveChipPositionInspection, collectChipPaintProposal, applyChipPaintProposal, chipPaintPredecessor } from './chip-position-inspection.mjs';
import { queryFindings, loadFindingEvidence } from '../../scripts/audit-findings-store.mjs';
import { collectChipPaintAuditInputs, validateChipPaintAuditInputs, validateChipPaintAuditClassifications, applyChipPaintAuditRows } from './chip-paint-audit-source-binding.mjs';
test('chip position requests separate explicit relative rules from computed zero offsets', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes);
  const cases = [...report.results.map(e => ({ ...e, kind: 'static' })),
    ...report.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => e.family === 'chips');
  assert.equal(cases.length, 76);
  const inventory = collectFullTreeInventory(cases);
  const keys = cases.map(e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`);
  assert.equal(new Set(keys).size, 76);
  let owners = 0;
  for (const key of keys) {
    const trees = modalInventoryTrees(inventory, key);
    for (const element of ['chip-0', 'chip-1']) {
      const proof = proveChipPositionRequests(...trees, element);
      assert.equal(proof.referencePositionRequests.length, 2);
      assert.deepEqual(proof.referenceComputedOffsets, { top: '0px', right: '0px', bottom: '0px', left: '0px' });
      assert.equal(proof.positionClassification, 'application-plugin-authoring-defect');
      assert.equal(proof.offsetClassification, 'parity-harness-defect');
      for (const flag of ['candidateComputedPositionVerified', 'candidateUsedOffsetsVerified',
        'inputEquivalent', 'renderingEquivalent', 'rendererCauseProven']) assert.equal(proof[flag], false);
      owners++;
    }
  }
  assert.equal(owners, 152);
  const original = modalInventoryTrees(inventory, keys[0]);
  const ref = r => r.nodes.find(n => n.attributes?.id === 'chip-0');
  const ast = a => a.nodes.find(n => n.authored?.id === 'chip-0');
  const positionRule = r => r.rules[ref(r).rules.find(i => r.rules[i].selector === '.mat-mdc-chip')];
  for (const mutate of [
    ([r]) => { r.ruleEvidenceComplete = false; },
    ([, a]) => { a.ruleEvidenceComplete = false; },
    ([r]) => { ref(r).inline = { top: '1px' }; },
    ([, a]) => { ast(a).authored.style = { position: 'relative' }; },
    ([, a]) => { ast(a).authored.attributes = { style: 'inset:0' }; },
    ([, a]) => { a.rules.push({ selector: '#chip-0', insetInlineStart: '1px' }); },
    ([r]) => { positionRule(r).declarations.position.important = true; },
    ([r]) => { positionRule(r).conditions = ['(min-width: 1px)']; },
    ([r]) => { positionRule(r).active = false; },
    ([r]) => { r.rules[ref(r).rules[0]].cssText += 'inset-inline:1px;'; },
    ([r]) => { r.rules[ref(r).rules[0]].declarations.all = { value: 'initial', important: false }; },
    ([r]) => { r.styles[ref(r).style].left = '1px'; },
    ([, a]) => { ast(a).interactionResolvedStyle.top = '1px'; },
    ([r]) => { ref(r).parent = 'wrong-owner'; },
  ]) {
    const trees = structuredClone(original); mutate(trees);
    assert.throws(() => proveChipPositionRequests(...trees, 'chip-0'));
  }
  assert.throws(() => proveChipPositionRequests(...original, 'chips-primary'));
});

test('chip position attribution conserves ten complete scalar groups and rejects forged membership', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const captured = JSON.parse(bytes);
  const cases = [...captured.results.map(e => ({ ...e, kind: 'static' })),
    ...captured.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => e.family === 'chips');
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const rows = queryFindings('artifacts/material-parity/working-audit', 'chips', {
    generation: '77595d08eb0f857cf058eb072074a433702f11e022dac2f1bfb666375d923752',
    indexSha256: 'd84236477a9da75dc58de0e5d3d48db58c98bab5232d746cdf5d88501ced2459',
  }).filter(row => row.evidence.section === 'discrepancies');
  const before = structuredClone(rows);
  const applied = applyChipPositionRequests(rows, cases, inventory, normalize);
  const changed = applied.filter((row, index) => row !== rows[index]);
  assert.equal(changed.length, 10);
  assert.equal(changed.reduce((sum, row) => sum + row.occurrences, 0), 760);
  assert.equal(changed.filter(row => row.classification === 'application-plugin-authoring-defect').length, 2);
  assert.equal(changed.filter(row => row.classification === 'parity-harness-defect').length, 8);
  assert.deepEqual(rows, before);
  for (const row of changed) {
    assert.equal(row.reviewedCases.length, 76); assert.equal(new Set(row.reviewedCases).size, 76);
    assert.equal(row.reviewEvidence.observations.length, 76);
    const restored = { ...row };
    for (const key of ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']) delete restored[key];
    Object.assign(restored, row.reviewEvidence.priorMetadata);
    assert.deepEqual(restored, rows.find(original => original.id === row.id));
    assert.equal(row.reviewEvidence.inputEquivalent, false); assert.equal(row.reviewEvidence.renderingEquivalent, false);
  }
  const validate = values => validateChipPositionRequests(values, rows, cases, inventory, normalize);
  assert.deepEqual(validate(applied), []);
  assert.deepEqual(validate(JSON.parse(JSON.stringify(applied))), []);
  const target = values => values.find(row => row.attribution === 'reviewed-chip-computed-offset-stage');
  for (const mutate of [values => values.splice(values.indexOf(target(values)), 1),
    values => values.push(target(values)), values => target(values).reviewedCases.pop(),
    values => { target(values).reviewEvidence.observations[0].referenceComputedOffsets.top = '4px'; },
    values => { target(values).reviewEvidence.inputEquivalent = true; }]) {
    const altered = structuredClone(applied); mutate(altered); assert.ok(validate(altered).length);
  }
  for (const altered of [cases.slice(1), [...cases, cases[0]]])
    assert.throws(() => applyChipPositionRequests(rows, altered, inventory, normalize));
  for (let index = 0; index < rows.length; index++)
    if (!changed.includes(applied[index])) assert.equal(applied[index], rows[index]);
});

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
  const compact = queryFindings(directory, 'chips', chipPaintPredecessor);
  assert.throws(() => queryFindings(directory, 'chips', { ...chipPaintPredecessor, indexSha256: '0'.repeat(64) }), /Working index changed/);
  const original = [];
  for (const group of proposal.groups) {
    const finding = compact.find(row => row.evidence.completeRowSha256 === group.reviewEvidence.originalCompleteRowSha256);
    original.push(await loadFindingEvidence(directory, 'chips', finding.id, chipPaintPredecessor));
  }
  const unrelatedFinding = compact.find(row => row.property === 'appearance');
  const unrelated = await loadFindingEvidence(directory, 'chips', unrelatedFinding.id, chipPaintPredecessor);
  original.splice(4, 0, unrelated);
  const before = structuredClone(original);
  const result = await applyChipPaintProposal(original, proposal);
  const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
  const evidence = collectChipPaintAuditInputs(JSON.parse(readFileSync(parityPath)), { parityPath });
  assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
  assert.deepEqual(applyChipPaintAuditRows(original, evidence), result);
  assert.deepEqual(validateChipPaintAuditClassifications(evidence, result), []);
  for (const mutate of [rows => rows.pop(), rows => rows.push(rows[0]), rows => { rows[0].occurrences++; }]) {
    const changed = structuredClone(original); mutate(changed);
    assert.throws(() => applyChipPaintAuditRows(changed, evidence));
  }
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

test('chip production binding rejects incomplete, foreign and forged evidence', () => {
  const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
  const original = JSON.parse(readFileSync(parityPath));
  const evidence = collectChipPaintAuditInputs(original, { parityPath });
  assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
  assert.equal(evidence.observations.length, 32);
  assert.deepEqual(validateChipPaintAuditInputs(evidence), []);
  for (const mutate of [e => e.observations.pop(), e => { e.review.groups[0].classification = 'equivalent-representation'; },
    e => { e.binding.reviewSource.sha256 = 'forged'; }, e => { e.inputEquivalent = true; }]) {
    const changed = structuredClone(evidence); mutate(changed);
    assert.ok(validateChipPaintAuditInputs(changed).length);
  }
  assert.equal(collectChipPaintAuditInputs({ ...original, results: original.results.slice(1) }, { parityPath }).binding.status, 'invalid');
  assert.equal(collectChipPaintAuditInputs(original, { parityPath: 'docs/material-chip-paint-review.json' }).binding.status, 'invalid');
  const unbound = collectChipPaintAuditInputs({});
  assert.equal(unbound.binding.status, 'unbound');
  assert.throws(() => applyChipPaintAuditRows([{ attribution: 'reviewed-chip-state-layer-substitution' }], unbound));
});

// Append-only: existing chip proof bodies and registered line anchors stay fixed.
test('retained chip checkmark inputs distinguish custom plugin geometry from native SVG', async () => {
  const hash = value => createHash('sha256').update(value).digest('hex');
  const bytes = readFileSync('artifacts/material-parity/chip-checkmark-retained-inputs-20261020.log');
  assert.equal(hash(bytes), 'c72a3c4abee38e39edb96b3bd5304f3a63ed05c8d355cc1501af40696dc90ab6');
  const observation = JSON.parse(bytes.toString().replace(/^\uFEFF/, ''));
  const check = result => {
    assert.equal(result.cases, 76); assert.equal(result.selected, 120); assert.equal(result.unselected, 32);
    assert.equal(result.combinations.length, 2);
    const selected = result.combinations.find(row => row.selected), unselected = result.combinations.find(row => !row.selected);
    assert.equal(selected.count, 120); assert.equal(unselected.count, 32); assert.equal(unselected.candidate, null);
    const native = { viewBox: '-2 -3 30 30', width: '20px', height: '20px',
      path: 'M1.73,12.91 8.1,19.28 22.79,4.59', strokeWidth: '2px', stroke: 'rgb(75, 67, 87)' };
    assert.deepEqual(selected.native, native); assert.deepEqual(unselected.native, native);
    assert.deepEqual(selected.candidate, { type: 'showcase.material:check-mark',
      data: { 'indicator-color': '#49454f', 'stroke-width': 1.8 }, width: '16px', height: '16px' });
  };
  check(observation);
  for (const mutate of [r => r.selected--, r => r.combinations[0].native.width = '16px',
    r => r.combinations[0].candidate.data['stroke-width'] = 2,
    r => r.combinations[0].candidate.data['indicator-color'] = '#4b4357']) {
    const changed = structuredClone(observation); mutate(changed); assert.throws(() => check(changed));
  }
  const reportBytes = readFileSync(observation.report.file); assert.equal(hash(reportBytes), observation.report.sha256);
  assert.equal(observation.report.sha256, 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const report = JSON.parse(reportBytes), counts = { selected: 0, unselected: 0 };
  const cases = [...report.results, ...report.interactions].filter(e => e.family === 'chips'); assert.equal(cases.length, 76);
  for (const entry of cases) {
    const trees = Object.fromEntries(Object.entries(entry.inputTrees).map(([side, receipt]) => {
      const data = readFileSync(receipt.file); assert.equal(hash(data), receipt.sha256);
      const tree = JSON.parse(data); assert.deepEqual(tree.errors, []); return [side, tree];
    }));
    for (const id of ['chip-0', 'chip-1']) {
      const native = trees.reference, candidate = trees.astylar;
      const host = native.nodes.find(n => n.attributes?.id === id);
      const action = native.nodes.find(n => n.key.startsWith(host.key + '/') && n.type === 'button');
      const selected = action.attributes['aria-selected'] === 'true';
      assert.equal(candidate.nodes.find(n => n.authored?.id === id).authored.ariaSelected, selected);
      const svg = native.nodes.find(n => n.key.startsWith(host.key + '/') && n.type === 'svg');
      const path = native.nodes.find(n => n.parent === svg.key && n.type === 'path');
      const ns = native.styles[svg.style], ps = native.styles[path.style];
      assert.deepEqual({ viewBox: svg.attributes.viewBox, width: ns.width, height: ns.height,
        path: path.attributes.d, strokeWidth: ps.strokeWidth, stroke: ps.stroke }, observation.combinations[0].native);
      assert.equal(ns.transform, 'none'); assert.equal(ps.transform, 'none');
      const mark = candidate.nodes.find(n => n.authored?.id === `${id}-mark`);
      if (selected) {
        counts.selected++; assert.ok(mark); assert.equal(mark.parent, candidate.nodes.find(n => n.authored?.id === id).key);
        assert.equal(mark.authored.type, 'showcase.material:check-mark');
        assert.deepEqual(mark.authored.data, observation.combinations[0].candidate.data);
        for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle']) {
          assert.equal(mark[stage].width, '16px'); assert.equal(mark[stage].height, '16px');
        }
      } else { counts.unselected++; assert.equal(mark, undefined); }
    }
  }
  assert.deepEqual(counts, { selected: 120, unselected: 32 });
  const { default: ts } = await import('typescript');
  const plugin = readFileSync('examples/material-showcase/src/app/material-plugin/material-showcase.plugin.ts', 'utf8');
  assert.equal(hash(plugin.replaceAll('\r\n', '\n')), 'dee2c10af7f3116bc6a476d63182ac182e5717b90f5333a327b77213e0b9107e');
  const ast = ts.createSourceFile('plugin.ts', plugin, 99, true, ts.ScriptKind.TS);
  const declaration = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === 'materialCheckMarkPath');
  const javascript = ts.transpileModule(declaration.getText(ast).replace(/^export /, ''), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  const points = new Function(javascript + '\nreturn materialCheckMarkPath();')();
  assert.deepEqual(points, [{ x: -5.5, y: .4 }, { x: -1.8, y: 3.2 }, { x: 5.5, y: -4.2 }]);
  // Native centerline in its own 20px CSS viewport, not chip/world coordinates.
  const nativePoints = [[1.73, 12.91], [8.1, 19.28], [22.79, 4.59]]
    .map(([x, y]) => ({ x: (x + 2) * 20 / 30 - 10, y: (y + 3) * 20 / 30 - 10 }));
  assert.ok(points.every((point, i) => Math.hypot(point.x - nativePoints[i].x, point.y - nativePoints[i].y) > 1));
  const renderer = ast.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'MaterialCheckMarkRenderer').getText(ast);
  assert.ok(renderer.includes('materialCheckMarkPath().map'));
  assert.ok(renderer.includes('context.coordinates.toRenderPoint(point)'));
  assert.ok(renderer.includes("Math.max(.6, this.number(context, 'stroke-width', 1.8) / 2)"));
  // Legitimate plugin paint ownership does not equate different paths/boxes/ink.
  // Source geometry only: no captured tube mesh, cap/join raster or current pixels.
});
