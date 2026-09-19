import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const file = 'scripts/capture-text-align-keyword-reference.mjs';
const html = '<!doctype html><style>body{margin:0}#owner{height:40px;font:16px/24px Arial;writing-mode:horizontal-tb;white-space:nowrap}</style><div id=owner>Alignment</div>';
const hash = x => createHash('sha256').update(x).digest('hex');
export function inspectKeywordReference(report) {
  assert.equal(report.kind, 'browser-logical-alignment-keyword-control');
  assert.equal(report.html, html); assert.deepEqual(report.errors, []);
  assert.equal(report.results.length, 32); assert.equal(new Set(report.results.map(r => `${r.dpr}/${r.width}/${r.direction}/${r.alignment}`)).size, 32);
  const controls = [];
  for (const r of report.results) {
    assert.ok([1, 2].includes(r.dpr)); assert.ok([160, 240].includes(r.width));
    assert.ok(['ltr', 'rtl'].includes(r.direction)); assert.ok(['start', 'left', 'end', 'right'].includes(r.alignment));
    assert.deepEqual(r.viewport, { width: 640, height: 360 }); assert.equal(r.devicePixelRatio, r.dpr);
    assert.equal(r.textContent, 'Alignment'); assert.equal(r.fontAvailable, true);
    assert.deepEqual(r.computed, { textAlign: r.alignment, direction: r.direction, writingMode: 'horizontal-tb',
      fontFamily: 'Arial', fontSize: '16px', lineHeight: '24px' });
    assert.equal(r.box.width, r.width); assert.equal(r.box.height, 40); assert.equal(r.box.x, 0); assert.equal(r.box.y, 0);
    for (const key of ['x', 'y', 'width', 'height']) assert.ok(Number.isFinite(r.text[key]));
    assert.ok(r.text.width > 20 && r.text.width < 100 && r.text.height > 10);
    if (!['start', 'end'].includes(r.alignment)) continue;
    const expected = (r.alignment === 'start') === (r.direction === 'ltr') ? 'left' : 'right';
    const peer = a => report.results.find(p => p.dpr === r.dpr && p.width === r.width && p.direction === r.direction && p.alignment === a);
    assert.deepEqual(r.text, peer(expected).text);
    const oppositeDelta = Math.abs(r.text.x - peer(expected === 'left' ? 'right' : 'left').text.x);
    assert.ok(oppositeDelta > 80);
    controls.push({ dpr: r.dpr, width: r.width, direction: r.direction, alignment: r.alignment, expectedPhysical: expected, oppositeDelta });
  }
  assert.equal(report.astylarRenderingVerified, false); assert.equal(report.materialRenderingEquivalent, false);
  return controls;
}

async function capture() {
  assert.equal(process.argv.length, 2);
  const browser = await chromium.launch({ channel: 'chrome', headless: true }), results = [], errors = [];
  try {
    for (const dpr of [1, 2]) {
      const context = await browser.newContext({ viewport: { width: 640, height: 360 }, deviceScaleFactor: dpr });
      const page = await context.newPage(); page.on('pageerror', e => errors.push(String(e)));
      for (const width of [160, 240]) for (const direction of ['ltr', 'rtl']) for (const alignment of ['start', 'left', 'end', 'right']) {
        await page.setContent(html);
        const sample = await page.evaluate(async ({ width, direction, alignment }) => {
          const owner = document.getElementById('owner'); Object.assign(owner.style, { width: width + 'px', direction, textAlign: alignment });
          await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const range = document.createRange(); range.selectNodeContents(owner);
          const css = getComputedStyle(owner);
          return { box: owner.getBoundingClientRect().toJSON(), text: range.getBoundingClientRect().toJSON(),
            computed: Object.fromEntries(['textAlign', 'direction', 'writingMode', 'fontFamily', 'fontSize', 'lineHeight'].map(k => [k, css[k]])),
            textContent: owner.textContent, fontAvailable: document.fonts.check('16px Arial'), devicePixelRatio,
            viewport: { width: innerWidth, height: innerHeight } };
        }, { width, direction, alignment });
        results.push({ dpr, width, direction, alignment, ...sample });
      }
      await context.close();
    }
    const report = { kind: 'browser-logical-alignment-keyword-control', browserVersion: browser.version(), html,
      source: { file, sha256: hash(readFileSync(file)) }, results, errors,
      astylarRenderingVerified: false, materialRenderingEquivalent: false };
    console.log(JSON.stringify({ ...report, controls: inspectKeywordReference(report) }));
  } finally { await browser.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await capture();
