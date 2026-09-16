import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { resolveOriginAliasPair } from '../tests/material-parity/origin-alias-mapping-evidence.mjs';
import { interactionLayerCursorProbe } from '../tests/material-parity/cursor-metrics.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

const options = parseSupplementalCaptureArguments(process.argv.slice(2));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const relative = file => path.relative(process.cwd(), file).replaceAll('\\', '/');
const surveyFile = 'docs/material-owner-gap-input-survey.json', surveyBytes = readFileSync(surveyFile);
const survey = JSON.parse(surveyBytes);
for (const source of survey.sourceFingerprints)
  assert.equal(hash(readFileSync(source.file, 'utf8').replaceAll('\r\n', '\n')), source.sha256);
const groups = survey.groups.filter(g => g.family === 'dialog' && g.element === 'dialog-panel');
assert.equal(groups.length, 2); assert.deepEqual(groups[0].originalCases, groups[1].originalCases);
const wanted = new Set(groups[0].originalCases); assert.equal(wanted.size, 32);
const records = readdirSync(options.checkpoint).filter(file => /^[a-f0-9]{64}\.json$/.test(file)).map(file => {
  const name = path.join(options.checkpoint, file), bytes = readFileSync(name), record = JSON.parse(bytes);
  assert.equal(record.sha256, hash(JSON.stringify(record.result)));
  const e = record.result, kind = JSON.parse(record.key).kind;
  return { entry: e, kind, case: `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`,
    source: { file: relative(name), sha256: hash(bytes) } };
}).filter(r => wanted.has(r.case));
assert.equal(records.length, 32); assert.equal(new Set(records.map(r => r.case)).size, 32);

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
const originalProperties = [...propertyList.matchAll(/'([^']+)'/g)].map(m => m[1]); assert.equal(originalProperties.length, 89);
const motionProperties = ['transitionProperty', 'transitionDuration', 'transitionDelay', 'transitionTimingFunction',
  'transitionBehavior', 'animationName', 'animationDuration', 'animationDelay', 'animationPlayState'];
const properties = [...originalProperties, ...motionProperties];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const evidence = openSupplementalCapture({ options, browser,
    script: 'scripts/capture-material-dialog-motion-context.mjs', styleProperties: properties });
  evidence.capture.sources.push(...[runner, 'tests/material-parity/origin-alias-mapping-evidence.mjs',
    'tests/material-parity/generated-node-mapping-evidence.mjs', 'tests/material-parity/input-equivalence-audit.mjs',
    'tests/material-parity/cursor-metrics.mjs', 'node_modules/typescript/lib/typescript.js'].map(file => ({ file, sha256: hash(readFileSync(file)) })));
  const results = [];
  for (const record of records) {
    const { family, profile, viewport, state, inputTrees } = record.entry;
    assert.equal(family, 'dialog'); assert.equal(record.kind, 'interaction');
    assert.ok(['activate', 'activate-leave', 'open', 'open-hover-content'].includes(state));
    const membership = survey.cases.find(c => c.case === record.case); assert.deepEqual(inputTrees, membership.inputTrees);
    const trees = {};
    for (const side of ['reference', 'astylar']) {
      const bytes = readFileSync(inputTrees[side].file); assert.equal(hash(bytes), inputTrees[side].sha256); trees[side] = JSON.parse(bytes);
    }
    const inputs = record.entry.styleInputs.filter(i => i.id === 'dialog-panel'); assert.equal(inputs.length, 1);
    const originalProof = resolveOriginAliasPair(record.entry, trees.reference, trees.astylar, inputs[0]);
    assert.equal(originalProof.status, 'mapped');
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
      const freshProof = resolveOriginAliasPair(record.entry, fresh, trees.astylar, inputs[0]);
      assert.deepEqual(freshProof, originalProof, `Original owner/scalars changed: ${record.case}`);
      const owner = fresh.nodes.find(n => n.key === freshProof.referenceNode); assert.ok(owner);
      const motion = Object.fromEntries(motionProperties.map(p => [p, fresh.styles[owner.style][p]]));
      const context = await page.evaluate(() => {
        const owners = [...document.querySelectorAll('.mat-mdc-dialog-surface')];
        if (owners.length !== 1) throw new Error('Ambiguous dialog surface');
        const element = owners[0], chain = [];
        for (let node = element; node; node = node.parentElement) {
          const style = getComputedStyle(node);
          chain.push({ type: node.tagName.toLowerCase(), attributes: Object.fromEntries([...node.attributes].map(a => [a.name, a.value])),
            computedDurationVariable: style.getPropertyValue('--mat-dialog-transition-duration').trim(),
            inlineDurationVariable: node.style.getPropertyValue('--mat-dialog-transition-duration').trim() });
        }
        return { ancestors: chain, activeOwnerAnimations: document.getAnimations().filter(a => a.effect?.target === element)
          .map(a => ({ playState: a.playState, currentTime: a.currentTime, timing: a.effect.getComputedTiming() })) };
      });
      assert.deepEqual(context.ancestors[0].attributes, owner.attributes);
      const runtime = await finishRuntime();
      const result = { case: record.case, family, profile, viewport, state, checkpointRecord: record.source,
        originalInputTrees: inputTrees, originalProof, freshProof, freshReferenceTree: fresh, motion, context, runtime,
        candidateReplayed: false, historicalMotionVerified: false, renderingEquivalent: false };
      const bytes = JSON.stringify(result), file = `${evidence.directory}/${hash(record.case)}.json`;
      writeFileSync(file, bytes, { flag: 'wx' }); results.push({ case: record.case, file, sha256: hash(bytes) });
      console.log(JSON.stringify({ case: record.case, motion }));
    } finally { await page.close(); }
  }
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify({ schemaVersion: 1,
    kind: 'original-dialog-reference-motion-context-replay', capture: evidence.capture, browser: browser.version(),
    gapSurvey: { file: surveyFile, sha256: hash(surveyBytes) }, motionProperties,
    reusedFunctions: names.map((name, i) => ({ name, sha256: hash(declarations[i]) })),
    cases: results.length, candidateReplayed: false, historicalMotionVerified: false, renderingEquivalent: false, results,
    limitation: 'Fresh reference motion under original actions/assets with all 89 original owner scalars verified. Original unrecorded motion and candidate computed behavior remain unproven.' }, null, 2) + '\n', { flag: 'wx' });
} finally { await browser.close(); }
