import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Read original showcase inputs without modifying either surface. Separate blank
// documents below isolate browser defaults; they are not replacement references.
const options = parseSupplementalCaptureArguments(process.argv.slice(2));
const styleProperties = Object.values(propertyGroups).flat();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const evidence = openSupplementalCapture({ options, browser, script: 'scripts/audit-material-button-defaults.mjs', styleProperties });
  const sides = {};
  for (const side of ['reference', 'astylar']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const finishRuntime = evidence.observe(page);
    try {
      await page.goto(`${options.baseUrl}/${side}/button-toggle?benchmark=1&profile=light`);
      await page.locator('.frame').waitFor();
      let tree;
      if (side === 'reference') {
        await page.locator('.mat-button-toggle-button').first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        sides[side] = { buttons: [] };
        for (const name of ['one', 'two']) {
          const selector = `#button-toggle-${name}-button`;
          const computed = await page.locator(selector).evaluate(button => [button.parentElement, button,
            button.querySelector('.mat-button-toggle-label-content')].map(element => {
            const style = getComputedStyle(element);
            return { tag: element.tagName.toLowerCase(), id: element.id, class: element.className,
              textAlign: style.textAlign, display: style.display, direction: style.direction,
              writingMode: style.writingMode, text: element.textContent.trim() };
          }));
          const rules = await matchedAlignmentRules(page, selector);
          assert.deepEqual(computed.map(node => node.textAlign), ['start', 'center', 'center']);
          assert.ok(rules.some(rule => rule.origin === 'user-agent' && rule.declarations.some(p => p.value === 'center')));
          assert.ok(rules.every(rule => rule.origin === 'user-agent'), 'Unexpected author alignment rule; investigate before attributing a UA default.');
          sides[side].buttons.push({ selector, computed, rules });
        }
        tree = await page.evaluate(captureBrowserInputTree, { styleProperties });
      } else {
        await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        tree = await page.evaluate(async () => {
          await window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled();
          return window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree;
        });
        sides[side] = { labels: tree.nodes.filter(node => /^button-toggle-(one|two)-label$/.test(node.authored?.id ?? '')) };
        assert.equal(sides[side].labels.length, 2);
        for (const label of sides[side].labels) {
          assert.equal(label.authored.type, 'span');
          assert.equal(label.retainedText.style.textAlign, 'left');
          const parent = tree.nodes.find(node => node.key === label.parent);
          assert.equal(parent.authored.type, 'div');
          assert.equal(parent.normalResolvedStyle.display, 'flex');
          assert.equal(parent.normalResolvedStyle.justifyContent, 'center');
        }
      }
      assert.ok(tree.nodes.length > 0);
      assert.deepEqual(tree.errors, []);
      const contents = JSON.stringify(tree), file = `${evidence.directory}/button-default-${side}-input-tree.json`;
      writeFileSync(file, contents, { flag: 'wx' });
      sides[side].inputTree = { file, sha256: createHash('sha256').update(contents).digest('hex') };
      sides[side].runtime = await finishRuntime();
    } finally { await page.close(); }
  }
  const controls = [];
  const page = await browser.newPage();
  try {
    for (const parentAlign of ['start', 'right']) for (const kind of ['button', 'div', 'role-button', 'button-inherit']) {
      const tag = kind.startsWith('button') ? 'button' : 'div';
      const html = `<main style="text-align:${parentAlign};direction:ltr"><${tag} id="target"${kind === 'role-button' ? ' role="button"' : ''} style="display:inline-block;width:160px;${kind === 'button-inherit' ? 'text-align:inherit;' : ''}"><span style="display:inline-block">Label</span></${tag}></main>`;
      await page.setContent(html);
      const values = await page.locator('#target').evaluate(element => [element.parentElement, element, element.firstElementChild].map(node => getComputedStyle(node).textAlign));
      const expected = kind === 'button' ? 'center' : parentAlign;
      assert.deepEqual(values, [parentAlign, expected, expected]);
      controls.push({ parentAlign, kind, html, values, rules: await matchedAlignmentRules(page, '#target') });
    }
  } finally { await page.close(); }
  const report = { schemaVersion: 1, browser: browser.version(), capture: evidence.capture,
    viewport: { width: 1440, height: 900, deviceScaleFactor: 1 }, profile: 'light',
    scope: 'Native button user-agent alignment and substituted flex-div structure; no core or raster equivalence claim',
    results: [{ family: 'button-toggle', state: 'static', ...sides }], controls };
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ directory: evidence.directory, browser: report.browser,
    nativeButtons: sides.reference.buttons.length, candidateLabels: sides.astylar.labels.length,
    controls: controls.map(({ parentAlign, kind, values }) => ({ parentAlign, kind, values })) }, null, 2));
} finally { await browser.close(); }

async function matchedAlignmentRules(page, selector) {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
    assert.ok(nodeId, `Missing CDP target ${selector}`);
    const result = await cdp.send('CSS.getMatchedStylesForNode', { nodeId });
    return result.matchedCSSRules.filter(({ rule }) => rule.style.cssProperties.some(p => p.name === 'text-align'))
      .map(({ rule }) => ({ origin: rule.origin, selector: rule.selectorList.text,
        declarations: rule.style.cssProperties.filter(p => p.name === 'text-align') }));
  } finally { await cdp.detach(); }
}
