import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import ts from 'typescript';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
test('supplementary alternate capture observes generated options and preserves native DOM lag', () => {
  const file = 'artifacts/material-parity/chips-alternate-observed-20261026/latest-report.json';
  const bytes = readFileSync(file);
  assert.equal(hash(bytes), '0a24820940bba3c8d4f2b738d69a6105e1ef3fe62c6bf44cf94c73360db59cad');
  const report = JSON.parse(bytes);
  assert.equal(hash(readFileSync(report.actionSource.file)), report.actionSource.sha256);
  assert.equal(report.results.length, 8);
  assert.equal(new Set(report.results.map(r => r.caseId)).size, 8);
  const expectedStore = [[true,true], [true,true], [false,true], [false,true], [false,true], [false,false]];
  const counts = { reference: 0, astylar: 0 };
  const verify = (row, side) => {
    const evidence = row[side];
    assert.deepEqual(evidence.runtime.errors, []);
    assert.deepEqual(evidence.actionTimeline.map(o => o.boundary),
      ['mouse-move', 'mouse-down', 'mouse-up', 'mouse-move', 'mouse-down', 'mouse-up']);
    const selected = observation => {
      assert.deepEqual(observation.chipOptions.map(o => o.id), ['chip-0', 'chip-1']);
      for (const option of observation.chipOptions) {
        assert.equal(option.role, 'option');
        assert.equal(typeof option.selected, 'boolean');
      }
      return observation.chipOptions.map(o => o.selected);
    };
    assert.deepEqual(selected(evidence.observations[0]), [true, true]);
    assert.deepEqual(selected(evidence.observations.at(-1)), [false, false]);
    for (const [i, observation] of evidence.actionTimeline.entries()) {
      assert.deepEqual(observation.state.chipSelections, expectedStore[i]);
      const dom = selected(observation);
      if (side === 'reference' && [2, 5].includes(i)) {
        assert.ok([JSON.stringify(expectedStore[i]), JSON.stringify(expectedStore[i - 1])].includes(JSON.stringify(dom)));
      } else assert.deepEqual(dom, expectedStore[i]);
      if (JSON.stringify(dom) !== JSON.stringify(expectedStore[i])) counts[side]++;
    }
  };
  for (const row of report.results) for (const side of ['reference', 'astylar']) {
    for (const receipt of [row[side].inputTree, row[side].screenshot])
      assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
    verify(row, side);
  }
  assert.deepEqual(counts, { reference: 14, astylar: 0 });
  const missing = structuredClone(report.results[0]);
  missing.astylar.actionTimeline[2].chipOptions.pop();
  assert.throws(() => verify(missing, 'astylar'));
  const swapped = structuredClone(report.results[0]);
  swapped.astylar.actionTimeline[2].state.chipSelections = [true, false];
  assert.throws(() => verify(swapped, 'astylar'));
  const skipped = structuredClone(report.results[0]);
  skipped.astylar.actionTimeline.splice(2, 1);
  assert.throws(() => verify(skipped, 'astylar'));
  console.log(JSON.stringify({ cases: 8, generatedOptionBoundaryObservations: 8 * 2 * 6,
    sampledDomStoreDifferences: counts,
    boundary: 'Supplementary served-build DOM option and store observations with added mouse-boundary reads. Native sampled lag is retained, not a timing defect or parity pass. No original historical hit replay, full current-library applicability, paint or case closure.' }));
});

