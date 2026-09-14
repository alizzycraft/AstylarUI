import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright-core';

// Browser-only diagnostic guard. This does not calculate or certify candidate
// computed styles, nor does it classify the captured Material discrepancies.
for (const deviceScaleFactor of [1, 2]) {
  test(`root initial styles require property-specific inheritance evidence at DPR ${deviceScaleFactor}`, async t => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor });
      await page.setContent('<main id="frame"><section id="root"><span>Text</span></section></main>');
      const result = await page.evaluate(() => {
        const frame = document.getElementById('frame'), root = document.getElementById('root');
        const read = () => {
          const s = getComputedStyle(root);
          return { fontWeight: s.fontWeight, textAlign: s.textAlign, verticalAlign: s.verticalAlign,
            localStyle: root.getAttribute('style') };
        };
        const initial = read();
        Object.assign(frame.style, { fontWeight: '700', textAlign: 'center', verticalAlign: 'middle' });
        const changedAncestor = read();
        Object.assign(root.style, { fontWeight: '400', textAlign: 'start', verticalAlign: 'middle' });
        const explicit = read();
        root.removeAttribute('style');
        const removedOverride = read();
        frame.removeAttribute('style');
        return { initial, changedAncestor, explicit, removedOverride, restored: read() };
      });
      const initial = { fontWeight: '400', textAlign: 'start', verticalAlign: 'baseline', localStyle: null };
      const inherited = { ...initial, fontWeight: '700', textAlign: 'center' };
      assert.deepEqual(result.initial, initial);
      assert.deepEqual(result.changedAncestor, inherited, 'font-weight and text-align inherit, vertical-align does not');
      assert.equal(result.explicit.fontWeight, '400');
      assert.equal(result.explicit.textAlign, 'start');
      assert.equal(result.explicit.verticalAlign, 'middle');
      assert.ok(result.explicit.localStyle.includes('vertical-align: middle'));
      assert.deepEqual(result.removedOverride, inherited);
      assert.deepEqual(result.restored, initial);
      t.diagnostic(JSON.stringify({ browserVersion: browser.version(), deviceScaleFactor,
        scope: 'browser computed-style sensitivity only; no candidate or raster equivalence claim', result }));
    } finally { await browser.close(); }
  });

  test(`vertical-align computed equality is not formatting-context equivalence at DPR ${deviceScaleFactor}`, async t => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor });
      await page.setContent(`<style>
        .line { font: 20px/40px Arial, sans-serif; height:80px; }
        .probe { width:20px; height:20px; }
        #inline { display:inline-block; } #block { display:block; }
      </style><div class="line">Text<span id="baseline" style="display:inline-block;width:0;height:0"></span><span class="probe" id="inline"></span></div>
      <div class="line"><div class="probe" id="block"></div></div>`);
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(() => {
        const nodes = ['inline', 'block'].map(id => document.getElementById(id));
        const read = () => nodes.map(n => {
          const s = getComputedStyle(n), b = n.getBoundingClientRect(), p = n.parentElement.getBoundingClientRect();
          return { id: n.id, display: s.display, verticalAlign: s.verticalAlign,
            top: b.top - p.top, width: b.width, height: b.height,
            ...(n.id === 'inline' ? { bottomFromBaseline: b.bottom - document.getElementById('baseline').getBoundingClientRect().top } : {}) };
        });
        const initial = read();
        nodes.forEach(n => { n.style.verticalAlign = '10px'; });
        const shifted = read();
        nodes.forEach(n => n.style.removeProperty('vertical-align'));
        return { initial, shifted, restored: read() };
      });
      assert.deepEqual(result.initial.map(n => n.verticalAlign), ['baseline', 'baseline']);
      assert.deepEqual(result.shifted.map(n => n.verticalAlign), ['10px', '10px']);
      assert.equal(result.initial[0].bottomFromBaseline, 0);
      assert.equal(result.shifted[0].bottomFromBaseline, -10, 'inline alignment is relative to the line baseline, not the parent top');
      assert.equal(result.shifted[1].top, result.initial[1].top, 'ordinary block does not consume vertical-align');
      assert.deepEqual(result.shifted.map(n => [n.width, n.height]), [[20, 20], [20, 20]]);
      assert.deepEqual(result.restored, result.initial);
      t.diagnostic(JSON.stringify({ browserVersion: browser.version(), deviceScaleFactor,
        scope: 'browser formatting-context sensitivity only; not an Astylar layout proof', result }));
    } finally { await browser.close(); }
  });
}
