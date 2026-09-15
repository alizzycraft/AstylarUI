import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from './input-tree-evidence.mjs';
import { captureReferenceRootAncestorContext } from './reference-root-ancestor-context.mjs';

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
