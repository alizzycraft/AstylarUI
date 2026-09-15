import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from './input-tree-evidence.mjs';

// A sensitivity proof for the existing capture boundary, not an Astylar layout
// implementation or a claim about the original overlay's final pixels.
for (const deviceScaleFactor of [1, 2]) {
  test(`captured overlay root does not establish DOM inheritance or containing-block ancestry at DPR ${deviceScaleFactor}`, async t => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor });
      await page.setContent(`<style>
        body { margin:0; font-style:normal; color:rgb(10,20,30); }
        .frame { width:200px; height:80px; --marker:rgb(40,50,60); font-style:oblique; }
        .cdk-overlay-container { position:fixed; left:10px; top:20px; width:100px; height:40px; color:var(--marker,rgb(70,80,90)); }
      </style><app-reference><main class="frame">Frame</main></app-reference>
      <div class="cdk-overlay-container"><span id="overlay-label">Overlay</span></div>`);
      const capture = () => page.evaluate(captureBrowserInputTree,
        { styleProperties: ['fontStyle', 'color', 'position', 'transform'] });
      const rect = () => page.locator('.cdk-overlay-container').boundingBox();
      const initial = await capture(), initialRect = await rect();
      assert.deepEqual(initial.errors, []);
      assert.deepEqual(initial.nodes.filter(n => n.parent === null).map(n => n.key), ['frame', 'overlay:0']);
      assert.ok(!initial.nodes.some(n => ['html', 'body', 'app-reference'].includes(n.type)));
      const style = (tree, key) => tree.styles[tree.nodes.find(n => n.key === key).style];
      assert.equal(style(initial, 'frame').fontStyle, 'oblique');
      assert.equal(style(initial, 'overlay:0').fontStyle, 'normal');
      assert.equal(style(initial, 'overlay:0').color, 'rgb(70, 80, 90)', 'frame token must not leak into sibling overlay');
      const actualParent = await page.locator('.cdk-overlay-container').evaluate(el => el.parentElement.tagName.toLowerCase());
      assert.equal(actualParent, 'body', 'captured null is a traversal boundary, not a real DOM parent');

      await page.evaluate(() => {
        document.body.style.fontStyle = 'italic';
        document.body.style.setProperty('--marker', 'rgb(100,110,120)');
      });
      const inherited = await capture();
      assert.equal(style(inherited, 'frame').fontStyle, 'oblique');
      assert.equal(style(inherited, 'overlay:0').fontStyle, 'italic');
      assert.equal(style(inherited, 'overlay:0').color, 'rgb(100, 110, 120)');
      assert.ok(!inherited.nodes.some(n => n.type === 'body'));
      const overlay = inherited.nodes.find(n => n.key === 'overlay:0');
      assert.ok(!Object.hasOwn(overlay.inline, 'font-style'));
      assert.ok(!overlay.rules.some(i => Object.hasOwn(inherited.rules[i].declarations, 'font-style')));

      await page.evaluate(() => { document.body.style.transform = 'translate(30px, 40px)'; });
      const transformed = await capture(), shiftedRect = await rect();
      assert.equal(style(transformed, 'overlay:0').transform, 'none');
      assert.equal(transformed.nodes.find(n => n.key === 'overlay:0').parent, null);
      assert.equal(shiftedRect.x - initialRect.x, 30);
      assert.equal(shiftedRect.y - initialRect.y, 40);
      await page.evaluate(() => { document.body.removeAttribute('style'); });
      assert.deepEqual(await capture(), initial);
      assert.deepEqual(await rect(), initialRect);
      t.diagnostic(JSON.stringify({ browser: browser.version(), deviceScaleFactor,
        capturedRoots: ['frame', 'overlay:0'], actualOverlayParent: actualParent,
        originalRect: initialRect, transformedRect: shiftedRect,
        claim: 'Capture-boundary sensitivity only; no original-case inheritance, candidate values or rendered equivalence inferred.' }));
    } finally { await browser.close(); }
  });
}
