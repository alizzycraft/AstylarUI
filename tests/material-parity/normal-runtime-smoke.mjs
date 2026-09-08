import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const baseUrl = process.env['ASTYLAR_MATERIAL_SHOWCASE_URL'] ?? 'http://127.0.0.1:4200';
const browser = await chromium.launch({
  channel: process.env['ASTYLAR_MATERIAL_BROWSER_CHANNEL'] ?? 'chrome',
  headless: true,
});

async function openComparedFamily(family) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(`${baseUrl}/compare`, { waitUntil: 'domcontentloaded' });
  await page.locator('.comparison-toolbar select').first().selectOption(family);
  const runtime = await page.waitForEvent('framenavigated', {
    predicate: (frame) => new URL(frame.url()).pathname === `/astylar/${family}`,
    timeout: 30_000,
  }).catch(() => page.frames().find((frame) => new URL(frame.url()).pathname === `/astylar/${family}`));
  assert.ok(runtime, `Compared Astylar runtime did not navigate to ${family}.`);
  await runtime.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__, undefined, { timeout: 30_000 });
  await runtime.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
  return { page, runtime, errors };
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

async function dragSliderHandle(page, runtime, visual, fromRatio, toRatio, targetId, fixedId) {
  await runtime.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.clearEvents());
  const samples = [];
  const readValues = async () => runtime.evaluate(({ targetId: movingId, fixedId: stationaryId }) => {
    const benchmark = window.__ASTYLAR_MATERIAL_BENCHMARK__;
    const state = benchmark.state();
    const events = benchmark.events();
    const latest = (id, fallback) => Number(
      [...events].reverse().find((event) => event.type === 'input' && event.targetId === id)?.value ?? fallback,
    );
    return {
      moving: latest(movingId, movingId === 'slider-start' ? state.sliderStart : state.sliderValue),
      fixed: latest(stationaryId, stationaryId === 'slider-start' ? state.sliderStart : state.sliderValue),
      wrongTargetInputs: events.filter((event) => event.type === 'input' && event.targetId === stationaryId).length,
    };
  }, { targetId, fixedId });
  const from = { x: visual.x + visual.width * fromRatio, y: visual.y + visual.height / 2 };
  const to = { x: visual.x + visual.width * toRatio, y: from.y };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  samples.push(await readValues());
  for (let step = 1; step <= 12; step += 1) {
    const progress = step / 12;
    await page.mouse.move(from.x + (to.x - from.x) * progress, from.y);
    await runtime.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    samples.push(await readValues());
  }
  await page.mouse.up();
  await runtime.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
  return samples;
}

