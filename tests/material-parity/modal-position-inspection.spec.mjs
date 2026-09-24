import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { collectModalPositionInspection, proveModalPositionInspection } from './modal-position-inspection.mjs';
import { queryFindings, loadFindingEvidence } from '../../scripts/audit-findings-store.mjs';
import { proveSnackbarSurfaceRequests, collectOverlaySurfaceReview, applyOverlaySurfaceRows,
  overlaySurfacePredecessor } from './overlay-surface-review.mjs';

test('overlay surface proposal replays 13 complete predecessors and preserves unrelated rows', async () => {
  const review = await collectOverlaySurfaceReview();
  assert.deepEqual(review, JSON.parse(readFileSync('docs/material-overlay-surface-review.json')));
  const directory = 'artifacts/material-parity/working-audit', rows = [];
  for (const group of review.groups) {
    const compact = queryFindings(directory, group.family, overlaySurfacePredecessor)
      .find(r => r.evidence.completeRowSha256 === group.reviewEvidence.originalCompleteRowSha256);
    assert.ok(compact);
    rows.push(await loadFindingEvidence(directory, group.family, compact.id, overlaySurfacePredecessor));
  }
  const unrelated = { family: 'unrelated', property: 'untouched', custom: { raw: true } };
  rows.splice(3, 0, unrelated);
  const before = structuredClone(rows), output = applyOverlaySurfaceRows(rows, review);
  assert.deepEqual(rows, before); assert.equal(output.length, rows.length);
  assert.equal(output[3], unrelated);
  for (let index = 0; index < output.length; index++) {
    if (index === 3) continue;
    const restored = structuredClone(output[index]);
    for (const p of restored.reviewEvidence.priorMetadata) {
      if (p.present) restored[p.field] = p.value; else delete restored[p.field];
    }
    assert.deepEqual(restored, before[index]);
  }
  for (const mutate of [r => r.pop(), r => r.push(r[0]), r => { r[0].occurrences++; },
    r => { r[0].unreviewedRawField = true; }]) {
    const changed = structuredClone(rows); mutate(changed);
    assert.throws(() => applyOverlaySurfaceRows(changed, review));
  }
  assert.throws(() => applyOverlaySurfaceRows(output, review), 'cannot apply twice');
  const receipt = review.groups.find(g => g.family === 'snack-bar').reviewEvidence.observations[0].inputTrees;
  const originals = ['reference', 'astylar'].map(side => JSON.parse(readFileSync(receipt[side].file)));
  for (const mutate of [
    a => { a.nodes.find(n => n.authored?.id === 'snack-bar-surface').authored.style = { minWidth: '344px' }; },
    a => { a.rules.push({ selector: '#snack-bar-surface:hover', background: '#ffffff' }); },
    a => { a.rules.push({ selector: ':unknown()', all: 'initial' }); },
  ]) {
    const changed = structuredClone(originals); mutate(changed[1]);
    assert.throws(() => proveSnackbarSurfaceRequests(...changed));
  }
});

test('all 34 retained snackbar rasters contain the surface inside the viewport', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const cases = JSON.parse(bytes).interactions.filter(e => e.family === 'snack-bar' && e.overlayPlacement?.targetId);
  assert.equal(cases.length, 34);
  const receipts = [];
  for (const entry of cases) {
    const file = entry.inputTrees.astylar.file.replace('astylar-input-tree.json', 'astylar.png');
    const image = readFileSync(file), png = PNG.sync.read(image);
    receipts.push({ file, sha256: hash(image) });
    const dpr = entry.viewport.deviceScaleFactor, box = entry.overlayPlacement.astylar;
    assert.equal(png.width, entry.viewport.width * dpr);
    assert.equal(png.height, entry.viewport.height * dpr);
    // A text-free interior strip proves actual surface paint, not just an
    // existing semantic owner or a projected rectangle. No text/parity claim.
    const left = Math.ceil((box.x + 8) * dpr), right = Math.floor((box.x + box.width - 8) * dpr);
    const top = Math.ceil((box.y + box.height - 8) * dpr), bottom = Math.floor((box.y + box.height - 4) * dpr);
    assert.ok(left >= 0 && right <= png.width && top >= 0 && bottom <= png.height);
    assert.ok(right > left && bottom > top);
    const paintedFraction = pixels => {
      let painted = 0, total = 0;
      for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
        const i = (y * png.width + x) * 4; total++;
        if ([50, 47, 53, 255].every((v, channel) => pixels[i + channel] === v)) painted++;
      }
      return painted / total;
    };
    assert.ok(paintedFraction(png.data) > .98, file);
    assert.equal(paintedFraction(Buffer.alloc(png.data.length, 255)), 0, 'blank paint must fail despite unchanged geometry');
  }
  assert.equal(hash(JSON.stringify(receipts)), '52f3cf2cd4c63a1e352cb8445f2654b66a99d633072c9e3700492264179574f5');
});

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

