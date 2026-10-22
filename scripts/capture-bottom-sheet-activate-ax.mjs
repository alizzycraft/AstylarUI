import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
// Reuse full AX/backend observation and pinned server,adding the maintained
// configured activate action. No fixture mutation or custom pointer calculation.
assert.equal(process.argv.length, 3, 'Provide a fresh bottom-sheet capture directory');
const base = 'scripts/capture-passive-static-ax.mjs';
let source = fs.readFileSync(base, 'utf8');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const runnerFile = 'tests/material-parity/run-material-parity.mjs', runner = fs.readFileSync(runnerFile);
const ast = ts.createSourceFile(runnerFile, runner.toString(), 99, true);
const names = ['performInteraction', 'interactionTargetBox', 'settleInteraction', 'profileTheme', 'sendShowcaseCommand', 'waitForThemeApplied'];
const methods = names.map(name => {
  const nodes = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.equal(nodes.length, 1); return nodes[0].getText(ast);
});
const actionSource = { file: runnerFile, sha256: hash(runner), methodsSha256: hash(methods.join('\n')), names };
function replaceOnce(before, after) {
  assert.equal(source.split(before).length, 2, `Unexpected base capture: ${before}`);
  source = source.replace(before, after);
}
replaceOnce("'../tests/material-parity/run-checkpoint.mjs'", "'./tests/material-parity/run-checkpoint.mjs'");
replaceOnce("const rows = JSON.parse(reportBytes).results.filter(row => ['sidenav', 'grid-list', 'table'].includes(row.family));",
  "const rows = materialInteractionCases.filter(row => row.family === 'bottom-sheet' && row.state === 'activate');");
replaceOnce('assert.equal(rows.length, 36);', 'assert.equal(rows.length, 9);');
replaceOnce('assert.equal(observations.length, 72);', 'assert.equal(observations.length, 18);');
replaceOnce("writeFileSync(path.join(output, 'producer.mjs'), readFileSync('scripts/capture-passive-static-ax.mjs'));",
  "writeFileSync(path.join(output, 'producer.mjs'), process.execArgv[2]);");
replaceOnce("producer: receipt('scripts/capture-passive-static-ax.mjs')",
  "producer: receipt(path.join(output, 'producer.mjs')), baseProducer: receipt('scripts/capture-passive-static-ax.mjs'), bottomSheetDerivation: receipt('scripts/capture-bottom-sheet-activate-ax.mjs'), actionSource, interactionConfig: receipt('tests/material-parity/benchmark.config.mjs'), cursorProbe: receipt('tests/material-parity/cursor-metrics.mjs')");
replaceOnce('const cdp = await page.context().newCDPSession(page);',
  `const theme = actions.profileTheme(row.profile);
        await actions.sendShowcaseCommand(page, { type: 'showcase:theme', theme });
        await actions.waitForThemeApplied(page, theme);
        await actions.settleInteraction(page, mode);
        await actions.sendShowcaseCommand(page, { type: 'showcase:benchmark', phase: 'start' });
        await actions.performInteraction(page, mode, row);
        await actions.settleInteraction(page, mode);
        await actions.sendShowcaseCommand(page, { type: 'showcase:benchmark', phase: 'settled' });
        await actions.settleInteraction(page, mode);
        const cdp = await page.context().newCDPSession(page);`);
replaceOnce('target, nodes, dom, runtimeErrors: errors', "state: row.state, boundary: 'after-configured-activate-and-settlement', target, nodes, dom, runtimeErrors: errors");
replaceOnce('for36 pinned static sidenav/grid-list/table contexts. No interaction-state replay',
  'for9 pinned configured bottom-sheet activate contexts. Only the configured activate endpoint');
replaceOnce('provenance.producer, provenance.report,',
  'provenance.producer, provenance.baseProducer, provenance.bottomSheetDerivation, provenance.actionSource, provenance.interactionConfig, provenance.cursorProbe, provenance.report,');
source = 'process.argv.splice(1, 0, "derived-bottom-sheet-activate-ax");\n'
  + "import { materialInteractionCases } from './tests/material-parity/benchmark.config.mjs';\n"
  + "import { interactionLayerCursorProbe } from './tests/material-parity/cursor-metrics.mjs';\n"
  + `const actionSource = ${JSON.stringify(actionSource)};\n`
  + `const actions = new Function('assert', 'interactionLayerCursorProbe', ${JSON.stringify(methods.join('\n') + ';return {performInteraction,settleInteraction,profileTheme,sendShowcaseCommand,waitForThemeApplied};')})(assert, interactionLayerCursorProbe);\n`
  + source;
assert.equal(ts.createSourceFile('derived.mjs', source, 99, true).parseDiagnostics.length, 0);
const result = spawnSync(process.execPath, ['--input-type=module', '-e', source, process.argv[2]],
  { cwd: process.cwd(), env: process.env, stdio: 'inherit', windowsHide: true });
if (result.error) throw result.error;
assert.equal(result.signal, null, 'Bottom-sheet capture terminated by signal');
process.exitCode = result.status ?? 1;
