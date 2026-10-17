import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { materialInteractionCases } from '../tests/material-parity/benchmark.config.mjs';
import { interactionLayerCursorProbe } from '../tests/material-parity/cursor-metrics.mjs';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { fingerprintDirectory, fingerprintModuleGraph, materialBrowserLaunchOptions,
  inspectMaterialBrowserLaunch, materialCaseKey, openMaterialCheckpoint } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments, validateSupplementalCapture } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Missing evidence: direct active owners for the56 configured non-editable
// focus cases. Reuse the exact maintained action, not Tab or a replacement focus.
const script = 'scripts/audit-material-configured-control-focus.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const families = ['chips', 'slide-toggle', 'button', 'menu', 'expansion', 'snack-bar', 'tooltip'];
const cases = materialInteractionCases.filter(c => families.includes(c.family) && c.state === 'focus');
assert.equal(cases.length, 56);
const properties = Object.values(propertyGroups).flat();
const verifyMode = process.argv[2] === '--verify';
assert.equal(process.argv.length, verifyMode ? 4 : 3);
const output = verifyMode ? process.argv[3] : process.argv[2].slice(9);
assert.ok(verifyMode || process.argv[2].startsWith('--output='));
const runnerFile = 'tests/material-parity/run-material-parity.mjs', runner = readFileSync(runnerFile);
const ast = ts.createSourceFile(runnerFile, runner.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
const names = ['performInteraction', 'interactionTargetBox', 'settleInteraction', 'profileTheme', 'sendShowcaseCommand', 'waitForThemeApplied'];
const methods = names.map(name => {
  const nodes = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.equal(nodes.length, 1); return nodes[0].getText(ast);
});
const actionSource = { file: runnerFile, sha256: hash(runner), methodsSha256: hash(methods.join('\n')) };
const actions = new Function('assert', 'interactionLayerCursorProbe', methods.join('\n') +
  ';return {performInteraction,settleInteraction,profileTheme,sendShowcaseCommand,waitForThemeApplied};')(assert, interactionLayerCursorProbe);
if (verifyMode) {
  const file = `${output}/latest-report.json`, report = JSON.parse(readFileSync(file));
  const manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  assert.deepEqual(validateSupplementalCapture(report, { reportFile: file, expectedProvenance: manifest.provenance, script, styleProperties: properties }),
    { status: 'checkpoint-bound', errors: [] });
  assert.deepEqual(report.actionSource, actionSource);
  for (const receipt of [...manifest.provenance.harnessFiles, ...manifest.provenance.diagnosticFiles])
    assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  assert.deepEqual(report.results.map(r => r.caseId).sort(), cases.map(c => materialCaseKey('interaction', c)).sort());
  for (const row of report.results) for (const side of ['reference', 'astylar']) {
    const evidence = row[side]; assert.equal(evidence.observations.length, 3);
    assert.deepEqual(evidence.observations.map(o => o.boundary), ['before', 'after-action', 'settled']);
    for (const o of evidence.observations) {
      assert.equal(o.host?.logicalId, `${row.family}-primary`);
      assert.ok(o.active?.tag && o.target?.tag);
      assert.equal(o.activeEqualsTarget, o.active.token === o.target.token);
      assert.ok(Array.isArray(o.activeAncestry) && Array.isArray(o.events));
    }
    assert.equal(hash(readFileSync(evidence.screenshot.file)), evidence.screenshot.sha256);
  }
  console.log(JSON.stringify({ cases: report.results.length, pairedBoundaries: report.results.length * 3,
    observedNotParityAccepted: true, reportSha256: hash(readFileSync(file)) }));
} else {
  const root = path.resolve('examples/material-showcase/dist/material-showcase/browser');
  const server = createServer((request, response) => {
    const name = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const candidate = path.resolve(root, name.replace(/^\/+/, ''));
    const file = candidate.startsWith(root + path.sep) && path.extname(candidate) && existsSync(candidate) ? candidate : path.join(root, 'index.csr.html');
    const ext = path.extname(file);
    response.writeHead(200, { 'content-type': ext === '.js' ? 'text/javascript' : ext === '.css' ? 'text/css' : ext === '.woff2' ? 'font/woff2' : ext === '.svg' ? 'image/svg+xml' : 'text/html', 'cache-control': 'no-store' });
    response.end(readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    const launch = materialBrowserLaunchOptions(); browser = await chromium.launch(launch);
    const provenance = { browser: browser.version(), browserLaunch: await inspectMaterialBrowserLaunch(browser, launch),
      browserFiles: fingerprintDirectory(root), harnessFiles: fingerprintModuleGraph(process.cwd(), runnerFile),
      diagnosticFiles: fingerprintModuleGraph(process.cwd(), script), scope: 'Current readable configured action; retained served build, not whole-library current rendering acceptance.' };
    openMaterialCheckpoint({ directory: output + '-provenance', provenance });
    const options = parseSupplementalCaptureArguments([`--output=${output}`, `--checkpoint=${output}-provenance/checkpoint`, `--base-url=http://127.0.0.1:${server.address().port}`]);
    const evidence = openSupplementalCapture({ options, browser, script, styleProperties: properties }), results = [];
    for (const c of cases) {
      const context = await browser.newContext({ viewport: { width: c.viewport.width, height: c.viewport.height },
        deviceScaleFactor: c.viewport.deviceScaleFactor, colorScheme: c.profile === 'dark' ? 'dark' : 'light', reducedMotion: 'reduce' });
      const row = { family: c.family, profile: c.profile, viewport: c.viewport, state: c.state, caseId: materialCaseKey('interaction', c) };
      try {
        for (const mode of ['reference', 'astylar']) {
          const page = await context.newPage(), finish = evidence.observe(page);
          try {
            await page.addInitScript(installObserver);
            await page.goto(`${options.baseUrl}/${mode}/${c.family}?benchmark=1&profile=${c.profile}&interaction=focus`, { waitUntil: 'commit' });
            await page.locator('.frame').waitFor({ state: 'visible' });
            const theme = actions.profileTheme(c.profile);
            await actions.sendShowcaseCommand(page, { type: 'showcase:theme', theme }); await actions.waitForThemeApplied(page, theme);
            if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
            await actions.settleInteraction(page, mode);
            await actions.sendShowcaseCommand(page, { type: 'showcase:benchmark', phase: 'start' });
            const sample = boundary => page.evaluate(({ mode, family, boundary }) => window.__configuredControlFocusObserve(mode, family, boundary), { mode, family: c.family, boundary });
            const observations = [await sample('before')];
            await actions.performInteraction(page, mode, c); observations.push(await sample('after-action'));
            await actions.settleInteraction(page, mode);
            await actions.sendShowcaseCommand(page, { type: 'showcase:benchmark', phase: 'settled' });
            observations.push(await sample('settled'));
            const tree = mode === 'reference' ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties }) : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree);
            assert.ok(tree.nodes.length); assert.deepEqual(tree.errors, []);
            const stem = `${evidence.directory}/${c.family}-${c.profile}-${c.viewport.id}-${mode}`;
            const treeBytes = Buffer.from(JSON.stringify(tree)), png = await page.screenshot({ animations: 'disabled' });
            writeFileSync(stem + '.json', treeBytes, { flag: 'wx' }); writeFileSync(stem + '.png', png, { flag: 'wx' });
            row[mode] = { observations, inputTree: { file: stem + '.json', sha256: hash(treeBytes) },
              screenshot: { file: stem + '.png', sha256: hash(png) }, runtime: await finish() };
          } finally { await page.close(); }
        }
        results.push(row); console.log(JSON.stringify({ caseId: row.caseId, reference: row.reference.observations.at(-1), astylar: row.astylar.observations.at(-1) }));
      } finally { await context.close(); }
    }
    writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify({ schemaVersion: 1, browser: browser.version(), capture: evidence.capture,
      actionSource, results, scope: '56 exact configured focus contexts; direct active owners before/after action and settlement. Not equal-input,paint,current-package or whole-case acceptance.', inputEquivalent: false, renderingEquivalent: false }) + '\n', { flag: 'wx' });
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}

