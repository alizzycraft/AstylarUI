import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { captureReferenceRootAncestorContext } from '../tests/material-parity/reference-root-ancestor-context.mjs';
import { resolveOriginAliasPair } from '../tests/material-parity/origin-alias-mapping-evidence.mjs';
import { originalCaseKey } from '../tests/material-parity/owner-initial-style-membership.mjs';
import { interactionLayerCursorProbe } from '../tests/material-parity/cursor-metrics.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

const options = parseSupplementalCaptureArguments(process.argv.slice(2));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const relative = file => path.relative(process.cwd(), file).replaceAll('\\', '/');
const mappingFile = 'docs/material-overlay-owner-mapping-survey.json', mappingBytes = readFileSync(mappingFile);
const mappings = JSON.parse(mappingBytes);
for (const source of mappings.sourceFingerprints) assert.equal(hash(readFileSync(source.file, 'utf8').replaceAll('\r\n', '\n')), source.sha256);
const wanted = new Map(mappings.cases.map(c => [c.case, c])); assert.equal(wanted.size, 91);
const records = readdirSync(options.checkpoint).filter(file => /^[a-f0-9]{64}\.json$/.test(file)).map(file => {
  const name = path.join(options.checkpoint, file), bytes = readFileSync(name), record = JSON.parse(bytes);
  assert.equal(record.sha256, hash(JSON.stringify(record.result)));
  const kind = JSON.parse(record.key).kind, entry = { ...record.result, kind };
  return { record, entry, case: originalCaseKey(entry), source: { file: relative(name), sha256: hash(bytes) } };
}).filter(record => wanted.has(record.case));
assert.equal(records.length, 91);

// Reuse exact named declarations without executing the top-level runner or
// changing its source. The supported family/state set below bounds the paths
// that may execute; no candidate coordinate helper is used in reference mode.
const runner = 'tests/material-parity/run-material-parity.mjs', source = readFileSync(runner, 'utf8');
const parsed = ts.createSourceFile(runner, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(parsed.parseDiagnostics.length, 0);
const names = ['profileTheme', 'sendShowcaseCommand', 'waitForThemeApplied', 'settleInteraction',
  'setBenchmarkPhase', 'interactionTargetBox', 'popupHoverBox', 'performInteraction'];
const declarations = names.map(name => {
  const matches = parsed.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.equal(matches.length, 1); return matches[0].getText(parsed);
});
const helpers = new Function('assert', 'interactionLayerCursorProbe', declarations.join('\n') +
  '; return {profileTheme,sendShowcaseCommand,waitForThemeApplied,settleInteraction,setBenchmarkPhase,performInteraction};')(assert, interactionLayerCursorProbe);
const propertyList = source.match(/const materialStyleInputProperties = Object\.freeze\(\[([\s\S]*?)\]\);/)?.[1];
assert.ok(propertyList && /^(?:\s|'[A-Za-z]+'|,)+$/.test(propertyList));
const properties = [...propertyList.matchAll(/'([^']+)'/g)].map(m => m[1]); assert.equal(properties.length, 89);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const evidence = openSupplementalCapture({ options, browser,
    script: 'scripts/capture-material-original-overlay-context.mjs', styleProperties: properties });
  evidence.capture.sources.push(...[runner, 'tests/material-parity/reference-root-ancestor-context.mjs',
    'tests/material-parity/origin-alias-mapping-evidence.mjs', 'tests/material-parity/generated-node-mapping-evidence.mjs',
    'tests/material-parity/input-equivalence-audit.mjs', 'tests/material-parity/owner-initial-style-membership.mjs',
    'tests/material-parity/cursor-metrics.mjs', 'node_modules/typescript/lib/typescript.js'].map(file => ({ file, sha256: hash(readFileSync(file)) })));
  const results = [];
  for (const record of records) {
    const { family, profile, viewport, state, inputTrees } = record.entry;
    assert.equal(record.entry.kind, 'interaction');
    assert.ok(['dialog', 'bottom-sheet', 'snack-bar'].includes(family));
    assert.ok(['activate', 'activate-leave', 'activate-twice', 'open', 'open-hover-content'].includes(state));
    assert.deepEqual(inputTrees, wanted.get(record.case).inputTrees);
    const trees = {};
    for (const side of ['reference', 'astylar']) {
      const bytes = readFileSync(inputTrees[side].file); assert.equal(hash(bytes), inputTrees[side].sha256); trees[side] = JSON.parse(bytes);
    }
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor, colorScheme: profile === 'dark' ? 'dark' : 'light', reducedMotion: 'reduce' });
    const finishRuntime = evidence.observe(page);
    try {
      await page.goto(`${options.baseUrl}/reference/${family}?benchmark=1&profile=${profile}&interaction=${state}`, { waitUntil: 'commit' });
      await page.locator('.frame').waitFor({ state: 'visible' });
      const theme = helpers.profileTheme(profile);
      await helpers.sendShowcaseCommand(page, { type: 'showcase:theme', theme });
      await helpers.waitForThemeApplied(page, theme);
      await helpers.settleInteraction(page, 'reference');
      await helpers.setBenchmarkPhase(page, 'start');
      assert.equal(await helpers.performInteraction(page, 'reference', record.entry), undefined);
      await helpers.setBenchmarkPhase(page, 'settled');
      await helpers.settleInteraction(page, 'reference');
      const fresh = await page.evaluate(captureBrowserInputTree, { styleProperties: properties });
      assert.deepEqual(fresh.errors, []);
      const selected = mappings.observations.filter(o => o.case === record.case), proofs = [];
      for (const selectedOwner of selected) {
        const inputs = record.entry.styleInputs.filter(i => i.id === selectedOwner.element); assert.equal(inputs.length, 1);
        const proof = resolveOriginAliasPair(record.entry, fresh, trees.astylar, inputs[0]);
        assert.deepEqual(proof, selectedOwner.proof, `Fresh owner differs from original: ${record.case}/${selectedOwner.element}`);
        proofs.push({ element: selectedOwner.element, proof });
      }
      const context = await page.evaluate(captureReferenceRootAncestorContext); assert.deepEqual(context.errors, []);
      const runtime = await finishRuntime();
      const result = { case: record.case, family, profile, viewport, state, checkpointRecord: record.source,
        originalInputTrees: inputTrees, freshReferenceTree: fresh, context, proofs, runtime,
        candidateReplayed: false, renderingEquivalent: false,
        limitation: 'Original reference actions and mapped owner styles replayed; candidate tree is original evidence, not a fresh candidate run. This is external context evidence, not rendering parity.' };
      const bytes = JSON.stringify(result), file = `${evidence.directory}/${hash(record.case)}.json`;
      writeFileSync(file, bytes, { flag: 'wx' }); results.push({ case: record.case, file, sha256: hash(bytes) });
      console.log(JSON.stringify({ family, profile, viewport: viewport.id, state, owners: proofs.length }));
    } finally { await page.close(); }
  }
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify({ schemaVersion: 1,
    kind: 'original-overlay-reference-context-replay', capture: evidence.capture, browser: browser.version(),
    mappingSurvey: { file: mappingFile, sha256: hash(mappingBytes) },
    reusedFunctions: names.map((name, i) => ({ name, sha256: hash(declarations[i]) })),
    cases: records.length, candidateReplayed: false, renderingEquivalent: false, results }, null, 2) + '\n', { flag: 'wx' });
} finally { await browser.close(); }
