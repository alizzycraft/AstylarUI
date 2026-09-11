import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from './input-tree-evidence.mjs';

test('browser inventory includes anonymous wrappers, SVG, pseudo-elements, and inactive authored rules', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
    await page.setContent(`<style>
      .frame { --ink: purple; color: var(--ink); }
      .anonymous::before { content: "mark"; width: 4px; }
      .anonymous, .unrelated::after { cursor: pointer; }
      @media (max-width: 100px) { .anonymous { padding: 99px; } }
      @layer example { .anonymous { display: flex; } }
    </style><app-reference><main class="frame"><div class="anonymous"><span>Text</span>
      <svg viewBox="0 0 24 24"><path d="M0 0 L5 5"/></svg>
    </div></main></app-reference><div class="cdk-overlay-container"><div role="dialog">Dialog</div></div>`);
    const tree = await page.evaluate(captureBrowserInputTree, { styleProperties: ['color', 'display', 'width', 'padding'] });
    assert.deepEqual(tree.errors, []);
    assert.ok(tree.nodes.some((node) => node.type === 'path' && node.attributes.d === 'M0 0 L5 5'));
    assert.ok(tree.nodes.some((node) => node.attributes.role === 'dialog' && node.parent === 'overlay:0'));
    const anonymous = tree.nodes.find((node) => node.attributes.class === 'anonymous');
    assert.ok(anonymous && !anonymous.attributes.id);
    assert.ok(anonymous.pseudoElements.some((pseudo) => pseudo.pseudo === '::before' && pseudo.generated));
    assert.ok(anonymous.rules.some((index) => tree.rules[index].active === false && tree.rules[index].declarations['padding-top']?.value === '99px'));
    assert.ok(tree.rules.some((rule) => rule.cssText.includes('padding: 99px')));
    assert.ok(anonymous.rules.some((index) => tree.rules[index].declarations.display?.value === 'flex'));
    assert.ok(anonymous.rules.some((index) => tree.rules[index].declarations.cursor?.value === 'pointer'));
    assert.ok(tree.rules.some((rule) => rule.declarations['--ink']?.value === 'purple'));
    assert.equal(tree.styles[anonymous.style].display, 'flex');
  } finally { await browser.close(); }
});
