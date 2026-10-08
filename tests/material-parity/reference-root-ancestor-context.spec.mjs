import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from './input-tree-evidence.mjs';
import { captureReferenceRootAncestorContext } from './reference-root-ancestor-context.mjs';

test('retained Menu ancestor and collision observations preserve exact receipts and bounded placement failure', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const runs = [
    ['menu-mobile-root-context-v2-20261008', '1a96c6753996e5048f6533f1c35812aae96a91368b42da4f3f0e37461558defa', 844],
    ['menu-collision-boundary-20261008', 'c5fce741a7eb00a4e72af366137a66dbf24635fda49e3a9346c4fa2b2f7bd882', 280],
  ];
  const popups = new Map();
  for (const [directory, expectedHash, height] of runs) {
    const bytes = readFileSync(`artifacts/material-parity/${directory}/latest-report.json`);
    assert.equal(hash(bytes), expectedHash);
    const report = JSON.parse(bytes);
    assert.equal(report.ancestorSource.file, 'tests/material-parity/reference-root-ancestor-context.mjs');
    assert.equal(hash(readFileSync(report.ancestorSource.file)), report.ancestorSource.sha256);
    assert.deepEqual(report.results.map(row => `${row.profile}/${row.mode}`).sort(),
      ['dark/astylar', 'dark/reference', 'light/astylar', 'light/reference']);
    for (const row of report.results) {
      assert.equal(row.family, 'menu');
      assert.deepEqual([row.viewport.width, row.viewport.height, row.viewport.deviceScaleFactor], [390, height, 2]);
      assert.deepEqual(row.boundaries.map(b => b.state), ['initial-closed', 'open-1', 'closed-1']);
      assert.deepEqual(row.boundaries.map(b => b.observation.open), [false, true, false]);
      for (const boundary of row.boundaries) {
        for (const receipt of [boundary.screenshot, boundary.inputTree]) {
          assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
        }
        const image = PNG.sync.read(readFileSync(boundary.screenshot.file));
        assert.deepEqual([image.width, image.height], [780, height * 2]);
        assert.deepEqual(JSON.parse(readFileSync(boundary.inputTree.file)).errors, []);
        if (row.mode !== 'reference') continue;
        const context = boundary.ancestorContext;
        assert.deepEqual(context.errors, []);
        assert.deepEqual(context.documentScroll, { x: 0, y: 0 });
        for (const root of context.roots) {
          const chain = root.ancestry.map(key => context.nodes.find(n => n.key === key));
          assert.ok(chain.every(Boolean));
          assert.equal(root.node, chain[0].key);
          for (let index = 0; index < chain.length; index++) {
            assert.equal(chain[index].parent, chain[index + 1]?.key ?? null);
          }
          if (root.captureKey.startsWith('overlay:')) {
            assert.deepEqual(chain.map(n => n.type), ['div', 'body', 'html']);
            for (const node of chain) {
              for (const property of ['transform', 'filter', 'perspective', 'contain']) {
                assert.equal(node.computed[property], 'none');
              }
              assert.equal(node.computed.zoom, '1');
            }
          }
        }
      }
      popups.set(`${height}/${row.profile}/${row.mode}`, row.boundaries[1].observation.popup);
    }
  }
  for (const profile of ['light', 'dark']) {
    const normal = popups.get(`844/${profile}/reference`);
    const short = popups.get(`280/${profile}/reference`);
    assert.equal(normal.y - short.y, 152, 'native collision fallback changes placement');
    assert.ok(short.y >= 0 && short.y + short.height <= 280);
    const candidate = popups.get(`280/${profile}/astylar`);
    assert.deepEqual(candidate, popups.get(`844/${profile}/astylar`), 'candidate placement remains fixed');
    assert.ok(Math.abs(candidate.y + candidate.height - 280 - 54.08000183105537) < 0.001);
  }
  // Historical observations of unequal anchor inputs, not current rendering acceptance.
});

for (const deviceScaleFactor of [1, 2]) {
  test(`supplemental ancestry preserves attachment, source and computed context without DOM writes at DPR ${deviceScaleFactor}`, async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor });
      await page.setContent(`<style>body{margin:0;--marker:orange;font-style:italic}
        @media(min-width:600px){body{transform:translate(30px,40px)}}
        app-reference{display:block}.frame{--marker:blue;font-style:normal}
        .cdk-overlay-container{position:fixed;left:10px;top:20px;color:var(--marker)}
        </style><app-reference><main class="frame">Frame</main></app-reference>
        <div class="cdk-overlay-container">Overlay</div>`);
      const oldCapture = () => page.evaluate(captureBrowserInputTree, { styleProperties: ['fontStyle', 'color', 'transform'] });
      const before = await oldCapture(), html = await page.content();
      const evidence = await page.evaluate(captureReferenceRootAncestorContext);
      assert.deepEqual(evidence.errors, []);
      assert.deepEqual(evidence.viewport, { width: 640, height: 400, deviceScaleFactor });
      const chain = key => evidence.roots.find(r => r.captureKey === key).ancestry.map(id => evidence.nodes.find(n => n.key === id));
      assert.deepEqual(chain('frame').map(n => n.type), ['main', 'app-reference', 'body', 'html']);
      assert.deepEqual(chain('overlay:0').map(n => n.type), ['div', 'body', 'html']);
      assert.equal(new Set(evidence.nodes.map(n => n.key)).size, evidence.nodes.length);
      for (const node of evidence.nodes) assert.ok(node.parent === null || evidence.nodes.some(n => n.key === node.parent));
      assert.equal(chain('overlay:0')[0].computed['font-style'], 'italic');
      assert.equal(chain('overlay:0')[0].computed.color, 'rgb(255, 165, 0)');
      assert.equal(chain('frame')[0].computed['--marker'], 'blue');
      assert.equal(chain('overlay:0')[1].computed.transform, 'matrix(1, 0, 0, 1, 30, 40)');
      assert.equal(chain('overlay:0')[0].computed.transform, 'none');
      assert.equal(chain('overlay:0')[0].viewportRect.x, 40);
      assert.equal(chain('overlay:0')[0].viewportRect.y, 60);
      assert.ok(evidence.sheets.some(s => s.rules.some(r => r.startsWith('@media') && r.includes('translate(30px, 40px)'))));
      assert.deepEqual(await oldCapture(), before, 'supplement must not mutate original tree evidence');
      assert.equal(await page.content(), html, 'supplement must not mutate the DOM');
      assert.deepEqual(await page.evaluate(captureReferenceRootAncestorContext), evidence, 'repeat capture must be stable');

      await page.evaluate(() => {
        const host = document.querySelector('app-reference');
        host.style.setProperty('--marker', 'purple', 'important');
        host.append(document.querySelector('.cdk-overlay-container'));
      });
      const moved = await page.evaluate(captureReferenceRootAncestorContext);
      const attachment = moved.roots.find(r => r.captureKey === 'overlay:0');
      const actual = attachment.ancestry.map(key => moved.nodes.find(n => n.key === key));
      assert.deepEqual(actual.map(n => n.type), ['div', 'app-reference', 'body', 'html']);
      assert.equal(actual[0].computed.color, 'rgb(128, 0, 128)');
      assert.deepEqual(actual[1].inline['--marker'], { value: 'purple', important: true });
      assert.notEqual(attachment.node, evidence.roots.find(r => r.captureKey === 'overlay:0').node);
      await page.locator('.frame').evaluate(element => element.remove());
      assert.deepEqual((await page.evaluate(captureReferenceRootAncestorContext)).errors, ['Reference frame is missing']);
    } finally { await browser.close(); }
  });
}
