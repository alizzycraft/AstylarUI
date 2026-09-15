import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { captureReferenceRootAncestorContext } from '../tests/material-parity/reference-root-ancestor-context.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Original static reference states, then separately labelled real activation.
// The post-activation sample is NOT represented as an original static capture.
const options = parseSupplementalCaptureArguments(process.argv.slice(2));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const relative = file => path.relative(process.cwd(), file).replaceAll('\\', '/');
const families = ['dialog', 'bottom-sheet', 'snack-bar', 'tooltip'];
const records = readdirSync(options.checkpoint).filter(file => /^[a-f0-9]{64}\.json$/.test(file)).map(file => {
  const name = path.join(options.checkpoint, file), bytes = readFileSync(name), record = JSON.parse(bytes);
  assert.equal(record.sha256, digest(JSON.stringify(record.result)), `Changed checkpoint record: ${file}`);
  return { ...record, source: { file: relative(name), sha256: digest(bytes) } };
}).filter(record => JSON.parse(record.key).kind === 'static' && families.includes(record.result.family));
assert.equal(records.length, 48, 'Expected all four priority overlay families across the original static profiles/viewports.');
const themes = {
  light: { mode: 'light', primary: '#6750a4', tertiary: '#7d5260', surface: '#fffbfe', error: '#b3261e', density: 0, cornerScale: 1, typographyScale: 1 },
  dark: { mode: 'dark', primary: '#d0bcff', tertiary: '#efb8c8', surface: '#1c1b1f', error: '#f2b8b5', density: 0, cornerScale: 1, typographyScale: 1 },
  contrast: { mode: 'light', primary: '#000000', tertiary: '#203864', surface: '#ffffff', error: '#8b0000', density: -5, cornerScale: .75, typographyScale: .9 },
  custom: { mode: 'light', primary: '#006a6a', tertiary: '#a43c42', surface: '#f4fbfa', error: '#ba1a1a', density: -2, cornerScale: 1.5, typographyScale: 1.15 },
};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const evidence = openSupplementalCapture({ options, browser,
    script: 'scripts/capture-material-overlay-ancestor-context.mjs', styleProperties: ['all-enumerated-computed-properties'] });
  evidence.capture.sources.push(...['tests/material-parity/reference-root-ancestor-context.mjs',
    'tests/material-parity/run-material-parity.mjs'].map(file => ({ file, sha256: digest(readFileSync(file)) })));
  const results = [];
  for (const record of records) {
    const { family, profile, viewport, inputTrees } = record.result;
    const originalBytes = readFileSync(inputTrees.reference.file);
    assert.equal(digest(originalBytes), inputTrees.reference.sha256);
    const original = JSON.parse(originalBytes);
    const originalRoots = original.nodes.filter(n => n.parent === null);
    const properties = [...new Set(originalRoots.flatMap(n => Object.keys(original.styles[n.style])))];
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor, colorScheme: profile === 'dark' ? 'dark' : 'light', reducedMotion: 'reduce' });
    const finishRuntime = evidence.observe(page);
    try {
      await page.goto(`${options.baseUrl}/reference/${family}?benchmark=1&profile=${profile}`);
      await page.locator('.frame').waitFor();
      await page.waitForFunction(() => typeof window.__MATERIAL_SHOWCASE_COMMAND__ === 'function');
      assert.equal(await page.evaluate(theme => window.__MATERIAL_SHOWCASE_COMMAND__({ type: 'showcase:theme', theme }), themes[profile]), true);
      await settle(page);
      const fresh = await page.evaluate(captureBrowserInputTree, { styleProperties: properties });
      assert.deepEqual(fresh.errors, []);
      assert.deepEqual(fresh.nodes.filter(n => n.parent === null).map(n => n.key), originalRoots.map(n => n.key));
      for (const node of originalRoots) {
        const current = fresh.nodes.find(n => n.key === node.key);
        assert.equal(current.type, node.type);
        assert.deepEqual(fresh.styles[current.style], original.styles[node.style], `Original root computed context differs: ${record.key}/${node.key}`);
      }
      const samples = [{ state: 'original-static-root-context', context: await page.evaluate(captureReferenceRootAncestorContext) }];
      const trigger = page.locator(`#${family}-primary`);
      if (family === 'tooltip') await trigger.hover(); else await trigger.click();
      await settle(page);
      const selector = { dialog: 'mat-dialog-container', 'bottom-sheet': 'mat-bottom-sheet-container',
        'snack-bar': 'mat-snack-bar-container', tooltip: '.mat-mdc-tooltip-surface' }[family];
      await page.locator(selector).waitFor({ state: 'visible' });
      samples.push({ state: family === 'tooltip' ? 'supplemental-real-hover' : 'supplemental-real-click',
        context: await page.evaluate(captureReferenceRootAncestorContext),
        popup: await page.locator(selector).evaluate(el => ({ tag: el.tagName.toLowerCase(),
          text: el.textContent.trim(), viewportRect: el.getBoundingClientRect().toJSON() })) });
      for (const sample of samples) assert.deepEqual(sample.context.errors, []);
      const runtime = await finishRuntime();
      const result = { originalCase: record.key, checkpointRecord: record.source,
        originalReferenceTree: inputTrees.reference, family, profile, viewport, originalRootStylesMatch: true,
        samples, runtime, limitation: 'Reference ancestry supplement only. Activation is a fresh named state, not an original static-state match or candidate/rendering-equivalence proof.' };
      const bytes = JSON.stringify(result), file = `${evidence.directory}/${digest(record.key)}.json`;
      writeFileSync(file, bytes, { flag: 'wx' });
      results.push({ case: record.key, file, sha256: digest(bytes) });
      console.log(JSON.stringify({ family, profile, viewport: viewport.id, samples: samples.length,
        overlayParent: samples[1].context.roots.filter(r => r.captureKey.startsWith('overlay:')).map(r =>
          samples[1].context.nodes.find(n => n.key === r.ancestry[1])?.type) }));
    } finally { await page.close(); }
  }
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify({ schemaVersion: 1,
    kind: 'priority-overlay-reference-ancestor-context', capture: evidence.capture, browser: browser.version(),
    families, originalStaticCases: records.length, samples: results.length * 2, settleDelayMs: 250,
    canonicalAttributionChanged: false, originalOverlayCauseEstablished: false, results }, null, 2) + '\n', { flag: 'wx' });
} finally { await browser.close(); }

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => undefined)));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.waitForTimeout(250);
}