function installObserver() {
  const tokens = new WeakMap(); let sequence = 0; const events = [];
  const describe = node => {
    if (!(node instanceof Element)) return null;
    if (!tokens.has(node)) tokens.set(node, ++sequence);
    return { token: tokens.get(node), tag: node.tagName, id: node.id || null, logicalId: node.getAttribute('data-astylar-id') || node.id || null,
      role: node.getAttribute('role'), tabindex: node.getAttribute('tabindex'), disabled: node.hasAttribute('disabled') };
  };
  for (const type of ['focus', 'blur', 'focusin', 'focusout']) document.addEventListener(type,
    event => events.push({ type, trusted: event.isTrusted, target: describe(event.target), related: describe(event.relatedTarget) }), true);
  window.__configuredControlFocusObserve = (mode, family, boundary) => {
    const host = mode === 'reference' ? document.getElementById(`${family}-primary`) : document.querySelector(`[data-astylar-id="${family}-primary"]`);
    const selector = 'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]';
    const target = host?.matches(selector) ? host : host?.querySelector(selector);
    if (!host || !target) throw Error(`Missing configured focus host/target: ${mode}/${family}`);
    const active = document.activeElement, activeAncestry = [];
    for (let node = active; node instanceof Element; node = node.parentElement) activeAncestry.push(describe(node));
    return { boundary, host: describe(host), target: describe(target), active: describe(active), activeEqualsTarget: active === target,
      activeWithinHost: !!active && host.contains(active), activeAncestry, events: structuredClone(events) };
  };
}
