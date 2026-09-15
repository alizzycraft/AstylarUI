import assert from 'node:assert/strict';
import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function collectOverlayAncestorContextSurvey(reportFile, { root = process.cwd(), readBytes = readFileSync } = {}) {
  const inside = (base, file) => {
    const relative = path.relative(base, file);
    return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  };
  const read = (file, source = false) => {
    const absolute = path.resolve(root, file), boundary = path.resolve(root, source ? '.' : 'artifacts/material-parity');
    assert.ok(inside(boundary, absolute), 'Evidence path escapes boundary');
    if (readBytes === readFileSync) assert.ok(inside(realpathSync(boundary), realpathSync(absolute)), 'Evidence symlink escapes boundary');
    return readBytes(absolute);
  };
  const hashed = (item, source = false) => {
    assert.match(item?.sha256 ?? '', /^[a-f0-9]{64}$/);
    const bytes = read(item.file, source); assert.equal(hash(bytes), item.sha256, `Changed evidence: ${item.file}`); return bytes;
  };
  const bytes = read(reportFile), raw = JSON.parse(bytes);
  assert.equal(raw.schemaVersion, 1);
  assert.equal(raw.kind, 'priority-overlay-reference-ancestor-context');
  assert.equal(raw.canonicalAttributionChanged, false);
  assert.equal(raw.originalOverlayCauseEstablished, false);
  assert.equal(raw.settleDelayMs, 250);
  const manifest = JSON.parse(hashed(raw.capture.checkpointManifest));
  assert.equal(raw.browser, manifest.provenance.browser);
  const expectedSources = ['scripts/capture-material-overlay-ancestor-context.mjs',
    'tests/material-parity/supplemental-capture-evidence.mjs', 'tests/material-parity/input-tree-evidence.mjs',
    'tests/material-parity/reference-root-ancestor-context.mjs', 'tests/material-parity/run-material-parity.mjs'];
  assert.deepEqual(raw.capture.sources.map(s => s.file), expectedSources);
  raw.capture.sources.forEach(item => hashed(item, true));
  const families = ['dialog', 'bottom-sheet', 'snack-bar', 'tooltip'];
  assert.deepEqual(raw.families, families);
  const expected = manifest.provenance.cases.filter(entry => families.includes(entry.family))
    .map(entry => JSON.stringify({ kind: 'static', family: entry.family, profile: entry.profile,
      viewport: entry.viewport, state: entry.state ?? null }));
  assert.equal(expected.length, 48);
  assert.equal(raw.originalStaticCases, expected.length);
  assert.equal(raw.samples, expected.length * 2);
  assert.deepEqual(raw.results.map(r => r.case).sort(), [...expected].sort());
  const assets = new Map(manifest.provenance.browserFiles.map(f => [f.file, f.sha256]));
  const observations = [], missingComputedAliases = new Set(); let replayedRootProperties = 0;
  for (const item of raw.results) {
    const result = JSON.parse(hashed(item)), record = JSON.parse(hashed(result.checkpointRecord));
    assert.equal(record.sha256, hash(JSON.stringify(record.result)));
    assert.equal(record.key, item.case); assert.equal(result.originalCase, item.case);
    assert.deepEqual(result.originalReferenceTree, record.result.inputTrees.reference);
    const original = JSON.parse(hashed(result.originalReferenceTree));
    for (const field of ['family', 'profile', 'viewport']) assert.deepEqual(result[field], record.result[field]);
    assert.equal(result.originalRootStylesMatch, true);
    assert.deepEqual(result.samples.map(s => s.state), ['original-static-root-context',
      result.family === 'tooltip' ? 'supplemental-real-hover' : 'supplemental-real-click']);
    assert.deepEqual(result.runtime.errors, []);
    for (const asset of result.runtime.assets) assert.equal(asset.sha256, assets.get(asset.file), 'Runtime asset differs from frozen manifest');
    for (const type of ['document', 'script', 'stylesheet', 'font']) assert.ok(result.runtime.assets.some(a => a.type === type));
    for (const sample of result.samples) {
      const context = sample.context, nodes = new Map(context.nodes.map(n => [n.key, n]));
      assert.equal(context.kind, 'supplemental-reference-root-ancestor-context');
      assert.equal(context.schemaVersion, 1); assert.deepEqual(context.errors, []);
      assert.equal(nodes.size, context.nodes.length, 'Duplicate ancestor node');
      const url = new URL(context.documentUrl);
      assert.ok(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname));
      assert.equal(url.pathname, `/reference/${result.family}`);
      assert.deepEqual([...url.searchParams], [['benchmark', '1'], ['profile', result.profile]]);
      assert.deepEqual(context.viewport, { width: result.viewport.width, height: result.viewport.height, deviceScaleFactor: result.viewport.deviceScaleFactor });
      assert.ok(context.sheets.length > 0 && context.sheets.every(s => Array.isArray(s.rules)));
      assert.equal(new Set(context.roots.map(r => r.captureKey)).size, context.roots.length);
      for (const captureRoot of context.roots) {
        assert.equal(captureRoot.node, captureRoot.ancestry[0]);
        assert.equal(new Set(captureRoot.ancestry).size, captureRoot.ancestry.length);
        for (let i = 0; i < captureRoot.ancestry.length; i++) {
          const node = nodes.get(captureRoot.ancestry[i]); assert.ok(node);
          assert.equal(node.parent, captureRoot.ancestry[i + 1] ?? null, 'Incomplete or reordered ancestry');
        }
        assert.equal(nodes.get(captureRoot.ancestry.at(-1)).type, 'html');
      }
    }
    const initial = result.samples[0].context, oldRoots = original.nodes.filter(n => n.parent === null);
    assert.deepEqual(initial.roots.map(r => r.captureKey), oldRoots.map(n => n.key));
    for (const old of oldRoots) {
      const root = initial.roots.find(r => r.captureKey === old.key), current = initial.nodes.find(n => n.key === root.node);
      assert.equal(current.type, old.type);
      assert.deepEqual(current.attributes, old.attributes, 'Original root authored attributes changed');
      for (const [property, value] of Object.entries(original.styles[old.style])) {
        const cssProperty = property.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase());
        if (!Object.hasOwn(current.computed, cssProperty)) { missingComputedAliases.add(property); continue; }
        assert.equal(current.computed[cssProperty], value, `Original root style changed: ${item.case}/${property}`);
        replayedRootProperties++;
      }
    }
    const opened = result.samples[1], context = opened.context;
    assert.ok(opened.popup.text.length && opened.popup.viewportRect.width > 0 && opened.popup.viewportRect.height > 0);
    const overlays = context.roots.filter(r => r.captureKey.startsWith('overlay:'));
    assert.equal(overlays.length, 1);
    const chain = overlays[0].ancestry.map(key => context.nodes.find(n => n.key === key));
    const frameRoot = context.roots.find(r => r.captureKey === 'frame');
    const frame = context.nodes.find(n => n.key === frameRoot.node);
    observations.push({ case: item.case, family: result.family, profile: result.profile, viewport: result.viewport,
      ancestorTypes: chain.map(n => n.type),
      ancestorContext: chain.map(n => ({ type: n.type, fontSize: n.computed['font-size'], fontStyle: n.computed['font-style'],
        lineHeight: n.computed['line-height'], transform: n.computed.transform, translate: n.computed.translate,
        scale: n.computed.scale, rotate: n.computed.rotate, perspective: n.computed.perspective, zoom: n.computed.zoom,
        filter: n.computed.filter, contain: n.computed.contain, willChange: n.computed['will-change'] })),
      frameFontSize: frame.computed['font-size'], popup: opened.popup });
  }
  return { schemaVersion: 1, kind: 'priority-overlay-reference-ancestor-survey',
    capture: { file: reportFile, sha256: hash(bytes) }, browser: raw.browser,
    cases: expected.length, samples: raw.samples, families, replayedRootProperties,
    missingEnumeratedComputedAliases: [...missingComputedAliases].sort(), observations,
    canonicalAttributionChanged: false, originalOverlayCauseEstablished: false, renderingEquivalent: false,
    limitation: 'Fresh reference-only activation; not original interaction replay, candidate layout or final raster proof. Full original root style equality is producer-asserted; this reader independently checks the subset present in enumerated computed CSS.' };
}
