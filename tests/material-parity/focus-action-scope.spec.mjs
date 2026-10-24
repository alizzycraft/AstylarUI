import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import ts from 'typescript';
import { materialInteractionCases } from './benchmark.config.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
test('configured focus action scope is 248 programmatic requests and eight pointer clicks, never Tab', async () => {
  const file = 'artifacts/material-parity/configured-input-focus-boundaries-20261024/latest-report.json';
  const bytes = readFileSync(file); assert.equal(hash(bytes), '8e176417defd6d8bbd2f9276adc8d37828867fce006cf80b4a74e4034aa9d118');
  const capture = JSON.parse(bytes), saved = Buffer.from(capture.sourceRecipe.actionRunnerSnapshot.base64, 'base64');
  assert.equal(hash(saved), capture.actionSource.sha256);
  const method = bytes => {
    const ast = ts.createSourceFile('runner.mjs', bytes.toString(), 99, true, ts.ScriptKind.JS);
    const nodes = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'performInteraction');
    assert.equal(nodes.length, 1); return nodes[0].getText(ast);
  };
  const source = method(saved);
  assert.equal(method(readFileSync('tests/material-parity/run-material-parity.mjs')), source);
  assert.equal(hash(readFileSync('tests/material-parity/benchmark.config.mjs')), 'a55e95abe098be26d6a99e3faab22a951ae140143fece8701726a23624b98535');
  const perform = new Function('assert', 'interactionTargetBox', source + ';return performInteraction;')
    (assert, async () => ({ x: 0, y: 0, width: 10, height: 10 }));
  const cases = materialInteractionCases.filter(c => c.state === 'focus'); assert.equal(cases.length, 256);
  let focusRequests = 0, pointerClicks = 0;
  for (const row of cases) for (const side of ['reference', 'astylar']) {
    const calls = [];
    const page = {
      mouse: { click: async () => calls.push('pointer-click') },
      // Observe the driver's request; do not fake activeElement or execute DOM in a stub.
      evaluate: async (callback, id) => { assert.equal(id, `${row.family}-primary`);
        assert.match(callback.toString(), /target\.focus\(\)/); calls.push('programmatic-request'); },
      keyboard: { press: async () => assert.fail('Configured focus unexpectedly uses keyboard navigation') },
    };
    await perform(page, side, row);
    assert.deepEqual(calls, [row.family === 'timepicker' ? 'pointer-click' : 'programmatic-request']);
    if (row.family === 'timepicker') pointerClicks++; else focusRequests++;
  }
  assert.equal(focusRequests, 496); assert.equal(pointerClicks, 16);
  // Paired call counts represent 248/8 configured cases, not measured browser success.
  // The saved maintained runner is not the missing original e01 capture procedure.
});

test('configured focus labels preserve forty already-inspected noninteractive exclusions', () => {
  const file = 'artifacts/material-parity/working-audit/proposals/c394338eb185b3f410e7e18825cd370391b8daeb827f9b60f4d7355b46862823.json';
  const bytes = readFileSync(file);
  assert.equal(hash(bytes), 'ed7ecfea82fef0406fc9e0430a2df16a7db4555d2fdd074568c96cb5f3b39868');
  const envelope = JSON.parse(bytes);
  assert.equal(envelope.sha256, 'c394338eb185b3f410e7e18825cd370391b8daeb827f9b60f4d7355b46862823');
  const excluded = new Map(); let applicableProgrammatic = 0, applicablePointer = 0;
  const byCase = new Map(envelope.review.groups.map(g => [g.case, g]));
  for (const row of materialInteractionCases.filter(c => c.state === 'focus')) {
    const key = `interaction:${row.family}@${row.profile}/${row.viewport.id}/focus`;
    const group = byCase.get(key); assert.ok(group, key);
    const focus = group.obligations.programmaticFocus;
    if (focus.applicability === 'not-applicable') {
      assert.equal(focus.disposition, 'inspected-authored-exclusion');
      excluded.set(row.family, (excluded.get(row.family) ?? 0) + 1);
    } else {
      assert.equal(focus.applicability, 'applicable');
      if (row.family === 'timepicker') applicablePointer++; else applicableProgrammatic++;
    }
  }
  assert.deepEqual([...excluded].sort(), [['badge', 8], ['grid-list', 8], ['list', 8], ['sidenav', 8], ['table', 8]]);
  assert.equal(applicableProgrammatic, 208); assert.equal(applicablePointer, 8);
  // Reuse the authenticated review's exclusions, not fresh browser success or revised applicability.
});
