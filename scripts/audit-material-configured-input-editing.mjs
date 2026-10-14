import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { materialInteractionCases } from '../tests/material-parity/benchmark.config.mjs';
import { interactionLayerCursorProbe } from '../tests/material-parity/cursor-metrics.mjs';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { fingerprintDirectory, fingerprintModuleGraph, materialBrowserLaunchOptions,
  inspectMaterialBrowserLaunch, materialCaseKey, openMaterialCheckpoint } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Specific missing evidence: configured empty-and-blur key identities and
// intermediate paint. No fixture/style/control mutation or alternate action recipe.
const script = 'scripts/audit-material-configured-input-editing.mjs';
assert.equal(process.argv.length, 3, 'Supply a fresh --output=artifacts/material-parity/...');
assert.ok(process.argv[2].startsWith('--output='));
const output = process.argv[2].slice(9), root = path.resolve('examples/material-showcase/dist/material-showcase/browser');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const runnerFile = 'tests/material-parity/run-material-parity.mjs', runner = readFileSync(runnerFile);
const ast = ts.createSourceFile(runnerFile, runner.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
const names = ['performInteraction', 'interactionTargetBox', 'settleInteraction', 'profileTheme', 'sendShowcaseCommand', 'waitForThemeApplied'];
const methods = names.map(name => {
  const nodes = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.equal(nodes.length, 1); return nodes[0].getText(ast);
});
const actions = new Function('assert', 'interactionLayerCursorProbe', methods.join('\n') +
  ';return {performInteraction,settleInteraction,profileTheme,sendShowcaseCommand,waitForThemeApplied};')(assert, interactionLayerCursorProbe);
const cases = materialInteractionCases.filter(c => ['form-field', 'input'].includes(c.family) && c.state === 'edit-empty-blur');
assert.equal(cases.length, 16);
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
  const browserFiles = fingerprintDirectory(root), harnessFiles = fingerprintModuleGraph(process.cwd(), runnerFile);
  const provenance = { browser: browser.version(), browserLaunch: await inspectMaterialBrowserLaunch(browser, launch), browserFiles, harnessFiles,
    diagnosticFiles: fingerprintModuleGraph(process.cwd(), script), scope: 'Current readable action source against the unchanged retained served build; not whole-library current rendering acceptance.' };
  // Existing checkpoint writer owns exclusive provenance publication.
  const checkpointDirectory = `${output}-provenance`;
  openMaterialCheckpoint({ directory: checkpointDirectory, provenance });
  const options = parseSupplementalCaptureArguments([`--output=${output}`, `--checkpoint=${checkpointDirectory}/checkpoint`, `--base-url=http://127.0.0.1:${server.address().port}`]);
  const properties = Object.values(propertyGroups).flat();
  const evidence = openSupplementalCapture({ options, browser, script, styleProperties: properties });
  const results = [];
  for (const c of cases) {
    const context = await browser.newContext({ viewport: { width: c.viewport.width, height: c.viewport.height }, deviceScaleFactor: c.viewport.deviceScaleFactor,
      colorScheme: c.profile === 'dark' ? 'dark' : 'light', reducedMotion: 'reduce' });
    const paired = new Map();
    try {
      for (const mode of ['reference', 'astylar']) {
        const page = await context.newPage(), finish = evidence.observe(page), calls = [];
        try {
          await page.addInitScript(() => {
            window.__editingAuditEvents = [];
            for (const type of ['focus', 'blur', 'keydown', 'keyup', 'input', 'change']) document.addEventListener(type, event => {
              const node = event.target;
              window.__editingAuditEvents.push({ type, key: event.key ?? null, code: event.code ?? null, inputType: event.inputType ?? null,
                trusted: event.isTrusted, id: node?.id ?? null, owner: node?.getAttribute?.('data-astylar-id') ?? null, value: node?.value ?? null });
            }, true);
          });
          await page.goto(`${options.baseUrl}/${mode}/${c.family}?benchmark=1&profile=${c.profile}&interaction=${c.state}`, { waitUntil: 'commit' });
          await page.locator('.frame').waitFor({ state: 'visible' });
          const theme = actions.profileTheme(c.profile);
          await actions.sendShowcaseCommand(page, { type: 'showcase:theme', theme }); await actions.waitForThemeApplied(page, theme);
          if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
          await actions.settleInteraction(page, mode);
          await actions.sendShowcaseCommand(page, { type: 'showcase:benchmark', phase: 'start' });
          const sample = async boundary => {
            await actions.settleInteraction(page, mode);
            const observation = await observe(page, mode, c.family), b = observation.box;
            const clip = { x: Math.max(0, b.x - 16), y: Math.max(0, b.y - 16),
              width: Math.min(c.viewport.width, b.x + b.width + 16) - Math.max(0, b.x - 16),
              height: Math.min(c.viewport.height, b.y + b.height + 16) - Math.max(0, b.y - 16) };
            assert.ok(clip.width > 0 && clip.height > 0);
            const tree = mode === 'reference' ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties }) : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree);
            assert.ok(tree.nodes.length); assert.deepEqual(tree.errors, []);
            const stem = `${evidence.directory}/${c.family}-${c.profile}-${c.viewport.id}-${mode}-${paired.has(boundary) ? [...paired.keys()].indexOf(boundary) : paired.size}`;
            const treeBytes = Buffer.from(JSON.stringify(tree)), png = await page.screenshot({ clip, caret: 'initial', animations: 'disabled' });
            writeFileSync(`${stem}.json`, treeBytes, { flag: 'wx' }); writeFileSync(`${stem}.png`, png, { flag: 'wx' });
            if (!paired.has(boundary)) paired.set(boundary, { family: c.family, profile: c.profile, viewport: c.viewport, state: boundary, caseId: materialCaseKey('interaction', c) });
            paired.get(boundary)[mode] = { observation, calls: structuredClone(calls), inputTree: { file: `${stem}.json`, sha256: hash(treeBytes) }, screenshot: { file: `${stem}.png`, sha256: hash(png), clip, caret: 'initial' } };
          };
          await sample('initial');
          const wrap = (target, kind) => new Proxy(target, { get(object, key) {
            const value = Reflect.get(object, key); if (typeof value !== 'function') return value;
            return async (...args) => {
              calls.push({ kind, method: String(key), args }); const result = await value.apply(object, args);
              if (kind === 'keyboard' || key === 'up' || key === 'click') await sample(`${kind}.${String(key)}:${calls.length}`);
              return result;
            };
          } });
          const wrappedPage = new Proxy(page, { get(target, key) {
            if (key === 'mouse' || key === 'keyboard') return wrap(target[key], key);
            const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
          } });
          await actions.performInteraction(wrappedPage, mode, c);
          assert.deepEqual(calls.map(call => `${call.kind}.${call.method}`), ['mouse.move', 'mouse.down', 'mouse.up', 'keyboard.press', 'keyboard.press', 'mouse.click']);
          assert.deepEqual(calls.slice(3, 5).map(call => call.args), [['Control+A'], ['Backspace']]);
          assert.deepEqual(calls.at(-1).args, [10, 10]);
          await actions.sendShowcaseCommand(page, { type: 'showcase:benchmark', phase: 'settled' });
          const runtime = await finish(); for (const row of paired.values()) row[mode].runtime = runtime;
        } finally { await page.close(); }
      }
      assert.equal(paired.size, 5); results.push(...paired.values());
      console.log(JSON.stringify({ caseId: materialCaseKey('interaction', c), boundaries: paired.size }));
    } finally { await context.close(); }
  }
  assert.equal(results.length, 80);
  assert.deepEqual(fingerprintDirectory(root), browserFiles); assert.deepEqual(fingerprintModuleGraph(process.cwd(), runnerFile), harnessFiles);
  assert.deepEqual(fingerprintModuleGraph(process.cwd(), script), provenance.diagnosticFiles);
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify({ schemaVersion: 1, browser: browser.version(), capture: evidence.capture,
    actionSource: { file: runnerFile, sha256: hash(runner), methods: names.map((name, i) => ({ name, sha256: hash(methods[i]) })) }, results,
    scope: 'Sixteen configured empty-and-blur cases with unchanged real action function; observations add settlement/screenshot delays. Current readable action provenance, not original timing, equal inputs, absence from one caret screenshot or whole-case acceptance.',
    inputEquivalent: false, renderingEquivalent: false }, null, 2) + '\n', { flag: 'wx' });
} finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }

