import assert from 'node:assert/strict';
import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import ts from 'typescript';
import { restoreMappingReadAdapterSource } from './audit-evidence-session.mjs';
import { originalCaseKey } from './owner-initial-style-membership.mjs';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { originalOverlayAuditSourceFile, verifyHistoricalAuditModuleSource,
  verifyHistoricalOverlayMappingSource } from './historical-audit-module-source.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const inside = (base, file) => { const r = path.relative(base, file); return r !== '' && r !== '..' && !r.startsWith(`..${path.sep}`) && !path.isAbsolute(r); };

export function assertOriginalOverlayEvidencePath(root, file, source, resolve = realpathSync) {
  const boundary = path.resolve(root, source ? '.' : 'artifacts/material-parity'), absolute = path.resolve(root, file);
  assert.ok(inside(boundary, absolute), 'overlay evidence escapes its logical boundary');
  // This one recorded producer dependency is installed under node_modules,
  // which may legitimately be a shared worktree junction. Author/project
  // sources still require real workspace containment; captured artifacts still
  // require real artifact containment. The caller also verifies exact bytes.
  const realBoundary = source && file === 'node_modules/typescript/lib/typescript.js'
    ? resolve(path.resolve(root, 'node_modules/typescript')) : resolve(boundary);
  assert.ok(inside(realBoundary, resolve(absolute)), 'overlay evidence escapes its real boundary');
}

