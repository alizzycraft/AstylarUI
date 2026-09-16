import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { inspectOwnerGapInput } from '../tests/material-parity/owner-gap-input-evidence.mjs';

const args = process.argv.slice(2);
assert.ok(args.length === 0 || args.length === 1 && args[0] === '--check', 'only --check is accepted');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const parentFile = 'docs/material-owner-gap-input-survey.json';
const survey = JSON.parse(readFileSync(parentFile));
for (const source of survey.sourceFingerprints)
  assert.equal(hash(readFileSync(source.file, 'utf8').replaceAll('\r\n', '\n')), source.sha256);
const originalGroups = survey.groups.filter(g => g.family === 'dialog' && g.element === 'dialog-panel');
assert.equal(originalGroups.length, 2);
assert.deepEqual(originalGroups[0].originalCases, originalGroups[1].originalCases);
assert.equal(originalGroups[0].originalCases.length, 32);
const captureBytes = readFileSync(survey.capture.file); assert.equal(hash(captureBytes), survey.capture.sha256);
const raw = JSON.parse(captureBytes);
const boundary = realpathSync('artifacts/material-parity/current-ancestry-audit') + path.sep;
const originalRecords = [], originalHashers = originalGroups.map(() => createHash('sha256'));
for (const caseId of originalGroups[0].originalCases) {
  const entries = raw.interactions.filter(e => `interaction:${e.family}@${e.profile}/${e.viewport.id}/${e.state}` === caseId);
  assert.equal(entries.length, 1); const entry = entries[0];
  const trees = {};
  for (const side of ['reference', 'astylar']) {
    const descriptor = entry.inputTrees[side], file = realpathSync(descriptor.file);
    assert.ok(file.startsWith(boundary)); const bytes = readFileSync(file);
    assert.equal(hash(bytes), descriptor.sha256); trees[side] = JSON.parse(bytes);
  }
  const inputs = entry.styleInputs.filter(i => i.id === 'dialog-panel'); assert.equal(inputs.length, 1);
  const proofs = originalGroups.map((group, index) => {
    const proof = inspectOwnerGapInput(inputs[0], group.property, trees.reference, trees.astylar, { family: 'dialog' });
    originalHashers[index].update(JSON.stringify({ case: caseId, proof }) + '\n'); return proof;
  });
  const owner = trees.reference.nodes.find(n => n.key === proofs[0].referenceNode); assert.ok(owner);
  const rules = owner.rules.map(i => trees.reference.rules[i]).filter(r => r.selector === '.mat-mdc-dialog-surface');
  assert.equal(rules.length, 1); const rule = rules[0];
  const scalarRules = inputs[0].referenceAuthored.filter(r => r.selector === rule.selector); assert.equal(scalarRules.length, 1);
  assert.deepEqual(scalarRules[0].declarations, rule.declarations);
  assert.equal(Object.hasOwn(scalarRules[0], 'cssText'), false);
  assert.ok(rule.cssText.includes('transition: transform var(--mat-dialog-transition-duration, 0ms) cubic-bezier(0, 0, 0.2, 1);'));
  const longhands = Object.fromEntries(Object.entries(rule.declarations).filter(([key]) => key.startsWith('transition-')));
  assert.equal(Object.keys(longhands).length, 5);
  assert.ok(Object.values(longhands).every(d => d.value === '' && d.important === false));
  originalRecords.push({ case: caseId, inputTrees: entry.inputTrees, owner: owner.key,
    source: rule.source, cssText: rule.cssText, longhands, scalarRetainsCssText: false });
}
originalGroups.forEach((g, i) => assert.equal(originalHashers[i].digest('hex'), g.proofSha256));
const cases = [
  { id: 'literal-transform', transition: 'transform 200ms ease', expectedProperty: 'transform', expectedDuration: '0.2s', empty: false },
  { id: 'variable-fallback', transition: 'transform var(--duration, 0ms) ease', expectedProperty: 'transform', expectedDuration: '0s', empty: true },
  { id: 'variable-duration', transition: 'transform var(--duration, 0ms) ease', variable: '240ms', expectedProperty: 'transform', expectedDuration: '0.24s', empty: true },
  { id: 'variable-gap', transition: 'gap var(--duration, 0ms) ease', expectedProperty: 'gap', expectedDuration: '0s', empty: true },
  { id: 'variable-adds-gap', transition: 'transform var(--duration, 0ms) ease', variable: '0ms, gap 10s', expectedProperty: 'transform, gap', expectedDuration: '0s, 10s', empty: true },
  { id: 'override-none', transition: 'transform var(--duration, 0ms) ease', variable: '0ms, gap 10s', override: true, expectedProperty: 'none', expectedDuration: '0s', empty: true },
];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const records = [];
try {
  const page = await browser.newPage();
  for (const scenario of cases) {
    await page.setContent(`<style>.owner { transition: ${scenario.transition}; }
      ${scenario.override ? '.owner { transition: none !important; }' : ''}</style>
      <app-reference><div class="frame"><div id="owner" class="owner"
      ${scenario.variable ? `style="--duration: ${scenario.variable}"` : ''}>test</div></div></app-reference>`);
    const tree = await page.evaluate(captureBrowserInputTree, { styleProperties: ['transitionProperty', 'transitionDuration'] });
    assert.deepEqual(tree.errors, []);
    const owner = tree.nodes.find(n => n.attributes.id === 'owner'); assert.ok(owner);
    const original = tree.rules[owner.rules[0]];
    for (const key of ['transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay', 'transition-behavior']) {
      assert.ok(Object.hasOwn(original.declarations, key));
      assert.equal(original.declarations[key].value === '', scenario.empty, `${scenario.id}:${key}`);
    }
    assert.ok(original.cssText.includes(scenario.empty ? 'var(--duration, 0ms)' : '200ms'));
    assert.equal(tree.styles[owner.style].transitionProperty, scenario.expectedProperty, scenario.id);
    assert.equal(tree.styles[owner.style].transitionDuration, scenario.expectedDuration, scenario.id);
    records.push({ scenario, rules: owner.rules.map(i => tree.rules[i]), inline: owner.inline,
      computed: { transitionProperty: tree.styles[owner.style].transitionProperty,
        transitionDuration: tree.styles[owner.style].transitionDuration } });
  }
  const report = { schemaVersion: 1, kind: 'browser-cssom-motion-capture-proof', browser: browser.version(),
    parent: { file: parentFile, sha256: hash(readFileSync(parentFile)) }, capture: survey.capture,
    originalDialogCases: originalRecords,
    source: ['scripts/verify-material-motion-cssom-capture.mjs', 'tests/material-parity/input-tree-evidence.mjs'].map(file =>
      ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
    cases: records, assertionsPassed: true,
    conclusion: 'Enumerated empty transition longhands do not imply missing authored transition, no transition, or a non-gap target. Retain shorthand text and resolve variables/cascade through the browser.',
    limitation: 'Isolated browser/capture proof, not a renderer reproduction or evidence of the original dialog variable values.' };
  const target = 'docs/material-motion-cssom-capture-proof.json', output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(target, output);
  console.log(JSON.stringify({ cases: records.length, browser: report.browser, assertionsPassed: true, mode: args[0] ?? 'generate' }));
} finally { await browser.close(); }
