import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { collectFullTreeInventory, collectControlTypographyEvidence } from '../tests/material-parity/input-equivalence-audit.mjs';
import { captureNormalLineBox } from '../tests/material-parity/normal-line-box-evidence.mjs';

const digest = (value) => createHash('sha256').update(value).digest('hex');
const options = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const match = /^--(base-url|checkpoint|output)=(.+)$/.exec(arg);
  assert.ok(match, `Unknown argument: ${arg}`);
  return [match[1], match[2]];
}));
assert.ok(options['base-url'] && options.checkpoint && options.output, 'Supply --base-url, --checkpoint and a new --output directory.');
const baseUrl = new URL(options['base-url']);
assert.ok(['127.0.0.1', 'localhost'].includes(baseUrl.hostname), 'Only the local frozen showcase server is supported.');
const withinArtifacts = (value) => {
  const absolute = path.resolve(value), artifacts = path.resolve('artifacts/material-parity') + path.sep;
  assert.ok(absolute.startsWith(artifacts), 'Evidence path must be inside artifacts/material-parity.');
  return absolute;
};
const checkpoint = withinArtifacts(options.checkpoint), output = withinArtifacts(options.output);
assert.ok(!existsSync(output), 'Use a new output directory; do not overwrite earlier diagnostic evidence.');
const manifestBytes = readFileSync(path.join(checkpoint, 'manifest.json'));
const manifest = JSON.parse(manifestBytes);
assert.equal(manifest.schemaVersion, 1);
const expectedAssets = new Map(manifest.provenance.browserFiles.map((file) => [file.file, file.sha256]));
const records = readdirSync(checkpoint).filter((name) => /^[a-f0-9]{64}\.json$/.test(name)).map((file) => {
  const record = JSON.parse(readFileSync(path.join(checkpoint, file), 'utf8'));
  assert.equal(record.sha256, digest(JSON.stringify(record.result)), `Changed result: ${file}`);
  return { ...record, file: path.relative(process.cwd(), path.join(checkpoint, file)).replaceAll('\\', '/') };
}).filter((record) => JSON.parse(record.key).kind === 'static');
const cases = records.map((record) => ({ ...record.result, kind: 'static' }));
const inventory = collectFullTreeInventory(cases);
assert.deepEqual(inventory.errors, [], 'Input-tree provenance must validate before collecting supplements.');
const control = collectControlTypographyEvidence(cases, inventory);
const targets = control.comparisons.filter((entry) => entry.properties.lineHeight.reference === 'normal');
assert.ok(targets.length > 0, 'No mapped normal line-height observations.');
// Same theme commands as the maintained runner. Fresh captured typography must
// match each checkpoint exactly; a theme mismatch cannot authorize a mapping.
const themes = {
  light: { mode: 'light', primary: '#6750a4', tertiary: '#7d5260', surface: '#fffbfe', error: '#b3261e', density: 0, cornerScale: 1, typographyScale: 1 },
  dark: { mode: 'dark', primary: '#d0bcff', tertiary: '#efb8c8', surface: '#1c1b1f', error: '#f2b8b5', density: 0, cornerScale: 1, typographyScale: 1 },
  contrast: { mode: 'light', primary: '#000000', tertiary: '#203864', surface: '#ffffff', error: '#8b0000', density: -5, cornerScale: .75, typographyScale: .9 },
  custom: { mode: 'light', primary: '#006a6a', tertiary: '#a43c42', surface: '#f4fbfa', error: '#ba1a1a', density: -2, cornerScale: 1.5, typographyScale: 1.15 },
};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  assert.equal(browser.version(), manifest.provenance.browser, 'Browser version differs from the checkpoint.');
  mkdirSync(output, { recursive: true });
  for (const record of records.sort((a, b) => a.key.localeCompare(b.key))) {
    const entry = record.result, key = `static:${entry.family}@${entry.profile}/${entry.viewport.id}`;
    const observations = targets.filter((target) => target.case === key);
    if (!observations.length) continue;
    const context = await browser.newContext({ viewport: { width: entry.viewport.width, height: entry.viewport.height }, deviceScaleFactor: entry.viewport.deviceScaleFactor });
    const page = await context.newPage(), errors = [], responses = [], assets = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', (response) => {
      if (!['document', 'script', 'stylesheet', 'font'].includes(response.request().resourceType())) return;
      responses.push((async () => {
        const url = new URL(response.url());
        assert.equal(url.origin, baseUrl.origin, 'Unexpected external runtime asset.');
        const file = response.request().resourceType() === 'document' ? 'index.csr.html' : decodeURIComponent(url.pathname).replace(/^\//, '');
        const sha256 = digest(await response.body());
        assert.equal(response.status(), 200, `Failed runtime asset: ${file}`);
        assert.equal(sha256, expectedAssets.get(file), `Served asset differs from checkpoint: ${file}`);
        assets.push({ file, sha256, type: response.request().resourceType() });
      })().catch((error) => errors.push(String(error))));
    });
    try {
      await page.goto(`${baseUrl.origin}/reference/${entry.family}?benchmark=1&profile=${entry.profile}`);
      await page.waitForFunction(() => typeof window.__MATERIAL_SHOWCASE_COMMAND__ === 'function');
      assert.equal(await page.evaluate((theme) => window.__MATERIAL_SHOWCASE_COMMAND__({ type: 'showcase:theme', theme }), themes[entry.profile]), true);
      await page.waitForFunction((surface) => {
        const frame = document.querySelector('app-reference .frame'), probe = document.createElement('span');
        probe.style.color = surface; document.body.append(probe);
        const expected = getComputedStyle(probe).color; probe.remove();
        return frame && getComputedStyle(frame).backgroundColor === expected;
      }, themes[entry.profile].surface);
      await page.evaluate(async () => { await document.fonts.ready; await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
      const tree = inventory.variants[inventory.cases.find((item) => item.case === key && item.side === 'reference').variant];
      const measurements = [];
      for (const target of observations) {
        const node = tree.nodes.find((item) => item.key === target.referenceNode);
        const measurement = await page.evaluate(captureNormalLineBox, { referenceNode: node.key,
          expectedText: node.ownText, expectedStyle: inventory.styles[node.style].value });
        assert.deepEqual(measurement.viewport, { width: entry.viewport.width, height: entry.viewport.height, deviceScaleFactor: entry.viewport.deviceScaleFactor });
        measurements.push({ element: target.element, ...measurement });
      }
      await Promise.all(responses);
      assert.deepEqual(errors, [], `Runtime errors: ${key}`);
      assert.ok(assets.some((asset) => asset.type === 'font'), 'Loaded font bytes were not observed.');
      const result = { case: key, family: entry.family, profile: entry.profile, viewport: entry.viewport,
        checkpointRecord: { file: record.file, sha256: record.sha256 }, inputTrees: entry.inputTrees,
        theme: themes[entry.profile], measurements, assets: assets.sort((a, b) => a.file.localeCompare(b.file)), errors };
      const bytes = JSON.stringify(result), file = `${digest(key)}.json`;
      writeFileSync(path.join(output, file), bytes, { flag: 'wx' });
      results.push({ case: key, file, sha256: digest(bytes), observations: measurements.length });
      console.log(`Natural line boxes: ${key}: ${measurements.map((item) => `${item.element}=${item.naturalHeight}`).join(', ')}`);
    } finally { await context.close(); }
  }
  assert.equal(results.reduce((sum, result) => sum + result.observations, 0), targets.length);
  writeFileSync(path.join(output, 'latest-report.json'), JSON.stringify({ schemaVersion: 1,
    scope: 'Supplemental static reference natural line boxes. Not full input/visual parity or a blanket normal-line-height normalization.',
    browser: browser.version(), checkpointManifest: { file: path.relative(process.cwd(), path.join(checkpoint, 'manifest.json')).replaceAll('\\', '/'), sha256: digest(manifestBytes) },
    captureSources: ['scripts/audit-material-normal-line-boxes.mjs', 'tests/material-parity/normal-line-box-evidence.mjs'].map((file) => ({ file, sha256: digest(readFileSync(file)) })),
    cases: results.length, observations: targets.length, results }, null, 2) + '\n');
  console.log(`Completed ${targets.length} natural line-box observations across ${results.length} cases.`);
} finally { await browser.close(); }
