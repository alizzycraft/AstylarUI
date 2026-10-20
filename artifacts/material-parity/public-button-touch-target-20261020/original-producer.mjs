import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { chromium } from 'playwright-core';

// Reuse the maintained package-root cursor page. Only diagnostic input/event
// overlays are compiled in memory;its files and canonical fixtures stay intact.
const root = process.cwd(), arg = process.argv[2];
assert.ok(process.argv.length === 3 && arg.startsWith('--output='));
const output = path.resolve(root, arg.slice(9));
assert.ok(output.startsWith(path.resolve(root, 'artifacts/material-parity') + path.sep));
assert.equal(existsSync(output), false, 'Use a fresh diagnostic output directory');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const entry = 'examples/material-showcase/audit/cursor-defaults.mjs';
const input = 'examples/material-showcase/audit/cursor-default-input.mjs';
const entryOriginal = readFileSync(entry, 'utf8'), inputOriginal = readFileSync(input, 'utf8');
const eventSource = 'events: { onEvent: event => publicEvents.push({ ...event }) }';
assert.equal(entryOriginal.split(eventSource).length, 2);
const entryOverlay = entryOriginal.replace(eventSource,
  "events: { handlers: { target: { click: event => publicEvents.push({ type: 'audit-parent-click', targetId: event.targetId, currentTargetId: event.currentTargetId }) } }, onEvent: event => publicEvents.push({ ...event }) }");
