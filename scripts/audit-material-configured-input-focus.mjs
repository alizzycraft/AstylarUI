import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { materialInteractionCases } from '../tests/material-parity/benchmark.config.mjs';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { fingerprintDirectory, materialBrowserLaunchOptions, materialCaseKey } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Close the demonstrated configured-focus evidence gap. Do not edit values,
// selections, styles, input types or renderer state. Retained 900px producers stay intact.
const args = process.argv.slice(2);
assert.equal(args.length, 2, 'Supply --checkpoint and a new --output directory.');
const checkpointArg = args.find(a => a.startsWith('--checkpoint='));
assert.ok(checkpointArg);
const manifest = JSON.parse(readFileSync(path.join(checkpointArg.slice(13), 'manifest.json')));
const root = path.resolve('examples/material-showcase/dist/material-showcase/browser');
assert.deepEqual(fingerprintDirectory(root), manifest.provenance.browserFiles);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const runnerFile = 'tests/material-parity/run-material-parity.mjs';
const runnerBytes = readFileSync(runnerFile);
assert.equal(hash(runnerBytes), manifest.provenance.harnessFiles.find(r => r.file === runnerFile).sha256);
const ast = ts.createSourceFile(runnerFile, runnerBytes.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
const originalFunction = name => {
  const nodes = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.equal(nodes.length, 1); return nodes[0];
};
const themeNode = originalFunction('profileTheme');
const theme = new Function('profile', themeNode.body.getText(ast).slice(1, -1));
const focusNodes = originalFunction('performInteraction').body.statements.filter(n =>
  ts.isIfStatement(n) && n.expression.getText(ast) === "state === 'focus'");
assert.equal(focusNodes.length, 1);
const focusBody = focusNodes[0].thenStatement.getText(ast).slice(1, -1);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const focus = new AsyncFunction('page', 'mode', 'family', 'x', 'y', focusBody);
const actionSource = { file: runnerFile, sha256: hash(runnerBytes),
  focusBodySha256: hash(focusBody), themeBodySha256: hash(themeNode.body.getText(ast)) };
const families = ['form-field', 'input', 'autocomplete', 'datepicker', 'timepicker'];
const cases = materialInteractionCases.filter(c => families.includes(c.family) && c.state === 'focus');
assert.equal(cases.length, 40);
const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  const candidate = path.resolve(root, pathname.replace(/^\/+/, ''));
  const target = candidate.startsWith(root + path.sep) && path.extname(candidate) && existsSync(candidate)
    ? candidate : path.join(root, 'index.csr.html');
  const extension = path.extname(target);
  response.writeHead(200, { 'content-type': extension === '.js' ? 'text/javascript' : extension === '.css' ? 'text/css'
    : extension === '.woff2' ? 'font/woff2' : extension === '.svg' ? 'image/svg+xml' : 'text/html', 'cache-control': 'no-store' });
  response.end(readFileSync(target));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  const options = parseSupplementalCaptureArguments([...args, `--base-url=http://127.0.0.1:${server.address().port}`]);
  browser = await chromium.launch(materialBrowserLaunchOptions());
  const properties = Object.values(propertyGroups).flat();
  const evidence = openSupplementalCapture({ options, browser, script: 'scripts/audit-material-configured-input-focus.mjs', styleProperties: properties });
  const results = [];
  for (const c of cases) {
    const context = await browser.newContext({ viewport: { width: c.viewport.width, height: c.viewport.height },
      deviceScaleFactor: c.viewport.deviceScaleFactor, colorScheme: c.profile === 'dark' ? 'dark' : 'light', reducedMotion: 'reduce' });
    const rows = Array.from({ length: 6 }, (_, sample) => ({ family: c.family, profile: c.profile, viewport: c.viewport,
      state: `configured-focus-${sample}`, caseId: materialCaseKey('interaction', c),
      action: sample ? 'wait 125ms' : 'original configured focus action', sample }));
    try {
      for (const mode of ['reference', 'astylar']) {
        const page = await context.newPage(), finishRuntime = evidence.observe(page);
        await page.goto(`${options.baseUrl}/${mode}/${c.family}?benchmark=1&profile=${c.profile}&interaction=focus`, { waitUntil: 'commit' });
        await page.locator('.frame').waitFor({ state: 'visible' });
        await page.waitForFunction(() => typeof window.__MATERIAL_SHOWCASE_COMMAND__ === 'function');
        assert.equal(await page.evaluate(theme => window.__MATERIAL_SHOWCASE_COMMAND__({ type: 'showcase:theme', theme }), theme(c.profile)), true);
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        const settle = async () => {
          if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
        };
        await settle();
        assert.equal(await page.evaluate(() => window.__MATERIAL_SHOWCASE_COMMAND__({ type: 'showcase:benchmark', phase: 'start' })), true);
        // Only timepicker consumes x/y in the original focus block. Read its
        // actual CSS input box; no world-space calculation or anchor adjustment.
        const box = c.family === 'timepicker' ? await observe(page, mode, c.family).then(r => r.box) : { x: 0, y: 0, width: 0, height: 0 };
        await focus(page, mode, c.family, box.x + box.width / 2, box.y + box.height / 2);
        assert.equal(await page.evaluate(() => window.__MATERIAL_SHOWCASE_COMMAND__({ type: 'showcase:benchmark', phase: 'settled' })), true);
        await settle();
        for (const row of rows) {
          if (row.sample) await page.waitForTimeout(125);
          await settle();
          const observation = await observe(page, mode, c.family);
          const tree = mode === 'reference' ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties })
            : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree);
          assert.ok(tree.nodes.length); assert.deepEqual(tree.errors, []);
          const b = observation.box;
          const clip = { x: Math.max(0, b.x - 16), y: Math.max(0, b.y - 16),
            width: Math.min(c.viewport.width, b.x + b.width + 16) - Math.max(0, b.x - 16),
            height: Math.min(c.viewport.height, b.y + b.height + 16) - Math.max(0, b.y - 16) };
          assert.ok(clip.width > 0 && clip.height > 0);
          const stem = `${evidence.directory}/${c.family}-${c.profile}-${c.viewport.id}-${mode}-${row.sample}`;
          const treeBytes = Buffer.from(JSON.stringify(tree)), visible = await page.screenshot({ clip, caret: 'initial', animations: 'disabled' }),
            hidden = await page.screenshot({ clip, caret: 'hide', animations: 'disabled' });
          for (const [suffix, bytes] of [['input-tree.json', treeBytes], ['visible.png', visible], ['hidden.png', hidden]])
            writeFileSync(`${stem}-${suffix}`, bytes, { flag: 'wx' });
          row[mode] = { observation, inputTree: { file: `${stem}-input-tree.json`, sha256: hash(treeBytes) },
            screenshot: { file: `${stem}-visible.png`, sha256: hash(visible), clip, caret: 'initial' },
            hiddenCaretControl: { file: `${stem}-hidden.png`, sha256: hash(hidden), clip, caret: 'hide' } };
        }
        const runtime = await finishRuntime();
        for (const row of rows) row[mode].runtime = runtime;
        await page.close();
      }
      results.push(...rows);
      console.log(JSON.stringify({ caseId: materialCaseKey('interaction', c), samples: rows.length,
        reference: rows[0].reference.observation.control, astylar: rows[0].astylar.observation.control }));
    } finally { await context.close(); }
  }
  assert.equal(results.length, 240);
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify({ schemaVersion: 1, browser: browser.version(), capture: evidence.capture,
    actionSource, generatedAt: new Date().toISOString(), results, scope: 'Forty exact configured input-focus contexts, six timed samples. Focus/selection and local caret modes observed, not equal paint or whole-case acceptance.',
    inputEquivalent: false, renderingEquivalent: false }, null, 2) + '\n', { flag: 'wx' });
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}

