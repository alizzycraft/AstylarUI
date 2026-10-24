import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';

// Reuse the existing full-AX capture/server, with exact configured activate actions.
assert.equal(process.argv.length, 3, 'Provide a fresh dialog AX directory');
const base = 'scripts/capture-passive-static-ax.mjs', script = 'scripts/capture-dialog-owner-ax.mjs';
let source = readFileSync(base, 'utf8');
const hash = b => createHash('sha256').update(b).digest('hex');
const runnerFile = 'tests/material-parity/run-material-parity.mjs', runner = readFileSync(runnerFile);
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
  "const rows = materialInteractionCases.filter(row => row.family === 'dialog' && row.state === 'activate');");
replaceOnce('assert.equal(rows.length, 36);', 'assert.equal(rows.length, 8);');
replaceOnce('assert.equal(observations.length, 72);', 'assert.equal(observations.length, 16);');
replaceOnce("'artifacts/material-parity/divider-current-browser-20261020/checkpoint/manifest.json'",
  "'artifacts/material-parity/snackbar-open-ax-postdelay-20261024-provenance/checkpoint/manifest.json'");
replaceOnce("path.resolve('examples/material-showcase/dist/material-showcase/browser')", "path.resolve(process.env.ASTYLAR_MATERIAL_SHOWCASE_BROWSER_ROOT)");
replaceOnce("writeFileSync(path.join(output, 'producer.mjs'), readFileSync('scripts/capture-passive-static-ax.mjs'));",
  "writeFileSync(path.join(output, 'producer.mjs'), process.execArgv[2]);");
replaceOnce("producer: receipt('scripts/capture-passive-static-ax.mjs')",
  `producer: receipt(path.join(output, 'producer.mjs')), baseProducer: receipt('${base}'), dialogDerivation: receipt('${script}'), actionSource, interactionConfig: receipt('tests/material-parity/benchmark.config.mjs'), cursorProbe: receipt('tests/material-parity/cursor-metrics.mjs')`);
replaceOnce('const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor });',
  "const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor, reducedMotion: 'reduce', colorScheme: row.profile === 'dark' ? 'dark' : 'light' });");
replaceOnce('const cdp = await page.context().newCDPSession(page);',
  `const theme = actions.profileTheme(row.profile);
        await actions.sendShowcaseCommand(page, { type: 'showcase:theme', theme });
        await actions.waitForThemeApplied(page, theme);
        await actions.settleInteraction(page, mode);
        await actions.sendShowcaseCommand(page, { type: 'showcase:benchmark', phase: 'start' });
        await actions.performInteraction(page, mode, row);
        await actions.settleInteraction(page, mode);
        await actions.sendShowcaseCommand(page, { type: 'showcase:benchmark', phase: 'settled' });
        const cdp = await page.context().newCDPSession(page);`);
replaceOnce('target, nodes, dom, runtimeErrors: errors', "state: row.state, boundary: 'after-configured-activate-and-settlement', target, nodes, dom, runtimeErrors: errors");
replaceOnce('for36 pinned static sidenav/grid-list/table contexts. No interaction-state replay', 'for8 retained-build dialog activate contexts. Configured activate endpoint only;not all interaction states');
replaceOnce('provenance.producer, provenance.report,', 'provenance.producer, provenance.baseProducer, provenance.dialogDerivation, provenance.actionSource, provenance.interactionConfig, provenance.cursorProbe, provenance.report,');
source = 'process.argv.splice(1, 0, "derived-dialog-owner-ax");\n'
  + "import { materialInteractionCases } from './tests/material-parity/benchmark.config.mjs';\n"
  + "import { interactionLayerCursorProbe } from './tests/material-parity/cursor-metrics.mjs';\n"
  + `const actionSource = ${JSON.stringify(actionSource)};\n`
  + `const actions = new Function('assert', 'interactionLayerCursorProbe', ${JSON.stringify(methods.join('\n') + ';return {performInteraction,settleInteraction,profileTheme,sendShowcaseCommand,waitForThemeApplied};')})(assert, interactionLayerCursorProbe);\n`
  + source;
assert.equal(ts.createSourceFile('derived.mjs', source, 99, true).parseDiagnostics.length, 0);
const result = spawnSync(process.execPath, ['--input-type=module', '-e', source, process.argv[2]], {
  cwd: process.cwd(), env: { ...process.env, ASTYLAR_MATERIAL_SHOWCASE_BROWSER_ROOT: 'artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser' },
  stdio: 'inherit', windowsHide: true,
});
if (result.error) throw result.error;
assert.equal(result.signal, null); process.exitCode = result.status ?? 1;
