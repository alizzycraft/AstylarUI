import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from './input-tree-evidence.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const expectedDurations = {
  'transition-duration': { value: '1ms', important: false },
  'animation-duration': { value: '1ms', important: false },
};
const properties = ['fontStyle', 'wordSpacing', 'textTransform', 'whiteSpace',
  'overflowWrap', 'wordBreak', 'pointerEvents', 'visibility'];

test('all retained chip motion observations preserve duration-only requests and missing computed motion context', () => {
  const bytes = readFileSync('docs/material-owner-initial-motion-review.json', 'utf8').replaceAll('\r\n', '\n');
  assert.equal(hash(bytes), 'f8f90799191604823875d849fb6ae56de46dd96c37e3f91c8d540bdd48916294');
  const parent = JSON.parse(bytes), cache = new Map(), owners = new Map(), cases = new Set();
  const groups = parent.findings.filter(g => g.family === 'chips' && g.disposition === 'requires-specific-review');
  assert.equal(groups.length, 16);
  assert.deepEqual([...new Set(groups.map(g => g.property))].sort(), [...properties].sort());
  assert.deepEqual([...new Set(groups.map(g => g.element))].sort(), ['chip-0', 'chip-1']);
  let observations = 0;
  for (const group of groups) for (const observation of group.observations) {
    const descriptor = observation.inputTrees.reference;
    if (!cache.has(descriptor.file)) {
      const raw = readFileSync(descriptor.file); assert.equal(hash(raw), descriptor.sha256);
      cache.set(descriptor.file, { sha256: descriptor.sha256, tree: JSON.parse(raw) });
    }
    const loaded = cache.get(descriptor.file); assert.equal(loaded.sha256, descriptor.sha256);
    const pattern = parent.patterns[observation.pattern], review = pattern.review;
    assert.equal(hash(JSON.stringify(review)), pattern.sha256);
    assert.equal(review.proof.property, group.property);
    assert.equal(review.proof.element, group.element);
    assert.equal(review.proof.candidateLocalDeclaration, '<omitted>');
    assert.equal(review.requests.length, 1);
    assert.deepEqual(review.reasons, ['transition-target-not-proven-disjoint', 'animation-name-not-proven-none']);
    const request = review.requests[0], tree = loaded.tree;
    const node = tree.nodes.find(n => n.key === request.node), rule = tree.rules[request.index];
    assert.ok(node && node.rules.includes(request.index));
    assert.ok(review.proof.referencePath.includes(node.key));
    assert.equal(rule.selector, request.selector);
    assert.equal(rule.active, true); assert.deepEqual(rule.conditions, []);
    assert.deepEqual(rule.declarations, expectedDurations);
    assert.deepEqual(request.declarations, expectedDurations);
    assert.deepEqual(review.proof.issues, Object.entries(expectedDurations).map(([key, value]) => ({
      reason: 'motion-request-needs-review', side: 'reference', node: node.key,
      source: rule.selector, key, value,
    })));
    for (const key of review.proof.referencePath) {
      const ancestor = tree.nodes.find(n => n.key === key);
      for (const property of ['transitionProperty', 'transitionDuration', 'transitionDelay',
        'animationName', 'animationDuration', 'animationPlayState'])
        assert.equal(Object.hasOwn(tree.styles[ancestor.style], property), false);
    }
    assert.equal(Object.hasOwn(tree, 'animations'), false);
    const evidence = { case: observation.case, element: group.element, reference: descriptor,
      node: node.key, ruleIndex: request.index, source: rule.source, cssText: rule.cssText };
    const ownerKey = JSON.stringify([observation.case, group.element]);
    if (owners.has(ownerKey)) assert.deepEqual(owners.get(ownerKey), evidence);
    else owners.set(ownerKey, evidence);
    cases.add(observation.case); observations++;
  }
  assert.equal(observations, 1216); assert.equal(owners.size, 152); assert.equal(cases.size, 76);
  console.log(JSON.stringify({ groups: groups.length, observations, ownerContexts: owners.size,
    cases: cases.size, orderedOwnerEvidenceSha256: hash(JSON.stringify([...owners])),
    computedMotionVerified: false, inactiveMotionProven: false, canonicalAttributionChanged: false }));
});

test('one-millisecond noopable declarations neither disable transitions nor prove absence of live animation', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const deviceScaleFactor of [1, 2]) {
      const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor });
      try {
        await page.setContent(`<style>
          .mat-mdc-standard-chip._mat-animation-noopable {
            transition-duration: 1ms; animation-duration: 1ms;
          }
        </style><app-reference><main class="frame"><button id="subject"
          class="mat-mdc-standard-chip _mat-animation-noopable">Chip label</button></main></app-reference>`);
        const snapshot = async () => ({
          tree: await page.evaluate(captureBrowserInputTree, { styleProperties: properties }),
          motion: await page.evaluate(() => {
            const element = document.getElementById('subject'), style = getComputedStyle(element);
            return { transitionProperty: style.transitionProperty, transitionDuration: style.transitionDuration,
              animationName: style.animationName, animationDuration: style.animationDuration,
              wordSpacing: style.wordSpacing, animations: element.getAnimations().map(a => ({
                playState: a.playState, currentTime: a.currentTime,
                duration: a.effect.getTiming().duration,
              })) };
          }),
        });
        const idle = await snapshot();
        assert.deepEqual(idle.motion, { transitionProperty: 'all', transitionDuration: '0.001s',
          animationName: 'none', animationDuration: '0.001s', wordSpacing: '0px', animations: [] });
        await page.evaluate(() => {
          const animation = document.getElementById('subject').animate(
            [{ wordSpacing: '0px' }, { wordSpacing: '20px' }], { duration: 1, fill: 'both' });
          animation.pause(); animation.currentTime = 0;
        });
        const pausedAtStart = await snapshot();
        // Identical captured inputs and sampled styles do not identify runtime
        // motion. This synthetic counterexample is not a claim that the saved
        // Material chip was running this animation.
        assert.deepEqual(pausedAtStart.tree, idle.tree);
        assert.deepEqual(pausedAtStart.motion.animations, [{ playState: 'paused', currentTime: 0, duration: 1 }]);
        await page.evaluate(() => { document.getElementById('subject').getAnimations()[0].currentTime = 0.5; });
        const midpoint = await snapshot();
        assert.equal(midpoint.motion.wordSpacing, '10px');
        assert.equal(midpoint.motion.transitionProperty, 'all');
        assert.equal(midpoint.motion.animationName, 'none');
        assert.deepEqual(midpoint.tree.rules, idle.tree.rules);
        for (const state of [idle, pausedAtStart, midpoint]) assert.deepEqual(state.tree.errors, []);
        await page.evaluate(() => document.getElementById('subject').getAnimations().forEach(a => a.cancel()));
        const cancelled = await snapshot();
        assert.deepEqual(cancelled.tree, idle.tree); assert.deepEqual(cancelled.motion, idle.motion);
      } finally { await page.close(); }
    }
    console.log(JSON.stringify({ browserVersion: browser.version(), dpr: [1, 2], states: 4,
      captureSourceSha256: hash(readFileSync('tests/material-parity/input-tree-evidence.mjs', 'utf8').replaceAll('\r\n', '\n')),
      materialRuntimeMotionProven: false, inputEquivalent: false, renderingEquivalent: false }));
  } finally { await browser.close(); }
});
