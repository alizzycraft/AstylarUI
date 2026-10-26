import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import ts from 'typescript';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
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