async function observe(page, mode, family) {
  return page.evaluate(({ mode, family }) => {
    const id = `${family}-control`, node = mode === 'reference' ? document.getElementById(id) : document.querySelector(`[data-astylar-id="${id}"]`);
    if (!node) throw Error(`Missing ${id}`);
    const dom = { id: node.id || null, astylarId: node.dataset.astylarId || null, type: node.type,
      value: node.value, focused: document.activeElement === node, selectionStart: node.selectionStart,
      selectionEnd: node.selectionEnd, selectionDirection: node.selectionDirection };
    if (mode === 'reference') return { box: node.getBoundingClientRect().toJSON(), control: dom, caretColor: getComputedStyle(node).caretColor };
    const surface = window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface;
    const input = surface.host.inputElementService.getInputElement(id), measured = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id], false).elements[id]?.borderBox;
    if (!input || !measured) throw Error(`Missing retained input ${id}`);
    const canvas = document.querySelector('canvas').getBoundingClientRect(), mesh = input.cursorMesh;
    return { box: { x: canvas.x + measured.left, y: canvas.y + measured.top, width: measured.width, height: measured.height }, control: dom,
      retained: { value: input.value, focused: input.focused, selectionStart: input.selectionStart ?? null, selectionEnd: input.selectionEnd ?? null,
        caretMesh: mesh ? { enabled: mesh.isEnabled(), visible: mesh.isVisible } : null } };
  }, { mode, family });
}