assert.equal(inputOriginal.split('export function cursorInput(name)').length, 2);
const inputOverlay = inputOriginal.replace('export function cursorInput(name)', 'function baseCursorInput(name)') + `
export function cursorInput(name) {
  if (!['plain','touch'].includes(name)) throw new Error('Unknown touch control');
  const site=baseCursorInput('button-omitted');
  if(name==='touch') {
    site.root.children[0].children[0].children=[{type:'span',id:'touch'}];
    site.styles.push({selector:'#touch',position:'absolute',left:'0px',top:'-4px',width:'100%',height:'48px',
      display:'block',boxSizing:'border-box',margin:'0',padding:'0',borderWidth:'0',background:'transparent',pointerEvents:'auto'});
  }
  return site;
}
`;
const overlays = new Map([[path.resolve(entry), entryOverlay], [path.resolve(input), inputOverlay]]);
const consumer = createRequire(path.join(root, 'examples/material-showcase/package.json'));
const built = await consumer('esbuild').build({ absWorkingDir: root, entryPoints: [entry], bundle: true, write: false,
  format: 'esm', platform: 'browser', target: 'es2022', metafile: true,
  plugins: [{ name: 'bounded-touch-diagnostic', setup(build) {
    build.onLoad({ filter: /cursor-default(s|-input)\.mjs$/ }, args => {
      const contents = overlays.get(args.path); assert.ok(contents);
      return { contents, loader: 'js', resolveDir: path.dirname(args.path) };
    });
  } }],
});
const bundle = built.outputFiles[0].contents;
const html = Buffer.from('<!doctype html><html><head><meta charset="utf-8"></head><body><script type="module" src="/audit.js"></script></body></html>');
mkdirSync(output, { recursive: true }); writeFileSync(path.join(output, 'audit.js'), bundle);
const provenance = { producer: { file: 'scripts/audit-public-button-touch-target.mjs', sha256: hash(readFileSync('scripts/audit-public-button-touch-target.mjs')) },
  bundleSha256: hash(bundle), htmlSha256: hash(html),
  overlays: [...overlays].map(([file, compiledSource]) => ({ file: path.relative(root, file).replaceAll('\\', '/'),
    originalSha256: hash(readFileSync(file)), compiledSource, compiledSha256: hash(compiledSource) })),
  bundleInputs: Object.keys(built.metafile.inputs).sort().map(file => ({ file, sha256: hash(readFileSync(file)),
    ...(overlays.has(path.resolve(file)) ? { compiledOverlaySha256: hash(overlays.get(path.resolve(file))) } : {}) })),
  packages: Object.fromEntries(['@angular/core', '@angular/platform-browser', '@babylonjs/core', 'astylarui', 'esbuild']
    .map(name => [name, JSON.parse(readFileSync(`examples/material-showcase/node_modules/${name}/package.json`)).version])),
};
writeFileSync(path.join(output, 'provenance.json'), JSON.stringify(provenance));
const server = createServer((request, response) => {
  response.setHeader('content-type', request.url === '/audit.js' ? 'text/javascript' : 'text/html');
  response.end(request.url === '/audit.js' ? bundle : html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const captures = [], errors = [];
try {
  for (const dpr of [1, 2]) for (const translated of [false, true]) for (const variant of ['plain', 'touch']) {
    const pairedSites = [];
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 480, height: 300 }, deviceScaleFactor: dpr });
      page.on('pageerror', error => errors.push({ mode, variant, error: error.message }));
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}&case=${variant}&translated=${translated}`);
        await page.waitForFunction(() => !!window.cursorDefaultAudit);
        await page.evaluate(() => window.cursorDefaultAudit.settle());
        const origin = translated ? { x: 64, y: 40 } : { x: 0, y: 0 };
        const initial = await page.evaluate(point => {
          window.__TOUCH_PARENT_CLICKS__ = 0; window.__TRUSTED_TOUCH_CLICKS__ = [];
          document.getElementById('target')?.addEventListener('click', () => window.__TOUCH_PARENT_CLICKS__++);
          document.addEventListener('click', e => window.__TRUSTED_TOUCH_CLICKS__.push({ trusted: e.isTrusted, x: e.clientX, y: e.clientY }), true);
          return window.cursorDefaultAudit.snapshot(point);
        }, { x: origin.x + 106, y: origin.y + 68 });
        pairedSites.push(initial.site);
        const points = [{ name: 'above2', x: origin.x + 106, y: origin.y + 46 },
          { name: 'below2', x: origin.x + 106, y: origin.y + 90 },
          { name: 'center', x: origin.x + 106, y: origin.y + 68 },
          { name: 'far-above8', x: origin.x + 106, y: origin.y + 40 },
          { name: 'far-below8', x: origin.x + 106, y: origin.y + 96 }];
        const trials = [];
        for (const point of points) {
          await page.mouse.move(420, 260); await page.evaluate(() => window.cursorDefaultAudit.settle());
          const before = await page.evaluate(() => ({ parent: window.__TOUCH_PARENT_CLICKS__,
            events: window.cursorDefaultAudit.snapshot({ x: 420, y: 260 }).publicEvents.length,
            trusted: window.__TRUSTED_TOUCH_CLICKS__.length }));
          await page.mouse.click(point.x, point.y); await page.evaluate(() => window.cursorDefaultAudit.settle());
          const after = await page.evaluate(point => ({ snapshot: window.cursorDefaultAudit.snapshot(point),
            parent: window.__TOUCH_PARENT_CLICKS__, trusted: window.__TRUSTED_TOUCH_CLICKS__ }), point);
          const events = after.snapshot.publicEvents.slice(before.events);
          const parentClicks = mode === 'reference' ? after.parent - before.parent
            : events.filter(e => e.type === 'audit-parent-click' && e.currentTargetId === 'target').length;
          assert.equal(after.trusted.length - before.trusted, 1); assert.equal(after.trusted.at(-1).trusted, true);
          if (point.name === 'center') assert.equal(parentClicks, 1);
          if (point.name.startsWith('far-') || variant === 'plain' && point.name !== 'center') assert.equal(parentClicks, 0);
          if (mode === 'reference' && variant === 'touch' && ['above2', 'below2'].includes(point.name)) assert.equal(parentClicks, 1);
          trials.push({ point, parentClicks, events, hit: after.snapshot.hit, diagnostics: after.snapshot.diagnostics });
        }
        const disposed = await page.evaluate(() => window.cursorDefaultAudit.dispose()); assert.equal(disposed.disposed, true);
        captures.push({ mode, dpr, translated, variant, initial, trials, disposed });
      } finally { await page.close(); }
    }
    assert.deepEqual(pairedSites[0], pairedSites[1], 'Both sides must receive identical SiteData');
  }
  assert.deepEqual(errors, []); assert.equal(captures.length, 16);
  for (const overlay of provenance.overlays) assert.equal(hash(readFileSync(overlay.file)), overlay.originalSha256);
  const result = { provenance, browser: browser.version(), captures, errors,
    scope: 'Package-root equal-input touch-descendant hit testing with plain,center,far-outside,DPR and translated-surface controls. Not Material style/paint parity,all controls or full audit acceptance.' };
  writeFileSync(path.join(output, 'latest-report.json'), JSON.stringify(result));
  console.log(JSON.stringify({ output: path.relative(root, output), captures: captures.length, trustedClickBoundaries: 80,
    results: captures.map(c => ({ mode: c.mode, dpr: c.dpr, translated: c.translated, variant: c.variant,
      hits: c.trials.map(t => ({ point: t.point.name, parentClicks: t.parentClicks })) })),
    sourceFilesUnchanged: true, runtimeErrors: errors }));
} catch (error) {
  writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ error: String(error), stack: error.stack, captures, errors }));
  throw error;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