export function collectOriginalOverlayContextSurvey(reportFile, { root = process.cwd(), readBytes = readFileSync } = {}) {
  const read = (file, source = false) => {
    const boundary = path.resolve(root, source ? '.' : 'artifacts/material-parity'), absolute = path.resolve(root, file);
    assert.ok(inside(boundary, absolute));
    if (readBytes === readFileSync) assertOriginalOverlayEvidencePath(root, file, source);
    return readBytes(absolute);
  };
  const hashed = (item, source = false) => {
    assert.match(item?.sha256 ?? '', /^[a-f0-9]{64}$/); const bytes = read(item.file, source);
    if (source && item.file === 'tests/material-parity/generated-node-mapping-evidence.mjs') {
      restoreMappingReadAdapterSource(item, bytes); return bytes;
    }
    assert.equal(hash(bytes), item.sha256, `Changed evidence: ${item.file}`); return bytes;
  };
  const bytes = read(reportFile), raw = JSON.parse(bytes), manifest = JSON.parse(hashed(raw.capture.checkpointManifest));
  assert.equal(raw.schemaVersion, 1); assert.equal(raw.kind, 'original-overlay-reference-context-replay');
  assert.equal(raw.browser, manifest.provenance.browser);
  assert.equal(raw.candidateReplayed, false); assert.equal(raw.renderingEquivalent, false);
  const expectedSources = ['scripts/capture-material-original-overlay-context.mjs',
    'tests/material-parity/supplemental-capture-evidence.mjs', 'tests/material-parity/input-tree-evidence.mjs',
    'tests/material-parity/run-material-parity.mjs', 'tests/material-parity/reference-root-ancestor-context.mjs',
    'tests/material-parity/origin-alias-mapping-evidence.mjs', 'tests/material-parity/generated-node-mapping-evidence.mjs',
    'tests/material-parity/input-equivalence-audit.mjs', 'tests/material-parity/owner-initial-style-membership.mjs',
    'tests/material-parity/cursor-metrics.mjs', 'node_modules/typescript/lib/typescript.js'];
  assert.deepEqual(raw.capture.sources.map(s => s.file), expectedSources);
  // Historical source identity and current proof replay are separate checks.
  // All other producer dependencies still require an exact current-file match.
  const historicalAuditSource = verifyHistoricalAuditModuleSource(
    raw.capture.sources.find(s => s.file === originalOverlayAuditSourceFile), read(originalOverlayAuditSourceFile, true), { root });
  raw.capture.sources.filter(item => item.file !== originalOverlayAuditSourceFile).forEach(item => hashed(item, true));
  const runner = read(expectedSources[3], true).toString('utf8');
  const parsed = ts.createSourceFile(expectedSources[3], runner, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const names = ['profileTheme', 'sendShowcaseCommand', 'waitForThemeApplied', 'settleInteraction',
    'setBenchmarkPhase', 'interactionTargetBox', 'popupHoverBox', 'performInteraction'];
  assert.deepEqual(raw.reusedFunctions.map(f => f.name), names);
  for (const item of raw.reusedFunctions) {
    const functions = parsed.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === item.name);
    assert.equal(functions.length, 1); assert.equal(hash(functions[0].getText(parsed)), item.sha256);
  }
  const { mapping, evidence: historicalMappingSource } = verifyHistoricalOverlayMappingSource(
    raw.mappingSurvey, read(raw.mappingSurvey.file, true), { root, readCurrentSource: file => read(file, true) });
  const expectedCases = mapping.cases.map(c => c.case);
  assert.equal(raw.cases, 91); assert.equal(expectedCases.length, 91);
  assert.deepEqual(raw.results.map(r => r.case).sort(), [...expectedCases].sort());
  const assets = new Map(manifest.provenance.browserFiles.map(f => [f.file, f.sha256]));
  const rows = []; let owners = 0, rootProperties = 0; const missingAliases = new Set();
  for (const descriptor of raw.results) {
    const result = JSON.parse(hashed(descriptor)), record = JSON.parse(hashed(result.checkpointRecord));
    assert.equal(record.sha256, hash(JSON.stringify(record.result)));
    const kind = JSON.parse(record.key).kind; assert.equal(kind, 'interaction');
    const entry = { ...record.result, kind }; assert.equal(originalCaseKey(entry), descriptor.case);
    assert.equal(result.case, descriptor.case);
    for (const property of ['family', 'profile', 'viewport', 'state']) assert.deepEqual(result[property], entry[property]);
    assert.deepEqual(result.originalInputTrees, entry.inputTrees);
    const originalReference = JSON.parse(hashed(entry.inputTrees.reference)), candidate = JSON.parse(hashed(entry.inputTrees.astylar));
    assert.equal(result.candidateReplayed, false); assert.equal(result.renderingEquivalent, false);
    assert.deepEqual(result.runtime.errors, []);
    for (const asset of result.runtime.assets) assert.equal(asset.sha256, assets.get(asset.file));
    for (const type of ['document', 'script', 'stylesheet', 'font']) assert.ok(result.runtime.assets.some(a => a.type === type));
    const expected = mapping.observations.filter(o => o.case === result.case);
    assert.deepEqual(result.proofs.map(p => p.element), expected.map(p => p.element));
    assert.deepEqual(result.freshReferenceTree.errors, []);
    for (const item of expected) {
      const inputs = entry.styleInputs.filter(input => input.id === item.element); assert.equal(inputs.length, 1);
      assert.deepEqual(resolveOriginAliasPair(entry, originalReference, candidate, inputs[0]), item.proof);
      const fresh = resolveOriginAliasPair(entry, result.freshReferenceTree, candidate, inputs[0]);
      assert.deepEqual(fresh, item.proof, 'Fresh mapped owner does not match original');
      assert.deepEqual(result.proofs.find(p => p.element === item.element).proof, fresh);
      owners++;
    }
    const context = result.context, nodes = new Map(context.nodes.map(n => [n.key, n]));
    assert.equal(context.schemaVersion, 1); assert.equal(context.kind, 'supplemental-reference-root-ancestor-context');
    assert.deepEqual(context.errors, []); assert.equal(nodes.size, context.nodes.length);
    assert.deepEqual(context.viewport, { width: entry.viewport.width, height: entry.viewport.height, deviceScaleFactor: entry.viewport.deviceScaleFactor });
    const url = new URL(context.documentUrl); assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
    assert.equal(url.pathname, `/reference/${entry.family}`);
    assert.deepEqual([...url.searchParams], [['benchmark', '1'], ['profile', entry.profile], ['interaction', entry.state]]);
    const roots = result.freshReferenceTree.nodes.filter(n => n.parent === null);
    assert.deepEqual(context.roots.map(r => r.captureKey), roots.map(n => n.key));
    assert.ok(context.sheets.length && context.sheets.every(s => Array.isArray(s.rules)));
    for (const root of context.roots) {
      assert.equal(root.node, root.ancestry[0]); assert.equal(new Set(root.ancestry).size, root.ancestry.length);
      for (let i = 0; i < root.ancestry.length; i++) {
        const node = nodes.get(root.ancestry[i]); assert.ok(node); assert.equal(node.parent, root.ancestry[i + 1] ?? null);
      }
      assert.equal(nodes.get(root.ancestry.at(-1)).type, 'html');
      const node = nodes.get(root.node), treeNode = roots.find(n => n.key === root.captureKey);
      assert.equal(node.type, treeNode.type); assert.deepEqual(node.attributes, treeNode.attributes);
      for (const [property, value] of Object.entries(result.freshReferenceTree.styles[treeNode.style])) {
        const css = property.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase());
        if (!Object.hasOwn(node.computed, css)) { missingAliases.add(property); continue; }
        assert.equal(node.computed[css], value); rootProperties++;
      }
    }
    const overlays = context.roots.filter(r => r.captureKey.startsWith('overlay:')); assert.equal(overlays.length, 1);
    rows.push({ case: result.case, family: result.family, profile: result.profile, viewport: result.viewport, state: result.state,
      owners: result.proofs.length, referenceAncestorContext: overlays[0].ancestry.map(key => {
        const n = nodes.get(key); return { type: n.type, fontSize: n.computed['font-size'], lineHeight: n.computed['line-height'],
          transform: n.computed.transform, translate: n.computed.translate, scale: n.computed.scale, rotate: n.computed.rotate,
          perspective: n.computed.perspective, zoom: n.computed.zoom, filter: n.computed.filter, contain: n.computed.contain,
          willChange: n.computed['will-change'], position: n.computed.position, overflowX: n.computed['overflow-x'], overflowY: n.computed['overflow-y'] };
      }) });
  }
  assert.equal(owners, 200);
  return { schemaVersion: 1, kind: 'original-overlay-reference-context-survey', capture: { file: reportFile, sha256: hash(bytes) },
    browser: raw.browser, historicalAuditSource, historicalMappingSource, cases: rows.length, matchedOriginalOwners: owners, rootProperties,
    missingEnumeratedAliases: [...missingAliases].sort(), observations: rows,
    canonicalAttributionChanged: false, candidateReplayed: false, renderingEquivalent: false,
    limitation: 'Original reference action functions and mapped owner styles are replayed. External context is freshly observed; no historical unrecorded ancestor values, fresh candidate behavior or final raster equivalence is inferred.' };
}
