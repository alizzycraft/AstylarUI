import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from './input-tree-evidence.mjs';

test('explicit host alignment is not interchangeable with omission under ancestor changes', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const deviceScaleFactor of [1, 2]) {
      const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor });
      try {
        await page.setContent('<main id="frame"><div id="explicit" style="text-align:left">Text</div><div id="omitted">Text</div></main>');
        const result = await page.evaluate(() => {
          const frame = document.getElementById('frame');
          const read = () => ['explicit', 'omitted'].map(id => getComputedStyle(document.getElementById(id)).textAlign);
          const initial = read(); frame.style.textAlign = 'center'; const centeredParent = read();
          frame.style.textAlign = 'right'; const rightParent = read(); frame.style.removeProperty('text-align');
          return { initial, centeredParent, rightParent, restored: read() };
        });
        assert.deepEqual(result.initial, ['left', 'start']); assert.deepEqual(result.centeredParent, ['left', 'center']);
        assert.deepEqual(result.rightParent, ['left', 'right']); assert.deepEqual(result.restored, result.initial);
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
});

test('container caret computed color does not prove descendant caret ownership', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const deviceScaleFactor of [1, 2]) {
      const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor });
      try {
        await page.setContent('<main id="frame" style="color:rgb(29,27,32)"><section id="host"><input id="edit" style="color:rgb(17,34,51)"></section></main>');
        const result = await page.evaluate(() => {
          const frame = document.getElementById('frame'), edit = document.getElementById('edit');
          const read = () => ['frame', 'host', 'edit'].map(id => getComputedStyle(document.getElementById(id)).caretColor);
          const initial = read(); frame.style.caretColor = 'rgb(200,10,20)'; const inherited = read();
          edit.style.caretColor = 'auto'; const overridden = read();
          frame.style.removeProperty('caret-color'); edit.style.removeProperty('caret-color');
          return { initial, inherited, overridden, restored: read() };
        });
        assert.deepEqual(result.initial, ['rgb(29, 27, 32)', 'rgb(29, 27, 32)', 'rgb(17, 34, 51)']);
        assert.deepEqual(result.inherited, ['rgb(200, 10, 20)', 'rgb(200, 10, 20)', 'rgb(200, 10, 20)']);
        assert.deepEqual(result.overridden, ['rgb(200, 10, 20)', 'rgb(200, 10, 20)', 'rgb(17, 34, 51)']);
        assert.deepEqual(result.restored, result.initial);
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
});

test('matching section boxes do not make fixed height equivalent to content-driven authoring', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const deviceScaleFactor of [1, 2]) {
      const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor });
      try {
        await page.setContent(`<style>
          section { width:200px; padding:28px; border:1px solid; }
          #fixed { box-sizing:border-box; width:258px; height:98px; }
          .child { height:40px; }
        </style><section id="auto"><div class="child"></div></section><section id="fixed"><div class="child"></div></section>`);
        const observations = await page.evaluate(() => {
          const observe = () => ['auto', 'fixed'].map(id => {
            const node = document.getElementById(id), s = getComputedStyle(node), b = node.getBoundingClientRect();
            return { id, width: b.width, height: b.height, usedHeight: s.height, boxSizing: s.boxSizing };
          });
          const initial = observe();
          document.querySelectorAll('.child').forEach(node => { node.style.height = '80px'; });
          const grown = observe();
          document.querySelectorAll('.child').forEach(node => { node.style.height = '40px'; });
          return { initial, grown, restored: observe() };
        });
        assert.deepEqual(observations.initial, [
          { id: 'auto', width: 258, height: 98, usedHeight: '40px', boxSizing: 'content-box' },
          { id: 'fixed', width: 258, height: 98, usedHeight: '98px', boxSizing: 'border-box' },
        ]);
        assert.deepEqual(observations.grown.map(n => n.height), [138, 98]);
        assert.deepEqual(observations.restored, observations.initial);
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
});

