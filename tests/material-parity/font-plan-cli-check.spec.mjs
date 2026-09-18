import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const definitions = [
  { script: 'scripts/audit-material-host-font-token-inputs.mjs', collect: 'collectHostFontTokens', plan: 'collectHostFontTokenPlan',
    file: 'docs/material-host-font-token-attribution-plan.json', groups: 7 },
  { script: 'scripts/audit-material-container-font-family-stages.mjs', collect: 'collectContainerFontFamily', plan: 'collectContainerFontFamilyPlan',
    file: 'docs/material-container-font-family-attribution-plan.json', groups: 20 },
];

// Execute the actual parsed CLI body with side-effect spies, not an imitation of
// its argument branching. The source collectors are separately exercised by the
// real, filesystem-write-prohibited child processes below.
function cliBody(file) {
  const source = readFileSync(file, 'utf8');
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(parsed.parseDiagnostics.length, 0);
  const gates = parsed.statements.filter(n => ts.isIfStatement(n) && n.expression.getText(parsed).includes('import.meta.url'));
  assert.equal(gates.length, 1); assert.ok(ts.isBlock(gates[0].thenStatement));
  return gates[0].thenStatement.statements.map(n => n.getText(parsed)).join('\n');
}

for (const d of definitions) {
  test(`CLI check mode is order-independent and rejects stale output: ${d.script}`, async () => {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const run = new AsyncFunction('assert', 'process', d.collect, d.plan, 'readFileSync', 'writeFileSync', 'hash', 'console', cliBody(d.script));
    const report = { observations: 1, counts: {}, proposedGroups: d.groups, proposedObservations: 1, otherCompleteRows: 0 };
    const output = JSON.stringify(report, null, 2) + '\n';
    for (const args of [['--check'], ['--check', '--plan'], ['--plan', '--check']]) for (const stale of [false, true]) {
      let writes = 0, reads = 0, collected = 0, planned = 0;
      const invocation = () => run(assert, { argv: ['node', d.script, ...args] },
        () => { collected++; return report; }, async () => { planned++; return report; },
        () => { reads++; return stale ? output + 'stale' : output; },
        () => { writes++; }, () => 'test-digest', { log() {} });
      if (stale) await assert.rejects(invocation); else await invocation();
      assert.equal(writes, 0, 'check mode attempted an output write'); assert.equal(reads, 1);
      assert.equal(planned, args.includes('--plan') ? 1 : 0); assert.equal(collected + planned, 1);
    }
    for (const args of [[], ['--plan']]) {
      let writes = 0, reads = 0;
      await run(assert, { argv: ['node', d.script, ...args] }, () => report, async () => report,
        () => { reads++; return output; }, (file, text) => { writes++; assert.equal(text, output); if (args.length) assert.equal(file, d.file); },
        () => 'test-digest', { log() {} });
      assert.equal(writes, 1); assert.equal(reads, 0);
    }
    for (const args of [['--unknown'], ['--check', '--check'], ['--plan', '--plan']]) {
      const forbidden = () => assert.fail('invalid arguments reached a collector or output operation');
      await assert.rejects(() => run(assert, { argv: ['node', d.script, ...args] }, forbidden, forbidden, forbidden, forbidden, forbidden, { log: forbidden }));
    }
  });

  test(`real source and canonical replay is read-only with --plan --check: ${d.script}`, () => {
    const before = readFileSync(d.file);
    // No workspace mutation is used to enforce read-only operation. Patch the
    // built-in write function only inside this child before loading its ESM.
    const guard = `import fs from 'node:fs'; import { syncBuiltinESMExports } from 'node:module';
      fs.writeFileSync = () => { throw new Error('CHECK_MODE_ATTEMPTED_WRITE'); }; syncBuiltinESMExports();`;
    const output = execFileSync(process.execPath, ['--max-old-space-size=512', '--import',
      'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'), d.script, '--plan', '--check'],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 });
    assert.equal(JSON.parse(output).proposedGroups, d.groups);
    assert.deepEqual(readFileSync(d.file), before);
  });
}