async function observe(page, mode, family) {
  return page.evaluate(({ mode, family }) => {
    const id = `${family}-control`, node = mode === 'reference' ? document.getElementById(id) : document.querySelector(`[data-astylar-id="${id}"]`);
    if (!node) throw Error(`Missing ${id}`);
    const control = { type: node.type, value: node.value, focused: document.activeElement === node,
      selectionStart: node.selectionStart, selectionEnd: node.selectionEnd, selectionDirection: node.selectionDirection };
    const events = structuredClone(window.__editingAuditEvents);
    if (mode === 'reference') return { box: node.getBoundingClientRect().toJSON(), control, events };
    const surface = window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface;
    const input = surface.host.inputElementService.getInputElement(id), b = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id], false).elements[id]?.borderBox;
    if (!input || !b) throw Error(`Missing retained ${id}`);
    const canvas = document.querySelector('canvas').getBoundingClientRect(), cursor = input.cursorMesh;
    return { box: { x: canvas.x + b.left, y: canvas.y + b.top, width: b.width, height: b.height }, control, events,
      retained: { value: input.value, focused: input.focused, selectionStart: input.selectionStart ?? null, selectionEnd: input.selectionEnd ?? null,
        cursor: cursor ? { enabled: cursor.isEnabled(), visible: cursor.isVisible } : null } };
  }, { mode, family });
}
