import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { inspectOwnerCaretInput } from '../tests/material-parity/owner-caret-input-evidence.mjs';
import { interactionLayerCursorProbe } from '../tests/material-parity/cursor-metrics.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

const options = parseSupplementalCaptureArguments(process.argv.slice(2));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const relative = file => path.relative(process.cwd(), file).replaceAll('\\', '/');
const surveyFile = 'docs/material-owner-caret-motion-review.json', surveyBytes = readFileSync(surveyFile);
const survey = JSON.parse(surveyBytes);
assert.equal(hash(readFileSync(survey.parent.file)), survey.parent.sha256);
for (const source of survey.sources)
  assert.equal(hash(readFileSync(source.file, 'utf8').replaceAll('\r\n', '\n')), source.sha256);
const groups = survey.findings.filter(g => g.disposition === 'requires-review');
assert.equal(groups.length, 10);
const wanted = new Map();
for (const group of groups) for (const observation of group.observations) {
  if (!wanted.has(observation.case)) wanted.set(observation.case, []);
  wanted.get(observation.case).push({ group, observation });
}
assert.equal([...wanted.values()].reduce((n, xs) => n + xs.length, 0), 362);
assert.equal(wanted.size, 146);
const records = readdirSync(options.checkpoint).filter(file => /^[a-f0-9]{64}\.json$/.test(file)).map(file => {
  const name = path.join(options.checkpoint, file), bytes = readFileSync(name), record = JSON.parse(bytes);
  assert.equal(record.sha256, hash(JSON.stringify(record.result)));
  const e = record.result, kind = JSON.parse(record.key).kind;
  return { entry: e, kind, case: `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`,
    source: { file: relative(name), sha256: hash(bytes) } };
}).filter(r => wanted.has(r.case));
assert.equal(records.length, wanted.size); assert.equal(new Set(records.map(r => r.case)).size, wanted.size);

