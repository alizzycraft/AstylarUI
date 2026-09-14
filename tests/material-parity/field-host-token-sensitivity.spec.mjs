import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { chromium } from 'playwright-core';

// Browser-only sensitivity evidence. Omission is a control, not an Astylar
// computed-style emulator. No candidate layout or raster claim follows.
const owner = 'examples/material-showcase/node_modules/@angular/material/fesm2022/form-field-CFbrnFED.mjs';
const source = readFileSync(owner, 'utf8');
const declarations = ['letter-spacing', 'font-weight'].map(property => {
  const matches = [...source.matchAll(new RegExp(`${property}:var\\(--mat-form-field-container-text-[^;}]+`, 'g'))];
  const unique = [...new Set(matches.map(match => match[0]))];
  assert.equal(unique.length, 1, `one unambiguous installed Material ${property} request`);
  return unique[0];
});
assert.deepEqual(declarations, [
  'letter-spacing:var(--mat-form-field-container-text-tracking, var(--mat-sys-body-large-tracking))',
  'font-weight:var(--mat-form-field-container-text-weight, var(--mat-sys-body-large-weight))',
]);

for (const deviceScaleFactor of [1, 2]) {
  test(`field host weight/tracking token requests are not inherited omissions at DPR ${deviceScaleFactor}`, async t => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor });
      await page.setContent(`<style>
        #ancestor { font-weight:400; letter-spacing:0.496px;
          --mat-sys-body-large-weight:400; --mat-sys-body-large-tracking:0.496px; }
        #explicit { ${declarations.join(';')} }
        .override { font-weight:300; letter-spacing:3px; }
      </style><main id="ancestor">
        <section id="explicit"><span>Inherited child</span><span class="override">Override child</span></section>
        <section id="omitted"><span>Inherited child</span><span class="override">Override child</span></section>
      </main>`);
      const result = await page.evaluate(() => {
        const ancestor = document.getElementById('ancestor');
        const readStyle = node => {
          const s = getComputedStyle(node);
          return { fontWeight: s.fontWeight, letterSpacing: s.letterSpacing };
        };
        const read = () => Object.fromEntries(['explicit', 'omitted'].map(id => {
          const node = document.getElementById(id);
          return [id, { host: readStyle(node), children: [...node.children].map(readStyle) }];
        }));
        const initial = read();
        Object.assign(ancestor.style, { fontWeight: '700', letterSpacing: '2px' });
        const changedAncestor = read();
        ancestor.style.setProperty('--mat-sys-body-large-weight', '500');
        ancestor.style.setProperty('--mat-sys-body-large-tracking', '0.75px');
        const changedSystemTokens = read();
        ancestor.style.setProperty('--mat-form-field-container-text-weight', '600');
        ancestor.style.setProperty('--mat-form-field-container-text-tracking', '1.25px');
        const componentOverrides = read();
        ancestor.style.removeProperty('--mat-form-field-container-text-weight');
        ancestor.style.removeProperty('--mat-form-field-container-text-tracking');
        const removedComponentOverrides = read();
        // A present but invalid custom-property value does not select var()'s
        // missing-token fallback: the consuming inherited property inherits.
        ancestor.style.setProperty('--mat-form-field-container-text-weight', 'bogus');
        ancestor.style.setProperty('--mat-form-field-container-text-tracking', 'bogus');
        const invalidComponentTokens = read();
        ancestor.removeAttribute('style');
        return { initial, changedAncestor, changedSystemTokens, componentOverrides,
          removedComponentOverrides, invalidComponentTokens, restored: read() };
      });
      const style = (fontWeight, letterSpacing) => ({ fontWeight, letterSpacing });
      const base = style('400', '0.496px'), inherited = style('700', '2px');
      const system = style('500', '0.75px'), component = style('600', '1.25px');
      for (const [state, explicit, omitted] of [
        ['initial', base, base], ['changedAncestor', base, inherited],
        ['changedSystemTokens', system, inherited], ['componentOverrides', component, inherited],
        ['removedComponentOverrides', system, inherited], ['invalidComponentTokens', inherited, inherited],
        ['restored', base, base],
      ]) {
        for (const [id, expected] of [['explicit', explicit], ['omitted', omitted]]) {
          assert.deepEqual(result[state][id].host, expected, `${state}/${id} host`);
          assert.deepEqual(result[state][id].children, [expected, style('300', '3px')], `${state}/${id} child ownership`);
        }
      }
      assert.deepEqual(result.restored, result.initial);
      t.diagnostic(JSON.stringify({ browserVersion: browser.version(), deviceScaleFactor,
        source: { file: owner, sha256: createHash('sha256').update(source.replaceAll('\r\n', '\n')).digest('hex') },
        declarations, scope: 'browser token sensitivity only; synthetic token values; not candidate computed-style or raster evidence', result }));
    } finally { await browser.close(); }
  });
}
