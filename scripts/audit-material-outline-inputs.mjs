import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Observe the unchanged showcase. In particular, do not replace a var() with a
// sampled literal, set a theme token, or feed a measurement back into a surface.
const options = parseSupplementalCaptureArguments(process.argv.slice(2));
const styleProperties = Object.values(propertyGroups).flat();
const targets = [
  { family: 'button', id: 'button-secondary', type: 'button', candidate: '.outlined',
    selector: '.mat-mdc-outlined-button:not(:disabled)', property: 'border-color',
    token: '--mat-button-outlined-outline-color', expression: 'var(--mat-button-outlined-outline-color, var(--mat-sys-outline))',
    sides: ['Top', 'Right', 'Bottom', 'Left'] },
  { family: 'button-toggle', id: 'button-toggle-primary', type: 'div', candidate: '#button-toggle-primary',
    selector: '.mat-button-toggle-standalone.mat-button-toggle-appearance-standard, .mat-button-toggle-group-appearance-standard',
    property: 'border', token: '--mat-button-toggle-divider-color',
    expression: 'solid 1px var(--mat-button-toggle-divider-color, var(--mat-sys-outline))', sides: ['Top', 'Right', 'Bottom', 'Left'] },
  { family: 'button-toggle', id: 'button-toggle-two', type: 'div', candidate: '#button-toggle-two',
    selector: '.mat-button-toggle-group-appearance-standard .mat-button-toggle-appearance-standard + .mat-button-toggle-appearance-standard',
    property: 'border-left', token: '--mat-button-toggle-divider-color',
    expression: 'solid 1px var(--mat-button-toggle-divider-color, var(--mat-sys-outline))', sides: ['Left'] },
];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const evidence = openSupplementalCapture({ options, browser, script: 'scripts/audit-material-outline-inputs.mjs', styleProperties });
  const results = [];
  for (const profile of ['light', 'dark', 'contrast', 'custom']) for (const family of ['button', 'button-toggle']) {
    const entry = { family, profile, state: 'static' };
    const selected = targets.filter(target => target.family === family);
    for (const side of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      const finishRuntime = evidence.observe(page);
      try {
        await page.goto(`${options.baseUrl}/${side}/${family}?benchmark=1&profile=${profile}`);
        await page.locator('.frame').waitFor();
        let tree, observations;
        if (side === 'reference') {
          await page.locator(`#${selected[0].id}`).waitFor();
          await page.evaluate(() => document.fonts.ready);
          tree = await page.evaluate(captureBrowserInputTree, { styleProperties });
          observations = await page.evaluate(targets => targets.map(target => {
            const element = document.getElementById(target.id), computed = getComputedStyle(element);
            const rules = [];
            const walk = (list, active = true, conditions = []) => {
              for (const rule of list) {
                if (rule instanceof CSSStyleRule && rule.selectorText === target.selector && element.matches(rule.selectorText)) {
                  rules.push({ selector: rule.selectorText, property: target.property, active, conditions,
                    value: rule.style.getPropertyValue(target.property).trim(), cssText: rule.style.cssText,
                    important: rule.style.getPropertyPriority(target.property) === 'important',
                    longhands: Object.fromEntries(target.sides.map(side => [`border${side}Color`, rule.style[`border${side}Color`]])) });
                } else if ('cssRules' in rule) {
                  const condition = rule.conditionText;
                  const matches = rule instanceof CSSMediaRule ? matchMedia(condition).matches
                    : rule instanceof CSSSupportsRule ? CSS.supports(condition) : true;
                  walk(rule.cssRules, active && matches, condition ? [...conditions, condition] : conditions);
                }
              }
            };
            for (const sheet of document.styleSheets) walk(sheet.cssRules);
            return { id: target.id, type: element.tagName.toLowerCase(), rules,
              colorScheme: computed.colorScheme, prefersDark: matchMedia('(prefers-color-scheme: dark)').matches,
              componentToken: { name: target.token, value: computed.getPropertyValue(target.token).trim() },
              fallbackToken: { name: '--mat-sys-outline', value: computed.getPropertyValue('--mat-sys-outline').trim() },
              borders: Object.fromEntries(target.sides.map(side => [side, {
                color: computed[`border${side}Color`], width: computed[`border${side}Width`], style: computed[`border${side}Style`],
              }])) };
          }), selected);
          for (const [index, observation] of observations.entries()) {
            const target = selected[index];
            const activeRules = observation.rules.filter(rule => rule.active && rule.value);
            assert.equal(activeRules.length, 1, `Ambiguous token rule: ${target.id}`);
            assert.equal(activeRules[0].value, target.expression);
            assert.equal(activeRules[0].important, false);
            assert.equal(observation.componentToken.value, '', 'A component override needs separate attribution.');
            assert.equal(observation.fallbackToken.value, 'light-dark(#7b757f, #958e99)');
            // Do not infer the effective scheme from the profile's name. The
            // actual border is the browser's resolved value, not a JS palette.
            for (const border of Object.values(observation.borders)) {
              assert.ok(['rgb(123, 117, 127)', 'rgb(149, 142, 153)'].includes(border.color));
              assert.equal(border.width, '1px');
              assert.equal(border.style, 'solid');
              assert.notEqual(border.color, 'rgb(121, 116, 126)', 'Revisit a profile where the literal happens to agree.');
            }
            const nodes = tree.nodes.filter(node => (node.attributes?.id ?? node.attributes?.['data-parity-id']) === target.id);
            assert.equal(nodes.length, 1);
            assert.ok(nodes[0].rules.map(i => tree.rules[i]).some(rule => rule.active === true &&
              rule.selector === target.selector && rule.cssText === activeRules[0].cssText));
          }
        } else {
          await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
          tree = await page.evaluate(async () => {
            await window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled();
            return window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree;
          });
          assert.equal(tree.resolvedStyleEvidenceVersion, 2);
          assert.equal(tree.resolvedStyleSource, 'core-style-inspection');
          assert.ok(Number.isInteger(tree.resolvedStyleRevision) && tree.resolvedStyleRevision >= 0);
          observations = selected.map(target => {
            const nodes = tree.nodes.filter(node => node.authored?.id === target.id);
            assert.equal(nodes.length, 1);
            const node = nodes[0], rules = tree.rules.filter(rule => rule.selector === target.candidate);
            assert.equal(node.authored.type, target.type);
            assert.equal(rules.length, 1);
            assert.equal(rules[0].borderColor, '#79747e');
            const stages = Object.fromEntries(['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle'].map(stage => {
              assert.equal(node[stage]?.borderColor, '#79747e');
              return [stage, node[stage].borderColor];
            }));
            return { id: target.id, type: node.authored.type, node: node.key, rule: rules[0], stages };
          });
        }
        assert.ok(tree.nodes.length > 0);
        assert.deepEqual(tree.errors, []);
        const contents = JSON.stringify(tree), file = `${evidence.directory}/${family}-${profile}-${side}-input-tree.json`;
        writeFileSync(file, contents, { flag: 'wx' });
        entry[side] = { observations, inputTree: { file, sha256: createHash('sha256').update(contents).digest('hex') }, runtime: await finishRuntime() };
      } finally { await page.close(); }
    }
    results.push(entry);
  }
  const report = { schemaVersion: 1, browser: browser.version(), capture: evidence.capture,
    viewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
    scope: 'Three explicit outline/divider token inputs across four profiles, at rest only. No core, border raster, shape, disabled-state or whole-component equivalence claim.',
    classification: 'application-plugin-authoring-defect', inputEquivalent: false, finalRasterVerified: false, results };
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ directory: evidence.directory, browser: report.browser, pairs: results.length,
    observations: results.flatMap(entry => entry.reference.observations.map(observation => ({ family: entry.family, profile: entry.profile,
      id: observation.id, token: observation.fallbackToken.value, reference: Object.values(observation.borders)[0].color,
      candidate: entry.astylar.observations.find(node => node.id === observation.id).stages.resolvedStyle }))) }, null, 2));
} finally { await browser.close(); }
