import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import ts from 'typescript';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
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
