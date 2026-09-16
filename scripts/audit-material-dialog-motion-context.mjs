import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { resolveOriginAliasPair } from '../tests/material-parity/origin-alias-mapping-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const dialogMotionCaptureFile = 'artifacts/material-parity/dialog-motion-current-ancestry-audit/latest-report.json';
export function collectDialogMotionContext({ readBytes = readFileSync } = {}) {
  const root = process.cwd();
  const inside = (base, file) => { const r = path.relative(base, file); return r && r !== '..' && !r.startsWith(`..${path.sep}`) && !path.isAbsolute(r); };
  const read = (file, source = false) => {
    const base = path.resolve(root, source ? '.' : 'artifacts/material-parity'), absolute = path.resolve(root, file);
    assert.ok(inside(base, absolute));
    if (readBytes === readFileSync) assert.ok(inside(realpathSync(base), realpathSync(absolute)));
    return readBytes(absolute);
  };
  const hashed = (descriptor, source = false) => {
    assert.match(descriptor?.sha256 ?? '', /^[a-f0-9]{64}$/);
    const bytes = read(descriptor.file, source); assert.equal(hash(bytes), descriptor.sha256, descriptor.file); return bytes;
  };
  const bytes = read(dialogMotionCaptureFile), raw = JSON.parse(bytes);
  assert.equal(raw.schemaVersion, 1); assert.equal(raw.kind, 'original-dialog-reference-motion-context-replay');
  for (const flag of ['candidateReplayed', 'historicalMotionVerified', 'renderingEquivalent']) assert.equal(raw[flag], false);
  const manifest = JSON.parse(hashed(raw.capture.checkpointManifest));
  assert.equal(raw.browser, manifest.provenance.browser);
  const sources = ['scripts/capture-material-dialog-motion-context.mjs',
    'tests/material-parity/supplemental-capture-evidence.mjs', 'tests/material-parity/input-tree-evidence.mjs',
    'tests/material-parity/run-material-parity.mjs', 'tests/material-parity/origin-alias-mapping-evidence.mjs',
    'tests/material-parity/generated-node-mapping-evidence.mjs', 'tests/material-parity/input-equivalence-audit.mjs',
    'tests/material-parity/cursor-metrics.mjs', 'node_modules/typescript/lib/typescript.js'];
  assert.deepEqual(raw.capture.sources.map(s => s.file), sources); raw.capture.sources.forEach(s => hashed(s, true));
  const runner = read(sources[3], true).toString('utf8');
  const parsed = ts.createSourceFile(sources[3], runner, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const names = ['profileTheme', 'sendShowcaseCommand', 'waitForThemeApplied', 'settleInteraction',
    'setBenchmarkPhase', 'interactionTargetBox', 'popupHoverBox', 'performInteraction'];
  assert.deepEqual(raw.reusedFunctions.map(f => f.name), names);
  for (const fn of raw.reusedFunctions) {
    const matches = parsed.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === fn.name);
    assert.equal(matches.length, 1); assert.equal(hash(matches[0].getText(parsed)), fn.sha256);
  }
  const properties = ['transitionProperty', 'transitionDuration', 'transitionDelay', 'transitionTimingFunction',
    'transitionBehavior', 'animationName', 'animationDuration', 'animationDelay', 'animationPlayState'];
  assert.deepEqual(raw.motionProperties, properties);
  const propertyList = runner.match(/const materialStyleInputProperties = Object\.freeze\(\[([\s\S]*?)\]\);/)?.[1];
  assert.ok(propertyList && /^(?:\s|'[A-Za-z]+'|,)+$/.test(propertyList));
  const originalProperties = [...propertyList.matchAll(/'([^']+)'/g)].map(m => m[1]); assert.equal(originalProperties.length, 89);
  assert.deepEqual(raw.capture.styleProperties, [...originalProperties, ...properties]);
  const survey = JSON.parse(hashed(raw.gapSurvey, true));
  const groups = survey.groups.filter(g => g.family === 'dialog' && g.element === 'dialog-panel');
  assert.equal(groups.length, 2); assert.deepEqual(groups[0].originalCases, groups[1].originalCases);
  assert.equal(raw.cases, 32); assert.equal(groups[0].originalCases.length, 32);
  assert.deepEqual(raw.results.map(r => r.case).sort(), [...groups[0].originalCases].sort());
  const assets = new Map(manifest.provenance.browserFiles.map(f => [f.file, f.sha256]));
  const rows = [];
  for (const descriptor of raw.results) {
    const result = JSON.parse(hashed(descriptor)), record = JSON.parse(hashed(result.checkpointRecord));
    assert.equal(record.sha256, hash(JSON.stringify(record.result)));
    assert.equal(JSON.parse(record.key).kind, 'interaction');
    const entry = record.result;
    assert.equal(`interaction:${entry.family}@${entry.profile}/${entry.viewport.id}/${entry.state}`, descriptor.case);
    assert.equal(result.case, descriptor.case);
    for (const p of ['family', 'profile', 'viewport', 'state']) assert.deepEqual(result[p], entry[p]);
    assert.equal(result.family, 'dialog'); assert.deepEqual(result.originalInputTrees, entry.inputTrees);
    assert.deepEqual(entry.inputTrees, survey.cases.find(c => c.case === result.case).inputTrees);
    for (const flag of ['candidateReplayed', 'historicalMotionVerified', 'renderingEquivalent']) assert.equal(result[flag], false);
    assert.deepEqual(result.runtime.errors, []);
    for (const asset of result.runtime.assets) { assert.ok(assets.has(asset.file)); assert.equal(asset.sha256, assets.get(asset.file)); }
    for (const type of ['document', 'script', 'stylesheet', 'font']) assert.ok(result.runtime.assets.some(a => a.type === type));
    const reference = JSON.parse(hashed(entry.inputTrees.reference)), candidate = JSON.parse(hashed(entry.inputTrees.astylar));
    const inputs = entry.styleInputs.filter(i => i.id === 'dialog-panel'); assert.equal(inputs.length, 1);
    const original = resolveOriginAliasPair(entry, reference, candidate, inputs[0]); assert.equal(original.status, 'mapped');
    const fresh = resolveOriginAliasPair(entry, result.freshReferenceTree, candidate, inputs[0]);
    assert.deepEqual(fresh, original); assert.deepEqual(result.originalProof, original); assert.deepEqual(result.freshProof, fresh);
    const owner = result.freshReferenceTree.nodes.find(n => n.key === fresh.referenceNode);
    const motion = Object.fromEntries(properties.map(p => [p, result.freshReferenceTree.styles[owner.style][p]]));
    assert.ok(Object.values(motion).every(v => typeof v === 'string' && v.length)); assert.deepEqual(result.motion, motion);
    const ancestors = result.context.ancestors;
    assert.ok(ancestors.length > fresh.referencePath.length);
    assert.equal(ancestors.at(-1).type, 'html'); assert.equal(ancestors.at(-2).type, 'body');
    fresh.referencePath.forEach((key, i) => {
      const node = result.freshReferenceTree.nodes.find(n => n.key === key);
      assert.equal(ancestors[i].type, node.type); assert.deepEqual(ancestors[i].attributes, node.attributes);
    });
    for (const node of ancestors) for (const p of ['computedDurationVariable', 'inlineDurationVariable']) assert.equal(typeof node[p], 'string');
    assert.ok(Array.isArray(result.context.activeOwnerAnimations));
    rows.push({ case: result.case, source: descriptor, profile: result.profile, viewport: result.viewport, state: result.state,
      checkedOriginalScalarProperties: fresh.checkedReferenceProperties, motion,
      durationVariable: ancestors[0].computedDurationVariable,
      inlineVariableOwners: ancestors.filter(n => n.inlineDurationVariable).map(n => ({ type: n.type, value: n.inlineDurationVariable })),
      activeOwnerAnimations: result.context.activeOwnerAnimations });
  }
  return { schemaVersion: 1, kind: 'original-dialog-reference-motion-context-survey',
    capture: { file: dialogMotionCaptureFile, sha256: hash(bytes) }, browser: raw.browser,
    cases: rows.length, checkedOriginalScalarProperties: rows.reduce((n, r) => n + r.checkedOriginalScalarProperties, 0),
    noTransitionTargetCases: rows.filter(r => r.motion.transitionProperty === 'none').length,
    noAnimationNameCases: rows.filter(r => r.motion.animationName === 'none').length,
    noActiveOwnerAnimationCases: rows.filter(r => r.activeOwnerAnimations.length === 0).length,
    observations: rows, canonicalAttributionChanged: false, candidateReplayed: false,
    historicalMotionVerified: false, renderingEquivalent: false,
    limitation: 'Fresh reference-only resolved motion at original settled states. Original unrecorded motion, candidate computed defaults, input equivalence and rendering parity are not established.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2); assert.ok(args.length === 0 || args.length === 1 && args[0] === '--check');
  const report = collectDialogMotionContext();
  report.sourceFingerprints = ['scripts/audit-material-dialog-motion-context.mjs', 'tests/material-parity/origin-alias-mapping-evidence.mjs']
    .map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) }));
  const target = 'docs/material-dialog-motion-context-survey.json', output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(target, output);
  console.log(JSON.stringify({ cases: report.cases, checkedOriginalScalarProperties: report.checkedOriginalScalarProperties,
    noTransitionTargetCases: report.noTransitionTargetCases, noAnimationNameCases: report.noAnimationNameCases,
    noActiveOwnerAnimationCases: report.noActiveOwnerAnimationCases }));
}
