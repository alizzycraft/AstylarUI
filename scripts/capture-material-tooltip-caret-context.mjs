import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { captureReferenceRootAncestorContext } from '../tests/material-parity/reference-root-ancestor-context.mjs';
import { inspectOwnerCaretInput } from '../tests/material-parity/owner-caret-input-evidence.mjs';
import { resolveOriginAliasPair } from '../tests/material-parity/origin-alias-mapping-evidence.mjs';
import { interactionLayerCursorProbe } from '../tests/material-parity/cursor-metrics.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

const options = parseSupplementalCaptureArguments(process.argv.slice(2));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const relative = file => path.relative(process.cwd(), file).replaceAll('\\', '/');
const surveyFile = 'docs/material-owner-caret-input-survey.json', surveyBytes = readFileSync(surveyFile);
const survey = JSON.parse(surveyBytes);
for (const s of survey.sourceFingerprints)
  assert.equal(hash(readFileSync(s.file, 'utf8').replaceAll('\r\n', '\n')), s.sha256);
const groups = survey.groups.filter(g => g.family === 'tooltip' && g.element === 'tooltip-popup' &&
  g.reasonCounts['unreviewed-captured-root-context']);
assert.equal(groups.length, 1);
const wanted = new Map(groups[0].observations.map(o => [o.case, o])); assert.equal(wanted.size, 18);
const records = readdirSync(options.checkpoint).filter(f => /^[a-f0-9]{64}\.json$/.test(f)).map(file => {
  const absolute = path.join(options.checkpoint, file), bytes = readFileSync(absolute), record = JSON.parse(bytes);
  assert.equal(record.sha256, hash(JSON.stringify(record.result)));
  const kind = JSON.parse(record.key).kind, e = record.result;
  return { entry: e, kind, case: `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`,
    source: { file: relative(absolute), sha256: hash(bytes) } };
}).filter(r => wanted.has(r.case));
assert.equal(records.length, 18); assert.equal(new Set(records.map(r => r.case)).size, 18);
const runner = 'tests/material-parity/run-material-parity.mjs', source = readFileSync(runner, 'utf8');
const parsed = ts.createSourceFile(runner, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(parsed.parseDiagnostics.length, 0);
const names = ['profileTheme', 'sendShowcaseCommand', 'waitForThemeApplied', 'settleInteraction',
  'setBenchmarkPhase', 'interactionTargetBox', 'popupHoverBox', 'performInteraction'];
const functions = names.map(name => {
  const nodes = parsed.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.equal(nodes.length, 1); return nodes[0].getText(parsed);
});
const helpers = new Function('assert', 'interactionLayerCursorProbe', functions.join('\n') +
  '; return {profileTheme,sendShowcaseCommand,waitForThemeApplied,settleInteraction,setBenchmarkPhase,performInteraction};')(assert, interactionLayerCursorProbe);
const list = source.match(/const materialStyleInputProperties = Object\.freeze\(\[([\s\S]*?)\]\);/)?.[1];
assert.ok(list && /^(?:\s|'[A-Za-z]+'|,)+$/.test(list));
const originalProperties = [...list.matchAll(/'([^']+)'/g)].map(m => m[1]); assert.equal(originalProperties.length, 89);
const motionProperties = ['transitionProperty', 'transitionDuration', 'transitionDelay', 'transitionTimingFunction',
  'transitionBehavior', 'animationName', 'animationDuration', 'animationDelay', 'animationPlayState'];
const properties = [...originalProperties, ...motionProperties];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const evidence = openSupplementalCapture({ options, browser,
    script: 'scripts/capture-material-tooltip-caret-context.mjs', styleProperties: properties });
  evidence.capture.sources.push(...[runner, 'tests/material-parity/reference-root-ancestor-context.mjs',
    'tests/material-parity/owner-caret-input-evidence.mjs', 'tests/material-parity/origin-alias-mapping-evidence.mjs',
    'tests/material-parity/generated-node-mapping-evidence.mjs', 'tests/material-parity/input-equivalence-audit.mjs',
    'tests/material-parity/cursor-metrics.mjs', 'node_modules/typescript/lib/typescript.js']
    .map(file => ({ file, sha256: hash(readFileSync(file)) })));
  const results = [];
  for (const record of records) {
    const { family, profile, viewport, state, inputTrees } = record.entry, original = wanted.get(record.case);
    assert.equal(record.kind, 'interaction'); assert.equal(family, 'tooltip'); assert.ok(['hover', 'held'].includes(state));
    assert.deepEqual(inputTrees, original.inputTrees);
    const trees = Object.fromEntries(['reference', 'astylar'].map(side => {
      const bytes = readFileSync(inputTrees[side].file); assert.equal(hash(bytes), inputTrees[side].sha256);
      return [side, JSON.parse(bytes)];
    }));
    const inputs = record.entry.styleInputs.filter(i => i.id === 'tooltip-popup'); assert.equal(inputs.length, 1);
    const input = inputs[0]; assert.equal(hash(JSON.stringify(input)), original.inputSha256);
    const originalCaret = inspectOwnerCaretInput(input, trees.reference, trees.astylar, { family });
    assert.equal(hash(JSON.stringify(originalCaret)), original.proofSha256);
    const originalAlias = resolveOriginAliasPair(record.entry, trees.reference, trees.astylar, input);
    assert.equal(originalAlias.status, 'mapped');
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor, colorScheme: profile === 'dark' ? 'dark' : 'light', reducedMotion: 'reduce' });
    const finishRuntime = evidence.observe(page); let release;
    try {
      await page.goto(`${options.baseUrl}/reference/${family}?benchmark=1&profile=${profile}&interaction=${state}`, { waitUntil: 'commit' });
      await page.locator('.frame').waitFor({ state: 'visible' });
      const theme = helpers.profileTheme(profile);
      await helpers.sendShowcaseCommand(page, { type: 'showcase:theme', theme });
      await helpers.waitForThemeApplied(page, theme);
      await helpers.settleInteraction(page, 'reference');
      await helpers.setBenchmarkPhase(page, 'start');
      release = await helpers.performInteraction(page, 'reference', record.entry);
      assert.equal(typeof release, state === 'held' ? 'function' : 'undefined');
      await helpers.setBenchmarkPhase(page, state === 'held' ? 'held' : 'settled');
      await helpers.settleInteraction(page, 'reference');
      const fresh = await page.evaluate(captureBrowserInputTree, { styleProperties: properties });
      assert.deepEqual(fresh.errors, []);
      const freshCaret = inspectOwnerCaretInput(input, fresh, trees.astylar, { family });
      const freshAlias = resolveOriginAliasPair(record.entry, fresh, trees.astylar, input);
      assert.deepEqual(freshCaret, originalCaret); assert.deepEqual(freshAlias, originalAlias);
      const context = await page.evaluate(captureReferenceRootAncestorContext); assert.deepEqual(context.errors, []);
      const runtime = await finishRuntime();
      const result = { case: record.case, family, profile, viewport, state, checkpointRecord: record.source,
        originalObservation: original, originalInputTrees: inputTrees, freshReferenceTree: fresh,
        originalCaret, freshCaret, originalAlias, freshAlias, context, runtime,
        heldDuringCapture: state === 'held', checkedOriginalScalarProperties: 89,
        candidateReplayed: false, historicalExternalContextVerified: false, historicalMotionVerified: false, renderingEquivalent: false };
      const bytes = JSON.stringify(result), file = `${evidence.directory}/${hash(record.case)}.json`;
      writeFileSync(file, bytes, { flag: 'wx' }); results.push({ case: record.case, file, sha256: hash(bytes) });
      console.log(JSON.stringify({ case: record.case, heldDuringCapture: result.heldDuringCapture,
        originalCaretMatched: true, originalAliasMatched: true, contextRoots: context.roots.map(r => r.captureKey) }));
    } finally { if (release) await release(); await page.close(); }
  }
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify({ schemaVersion: 1,
    kind: 'original-tooltip-caret-reference-context-replay', capture: evidence.capture, browser: browser.version(),
    parent: { file: surveyFile, sha256: hash(surveyBytes) }, cases: results.length, motionProperties,
    reusedFunctions: names.map((name, i) => ({ name, sha256: hash(functions[i]) })),
    candidateReplayed: false, historicalExternalContextVerified: false, historicalMotionVerified: false,
    renderingEquivalent: false, results }, null, 2) + '\n', { flag: 'wx' });
} finally { await browser.close(); }
