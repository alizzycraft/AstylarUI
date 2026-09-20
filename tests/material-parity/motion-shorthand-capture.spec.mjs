import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from './input-tree-evidence.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const motionKeys = ['transition-property', 'transition-duration', 'transition-timing-function',
  'transition-delay', 'transition-behavior'];
const shorthand = 'transition: transform var(--mat-tab-animation-duration) 1ms cubic-bezier(0.35, 0, 0.25, 1);';

test('all 490 retained panel observations preserve pending-substitution shorthand rather than absent motion input', () => {
  const bytes = readFileSync('docs/material-owner-initial-motion-review.json', 'utf8').replaceAll('\r\n', '\n');
  assert.equal(hash(bytes), 'f8f90799191604823875d849fb6ae56de46dd96c37e3f91c8d540bdd48916294');
  const parent = JSON.parse(bytes), groups = parent.findings.filter(g => g.element === 'tab-panel' && g.disposition === 'requires-specific-review');
  assert.equal(groups.length, 7);
  const cases = new Map(), cache = new Map(); let count = 0;
  for (const g of groups) for (const observation of g.observations) {
    const descriptor = observation.inputTrees.reference;
    if (!cache.has(descriptor.file)) {
      const treeBytes = readFileSync(descriptor.file); assert.equal(hash(treeBytes), descriptor.sha256);
      cache.set(descriptor.file, { sha256: descriptor.sha256, tree: JSON.parse(treeBytes) });
    }
    const loaded = cache.get(descriptor.file); assert.equal(loaded.sha256, descriptor.sha256);
    const tree = loaded.tree, pattern = parent.patterns[observation.pattern];
    assert.equal(hash(JSON.stringify(pattern.review)), pattern.sha256);
    const unresolved = pattern.review.requests.filter(r => r.selector === '.mat-tab-body-content-can-animate');
    assert.equal(unresolved.length, 1);
    const request = unresolved[0], node = tree.nodes.find(n => n.key === request.node), rule = tree.rules[request.index];
    assert.ok(node.rules.includes(request.index)); assert.equal(rule.selector, request.selector);
    assert.deepEqual(rule.declarations, request.declarations); assert.equal(rule.cssText, shorthand);
    assert.equal(rule.active, true); assert.deepEqual(rule.conditions, []);
    assert.deepEqual(Object.keys(rule.declarations), motionKeys);
    for (const k of motionKeys) assert.deepEqual(rule.declarations[k], { value: '', important: false });
    const durationOwners = pattern.review.proof.referencePath.map(key => tree.nodes.find(n => n.key === key))
      .filter(n => Object.hasOwn(n.inline, '--mat-tab-animation-duration'));
    assert.equal(durationOwners.length, 1);
    assert.deepEqual(durationOwners[0].inline['--mat-tab-animation-duration'], { value: '500ms', important: false });
    for (const field of ['transitionProperty', 'transitionDuration', 'transitionDelay', 'animationName'])
      assert.equal(Object.hasOwn(tree.styles[node.style], field), false, 'historical computed motion remains uncaptured');
    const evidence = { reference: descriptor, node: node.key, ruleIndex: request.index,
      source: rule.source, cssText: rule.cssText, durationOwner: durationOwners[0].key };
    if (cases.has(observation.case)) assert.deepEqual(cases.get(observation.case), evidence);
    else cases.set(observation.case, evidence);
    count++;
  }
  assert.equal(count, 490); assert.equal(cases.size, 70);
  console.log(JSON.stringify({ groups: groups.length, observations: count, cases: cases.size,
    orderedCaseEvidenceSha256: hash(JSON.stringify([...cases])),
    inputEquivalent: false, computedMotionVerified: false, canonicalAttributionChanged: false }));
});

test('real CSSOM empty transition longhands retain variable shorthand and do not identify computed motion', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const deviceScaleFactor of [1, 2]) {
      const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor });
      try {
        await page.setContent(`<style>
          .frame { --mat-tab-animation-duration: 500ms; }
          .pending { ${shorthand} }
          .noop .pending { transition: none; }
        </style><app-reference><main class="frame"><div class="pending" id="subject">Panel</div></main></app-reference>`);
        const snapshot = async () => ({
          tree: await page.evaluate(captureBrowserInputTree, { styleProperties: ['fontStyle', 'whiteSpace'] }),
          computed: await page.evaluate(() => {
            const s = getComputedStyle(document.getElementById('subject'));
            return { property: s.transitionProperty, duration: s.transitionDuration, delay: s.transitionDelay };
          }),
        });
        const initial = await snapshot();
        assert.deepEqual(initial.computed, { property: 'transform', duration: '0.5s', delay: '0.001s' });
        await page.evaluate(() => document.querySelector('.frame').style.setProperty('--mat-tab-animation-duration', '2s'));
        const changed = await snapshot();
        assert.deepEqual(changed.computed, { property: 'transform', duration: '2s', delay: '0.001s' });
        await page.evaluate(() => document.querySelector('.frame').classList.add('noop'));
        const suppressed = await snapshot();
        assert.deepEqual(suppressed.computed, { property: 'none', duration: '0s', delay: '0s' });
        for (const result of [initial, changed, suppressed]) {
          const rule = result.tree.rules.find(r => r.selector === '.pending');
          assert.equal(rule.cssText, shorthand);
          for (const k of motionKeys) assert.equal(rule.declarations[k].value, '');
          const node = result.tree.nodes.find(n => n.attributes.id === 'subject');
          assert.equal(Object.hasOwn(result.tree.styles[node.style], 'transitionProperty'), false);
          assert.deepEqual(result.tree.errors, []);
        }
        assert.deepEqual(initial.tree.rules.find(r => r.selector === '.pending'), changed.tree.rules.find(r => r.selector === '.pending'));
      } finally { await page.close(); }
    }
    console.log(JSON.stringify({ browserVersion: browser.version(), dpr: [1, 2], states: 3,
      captureSourceSha256: hash(readFileSync('tests/material-parity/input-tree-evidence.mjs', 'utf8').replaceAll('\r\n', '\n')),
      renderingEquivalent: false }));
  } finally { await browser.close(); }
});
