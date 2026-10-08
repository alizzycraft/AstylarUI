import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { fingerprintDirectory, materialBrowserLaunchOptions } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// One exact physical context; close the action-delivery gap, not whole-menu acceptance.
const args = process.argv.slice(2), checkpoint = args.find(a => a.startsWith('--checkpoint='));
assert.equal(args.length, 2); assert.ok(checkpoint);
const manifest = JSON.parse(readFileSync(path.join(checkpoint.slice(13), 'manifest.json')));
const root = path.resolve('examples/material-showcase/dist/material-showcase/browser');
assert.deepEqual(fingerprintDirectory(root), manifest.provenance.browserFiles);
const hash = b => createHash('sha256').update(b).digest('hex');
const runnerFile = 'tests/material-parity/run-material-parity.mjs', runner = readFileSync(runnerFile);
assert.equal(hash(runner), manifest.provenance.harnessFiles.find(f => f.file === runnerFile).sha256);
const ast = ts.createSourceFile(runnerFile, runner.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const names = ['profileTheme', 'sendShowcaseCommand', 'waitForThemeApplied', 'settleInteraction'];
const bodies = names.map(name => {
  const nodes = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.equal(nodes.length, 1); return nodes[0].getText(ast);
});
const helpers = new Function('assert', `${bodies.join('\n')};return {${names.join(',')}};`)(assert);
const server = createServer((req, res) => {
  const candidate = path.resolve(root, decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, ''));
  const file = candidate.startsWith(root + path.sep) && path.extname(candidate) && existsSync(candidate) ? candidate : path.join(root, 'index.csr.html');
  const ext = path.extname(file);
  res.writeHead(200, { 'content-type': ext === '.js' ? 'text/javascript' : ext === '.css' ? 'text/css' : ext === '.woff2' ? 'font/woff2' : 'text/html', 'cache-control': 'no-store' });
  res.end(readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  const options = parseSupplementalCaptureArguments([...args, `--base-url=http://127.0.0.1:${server.address().port}`]);
  browser = await chromium.launch(materialBrowserLaunchOptions());
  const properties = Object.values(propertyGroups).flat();
  const evidence = openSupplementalCapture({ options, browser, script: 'scripts/audit-material-menu-actions.mjs', styleProperties: properties });
  const results = [];
  for (const mode of ['reference', 'astylar']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, colorScheme: 'light', reducedMotion: 'reduce' });
    try {
      const page = await context.newPage(), finishRuntime = evidence.observe(page), boundaries = [];
      await page.goto(`${options.baseUrl}/${mode}/menu?benchmark=1&profile=light&interaction=open`, { waitUntil: 'commit' });
      await page.locator('.frame').waitFor({ state: 'visible' });
      await helpers.sendShowcaseCommand(page, { type: 'showcase:theme', theme: helpers.profileTheme('light') });
      await helpers.waitForThemeApplied(page, helpers.profileTheme('light'));
      await helpers.settleInteraction(page, mode);
      const box = async id => mode === 'reference' ? page.locator(id === 'menu-primary' ? '#menu-primary' : '.mat-mdc-menu-panel button').first().boundingBox()
        : page.evaluate(id => { const b = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id], false).elements[id]?.borderBox;
          const c = document.querySelector('canvas').getBoundingClientRect(); return b ? { x: c.x+b.left, y: c.y+b.top, width: b.width, height: b.height } : null; }, id);
      const move = async id => { const b = await box(id); assert.ok(b?.width > 0); await page.mouse.move(b.x+b.width/2, b.y+b.height/2); };
      const snapshot = async state => {
        await helpers.settleInteraction(page, mode);
        const observation = await page.evaluate(mode => {
          const active = document.activeElement;
          return { open: mode === 'reference' ? !!document.querySelector('.mat-mdc-menu-panel') : window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open,
            active: { id: active?.id, astylarId: active?.getAttribute('data-astylar-id'), text: active?.textContent?.trim().slice(0,80) },
            events: mode === 'astylar' ? window.__ASTYLAR_MATERIAL_BENCHMARK__.events() : null };
        }, mode);
        const tree = mode === 'reference' ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties }) : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree);
        assert.deepEqual(tree.errors, []);
        const stem = `${evidence.directory}/${mode}-${state}`, pixels = await page.screenshot({ animations: 'disabled', caret: 'hide' }), treeBytes = Buffer.from(JSON.stringify(tree));
        writeFileSync(`${stem}.png`, pixels, { flag: 'wx' }); writeFileSync(`${stem}.json`, treeBytes, { flag: 'wx' });
        boundaries.push({ state, observation, screenshot: { file: `${stem}.png`, sha256: hash(pixels) }, inputTree: { file: `${stem}.json`, sha256: hash(treeBytes) } });
      };
      await move('menu-primary'); await page.mouse.click((await box('menu-primary')).x+20,(await box('menu-primary')).y+20); await snapshot('opened');
      await move('menu-rename'); await page.mouse.down(); await snapshot('item-held'); await page.mouse.up(); await snapshot('item-clicked');
      await page.keyboard.press('Escape'); await helpers.settleInteraction(page, mode);
      await move('menu-primary'); await page.mouse.down(); await page.mouse.up(); await snapshot('reopened');
      await page.keyboard.press('ArrowDown'); await snapshot('arrow-down');
      await page.keyboard.press('Escape'); await snapshot('escape');
      results.push({ family: 'menu', mode, profile: 'light', viewport: { width: 1440, height: 1000, deviceScaleFactor: 1 }, boundaries, runtime: await finishRuntime() });
      await page.close();
    } finally { await context.close(); }
  }
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify({ schemaVersion: 1, browser: browser.version(), capture: evidence.capture,
    actionSource: { file: runnerFile, sha256: hash(runner), names, bodiesSha256: hash(bodies.join('\n')) }, results,
    scope: 'Real item pointer hold/release and ArrowDown/Escape in one matched light desktop DPR1 context; not all configured states or input equivalence', inputEquivalent: false }, null, 2)+'\n', { flag: 'wx' });
  console.log(JSON.stringify(results.map(r => ({ mode: r.mode, boundaries: r.boundaries.map(b => ({ state: b.state, ...b.observation, events: undefined })) }))));
} finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