test('all 34 retained snackbars substitute surface sizing and paint requests', async () => {
  const readBound = receipt => {
    const bytes = readFileSync(receipt.file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), receipt.sha256);
    return JSON.parse(bytes);
  };
  const population = readBound({ file: 'docs/material-position-input-population.json',
    sha256: '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff' });
  const group = population.groups.find(g => g.element === 'snack-bar-overlay');
  assert.equal(group.observations.length, 34);
  assert.equal(new Set(group.observations.map(o => o.case)).size, 34);
  for (const observation of group.observations) {
    const r = readBound(observation.inputTrees.reference), a = readBound(observation.inputTrees.astylar);
    proveSnackbarSurfaceRequests(r, a);
  }
  // Join authenticated complete rows, not just their representative first 12
  // cases. Full membership is independently supplied by the 34 paired trees.
  const directory = 'artifacts/material-parity/working-audit';
  const snapshot = JSON.parse(readFileSync(`${directory}/current.json`));
  assert.equal(snapshot.generation, JSON.parse(readFileSync('docs/material-input-equivalence-audit.json')).compressedSha256);
  const expected = {
    backgroundColor: ['rgba(50,48,51,1)', 'rgba(50,47,53,1)'],
    color: ['rgba(245,239,244,1)', 'rgba(255,255,255,1)'],
    minWidth: ['344px'], maxWidth: ['672px'],
    paddingLeft: ['0', '18px'], paddingRight: ['8px', '18px'],
    justifyContent: ['flex-start', 'space-between'],
    boxShadow: ['rgba(0,0,0,0.2) 0 3px 5px -1px,rgba(0,0,0,0.14) 0 6px 10px 0,rgba(0,0,0,0.12) 0 1px 18px 0'],
  };
  const rows = queryFindings(directory, 'snack-bar', snapshot).filter(row =>
    row.evidence.section === 'discrepancies' && row.element === 'snack-bar-surface' && Object.hasOwn(expected, row.property));
  assert.equal(rows.length, 8);
  assert.equal(new Set(rows.map(row => row.property)).size, 8);
  const cases = group.observations.map(o => o.case);
  for (const compact of rows) {
    const row = await loadFindingEvidence(directory, 'snack-bar', compact.id, snapshot);
    const values = expected[row.property];
    assert.equal(row.reference, values[0]);
    assert.equal(Object.hasOwn(row, 'astylar'), values.length === 2, 'preserve candidate omission');
    if (values.length === 2) assert.equal(row.astylar, values[1]);
    assert.equal(row.occurrences, cases.length);
    assert.deepEqual(row.cases, cases.slice(0, 12));
    assert.deepEqual(row.states, [...new Set(cases.map(key => key.split('/').at(-1)))]);
  }
  // Historical input substitutions, not a proof of missing paint or current
  // runtime acceptance. Do not infer that equal short-content geometry excuses them.
});

test('all retained sheets substitute fixed candidate height for intrinsic reference list sizing', () => {
  const report = JSON.parse(readFileSync('docs/material-modal-position-inspection.json'));
  const group = report.groups.find(g => g.element === 'bottom-sheet-panel');
  assert.equal(group.observations.length, 25);
  let compact = 0;
  for (const observation of group.observations) {
    const receipt = observation.inputTrees.reference, bytes = readFileSync(receipt.file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), receipt.sha256);
    const tree = JSON.parse(bytes);
    const panel = tree.nodes.find(n => n.key === observation.proof.mapping.referenceNode);
    assert.equal(panel.type, 'mat-bottom-sheet-container');
    const active = panel.rules.map(i => tree.rules[i]).filter(rule => rule.active);
    assert.ok(active.length > 0);
    for (const declarations of [...active.map(rule => rule.declarations), panel.inline]) {
      assert.equal(Object.hasOwn(declarations, 'width'), false);
      assert.equal(Object.hasOwn(declarations, 'height'), false);
    }
    const declarations = Object.assign({}, ...active.map(rule => rule.declarations));
    assert.equal(declarations['box-sizing'].value, 'border-box');
    assert.equal(declarations['padding-top'].value, '8px');
    assert.equal(declarations['padding-bottom'].value, '8px');
    assert.equal(declarations['max-height'].value, '80vh');
    if (declarations['min-width'].value === '100vw') compact++;
    else {
      assert.equal(declarations['min-width'].value, '512px');
      assert.equal(declarations['max-width'].value, 'calc(-256px + 100vw)');
    }
    const lists = tree.nodes.filter(n => n.parent === panel.key && n.type === 'mat-nav-list');
    assert.equal(lists.length, 1);
    assert.equal(tree.styles[lists[0].style].padding, '8px 0px');
    assert.deepEqual(observation.proof.candidate.style.height, { present: true, value: '128px' });
  }
  assert.equal(compact, 1);
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
