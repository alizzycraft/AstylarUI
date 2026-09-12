import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { chromium } from 'playwright-core';
import { captureNormalLineBox } from './normal-line-box-evidence.mjs';

let browser;
before(async () => { browser = await chromium.launch({ channel: 'chrome', headless: true }); });
after(async () => { await browser?.close(); });
async function fixture(callback) {
  const context = await browser.newContext({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  try {
    await page.setContent('<app-reference><main class="frame"><button style="height:48px"><span id="label" class="mdc-button__label" style="font:400 16px/normal Arial,sans-serif;letter-spacing:0px;word-spacing:0px">Mg</span></button></main></app-reference>');
    await page.evaluate(() => document.fonts.ready);
    const expectedStyle = await page.evaluate(() => {
      const style = getComputedStyle(document.getElementById('label'));
      return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing',
        'wordSpacing', 'textAlign', 'textTransform', 'textDecoration', 'whiteSpace'].map((property) => [property, style[property]]));
    });
    await callback(page, { referenceNode: 'frame/0/0', expectedText: 'Mg', expectedStyle });
    assert.equal(await page.locator('material-audit-line-box').count(), 0, 'observer must be removed on success or failure');
  } finally { await context.close(); }
}

test('natural line box retains typography and DPR without changing the fixed-height reference control', async () => {
  await fixture(async (page, request) => {
    const before = await page.locator('button').boundingBox();
    const result = await page.evaluate(captureNormalLineBox, request);
    assert.equal(result.source, 'browser-natural-single-line-box');
    assert.equal(result.text, 'Mg');
    assert.equal(result.typography.lineHeight, 'normal');
    assert.ok(result.naturalHeight > 0 && result.naturalHeight < 48);
    assert.ok(result.naturalWidth > 0);
    assert.deepEqual(result.viewport, { width: 640, height: 360, deviceScaleFactor: 2 });
    assert.equal(result.fontReady, true);
    assert.deepEqual(await page.locator('button').boundingBox(), before);
  });
});

test('natural line box rejects missing and mismatched checkpoint typography, text and identity', async () => {
  for (const mutate of [
    (request) => { request.referenceNode = 'overlay:0/0'; },
    (request) => { request.referenceNode = 'frame/1/0'; },
    (request) => { request.expectedText = 'Other'; },
    (request) => { delete request.expectedStyle.fontFamily; },
    (request) => { request.expectedStyle.fontWeight = '700'; },
  ]) await fixture(async (page, request) => {
    mutate(request);
    await assert.rejects(page.evaluate(captureNormalLineBox, request), /Normal line-box evidence:/);
  });
});

test('natural line box rejects unsupported reference structure and line layout', async () => {
  for (const mutation of ['child', 'line-height', 'vertical', 'multiline']) await fixture(async (page, request) => {
    await page.evaluate((mutation) => {
      const label = document.getElementById('label');
      if (mutation === 'child') label.append(document.createElement('span'));
      if (mutation === 'line-height') label.style.lineHeight = '21px';
      if (mutation === 'vertical') label.style.writingMode = 'vertical-rl';
      if (mutation === 'multiline') label.textContent = 'M\ng';
    }, mutation);
    await assert.rejects(page.evaluate(captureNormalLineBox, request), /Normal line-box evidence:/);
  });
});

test('generated observer content cannot silently change natural line-height and cleanup survives rejection', async () => {
  await fixture(async (page, request) => {
    await page.addStyleTag({ content: 'material-audit-line-box::before { content:"Extra"; display:block; height:100px }' });
    await assert.rejects(page.evaluate(captureNormalLineBox, request), /observer has generated content/);
  });
});
