import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright-core';

// Control-specific extension of the ordinary-node overflow probe. This proves
// browser initial-value/descendant reachability only, not cross-renderer parity.
test('button explicit visible axes and omission retain the same initial overflow behavior', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
    const result = await page.evaluate(() => {
      const observe = (overflow, ancestorClips = false) => {
        const parent = document.createElement('div');
        const button = document.createElement('button');
        const child = document.createElement('span');
        Object.assign(parent.style, { position: 'absolute', left: '20px', top: '20px',
          width: '60px', height: '40px', overflow: ancestorClips ? 'hidden' : 'visible' });
        Object.assign(button.style, { position: 'relative', display: 'block', boxSizing: 'border-box',
          width: '60px', height: '40px', border: '0', padding: '0', margin: '0', ...overflow });
        Object.assign(child.style, { position: 'absolute', left: '0', top: '0',
          width: '120px', height: '120px', background: 'red' });
        child.textContent = 'Overflow';
        button.append(child); parent.append(button); document.body.append(parent);
        const style = getComputedStyle(button);
        const observation = { x: style.overflowX, y: style.overflowY,
          outsideX: document.elementFromPoint(100, 30) === child,
          outsideY: document.elementFromPoint(30, 90) === child };
        button.scrollLeft = 20; button.scrollTop = 20;
        Object.assign(observation, { left: button.scrollLeft, top: button.scrollTop });
        parent.remove();
        return observation;
      };
      return { omitted: observe({}), axes: observe({ overflowX: 'visible', overflowY: 'visible' }),
        hidden: observe({ overflow: 'hidden' }), mixed: observe({ overflowX: 'visible', overflowY: 'hidden' }),
        ancestor: observe({}, true) };
    });
    assert.deepEqual(result.omitted, { x: 'visible', y: 'visible', outsideX: true, outsideY: true, left: 0, top: 0 });
    assert.deepEqual(result.axes, result.omitted);
    assert.deepEqual(result.hidden, { x: 'hidden', y: 'hidden', outsideX: false, outsideY: false, left: 20, top: 20 });
    assert.deepEqual(result.mixed, { x: 'auto', y: 'hidden', outsideX: false, outsideY: false, left: 20, top: 20 });
    assert.deepEqual(result.ancestor, { ...result.omitted, outsideX: false, outsideY: false });
  } finally {
    await browser.close();
  }
});
