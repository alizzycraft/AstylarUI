import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const baseUrl = process.env['ASTYLAR_MATERIAL_SHOWCASE_URL'] ?? 'http://127.0.0.1:4200';
const browser = await chromium.launch({
  channel: process.env['ASTYLAR_MATERIAL_BROWSER_CHANNEL'] ?? 'chrome',
  headless: true,
});

async function openFamily(family) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(`${baseUrl}/astylar/${family}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__, undefined, { timeout: 30_000 });
  await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
  return { page, errors };
}

async function astylarBox(page, id) {
  const [local, canvas] = await Promise.all([
    page.evaluate((targetId) =>
      window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([targetId]).elements[targetId]?.borderBox, id),
    page.locator('canvas').boundingBox(),
  ]);
  assert.ok(local && canvas, `Normal-runtime geometry is missing for ${id}.`);
  return {
    x: canvas.x + local.left,
    y: canvas.y + local.top,
    width: local.width,
    height: local.height,
    canvas,
  };
}

try {
  const { page, errors } = await openFamily('snack-bar');

  const trigger = await astylarBox(page, 'snack-bar-primary');
  await page.mouse.click(
    trigger.x + trigger.width / 2,
    trigger.y + trigger.height / 2,
  );
  await page.waitForFunction(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open === true);
  await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());

  const result = await page.evaluate(() => ({
    state: window.__ASTYLAR_MATERIAL_BENCHMARK__.state(),
    measurement: window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['snack-bar-overlay', 'snack-bar-surface']),
  }));
  const snackSurface = result.measurement.elements['snack-bar-surface']?.borderBox;
  assert.ok(snackSurface, 'Normal-runtime snackbar surface was not rendered.');
  assert.ok(snackSurface.top >= 0 && snackSurface.top + snackSurface.height <= trigger.canvas.height,
    'Normal-runtime snackbar surface is not reachable inside the canvas.');

  // A second activation must leave the snackbar visible and restart its
  // lifetime rather than creating a stale or duplicate overlay.
  await page.waitForTimeout(250);
  await page.mouse.click(trigger.x + trigger.width / 2, trigger.y + trigger.height / 2);
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open), true);
  await page.waitForFunction(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open === false, undefined, {
    timeout: 6_000,
  });
  await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
  const cleanup = await page.evaluate(() =>
    window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['snack-bar-surface']));
  assert.equal(cleanup.elements['snack-bar-surface']?.exists, false, 'Normal-runtime snackbar did not clean up.');
  assert.equal(cleanup.diagnostics.surface.session.status, 'idle');
  assert.equal(cleanup.diagnostics.surface.pluginResources.pending, 0);
  assert.deepEqual(errors, [], `Normal-runtime snackbar emitted browser errors: ${errors.join(' | ')}`);
  await page.close();
  console.log('Normal-runtime snackbar activation passed.');

  const tooltip = await openFamily('tooltip');
  const tooltipTrigger = await astylarBox(tooltip.page, 'tooltip-primary');
  await tooltip.page.mouse.move(
    tooltipTrigger.x + tooltipTrigger.width / 2,
    tooltipTrigger.y + tooltipTrigger.height / 2,
  );
  await tooltip.page.waitForFunction(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open === true);
  await tooltip.page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
  const tooltipBox = await astylarBox(tooltip.page, 'tooltip-popup');
  const triggerCenter = tooltipTrigger.x + tooltipTrigger.width / 2;
  const tooltipCenter = tooltipBox.x + tooltipBox.width / 2;
  assert.ok(Math.abs(triggerCenter - tooltipCenter) <= 2, 'Normal-runtime tooltip is not horizontally centered.');
  assert.ok(Math.abs(tooltipBox.y - (tooltipTrigger.y + tooltipTrigger.height) - 8) <= 2,
    'Normal-runtime tooltip does not have the expected 8 px trigger gap.');
  assert.ok(tooltipBox.y >= tooltipBox.canvas.y && tooltipBox.y + tooltipBox.height <= tooltipBox.canvas.y + tooltipBox.canvas.height,
    'Normal-runtime tooltip is not reachable inside the canvas.');
  await tooltip.page.mouse.move(2, 2);
  await tooltip.page.waitForFunction(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open === false);
  await tooltip.page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
  assert.deepEqual(tooltip.errors, [], `Normal-runtime tooltip emitted browser errors: ${tooltip.errors.join(' | ')}`);
  await tooltip.page.close();
  console.log('Normal-runtime tooltip hover and cleanup passed.');
} finally {
  await browser.close();
}