test('captured Material scalar collector skips layer rules that full-tree capture retains', async () => {
  const { readFileSync } = await import('node:fs');
  const source = readFileSync('tests/material-parity/run-material-parity.mjs', 'utf8');
  const start = source.indexOf('    function matchedAuthoredStyles(element) {');
  const end = source.indexOf('\n    return { elements, semantics };', start);
  assert.ok(start >= 0 && end > start);
  const collectorSource = source.slice(start, end).trim();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>
      .target { display: flex; }
      @layer cdk-overlay { .target { z-index: 1000; } }
      @media (min-width: 1px) { .target { position: absolute; } }
      @supports (display: grid) { .target { width: 120px; } }
    </style><app-reference><main class="frame"><div class="target" style="height:40px">Proof</div></main></app-reference>`);
    const scalar = await page.evaluate(source => {
      const collect = new Function(`${source}; return matchedAuthoredStyles;`)();
      const element = document.querySelector('.target');
      return { rules: collect(element), computedZIndex: getComputedStyle(element).zIndex,
        ruleTypes: [...document.styleSheets[0].cssRules].map(r => r.constructor.name) };
    }, collectorSource);
    const tree = await page.evaluate(captureBrowserInputTree, { styleProperties: ['zIndex', 'width', 'height'] });
    const node = tree.nodes.find(n => n.attributes.class === 'target');
    assert.equal(scalar.computedZIndex, '1000');
    assert.ok(scalar.ruleTypes.includes('CSSLayerBlockRule'));
    assert.equal(scalar.rules.some(r => r.declarations['z-index']), false, 'preserve the current scalar-collector defect');
    for (const prop of ['display', 'position', 'width', 'height']) assert.ok(scalar.rules.some(r => r.declarations[prop]), prop);
    const rule = node.rules.map(i => tree.rules[i]).find(r => r.declarations['z-index']);
    assert.equal(rule.source, 'sheet:0/1/0');
    assert.equal(rule.active, true);
    assert.deepEqual(rule.declarations['z-index'], { value: '1000', important: false });
    assert.equal(tree.styles[node.style].zIndex, '1000');
    assert.deepEqual(tree.errors, []);
  } finally { await browser.close(); }
});

test('browser omitted overflow equals visible only when both axes retain their initial values', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
    const observations = await page.evaluate(() => {
      const observe = (overflow, parentClips = false, type = 'div') => {
        const parent = document.createElement('div'), box = document.createElement(type), child = document.createElement('div');
        Object.assign(parent.style, { position: 'absolute', left: '20px', top: '20px', width: '60px', height: '40px',
          overflow: parentClips ? 'hidden' : 'visible' });
        Object.assign(box.style, { width: '60px', height: '40px', margin: '0', ...overflow });
        Object.assign(child.style, { width: '120px', height: '120px', background: 'red' });
        box.append(child); parent.append(box); document.body.append(parent);
        const style = getComputedStyle(box);
        const result = { x: style.overflowX, y: style.overflowY,
          hitOutsideX: document.elementFromPoint(100, 30) === child,
          hitOutsideY: document.elementFromPoint(30, 90) === child };
        box.scrollTop = 20; box.scrollLeft = 20;
        Object.assign(result, { scrollTop: box.scrollTop, scrollLeft: box.scrollLeft });
        parent.remove();
        return result;
      };
      return { omitted: observe({}), visible: observe({ overflow: 'visible' }),
        hidden: observe({ overflow: 'hidden' }), clip: observe({ overflow: 'clip' }),
        auto: observe({ overflow: 'auto' }), scroll: observe({ overflow: 'scroll' }),
        mixedX: observe({ overflowX: 'visible', overflowY: 'hidden' }),
        mixedY: observe({ overflowX: 'hidden', overflowY: 'visible' }),
        ancestorClips: observe({}, true),
        headingOmitted: observe({}, false, 'h2'), headingVisible: observe({ overflow: 'visible' }, false, 'h2'),
        headingHidden: observe({ overflow: 'hidden' }, false, 'h2'), headingAncestor: observe({}, true, 'h2') };
    });
    assert.deepEqual(observations.omitted, { x: 'visible', y: 'visible', hitOutsideX: true, hitOutsideY: true, scrollTop: 0, scrollLeft: 0 });
    assert.deepEqual(observations.visible, observations.omitted);
    for (const mode of ['hidden', 'auto', 'scroll']) {
      assert.deepEqual(observations[mode], { x: mode, y: mode, hitOutsideX: false, hitOutsideY: false, scrollTop: 20, scrollLeft: 20 });
    }
    assert.deepEqual(observations.clip, { x: 'clip', y: 'clip', hitOutsideX: false, hitOutsideY: false, scrollTop: 0, scrollLeft: 0 });
    assert.equal(observations.mixedX.x, 'auto');
    assert.equal(observations.mixedY.y, 'auto');
    assert.deepEqual(observations.ancestorClips, { x: 'visible', y: 'visible', hitOutsideX: false, hitOutsideY: false, scrollTop: 0, scrollLeft: 0 });
    assert.deepEqual(observations.headingOmitted, observations.omitted);
    assert.deepEqual(observations.headingVisible, observations.visible);
    assert.deepEqual(observations.headingHidden, observations.hidden);
    assert.deepEqual(observations.headingAncestor, observations.ancestorClips);
  } finally { await browser.close(); }
});

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
        rtlLeft: pair('rtl', 'normal', 'left'), isolate: pair('ltr', 'isolate', 'left', 'שלום'),
        plaintext: pair('ltr', 'plaintext', 'left', 'שלום') };
    });
    assert.equal(result.ltr.start.offset, result.ltr.physical.offset);
    assert.equal(result.rtlRight.start.offset, result.rtlRight.physical.offset);
    assert.equal(result.isolate.start.offset, result.isolate.physical.offset,
      'isolate keeps the specified LTR paragraph direction; it is not plaintext auto direction');
    assert.ok(result.rtlLeft.start.offset - result.rtlLeft.physical.offset > 100);
    assert.equal(result.plaintext.start.leaf.direction, 'ltr');
    assert.equal(result.plaintext.start.leaf.unicodeBidi, 'normal');
    assert.equal(result.plaintext.start.parent.unicodeBidi, 'plaintext');
    assert.ok(result.plaintext.start.offset - result.plaintext.physical.offset > 100,
      'an LTR leaf with normal unicode-bidi does not authorize start/left equivalence when the line container is plaintext');
  } finally { await browser.close(); }
});

test('component font tokens preserve nested fallback lists and source-order exceptions', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    const result = await page.evaluate(() => {
      const inspect = (rules, properties = {}) => {
        const wrapper = document.createElement('div'), style = document.createElement('style');
        const owner = document.createElement('mat-button-toggle'), button = document.createElement('button');
        const label = document.createElement('span');
        wrapper.style.fontFamily = 'serif';
        for (const [key, value] of Object.entries(properties)) wrapper.style.setProperty(key, value);
        owner.className = 'mat-button-toggle mat-button-toggle-appearance-standard';
        label.textContent = 'Label';
        button.style.fontFamily = 'inherit';
        button.append(label); owner.append(button); wrapper.append(style, owner);
        style.textContent = rules; document.body.append(wrapper);
        const fonts = [owner, button, label].map(n => getComputedStyle(n).fontFamily);
        wrapper.remove();
        return fonts;
      };
      const legacy = '.mat-button-toggle { font-family: var(--mat-button-toggle-legacy-label-text-font) }';
      const standard = '.mat-button-toggle-appearance-standard { font-family: var(--mat-button-toggle-label-text-font, var(--mat-sys-label-large-font)) }';
      const vars = { '--mat-button-toggle-legacy-label-text-font': 'Arial', '--mat-sys-label-large-font': 'Roboto' };
      const table = '.mat-button-toggle { font-family: var(--mat-table-header-headline-font, var(--mat-sys-title-small-font, Roboto, sans-serif)) }';
      return { standardWins: inspect(legacy + standard, vars), laterLegacyWins: inspect(standard + legacy, vars),
        importantLegacyWins: inspect(legacy.replace(') }', ') !important }') + standard, vars),
        unlayeredLegacyWins: inspect(legacy + '@layer component {' + standard + '}', vars),
        tableSystem: inspect(table, { '--mat-sys-title-small-font': 'Roboto' }),
        tableFallback: inspect(table), tableComponent: inspect(table, { '--mat-table-header-headline-font': 'Arial', '--mat-sys-title-small-font': 'Roboto' }) };
    });
    assert.deepEqual(result.standardWins, ['Roboto', 'Roboto', 'Roboto']);
    for (const name of ['laterLegacyWins', 'importantLegacyWins', 'unlayeredLegacyWins', 'tableComponent']) {
      assert.deepEqual(result[name], ['Arial', 'Arial', 'Arial'], name);
    }
    assert.deepEqual(result.tableSystem, ['Roboto', 'Roboto', 'Roboto']);
    assert.deepEqual(result.tableFallback, ['Roboto, sans-serif', 'Roboto, sans-serif', 'Roboto, sans-serif']);
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

test('retained tree capture cannot distinguish text interleaving around an inline child', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const deviceScaleFactor of [1, 2]) {
      const page = await browser.newPage({ viewport: { width: 640, height: 360 }, deviceScaleFactor });
      try {
        const observe = async (content) => {
          await page.setContent(`<app-reference><main class="frame"><div>${content}</div></main></app-reference>`);
          const tree = await page.evaluate(captureBrowserInputTree,
            { styleProperties: ['display', 'width', 'height', 'fontFamily', 'fontSize'] });
          const childLeft = await page.locator('span').evaluate(node => node.getBoundingClientRect().left);
          return { tree, childLeft };
        };
        const interleaved = await observe('A<span>X</span>B');
        const preceding = await observe('AB<span>X</span>');
        const changedText = await observe('AC<span>X</span>');
        assert.deepEqual(interleaved.tree.errors, []);
        assert.deepEqual(interleaved.tree, preceding.tree);
        assert.ok(preceding.childLeft > interleaved.childLeft,
          'native inline placement must distinguish the two text/element orders');
        assert.notDeepEqual(preceding.tree, changedText.tree,
          'control: changed direct text is still observable');
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
});

// Append-only diagnostic block preserves the published proof line anchors above.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative, isAbsolute } from 'node:path';

test('retained main mixed-text owners have only out-of-flow chip focus-indicator children', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const descriptor = JSON.parse(readFileSync('docs/material-generated-node-mapping-audit.json')).mainCapture;
  assert.equal(descriptor.sha256, 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const load = descriptor => {
    const file = resolve(descriptor.file), rel = relative(resolve('artifacts/material-parity'), file);
    assert.ok(!isAbsolute(rel) && rel !== '..' && !rel.startsWith('../') && !rel.startsWith('..\\'));
    const bytes = readFileSync(file);
    assert.equal(hash(bytes), descriptor.sha256);
    return JSON.parse(bytes);
  };
  const report = load(descriptor), families = new Set();
  let cases = 0, mixedCases = 0, owners = 0;
  for (const entry of [...report.results, ...report.interactions]) {
    cases++;
    const tree = load(entry.inputTrees.reference);
    assert.deepEqual(tree.errors, []);
    const children = new Map();
    for (const node of tree.nodes) {
      if (!children.has(node.parent)) children.set(node.parent, []);
      children.get(node.parent).push(node);
    }
    const mixed = tree.nodes.filter(node => node.ownText?.trim() && children.has(node.key));
    if (mixed.length) { mixedCases++; families.add(entry.family); }
    for (const owner of mixed) {
      owners++;
      assert.equal(entry.family, 'chips');
      assert.match(owner.attributes.class, /\bmat-mdc-chip-action-label\b/);
      const descendants = children.get(owner.key);
      assert.equal(descendants.length, 1);
      const child = descendants[0];
      assert.equal(child.type, 'span');
      assert.equal(child.ownText, '');
      assert.ok(!children.has(child.key));
      assert.match(child.attributes.class, /\bmat-mdc-chip-primary-focus-indicator\b/);
      assert.equal(tree.styles[child.style].position, 'absolute');
      assert.equal(tree.styles[child.style].pointerEvents, 'none');
    }
  }
  assert.deepEqual({ cases, mixedCases, owners, families: [...families] },
    { cases: 2311, mixedCases: 76, owners: 152, families: ['chips'] });
  // This bounds the demonstrated inline-flow capture risk only. Absolute child
  // paint order, generated pseudo-elements, semantics and current runtime remain
  // separate obligations; historical trees are not current rendering acceptance.
});

test('retained filled-field structure substitutes absolute regions for the native infix chain', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const component = readFileSync('examples/material-showcase/src/app/astylar.component.ts', 'utf8').replaceAll('\r\n', '\n');
  assert.equal(hash(component), 'b493a355679903f988e29f0dafbb95d2d6cce41275302fce5c978ae55f423b9f');
  assert.ok(component.includes('const fieldActiveLine = (controlId: string): DOMElement[] => this.focusedId() === controlId || state.error ?'));
  const load = descriptor => {
    const file = resolve(descriptor.file), rel = relative(resolve('artifacts/material-parity'), file);
    assert.ok(!isAbsolute(rel) && rel !== '..' && !rel.startsWith('../') && !rel.startsWith('..\\'));
    const bytes = readFileSync(file);
    assert.equal(hash(bytes), descriptor.sha256);
    return JSON.parse(bytes);
  };
  const descriptor = JSON.parse(readFileSync('docs/material-generated-node-mapping-audit.json')).mainCapture;
  assert.equal(descriptor.sha256, 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = load(descriptor), counts = {}, classHas = (node, cls) =>
    String(node.attributes?.class ?? '').split(/\s+/).includes(cls);
  const unique = nodes => { assert.equal(nodes.length, 1); return nodes[0]; };
  const families = ['form-field', 'input', 'autocomplete', 'select', 'datepicker', 'timepicker'];
  let absentDisabledLayers = 0;
  const focusOpacities = {}, cornerSubstitutions = {};
  const underlineStates = {}, errorActivation = {}, alternateLineStates = {}, missingLineCases = [];
  for (const entry of [...report.results, ...report.interactions].filter(entry => families.includes(entry.family))) {
    const native = load(entry.inputTrees.reference), candidate = load(entry.inputTrees.astylar);
    assert.deepEqual(native.errors, []); assert.deepEqual(candidate.errors, []);
    const byKey = new Map(native.nodes.map(node => [node.key, node]));
    const family = entry.family, named = id => unique(native.nodes.filter(node => node.attributes?.id === id));
    const authored = id => unique(candidate.nodes.filter(node => node.authored?.id === id));
    const host = named(`${family}-primary`), shell = authored(`${family}-primary`);
    assert.equal(host.type, 'mat-form-field'); assert.equal(shell.authored.type, 'div');
    const control = named(`${family}-control`), infix = byKey.get(control.parent);
    assert.ok(classHas(infix, 'mat-mdc-form-field-infix'));
    assert.equal(native.styles[infix.style].position, 'relative');
    const flex = byKey.get(infix.parent), wrapper = byKey.get(flex.parent);
    assert.ok(classHas(flex, 'mat-mdc-form-field-flex'));
    assert.ok(classHas(wrapper, 'mat-mdc-text-field-wrapper'));
    assert.equal(wrapper.parent, host.key);
    const label = named(`${family}-label`), floating = byKey.get(label.parent);
    assert.ok(classHas(floating, 'mdc-floating-label'));
    assert.equal(floating.parent, infix.key);
    assert.equal(authored(`${family}-label`).parent, shell.key);
    const region = authored(`${family}-input-region`), surface = authored(`${family}-control-surface`);
    assert.equal(region.parent, shell.key); assert.equal(surface.parent, shell.key);
    assert.equal(authored(`${family}-control`).parent, region.key);
    for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']) {
      assert.equal(region[stage].position, 'absolute');
      assert.equal(surface[stage].position, 'absolute');
      assert.ok(['3px', '4px', '6px'].includes(surface[stage].borderRadius));
      assert.equal(surface[stage].borderRadius, surface.resolvedStyle.borderRadius);
    }
    const wrapperStyle = native.styles[wrapper.style];
    assert.equal(wrapperStyle.borderTopLeftRadius, '4px');
    assert.equal(wrapperStyle.borderTopRightRadius, '4px');
    assert.equal(wrapperStyle.borderBottomLeftRadius, '0px');
    assert.equal(wrapperStyle.borderBottomRightRadius, '0px');
    const radius = surface.resolvedStyle.borderRadius;
    cornerSubstitutions[radius] = (cornerSubstitutions[radius] ?? 0) + 1;
    const ripple = unique(native.nodes.filter(node => node.parent === wrapper.key && classHas(node, 'mdc-line-ripple')));
    assert.equal(ripple.ownText, '');
    const after = unique(ripple.pseudoElements.filter(pseudo => pseudo.pseudo === '::after'));
    assert.equal(after.generated, true);
    const afterStyle = native.styles[after.style];
    const lines = candidate.nodes.filter(node => node.authored?.id === `${family}-control-active-line`);
    assert.ok(lines.length <= 1);
    const underlineState = JSON.stringify([afterStyle.opacity, afterStyle.transform, !!lines.length]);
    underlineStates[underlineState] = (underlineStates[underlineState] ?? 0) + 1;
    if (lines.length && afterStyle.opacity === '0') {
      assert.equal(entry.state, 'error');
      assert.ok(classHas(host, 'mat-form-field-invalid'));
      assert.ok(!classHas(wrapper, 'mdc-text-field--focused'));
      assert.equal(afterStyle.transform, 'matrix(0, 0, 0, 1, 0, 0)');
      assert.equal(afterStyle.borderBottomWidth, '2px');
      const before = unique(ripple.pseudoElements.filter(pseudo => pseudo.pseudo === '::before'));
      assert.equal(native.styles[before.style].borderBottomWidth, '1px');
      assert.equal(native.styles[before.style].opacity, '1');
      for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']) {
        assert.equal(lines[0][stage].height, '2px');
        assert.equal(lines[0][stage].opacity, '1.0');
      }
      errorActivation[family] = (errorActivation[family] ?? 0) + 1;
    }
    if (!lines.length && afterStyle.opacity === '1') {
      assert.equal(family, 'timepicker');
      assert.ok(classHas(host, 'mat-focused'));
      assert.ok(classHas(wrapper, 'mdc-text-field--focused'));
      const alternate = candidate.nodes.filter(node => node.authored?.id === 'timepicker-active-line');
      assert.ok(alternate.length <= 1);
      if (alternate.length) {
        assert.equal(entry.astylarState.open, true);
        for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']) {
          assert.equal(alternate[0][stage].height, '2px');
          assert.equal(alternate[0][stage].opacity, '1.0');
        }
        alternateLineStates[entry.state] = (alternateLineStates[entry.state] ?? 0) + 1;
      } else {
        assert.equal(entry.astylarState.open, false);
        assert.equal(entry.state, 'open-dismiss');
        assert.deepEqual(entry.focus, { reference: 'timepicker-primary', astylar: 'timepicker-primary', matches: true });
        missingLineCases.push(`${entry.profile}/${entry.viewport.id}/${entry.state}`);
      }
    }
    const focus = native.nodes.filter(node => node.parent === wrapper.key && classHas(node, 'mat-mdc-form-field-focus-overlay'));
    if (classHas(wrapper, 'mdc-text-field--disabled')) { assert.equal(focus.length, 0); absentDisabledLayers++; }
    else assert.equal(focus.length, 1);
    const opacity = focus.length ? native.styles[focus[0].style].opacity : 'absent';
    focusOpacities[opacity] = (focusOpacities[opacity] ?? 0) + 1;
    counts[family] = (counts[family] ?? 0) + 1;
  }
  assert.deepEqual(counts, { 'form-field': 76, input: 76, autocomplete: 110, select: 94, datepicker: 111, timepicker: 110 });
  assert.equal(absentDisabledLayers, 48);
  assert.deepEqual(cornerSubstitutions, { '4px': 293, '3px': 142, '6px': 142 });
  assert.deepEqual(focusOpacities, { '0': 463, '0.08': 66, absent: 48 });
  assert.deepEqual(underlineStates, {
    '["0","matrix(0, 0, 0, 1, 0, 0)",false]': 251,
    '["1","matrix(1, 0, 0, 1, 0, 0)",true]': 196,
    '["0","matrix(1, 0, 0, 1, 0, 0)",false]': 48,
    '["0","matrix(0, 0, 0, 1, 0, 0)",true]': 40,
    '["1","matrix(1, 0, 0, 1, 0, 0)",false]': 42,
  });
  assert.deepEqual(errorActivation, { 'form-field': 8, input: 8, autocomplete: 8, datepicker: 8, timepicker: 8 });
  assert.deepEqual(alternateLineStates, { activate: 8, 'activate-leave': 8, 'open-scroll': 8, 'open-hover-content': 8, open: 8 });
  assert.deepEqual(missingLineCases, ['light/mobile-dpr2/open-dismiss', 'dark/mobile-dpr2/open-dismiss']);
  // These are unequal layout/tree requests, not a one-to-one wrapper mapping or
  // proof that every removed wrapper has a separate renderer defect. Preserve
  // existing label/token diagnoses and investigate unclassified paint separately.
});
