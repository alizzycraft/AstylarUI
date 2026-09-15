import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Reference-only samples, not a new waiver or a replacement for original captures.
const options = parseSupplementalCaptureArguments(process.argv.slice(2));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const inventoryFile = 'docs/material-origin-request-contexts.json';
const inventoryBytes = readFileSync(inventoryFile), inventory = JSON.parse(inventoryBytes);
assert.equal(hash(inventoryBytes), '8cd9950f3dc692509f1b8fd897fe60b9239281acfeac482c07e48e62a4d55696');
const rawBytes = readFileSync(inventory.capture.file); assert.equal(hash(rawBytes), inventory.capture.sha256);
const raw = JSON.parse(rawBytes), entries = new Map();
for (const [kind, list] of [['static', raw.results], ['interaction', raw.interactions]]) for (const e of list)
  entries.set(`${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`, { ...e, kind });
const selected = inventory.contexts.map((_, context) => inventory.observations.find(o => o.context === context));
assert.equal(selected.length, 15); assert.ok(selected.every(Boolean));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const properties = Object.keys(entries.get(selected[0].case).styleInputs[0].reference);
const results = [];
try {
  const evidence = openSupplementalCapture({ options, browser, script: 'scripts/audit-material-origin-motion-samples.mjs', styleProperties: properties });
  for (const caseKey of [...new Set(selected.map(o => o.case))]) {
    const entry = entries.get(caseKey); assert.equal(entry.profile, 'light');
    const targets = selected.filter(o => o.case === caseKey);
    const originalBytes = readFileSync(entry.inputTrees.reference.file);
    assert.equal(hash(originalBytes), entry.inputTrees.reference.sha256);
    const original = JSON.parse(originalBytes);
    const page = await browser.newPage({ viewport: { width: entry.viewport.width, height: entry.viewport.height },
      deviceScaleFactor: entry.viewport.deviceScaleFactor, colorScheme: 'light', reducedMotion: 'reduce' });
    const finishRuntime = evidence.observe(page);
    try {
      await page.goto(`${options.baseUrl}/reference/${entry.family}?benchmark=1&profile=light${entry.state ? '&interaction=' + entry.state : ''}`);
      await page.waitForFunction(() => typeof window.__MATERIAL_SHOWCASE_COMMAND__ === 'function');
      assert.equal(await page.evaluate(() => window.__MATERIAL_SHOWCASE_COMMAND__({ type: 'showcase:theme', theme: {
        mode: 'light', primary: '#6750a4', tertiary: '#7d5260', surface: '#fffbfe', error: '#b3261e', density: 0, cornerScale: 1, typographyScale: 1,
      } })), true);
      await settle(page);
      if (entry.kind === 'interaction') {
        assert.ok(entry.family === 'dialog' && entry.state === 'activate' || entry.family === 'tooltip' && entry.state === 'hover');
        assert.equal(await page.evaluate(() => window.__MATERIAL_SHOWCASE_COMMAND__({ type: 'showcase:benchmark', phase: 'start' })), true);
        const box = await page.locator(`#${entry.family}-primary`).boundingBox(); assert.ok(box);
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        if (entry.state === 'activate') { await page.mouse.down(); await page.mouse.up(); }
        assert.equal(await page.evaluate(() => window.__MATERIAL_SHOWCASE_COMMAND__({ type: 'showcase:benchmark', phase: 'settled' })), true);
        await page.locator(entry.family === 'dialog' ? 'mat-dialog-container' : '.mat-mdc-tooltip-surface').waitFor();
        await settle(page);
      }
      const tree = await page.evaluate(captureBrowserInputTree, { styleProperties: properties });
      assert.deepEqual(tree.errors, []);
      const observations = [];
      for (const target of targets) {
        const path = [], mismatches = [], seen = new Set();
        let before = original.nodes.find(n => n.key === target.referenceNode);
        assert.ok(before);
        while (before) {
          assert.ok(!seen.has(before.key)); seen.add(before.key);
          const after = tree.nodes.find(n => n.key === before.key);
          if (!after) { mismatches.push({ node: before.key, kind: 'missing-owner' }); break; }
          for (const key of ['type', 'parent', 'attributes', 'ownText', 'inline'])
            if (!isDeepStrictEqual(before[key], after[key])) mismatches.push({ node: before.key, kind: key, original: before[key], current: after[key] });
          for (const [key, value] of Object.entries(original.styles[before.style]))
            if (tree.styles[after.style][key] !== value) mismatches.push({ node: before.key, kind: 'computed-style', property: key, original: value, current: tree.styles[after.style][key] });
          const rule = r => ({ selector: r.selector, cssText: r.cssText, declarations: r.declarations, active: r.active, conditions: r.conditions });
          if (!isDeepStrictEqual(before.rules.map(i => rule(original.rules[i])), after.rules.map(i => rule(tree.rules[i]))))
            mismatches.push({ node: before.key, kind: 'matched-rules' });
          path.unshift(before.key);
          if (before.parent === null) break;
          const parents = original.nodes.filter(n => n.key === before.parent); assert.equal(parents.length, 1); before = parents[0];
        }
        const motion = await page.evaluate(keys => keys.map(key => {
          const [root, ...indices] = key.split('/');
          let node = root === 'frame' ? document.querySelector('app-reference .frame') : document.querySelectorAll('.cdk-overlay-container')[Number(root.slice(8))];
          for (const index of indices) node = node?.children[Number(index)];
          if (!(node instanceof HTMLElement)) throw new Error('Missing motion owner: ' + key);
          const style = getComputedStyle(node);
          return { key, type: node.tagName.toLowerCase(), computed: Object.fromEntries([
            'transform', 'transformOrigin', 'transformBox', 'transitionProperty', 'transitionDuration', 'transitionDelay',
            'animationName', 'animationDuration', 'animationDelay', 'animationPlayState', 'animationFillMode',
          ].map(p => [p, style[p]])), animations: node.getAnimations().map(animation => ({
            type: animation.constructor.name, playState: animation.playState, pending: animation.pending,
            currentTime: animation.currentTime, timing: animation.effect?.getComputedTiming(), keyframes: animation.effect?.getKeyframes(),
          })) };
        }), path);
        observations.push({ context: target.context, element: target.element, referenceNode: target.referenceNode,
          originalInputTrees: target.inputTrees, status: mismatches.length ? 'capture-context-mismatch' : 'captured-context-reproduced', mismatches, motion });
      }
      const runtime = await finishRuntime(), stem = `${evidence.directory}/${hash(caseKey)}`;
      const bytes = JSON.stringify(tree); writeFileSync(`${stem}-reference.json`, bytes, { flag: 'wx' });
      results.push({ case: caseKey, viewport: entry.viewport, observations, runtime, inputTree: { file: `${stem}-reference.json`, sha256: hash(bytes) } });
      console.log(JSON.stringify({ case: caseKey, contexts: observations.map(o => ({ context: o.context, status: o.status, mismatches: o.mismatches.length })) }));
    } finally { await page.close(); }
  }
  const report = { schemaVersion: 1, kind: 'reference-origin-motion-context-samples', browser: browser.version(), capture: evidence.capture,
    requestInventory: { file: inventoryFile, sha256: hash(inventoryBytes) }, originalCapture: inventory.capture,
    scope: 'One original case per request pattern, reference only. Samples do not establish all-case motion state, candidate origin, input equivalence or raster parity. Mismatches remain diagnostic and must not receive attribution.', results };
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  if (results.some(r => r.observations.some(o => o.mismatches.length))) process.exitCode = 1;
} finally { await browser.close(); }

async function settle(page) {
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
}
