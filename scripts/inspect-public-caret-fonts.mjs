import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';

const output = path.resolve(process.argv[2] ?? '');
assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep)); assert.ok(!existsSync(output));
const hash = b => createHash('sha256').update(b).digest('hex');
const sources = [
  ['Arial', 'public-caret-frames-arial-receipted-20261024', '508da18107728877c325cc480fb6f3cd43ba18ab8cb75927df60434717a9dd97'],
  ['monospace', 'public-caret-frames-monospace-20261024', '6fa0cb7a747a1f308e2cc6bbbbbc991782c590884da4957f31e3cbfc4192eaa9'],
].map(([font, name, sha256]) => {
  const file = `artifacts/material-parity/${name}/latest-report.json`, bytes = readFileSync(file); assert.equal(hash(bytes), sha256);
  const report = JSON.parse(bytes), bundleFile = `artifacts/material-parity/${name}/audit.js`, bundle = readFileSync(bundleFile);
  assert.equal(hash(bundle), report.bundleSha256); return { font, file, sha256, bundleFile, bundleSha256: hash(bundle), bundle };
});
const html = Buffer.from('<!doctype html><html><head><meta charset="utf-8"></head><body><script type="module" src="/audit.js"></script></body></html>');
let selected;
const server = createServer((req, res) => {
  const script = new URL(req.url, 'http://localhost').pathname === '/audit.js';
  res.setHeader('content-type', script ? 'text/javascript' : 'text/html'); res.end(script ? selected.bundle : html);
});
mkdirSync(output);
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); let browser;
const observations = [], errors = [];
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const source of sources) for (const dpr of [1, 2]) {
    selected = source;
    const page = await browser.newPage({ viewport: { width: 390, height: 140 }, deviceScaleFactor: dpr });
    page.on('pageerror', e => errors.push(String(e)));
    try {
      await page.goto(`http://127.0.0.1:${server.address().port}/?mode=reference&variant=placeholder-keyboard`);
      await page.waitForFunction(() => !!window.caretAudit); await page.evaluate(() => window.caretAudit.settle());
      await page.keyboard.press('Tab'); await page.evaluate(() => window.caretAudit.settle());
      const snapshot = await page.evaluate(() => window.caretAudit.snapshot()); assert.equal(snapshot.focused, true);
      const computed = await page.locator('#audit-empty').evaluate(n => {
        const s = getComputedStyle(n), canvas = document.createElement('canvas'), ctx = canvas.getContext('2d'); ctx.font = s.font;
        const m = ctx.measureText('Project name');
        return { font: s.font, fontFamily: s.fontFamily, fontSize: s.fontSize, lineHeight: s.lineHeight,
          fontsReady: document.fonts.status, fontCheck: document.fonts.check(s.font, 'Project name'),
          textMetrics: { width: m.width, actualBoundingBoxAscent: m.actualBoundingBoxAscent, actualBoundingBoxDescent: m.actualBoundingBoxDescent,
            fontBoundingBoxAscent: m.fontBoundingBoxAscent, fontBoundingBoxDescent: m.fontBoundingBoxDescent } };
      });
      const cdp = await page.context().newCDPSession(page); await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
      const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#audit-empty' }); assert.ok(nodeId);
      const target = await cdp.send('DOM.describeNode', { nodeId, depth: -1, pierce: true });
      const fonts = [];
      async function visit(node) {
        if (node.nodeId) {
          const result = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: node.nodeId });
          if (result.fonts.length) fonts.push({ nodeId: node.nodeId, nodeName: node.nodeName, nodeValue: node.nodeValue, fonts: result.fonts });
        }
        for (const child of [...(node.children ?? []), ...(node.shadowRoots ?? [])]) await visit(child);
      }
      await visit(target.node); await cdp.detach();
      observations.push({ font: source.font, dpr, computed, snapshot, target, fonts });
      assert.equal(await page.evaluate(() => window.caretAudit.dispose()), true);
    } finally { await page.close(); }
  }
  assert.deepEqual(errors, []);
  const script = 'scripts/inspect-public-caret-fonts.mjs';
  writeFileSync(path.join(output, 'producer.mjs'), readFileSync(script), { flag: 'wx' });
  writeFileSync(path.join(output, 'latest-report.json'), JSON.stringify({ browser: browser.version(), htmlSha256: hash(html),
    producer: { file: script, sha256: hash(readFileSync(script)) }, sources: sources.map(({ bundle, ...source }) => source), observations,
    scope: 'Native focused empty input and rendered placeholder font metadata from unchanged retained public bundles; not candidate canvas-font identity, native logical caret metrics or new pixel acceptance.' }) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ observations: observations.length, platformFontRows: observations.map(r => r.fonts.length) }));
} catch (e) {
  writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ error: String(e), observations, errors })); throw e;
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
