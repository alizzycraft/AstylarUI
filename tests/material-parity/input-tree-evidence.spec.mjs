import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from './input-tree-evidence.mjs';

test('browser context capture distinguishes inherited RTL, vertical writing, last-line alignment and actual clipping', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
    await page.setContent(`<style>
      body { direction: rtl; }
      .frame { text-align: start; }
      .vertical { writing-mode: vertical-rl; text-align-last: justify; text-justify: inter-character; }
      .override { direction: ltr; unicode-bidi: isolate; font-kerning: none; text-rendering: optimizeLegibility;
        font-variant-ligatures: none; font-feature-settings: "kern" 0; font-variation-settings: "wght" 450; }
      .override::before { content: "mark"; direction: rtl; text-align: end; font-kerning: normal; }
      .clipped { position: absolute; clip: rect(0px, 0px, 0px, 0px); width: 1px; height: 1px; }
    </style><app-reference><main class="frame"><div class="vertical"><span>Vertical</span></div>
      <div class="override">Override</div><button class="clipped">Close calendar</button>
    </main></app-reference><div class="cdk-overlay-container"><div>Overlay</div></div>`);
    const before = await page.evaluate(() => ({ html: document.documentElement.outerHTML,
      focus: document.activeElement.tagName, width: document.querySelector('.frame').getBoundingClientRect().width }));
    const tree = await page.evaluate(captureBrowserInputTree, { styleProperties: ['width', 'height'] });
    assert.equal(tree.contextStyleEvidenceVersion, 1);
    assert.deepEqual(tree.contextStyleProperties, ['direction', 'writingMode', 'unicodeBidi', 'textAlign',
      'textAlignLast', 'textJustify', 'clip', 'fontKerning', 'textRendering',
      'fontVariantLigatures', 'fontFeatureSettings', 'fontVariationSettings']);
    assert.deepEqual(tree.errors, []);
    for (const style of tree.styles) for (const property of tree.contextStyleProperties) {
      assert.equal(typeof style[property], 'string', property);
      assert.notEqual(style[property], '', property);
    }
    const node = name => tree.nodes.find(n => n.attributes.class === name);
    const style = name => tree.styles[node(name).style];
    assert.equal(style('frame').direction, 'rtl');
    assert.equal(style('frame').writingMode, 'horizontal-tb');
    assert.equal(style('frame').textAlign, 'start');
    assert.equal(style('frame').textAlignLast, 'auto');
    assert.equal(style('vertical').direction, 'rtl');
    assert.equal(style('vertical').writingMode, 'vertical-rl');
    assert.equal(style('vertical').textAlignLast, 'justify');
    assert.equal(style('vertical').textJustify, 'inter-character');
    assert.equal(style('override').direction, 'ltr');
    assert.equal(style('override').unicodeBidi, 'isolate');
    assert.equal(style('override').fontKerning, 'none');
    assert.equal(style('override').textRendering, 'optimizelegibility');
    assert.equal(style('override').fontVariantLigatures, 'none');
    assert.equal(style('override').fontFeatureSettings, '"kern" 0');
    assert.equal(style('override').fontVariationSettings, '"wght" 450');
    assert.equal(style('clipped').clip, 'rect(0px, 0px, 0px, 0px)');
    const pseudo = node('override').pseudoElements.find(p => p.pseudo === '::before');
    assert.equal(tree.styles[pseudo.style].direction, 'rtl');
    assert.equal(tree.styles[pseudo.style].textAlign, 'end');
    assert.equal(tree.styles[pseudo.style].fontKerning, 'normal');
    assert.equal(tree.styles[tree.nodes.find(n => n.key === 'overlay:0').style].direction, 'rtl');
    const after = await page.evaluate(() => ({ html: document.documentElement.outerHTML,
      focus: document.activeElement.tagName, width: document.querySelector('.frame').getBoundingClientRect().width }));
    assert.deepEqual(after, before, 'capture must not change DOM, focus or layout');
  } finally { await browser.close(); }
});

test('start alignment requires the line-container context, not just a leaf direction or default', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    const result = await page.evaluate(() => {
      const measure = (direction, unicodeBidi, textAlign, text) => {
        const container = document.createElement('div'), leaf = document.createElement('span');
        Object.assign(container.style, { display: 'block', width: '240px', height: '48px',
          padding: '0px', border: '0px', margin: '0px', font: '16px/24px Arial',
          writingMode: 'horizontal-tb', direction, unicodeBidi, textAlign, textAlignLast: 'auto' });
        leaf.textContent = text;
        container.append(leaf);
        document.body.append(container);
        const range = document.createRange();
        range.selectNodeContents(leaf);
        const parentStyle = getComputedStyle(container), leafStyle = getComputedStyle(leaf);
        const snapshot = { offset: range.getBoundingClientRect().left - container.getBoundingClientRect().left,
          parent: { direction: parentStyle.direction, unicodeBidi: parentStyle.unicodeBidi, textAlign: parentStyle.textAlign },
          leaf: { direction: leafStyle.direction, unicodeBidi: leafStyle.unicodeBidi, textAlign: leafStyle.textAlign } };
        container.remove();
        return snapshot;
      };
      const pair = (direction, unicodeBidi, physical, text = 'ABC') => ({
        start: measure(direction, unicodeBidi, 'start', text), physical: measure(direction, unicodeBidi, physical, text),
      });
      return { ltr: pair('ltr', 'normal', 'left'), rtlRight: pair('rtl', 'normal', 'right'),
        rtlLeft: pair('rtl', 'normal', 'left'), plaintext: pair('ltr', 'plaintext', 'left', 'שלום') };
    });
    assert.equal(result.ltr.start.offset, result.ltr.physical.offset);
    assert.equal(result.rtlRight.start.offset, result.rtlRight.physical.offset);
    assert.ok(result.rtlLeft.start.offset - result.rtlLeft.physical.offset > 100);
    assert.equal(result.plaintext.start.leaf.direction, 'ltr');
    assert.equal(result.plaintext.start.leaf.unicodeBidi, 'normal');
    assert.equal(result.plaintext.start.parent.unicodeBidi, 'plaintext');
    assert.ok(result.plaintext.start.offset - result.plaintext.physical.offset > 100,
      'an LTR leaf with normal unicode-bidi does not authorize start/left equivalence when the line container is plaintext');
  } finally { await browser.close(); }
});

test('browser font-weight keywords resolve to exact numeric aliases but relative weights depend on ancestry', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    const values = await page.evaluate(() => {
      const read = (weight, parentWeight = '400') => {
        const parent = document.createElement('div');
        parent.style.fontWeight = parentWeight;
        const span = document.createElement('span');
        span.style.fontWeight = weight;
        span.textContent = 'Weight';
        parent.append(span);
        document.body.append(parent);
        const result = getComputedStyle(span).fontWeight;
        parent.remove();
        return result;
      };
      return { normal: read('normal'), numeric400: read('400'), bold: read('bold'), numeric700: read('700'),
        bolder400: read('bolder', '400'), bolder700: read('bolder', '700') };
    });
    assert.equal(values.normal, '400');
    assert.equal(values.normal, values.numeric400);
    assert.equal(values.bold, '700');
    assert.equal(values.bold, values.numeric700);
    assert.notEqual(values.bolder400, values.bolder700);
  } finally { await browser.close(); }
});

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
