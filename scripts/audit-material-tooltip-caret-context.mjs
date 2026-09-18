import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { inspectOwnerCaretInput } from '../tests/material-parity/owner-caret-input-evidence.mjs';
import { resolveOriginAliasPair } from '../tests/material-parity/origin-alias-mapping-evidence.mjs';
import { bindOwnerCaretNormalization } from '../tests/material-parity/owner-caret-source-binding.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const tooltipCaretCaptureFile = 'artifacts/material-parity/tooltip-caret-context-audit-v1/latest-report.json';
export const tooltipCaretSurveyFile = 'docs/material-tooltip-caret-context-survey.json';
export function collectTooltipCaretContext({ readBytes = readFileSync } = {}) {
  const root = process.cwd();
  const inside = (base, file) => { const p = path.relative(base, file); return p && p !== '..' && !p.startsWith(`..${path.sep}`) && !path.isAbsolute(p); };
  const read = (file, source = false) => {
    const base = path.resolve(root, source ? '.' : 'artifacts/material-parity'), absolute = path.resolve(root, file);
    assert.ok(inside(base, absolute));
    if (readBytes === readFileSync) assert.ok(inside(realpathSync(base), realpathSync(absolute)));
    return readBytes(absolute);
  };
  const hashed = (d, source = false) => {
    assert.match(d?.sha256 ?? '', /^[a-f0-9]{64}$/);
    const bytes = read(d.file, source); assert.equal(hash(bytes), d.sha256, d.file); return bytes;
  };
  const bytes = read(tooltipCaretCaptureFile), raw = JSON.parse(bytes);
  assert.equal(raw.schemaVersion, 1); assert.equal(raw.kind, 'original-tooltip-caret-reference-context-replay');
  const flags = ['candidateReplayed', 'historicalExternalContextVerified', 'historicalMotionVerified', 'renderingEquivalent'];
  for (const f of flags) assert.equal(raw[f], false);
  const manifest = JSON.parse(hashed(raw.capture.checkpointManifest));
  assert.equal(raw.browser, manifest.provenance.browser);
  const sources = ['scripts/capture-material-tooltip-caret-context.mjs',
    'tests/material-parity/supplemental-capture-evidence.mjs', 'tests/material-parity/input-tree-evidence.mjs',
    'tests/material-parity/run-material-parity.mjs', 'tests/material-parity/reference-root-ancestor-context.mjs',
    'tests/material-parity/owner-caret-input-evidence.mjs', 'tests/material-parity/origin-alias-mapping-evidence.mjs',
    'tests/material-parity/generated-node-mapping-evidence.mjs', 'tests/material-parity/input-equivalence-audit.mjs',
    'tests/material-parity/cursor-metrics.mjs', 'node_modules/typescript/lib/typescript.js'];
  assert.deepEqual(raw.capture.sources.map(s => s.file), sources);
  const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';
  const historicalRevision = '42fd47312ed6acc093d55eeced5e86b595a4d364';
  const historicalSource = execFileSync('git', ['show', `${historicalRevision}:${moduleFile}`],
    { maxBuffer: 4 * 1024 * 1024 });
  for (const s of raw.capture.sources) {
    if (s.file === moduleFile) assert.equal(hash(historicalSource), s.sha256, 'historical tooltip audit source changed');
    else hashed(s, true);
  }
  const historicalAuditSource = { file: moduleFile, revision: historicalRevision,
    recorded: hash(historicalSource), current: hash(read(moduleFile, true)),
    historicalReceiptPreserved: true, currentNormalizationVerified: true };
  const runner = read(sources[3], true).toString('utf8');
  const parsed = ts.createSourceFile(sources[3], runner, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const names = ['profileTheme', 'sendShowcaseCommand', 'waitForThemeApplied', 'settleInteraction',
    'setBenchmarkPhase', 'interactionTargetBox', 'popupHoverBox', 'performInteraction'];
  assert.deepEqual(raw.reusedFunctions.map(f => f.name), names);
  for (const f of raw.reusedFunctions) {
    const matches = parsed.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === f.name);
    assert.equal(matches.length, 1); assert.equal(hash(matches[0].getText(parsed)), f.sha256);
  }
  const motion = ['transitionProperty', 'transitionDuration', 'transitionDelay', 'transitionTimingFunction',
    'transitionBehavior', 'animationName', 'animationDuration', 'animationDelay', 'animationPlayState'];
  assert.deepEqual(raw.motionProperties, motion);
  const list = runner.match(/const materialStyleInputProperties = Object\.freeze\(\[([\s\S]*?)\]\);/)?.[1];
  assert.ok(list && /^(?:\s|'[A-Za-z]+'|,)+$/.test(list));
  const originalProperties = [...list.matchAll(/'([^']+)'/g)].map(m => m[1]); assert.equal(originalProperties.length, 89);
  assert.deepEqual(raw.capture.styleProperties, [...originalProperties, ...motion]);
  const parent = JSON.parse(hashed(raw.parent, true));
  bindOwnerCaretNormalization(read(parent.productionNormalization.module, true).toString('utf8'), parent.productionNormalization);
  const parentSourceChecks = parent.sourceFingerprints.map(s => {
    const current = hash(read(s.file, true).toString('utf8').replaceAll('\r\n', '\n'));
    const normalization = s.file === parent.productionNormalization.module;
    if (!normalization) assert.equal(current, s.sha256, s.file);
    return { file: s.file, recorded: s.sha256, current,
      verification: normalization ? 'exact-executed-normalization-functions' : 'complete-source' };
  });
  const groups = parent.groups.filter(g => g.family === 'tooltip' && g.element === 'tooltip-popup' &&
    g.reasonCounts['unreviewed-captured-root-context']);
  assert.equal(groups.length, 1); const wanted = new Map(groups[0].observations.map(o => [o.case, o]));
  assert.equal(wanted.size, 18); assert.equal(raw.cases, 18);
  assert.deepEqual(raw.results.map(r => r.case).sort(), [...wanted.keys()].sort());
  const assets = new Map(manifest.provenance.browserFiles.map(a => [a.file, a.sha256]));
  const rows = [], missingAliases = new Set(); let rootProperties = 0;
  for (const descriptor of raw.results) {
    const result = JSON.parse(hashed(descriptor)), record = JSON.parse(hashed(result.checkpointRecord));
    assert.equal(record.sha256, hash(JSON.stringify(record.result))); assert.equal(JSON.parse(record.key).kind, 'interaction');
    const e = record.result, key = `interaction:${e.family}@${e.profile}/${e.viewport.id}/${e.state}`;
    assert.equal(key, descriptor.case); assert.equal(result.case, key); assert.equal(e.family, 'tooltip');
    for (const p of ['family', 'profile', 'viewport', 'state']) assert.deepEqual(result[p], e[p]);
    assert.ok(['hover', 'held'].includes(e.state)); assert.equal(result.heldDuringCapture, e.state === 'held');
    for (const f of flags) assert.equal(result[f], false);
    const original = wanted.get(key); assert.deepEqual(result.originalObservation, original);
    assert.deepEqual(result.originalInputTrees, e.inputTrees); assert.deepEqual(original.inputTrees, e.inputTrees);
    assert.deepEqual(result.runtime.errors, []);
    for (const a of result.runtime.assets) { assert.ok(assets.has(a.file)); assert.equal(a.sha256, assets.get(a.file)); }
    for (const type of ['document', 'script', 'stylesheet', 'font']) assert.ok(result.runtime.assets.some(a => a.type === type));
    const reference = JSON.parse(hashed(e.inputTrees.reference)), candidate = JSON.parse(hashed(e.inputTrees.astylar));
    const inputs = e.styleInputs.filter(i => i.id === 'tooltip-popup'); assert.equal(inputs.length, 1);
    const input = inputs[0]; assert.equal(hash(JSON.stringify(input)), original.inputSha256);
    const caret = inspectOwnerCaretInput(input, reference, candidate, { family: e.family });
    assert.equal(hash(JSON.stringify(caret)), original.proofSha256);
    const alias = resolveOriginAliasPair(e, reference, candidate, input); assert.equal(alias.status, 'mapped');
    assert.deepEqual(inspectOwnerCaretInput(input, result.freshReferenceTree, candidate, { family: e.family }), caret);
    assert.deepEqual(resolveOriginAliasPair(e, result.freshReferenceTree, candidate, input), alias);
    for (const p of ['originalCaret', 'freshCaret']) assert.deepEqual(result[p], JSON.parse(JSON.stringify(caret)));
    for (const p of ['originalAlias', 'freshAlias']) assert.deepEqual(result[p], JSON.parse(JSON.stringify(alias)));
    assert.equal(result.checkedOriginalScalarProperties, 89);
    const context = result.context, nodes = new Map(context.nodes.map(n => [n.key, n]));
    assert.equal(context.schemaVersion, 1); assert.equal(context.kind, 'supplemental-reference-root-ancestor-context');
    assert.deepEqual(context.errors, []); assert.equal(nodes.size, context.nodes.length);
    assert.deepEqual(context.viewport, { width: e.viewport.width, height: e.viewport.height, deviceScaleFactor: e.viewport.deviceScaleFactor });
    const url = new URL(context.documentUrl); assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
    assert.equal(url.pathname, '/reference/tooltip');
    assert.deepEqual([...url.searchParams], [['benchmark', '1'], ['profile', e.profile], ['interaction', e.state]]);
    assert.ok(context.sheets.length && context.sheets.every(s => Array.isArray(s.rules)));
    const roots = result.freshReferenceTree.nodes.filter(n => n.parent === null);
    assert.deepEqual(context.roots.map(r => r.captureKey), roots.map(n => n.key));
    assert.deepEqual(roots.map(n => n.key), ['frame', 'overlay:0']);
    for (const r of context.roots) {
      assert.equal(r.node, r.ancestry[0]); assert.equal(new Set(r.ancestry).size, r.ancestry.length);
      for (let i = 0; i < r.ancestry.length; i++) {
        const n = nodes.get(r.ancestry[i]); assert.ok(n); assert.equal(n.parent, r.ancestry[i + 1] ?? null);
      }
      assert.equal(nodes.get(r.ancestry.at(-1)).type, 'html');
      const n = nodes.get(r.node), treeNode = roots.find(n => n.key === r.captureKey);
      assert.equal(n.type, treeNode.type); assert.deepEqual(n.attributes, treeNode.attributes);
      for (const [property, value] of Object.entries(result.freshReferenceTree.styles[treeNode.style])) {
        const css = property.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
        if (!Object.hasOwn(n.computed, css)) { missingAliases.add(property); continue; }
        assert.equal(n.computed[css], value); rootProperties++;
      }
    }
    const ownerPath = alias.referencePath.map(key => {
      const n = result.freshReferenceTree.nodes.find(n => n.key === key); assert.ok(n);
      const style = result.freshReferenceTree.styles[n.style];
      const properties = Object.fromEntries(motion.map(p => [p, style[p]]));
      assert.ok(Object.values(properties).every(v => typeof v === 'string' && v.length));
      return { node: key, type: n.type, attributes: n.attributes, motion: properties,
        caretColor: style.caretColor, color: style.color };
    });
    const overlay = context.roots.find(r => r.captureKey === alias.referencePath.at(-1)); assert.ok(overlay);
    rows.push({ case: key, source: descriptor, inputTrees: e.inputTrees, originalProofSha256: original.proofSha256,
      profile: e.profile, viewport: e.viewport, state: e.state, heldDuringCapture: result.heldDuringCapture,
      checkedOriginalScalarProperties: 89, freshOwnerPath: ownerPath,
      freshExternalContext: overlay.ancestry.map(key => {
        const n = nodes.get(key); return { node: key, parent: n.parent, type: n.type, attributes: n.attributes,
          caretColor: n.computed['caret-color'], color: n.computed.color,
          transform: n.computed.transform, translate: n.computed.translate, scale: n.computed.scale,
          rotate: n.computed.rotate, zoom: n.computed.zoom, fontSize: n.computed['font-size'],
          lineHeight: n.computed['line-height'] };
      }) });
  }
  return { schemaVersion: 1, kind: 'original-tooltip-caret-reference-context-survey',
    parentSourceChecks, historicalAuditSource,
    capture: { file: tooltipCaretCaptureFile, sha256: hash(bytes) }, browser: raw.browser,
    cases: rows.length, originalScalarChecks: rows.length * 89, rootProperties,
    missingEnumeratedAliases: [...missingAliases].sort(), observations: rows,
    canonicalAttributionChanged: false, ...Object.fromEntries(flags.map(f => [f, false])),
    limitation: 'Fresh reference-only external context and owner motion at original hover/held boundaries. Original scalar/identity proofs match, but unrecorded historical motion/ancestry and candidate computed/visible behavior remain unproven.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectTooltipCaretContext();
  report.sourceFingerprints = ['scripts/audit-material-tooltip-caret-context.mjs',
    'tests/material-parity/owner-caret-input-evidence.mjs', 'tests/material-parity/origin-alias-mapping-evidence.mjs',
    'tests/material-parity/owner-caret-source-binding.mjs']
    .map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) }));
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(tooltipCaretSurveyFile, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(tooltipCaretSurveyFile, output);
  const { observations, sourceFingerprints, ...summary } = report; console.log(JSON.stringify(summary));
}
