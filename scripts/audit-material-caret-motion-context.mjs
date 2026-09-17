import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { inspectOwnerCaretInput } from '../tests/material-parity/owner-caret-input-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const caretMotionCaptureFile = 'artifacts/material-parity/caret-motion-context-audit-v1/latest-report.json';
export function collectCaretMotionContext({ readBytes = readFileSync } = {}) {
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
  const bytes = read(caretMotionCaptureFile), raw = JSON.parse(bytes);
  assert.equal(raw.schemaVersion, 1); assert.equal(raw.kind, 'original-caret-reference-motion-context-replay');
  for (const flag of ['candidateReplayed', 'historicalMotionVerified', 'renderingEquivalent']) assert.equal(raw[flag], false);
  const manifest = JSON.parse(hashed(raw.capture.checkpointManifest));
  assert.equal(raw.browser, manifest.provenance.browser);
  const sources = ['scripts/capture-material-caret-motion-context.mjs',
    'tests/material-parity/supplemental-capture-evidence.mjs', 'tests/material-parity/input-tree-evidence.mjs',
    'tests/material-parity/run-material-parity.mjs', 'tests/material-parity/owner-caret-input-evidence.mjs',
    'tests/material-parity/origin-alias-mapping-evidence.mjs', 'tests/material-parity/generated-node-mapping-evidence.mjs',
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
  const survey = JSON.parse(hashed(raw.caretMotionSurvey, true));
  const parent = JSON.parse(hashed(survey.parent, true));
  for (const source of [...survey.sources, ...parent.sourceFingerprints])
    assert.equal(hash(read(source.file, true).toString('utf8').replaceAll('\r\n', '\n')), source.sha256);
  const groups = survey.findings.filter(g => g.disposition === 'requires-review'); assert.equal(groups.length, 10);
  const wanted = new Map();
  for (const group of groups) for (const observation of group.observations) {
    if (!wanted.has(observation.case)) wanted.set(observation.case, []);
    wanted.get(observation.case).push({ group, observation });
  }
  assert.equal(wanted.size, 146); assert.equal(raw.cases, 146); assert.equal(raw.observations, 362);
  assert.deepEqual(raw.results.map(r => r.case).sort(), [...wanted.keys()].sort());
  const assets = new Map(manifest.provenance.browserFiles.map(f => [f.file, f.sha256]));
  const rows = [];
  for (const descriptor of raw.results) {
    const result = JSON.parse(hashed(descriptor)), record = JSON.parse(hashed(result.checkpointRecord));
    assert.equal(record.sha256, hash(JSON.stringify(record.result)));
    const entry = record.result, kind = JSON.parse(record.key).kind;
    assert.ok(['static', 'interaction'].includes(kind)); assert.equal(result.kind, kind);
    assert.equal(`${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`, descriptor.case);
    assert.equal(result.case, descriptor.case);
    for (const p of ['family', 'profile', 'viewport', 'state']) assert.deepEqual(result[p], entry[p]);
    assert.ok(['chips', 'tabs'].includes(result.family)); assert.deepEqual(result.originalInputTrees, entry.inputTrees);
    assert.equal(result.heldDuringCapture, entry.state === 'held');
    for (const flag of ['candidateReplayed', 'historicalMotionVerified', 'renderingEquivalent']) assert.equal(result[flag], false);
    assert.deepEqual(result.runtime.errors, []);
    for (const asset of result.runtime.assets) { assert.ok(assets.has(asset.file)); assert.equal(asset.sha256, assets.get(asset.file)); }
    for (const type of ['document', 'script', 'stylesheet', 'font']) assert.ok(result.runtime.assets.some(a => a.type === type));
    const reference = JSON.parse(hashed(entry.inputTrees.reference)), candidate = JSON.parse(hashed(entry.inputTrees.astylar));
    const selected = wanted.get(result.case);
    assert.deepEqual(result.owners.map(o => o.element), selected.map(s => s.group.element));
    for (let i = 0; i < selected.length; i++) {
      const { group, observation } = selected[i], owner = result.owners[i];
      assert.deepEqual(entry.inputTrees, observation.inputTrees); assert.deepEqual(owner.originalObservation, observation);
      const inputs = entry.styleInputs.filter(i => i.id === owner.element); assert.equal(inputs.length, 1);
      const input = inputs[0]; assert.equal(hash(JSON.stringify(input)), observation.inputSha256);
      const original = inspectOwnerCaretInput(input, reference, candidate, { family: entry.family });
      assert.equal(hash(JSON.stringify(original)), observation.proofSha256);
      const fresh = inspectOwnerCaretInput(input, result.freshReferenceTree, candidate, { family: entry.family });
      assert.deepEqual(fresh, original);
      // The on-disk proofs use JSON's representation: undefined object fields
      // (the synthetic candidate root's type) are absent. Compare that exact
      // wire representation without changing either live proof or input tree.
      assert.deepEqual(owner.originalProof, JSON.parse(JSON.stringify(original)));
      assert.deepEqual(owner.freshProof, JSON.parse(JSON.stringify(fresh)));
      assert.equal(owner.checkedOriginalScalarProperties, 89);
      const node = result.freshReferenceTree.nodes.find(n => n.key === fresh.referenceNode); assert.ok(node);
      const motion = Object.fromEntries(properties.map(p => [p, result.freshReferenceTree.styles[node.style][p]]));
      assert.ok(Object.values(motion).every(v => typeof v === 'string' && v.length)); assert.deepEqual(owner.motion, motion);
      const ancestors = owner.context.ancestors, chain = [...fresh.referencePath].reverse();
      assert.ok(ancestors.length > chain.length);
      assert.equal(ancestors.at(-1).type, 'html'); assert.equal(ancestors.at(-2).type, 'body');
      for (let j = 0; j < chain.length; j++) {
        const n = result.freshReferenceTree.nodes.find(n => n.key === chain[j].key), style = result.freshReferenceTree.styles[n.style];
        assert.equal(ancestors[j].type, n.type); assert.deepEqual(ancestors[j].attributes, n.attributes);
        assert.deepEqual(ancestors[j].motion, Object.fromEntries(properties.map(p => [p, style[p]])));
        assert.equal(ancestors[j].caretColor, style.caretColor); assert.equal(ancestors[j].color, style.color);
      }
      for (const ancestor of ancestors) {
        assert.equal(typeof ancestor.tabDurationVariable, 'string');
        assert.ok(Object.values(ancestor.motion).every(v => typeof v === 'string' && v.length));
      }
      assert.ok(Array.isArray(owner.context.activeOwnerAnimations));
      const requestNodes = [...new Set(original.requests.reference.map(r => r.node))];
      const motionRequestOwners = requestNodes.map(key => {
        const n = result.freshReferenceTree.nodes.find(n => n.key === key); assert.ok(n);
        assert.ok(chain.some(p => p.key === key), 'motion request must belong to captured owner ancestry');
        const style = result.freshReferenceTree.styles[n.style];
        return { key, type: n.type, sources: original.requests.reference.filter(r => r.node === key).map(r => r.source),
          motion: Object.fromEntries(properties.map(p => [p, style[p]])), caretColor: style.caretColor, color: style.color };
      });
      rows.push({ case: result.case, source: descriptor, element: owner.element, family: group.family,
        profile: result.profile, viewport: result.viewport, state: result.state ?? 'static',
        checkedOriginalScalarProperties: 89, motion, caretColor: ancestors[0].caretColor, color: ancestors[0].color,
        tabDurationVariable: ancestors[0].tabDurationVariable, motionRequestOwners,
        activeOwnerAnimations: owner.context.activeOwnerAnimations });
    }
  }
  assert.equal(rows.length, 362);
  return { schemaVersion: 1, kind: 'original-caret-reference-motion-context-survey',
    capture: { file: caretMotionCaptureFile, sha256: hash(bytes) }, browser: raw.browser,
    cases: raw.cases, observations: rows.length,
    checkedOriginalScalarProperties: rows.reduce((n, r) => n + r.checkedOriginalScalarProperties, 0),
    noTransitionTargetObservations: rows.filter(r => r.motion.transitionProperty === 'none').length,
    allTransitionTargetObservations: rows.filter(r => r.motion.transitionProperty === 'all').length,
    noAnimationNameObservations: rows.filter(r => r.motion.animationName === 'none').length,
    noActiveOwnerAnimationObservations: rows.filter(r => !r.activeOwnerAnimations.length).length,
    observationsByCase: rows, canonicalAttributionChanged: false, candidateReplayed: false,
    historicalMotionVerified: false, renderingEquivalent: false,
    limitation: 'Fresh reference-only motion at the original boundaries. Original unrecorded motion and candidate computed styles are not inferred; all transition targets remain meaningful even when no animation is active at capture.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectCaretMotionContext();
  report.sourceFingerprints = ['scripts/audit-material-caret-motion-context.mjs', 'tests/material-parity/owner-caret-input-evidence.mjs']
    .map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) }));
  const target = 'docs/material-caret-motion-context-survey.json', output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(target, output);
  const { observationsByCase, sourceFingerprints, ...summary } = report;
  console.log(JSON.stringify(summary));
}