try {
  const { page, runtime, errors } = await openComparedFamily('snack-bar');

  const trigger = await astylarBox(runtime, 'snack-bar-primary');
  await page.mouse.click(
    trigger.x + trigger.width / 2,
    trigger.y + trigger.height / 2,
  );
  await runtime.waitForFunction(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open === true);
  await runtime.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());

  const result = await runtime.evaluate(() => ({
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
  assert.equal(await runtime.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open), true);
  await runtime.waitForFunction(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open === false, undefined, {
    timeout: 6_000,
  });
  await runtime.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
  const cleanup = await runtime.evaluate(() =>
    window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['snack-bar-surface']));
  assert.equal(cleanup.elements['snack-bar-surface']?.exists, false, 'Normal-runtime snackbar did not clean up.');
  assert.equal(cleanup.diagnostics.surface.session.status, 'idle');
  assert.equal(cleanup.diagnostics.surface.pluginResources.pending, 0);
  assert.deepEqual(errors, [], `Normal-runtime snackbar emitted browser errors: ${errors.join(' | ')}`);
  await page.close();
  console.log('Normal-runtime snackbar activation passed.');

  const tooltip = await openComparedFamily('tooltip');
  const tooltipTrigger = await astylarBox(tooltip.runtime, 'tooltip-primary');
  await tooltip.page.mouse.move(
    tooltipTrigger.x + tooltipTrigger.width / 2,
    tooltipTrigger.y + tooltipTrigger.height / 2,
  );
  await tooltip.runtime.waitForFunction(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open === true);
  await tooltip.runtime.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
  const tooltipBox = await astylarBox(tooltip.runtime, 'tooltip-popup');
  const triggerCenter = tooltipTrigger.x + tooltipTrigger.width / 2;
  const tooltipCenter = tooltipBox.x + tooltipBox.width / 2;
  assert.ok(Math.abs(triggerCenter - tooltipCenter) <= 2, 'Normal-runtime tooltip is not horizontally centered.');
  assert.ok(Math.abs(tooltipBox.y - (tooltipTrigger.y + tooltipTrigger.height) - 8) <= 2,
    'Normal-runtime tooltip does not have the expected 8 px trigger gap.');
  assert.ok(tooltipBox.y >= tooltipBox.canvas.y && tooltipBox.y + tooltipBox.height <= tooltipBox.canvas.y + tooltipBox.canvas.height,
    'Normal-runtime tooltip is not reachable inside the canvas.');
  await tooltip.page.mouse.move(
    tooltipBox.canvas.x + tooltipBox.canvas.width - 20,
    tooltipBox.canvas.y + tooltipBox.canvas.height - 20,
  );
  await tooltip.runtime.waitForFunction(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open === false);
  await tooltip.runtime.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
  assert.deepEqual(tooltip.errors, [], `Normal-runtime tooltip emitted browser errors: ${tooltip.errors.join(' | ')}`);
  await tooltip.page.close();
  console.log('Normal-runtime tooltip hover and cleanup passed.');

  const slider = await openComparedFamily('slider');
  const visual = await astylarBox(slider.runtime, 'slider-visual');
  const [startHit, endHit] = await Promise.all([
    astylarBox(slider.runtime, 'slider-start'),
    astylarBox(slider.runtime, 'slider-primary'),
  ]);
  assert.ok(Math.abs(startHit.x - visual.x) <= 1 && Math.abs(startHit.width - visual.width / 2) <= 1,
    'Normal-runtime start handle does not own the left half of the visual track.');
  assert.ok(Math.abs(endHit.x - (visual.x + visual.width / 2)) <= 1 && Math.abs(endHit.width - visual.width / 2) <= 1,
    'Normal-runtime end handle does not own the right half of the visual track.');

  const startTrace = await dragSliderHandle(slider.page, slider.runtime, visual, .3, .05, 'slider-start', 'slider-primary');
  const startValues = startTrace.map(({ moving }) => moving);
  assert.ok(startValues.every((value, index) => index === 0 || value <= startValues[index - 1]),
    `Normal-runtime start handle did not move continuously left: ${startValues.join(', ')}.`);
  assert.ok(new Set(startValues).size >= 8 && startValues.at(-1) === 5,
    `Normal-runtime start handle did not traverse the requested range: ${startValues.join(', ')}.`);
  assert.ok(startTrace.every(({ fixed, wrongTargetInputs }) => fixed === 65 && wrongTargetInputs === 0),
    'Dragging the normal-runtime start handle mutated the end handle.');

  const endTrace = await dragSliderHandle(slider.page, slider.runtime, visual, .65, .95, 'slider-primary', 'slider-start');
  const endValues = endTrace.map(({ moving }) => moving);
  assert.ok(endValues.every((value, index) => index === 0 || value >= endValues[index - 1]),
    `Normal-runtime end handle did not move continuously right: ${endValues.join(', ')}.`);
  assert.ok(new Set(endValues).size >= 8 && endValues.at(-1) === 95,
    `Normal-runtime end handle did not traverse the requested range: ${endValues.join(', ')}.`);
  assert.ok(endTrace.every(({ fixed, wrongTargetInputs }) => fixed === 5 && wrongTargetInputs === 0),
    'Dragging the normal-runtime end handle mutated the start handle.');
  assert.deepEqual(slider.errors, [], `Normal-runtime slider emitted browser errors: ${slider.errors.join(' | ')}`);
  await slider.page.close();
  console.log('Normal-runtime independent slider drag passed.');
} finally {
  await browser.close();
}