test('original Chips alternate recipe selects both owners without certifying historical hits', async () => {
  const original = gunzipSync(Buffer.from(readFileSync(
    'docs/evidence/material-original-runner-e01.mjs.gz.b64', 'utf8').replace(/\s/g, ''), 'base64'));
  assert.equal(hash(original), 'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0');
  const ast = ts.createSourceFile('original.mjs', original.toString(), 99, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0);
  const extract = name => {
    const nodes = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
    assert.equal(nodes.length, 1);
    return nodes[0].getText(ast);
  };
  const current = ts.createSourceFile('current.mjs', readFileSync('tests/material-parity/run-material-parity.mjs', 'utf8'), 99, true, ts.ScriptKind.JS);
  for (const name of ['performInteraction', 'interactionTargetBox']) {
    const nodes = current.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].getText(current).replace(/\r\n/g, '\n'), extract(name).replace(/\r\n/g, '\n'));
  }
  for (const mode of ['reference', 'astylar']) {
    const trace = [], boxes = [{ x: 10, y: 20, width: 30, height: 40 }, { x: 60, y: 20, width: 50, height: 40 }];
    const canvas = { x: 100, y: 200 };
    const selectors = ['#chips-primary mat-chip-option:first-child', '#chips-primary mat-chip-option:nth-child(2)'];
    const page = {
      locator(selector) {
        if (selector === 'canvas') return { boundingBox: async () => canvas };
        assert.ok(selectors.includes(selector));
        trace.push(['target', selectors.indexOf(selector)]);
        return { boundingBox: async () => boxes[selectors.indexOf(selector)] };
      },
      async evaluate(callback, id) {
        assert.ok(['chip-0', 'chip-1'].includes(id));
        trace.push(['target', Number(id.at(-1))]);
        const window = { __ASTYLAR_MATERIAL_BENCHMARK__: { measure(ids, includeDiagnostics) {
          assert.deepEqual(ids, [id]); assert.equal(includeDiagnostics, false);
          const b = boxes[Number(id.at(-1))];
          return { elements: { [id]: { borderBox: { left: b.x, top: b.y, width: b.width, height: b.height } } } };
        } } };
        return new Function('window', 'id', `return (${callback.toString()})(id)`)(window, id);
      },
      mouse: Object.fromEntries(['move', 'down', 'up'].map(name => [name, async (...args) => trace.push([name, ...args])])),
    };
    const target = new Function('interactionLayerCursorProbe', `return (${extract('interactionTargetBox')})`)(
      (family, state) => { assert.equal(family, 'chips'); assert.equal(state, 'activate-alternate'); return undefined; });
    const perform = new Function('assert', 'interactionTargetBox', 'settleInteraction',
      `return (${extract('performInteraction')})`)(assert, target, async (p, m) => {
      assert.equal(p, page); assert.equal(m, mode); trace.push(['settle']);
    });
    assert.equal(await perform(page, mode, { family: 'chips', state: 'activate-alternate' }), undefined);
    const offset = mode === 'reference' ? { x: 0, y: 0 } : canvas;
    assert.deepEqual(trace, [['target', 0], ['move', 25 + offset.x, 40 + offset.y], ['down'], ['up'],
      ['settle'], ['target', 1], ['move', 85 + offset.x, 40 + offset.y], ['down'], ['up']]);
  }
  console.log(JSON.stringify({ originalRecipeOwners: ['chip-0', 'chip-1'],
    methods: Object.fromEntries(['performInteraction', 'interactionTargetBox'].map(n => [n, hash(extract(n))])),
    boundary: 'Authenticated original recipe execution with explicit probe, settlement and measurement seams. Proves intended target order and box-centre arithmetic only, not historical geometry, actual hit recipients, callbacks or intermediate states.' }));
});

test('original Chips alternate comparator records are not target or state witnesses', async () => {
  const original = gunzipSync(Buffer.from(readFileSync(
    'docs/evidence/material-original-runner-e01.mjs.gz.b64', 'utf8').replace(/\s/g, ''), 'base64'));
  assert.equal(hash(original), 'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0');
  const ast = ts.createSourceFile('original.mjs', original.toString(), 99, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0);
  const extract = name => {
    const nodes = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
    assert.equal(nodes.length, 1);
    return nodes[0].getText(ast);
  };
  // Execute the authenticated original functions, not current approximations.
  const compareEvents = new Function(`return (${extract('compareEvents')})`)();
  const compareState = new Function(`return (${extract('compareInteractionState')})`)();
  const bytes = readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(hash(bytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const cases = JSON.parse(bytes).interactions.filter(r => r.family === 'chips' && r.state === 'activate-alternate');
  assert.equal(cases.length, 8);
  const forbiddenPage = new Proxy({}, { get() { throw Error('An uncompared state must not read a page'); } });
  for (const row of cases) {
    assert.deepEqual(row.interactionState, { matches: true });
    for (const chipSelections of [[false, false], [true, false], [false, true], [true, true]]) {
      assert.deepEqual(await compareState(forbiddenPage, forbiddenPage, 'chips', row.state,
        { ...row.astylarState, chipSelections }), row.interactionState);
    }
    // These synthetic controls demonstrate information loss, not recovered raw events.
    const raw = row.eventComparison.reference.map(type => ({ type, targetId: 'chips-primary', leaf: 'chip-0' }));
    const alternate = raw.map(e => ({ ...e, leaf: 'chip-1', value: 'different' }));
    assert.deepEqual(compareEvents(raw, alternate, 'chips', row.state), row.eventComparison);
    const ignored = [...alternate, { type: 'click', targetId: 'unrelated-owner' }];
    assert.deepEqual(compareEvents(raw, ignored, 'chips', row.state), row.eventComparison);
    const missingClick = alternate.filter(e => e.type !== 'click');
    assert.equal(compareEvents(raw, missingClick, 'chips', row.state).matches, false);
  }
  console.log(JSON.stringify({ cases: cases.length, originalRunnerSha256: hash(original),
    methods: Object.fromEntries(['compareEvents', 'compareInteractionState'].map(n => [n, hash(extract(n))])),
    boundary: 'Original comparator provenance only. Chips state flag is unconditional; normalized host event types omit leaf identity and values. Separate semantics/trees may prove endpoints, but these fields cannot prove intermediate transitions, actual hit targets, current rendering or whole-case acceptance.' }));
});