const runner = 'tests/material-parity/run-material-parity.mjs', source = readFileSync(runner, 'utf8');
const parsed = ts.createSourceFile(runner, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(parsed.parseDiagnostics.length, 0);
const names = ['profileTheme', 'sendShowcaseCommand', 'waitForThemeApplied', 'settleInteraction',
  'setBenchmarkPhase', 'interactionTargetBox', 'popupHoverBox', 'performInteraction'];
const declarations = names.map(name => {
  const matches = parsed.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
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
    script: 'scripts/capture-material-caret-motion-context.mjs', styleProperties: properties });
  evidence.capture.sources.push(...[runner, 'tests/material-parity/owner-caret-input-evidence.mjs',
    'tests/material-parity/origin-alias-mapping-evidence.mjs', 'tests/material-parity/generated-node-mapping-evidence.mjs',
    'tests/material-parity/cursor-metrics.mjs', 'node_modules/typescript/lib/typescript.js'].map(file => ({ file, sha256: hash(readFileSync(file)) })));
  const results = [];
  for (const record of records) {
    const { family, profile, viewport, state, inputTrees } = record.entry;
    assert.ok(['chips', 'tabs'].includes(family)); assert.ok(['static', 'interaction'].includes(record.kind));
    const selected = wanted.get(record.case), trees = {};
    for (const item of selected) assert.deepEqual(inputTrees, item.observation.inputTrees);
    for (const side of ['reference', 'astylar']) {
      const bytes = readFileSync(inputTrees[side].file); assert.equal(hash(bytes), inputTrees[side].sha256); trees[side] = JSON.parse(bytes);
    }
    const originals = selected.map(({ group, observation }) => {
      const inputs = record.entry.styleInputs.filter(i => i.id === group.element); assert.equal(inputs.length, 1);
      const input = inputs[0]; assert.equal(hash(JSON.stringify(input)), observation.inputSha256);
      const proof = inspectOwnerCaretInput(input, trees.reference, trees.astylar, { family });
      assert.equal(hash(JSON.stringify(proof)), observation.proofSha256);
      return { element: group.element, input, proof, observation };
    });
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor, colorScheme: profile === 'dark' ? 'dark' : 'light', reducedMotion: 'reduce' });
    const finishRuntime = evidence.observe(page); let release;
    try {
      await page.goto(`${options.baseUrl}/reference/${family}?benchmark=1&profile=${profile}${record.kind === 'interaction' ? `&interaction=${state}` : ''}`, { waitUntil: 'commit' });
      await page.locator('.frame').waitFor({ state: 'visible' });
      const theme = helpers.profileTheme(profile);
      await helpers.sendShowcaseCommand(page, { type: 'showcase:theme', theme });
      await helpers.waitForThemeApplied(page, theme);
      await helpers.settleInteraction(page, 'reference');
      if (record.kind === 'interaction') {
        await helpers.setBenchmarkPhase(page, 'start');
        release = await helpers.performInteraction(page, 'reference', record.entry);
        assert.equal(typeof release, state === 'held' ? 'function' : 'undefined');
        await helpers.setBenchmarkPhase(page, state === 'held' ? 'held' : 'settled');
        await helpers.settleInteraction(page, 'reference');
      } else {
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(document.getAnimations().map(a => a.finished.catch(() => undefined)));
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        });
      }
      const fresh = await page.evaluate(captureBrowserInputTree, { styleProperties: properties });
      assert.deepEqual(fresh.errors, []);
      const owners = [];
      for (const original of originals) {
        const proof = inspectOwnerCaretInput(original.input, fresh, trees.astylar, { family });
        assert.deepEqual(proof, original.proof, `Original scalar/rule/path changed: ${record.case}/${original.element}`);
        const node = fresh.nodes.find(n => n.key === proof.referenceNode); assert.ok(node);
        const motion = Object.fromEntries(motionProperties.map(p => [p, fresh.styles[node.style][p]]));
        const context = await page.evaluate(({ key, properties }) => {
          if (!key.startsWith('frame/')) throw new Error('Unreviewed non-frame caret owner');
          let element = document.querySelector('app-reference .frame');
          for (const part of key.split('/').slice(1)) element = element?.children[Number(part)];
          if (!(element instanceof HTMLElement)) throw new Error('Missing reference owner');
          const ancestors = [];
          for (let n = element; n; n = n.parentElement) {
            const style = getComputedStyle(n);
            ancestors.push({ type: n.tagName.toLowerCase(), attributes: Object.fromEntries([...n.attributes].map(a => [a.name, a.value])),
              motion: Object.fromEntries(properties.map(p => [p, style[p]])),
              caretColor: style.caretColor, color: style.color,
              tabDurationVariable: style.getPropertyValue('--mat-tab-animation-duration').trim() });
          }
          return { ancestors, activeOwnerAnimations: document.getAnimations().filter(a => a.effect?.target === element)
            .map(a => ({ playState: a.playState, currentTime: a.currentTime, timing: a.effect.getComputedTiming() })) };
        }, { key: node.key, properties: motionProperties });
        assert.deepEqual(context.ancestors[0].attributes, node.attributes);
        assert.deepEqual(context.ancestors[0].motion, motion);
        owners.push({ element: original.element, originalObservation: original.observation,
          originalProof: original.proof, freshProof: proof, checkedOriginalScalarProperties: originalProperties.length,
          motion, context });
      }
      const runtime = await finishRuntime();
      const result = { case: record.case, kind: record.kind, family, profile, viewport, ...(state ? { state } : {}),
        checkpointRecord: record.source, originalInputTrees: inputTrees, freshReferenceTree: fresh, owners, runtime,
        heldDuringCapture: state === 'held', candidateReplayed: false, historicalMotionVerified: false, renderingEquivalent: false };
      const bytes = JSON.stringify(result), file = `${evidence.directory}/${hash(record.case)}.json`;
      writeFileSync(file, bytes, { flag: 'wx' }); results.push({ case: record.case, file, sha256: hash(bytes) });
      console.log(JSON.stringify({ case: record.case, owners: owners.map(o => ({ element: o.element, motion: o.motion,
        activeOwnerAnimations: o.context.activeOwnerAnimations.length })) }));
    } finally { if (release) await release(); await page.close(); }
  }
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify({ schemaVersion: 1,
    kind: 'original-caret-reference-motion-context-replay', capture: evidence.capture, browser: browser.version(),
    caretMotionSurvey: { file: surveyFile, sha256: hash(surveyBytes) }, motionProperties,
    reusedFunctions: names.map((name, i) => ({ name, sha256: hash(declarations[i]) })), cases: results.length,
    observations: 362, candidateReplayed: false, historicalMotionVerified: false, renderingEquivalent: false, results,
    limitation: 'Fresh reference-only motion at original static/interaction boundaries, with all 89 original scalar properties and declaration/ancestry proofs checked. Historical unrecorded motion, candidate computed behavior and rendering parity remain unproven.' }, null, 2) + '\n', { flag: 'wx' });
} finally { await browser.close(); }
