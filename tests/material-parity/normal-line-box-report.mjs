import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sourceFiles = ['scripts/audit-material-normal-line-boxes.mjs', 'tests/material-parity/normal-line-box-evidence.mjs'];
const properties = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing',
  'wordSpacing', 'textAlign', 'textTransform', 'textDecoration', 'whiteSpace'];
const identity = (value) => JSON.stringify([value.case, value.element, value.referenceNode]);
const caseKey = (value) => `static:${value.family}@${value.profile}/${value.viewport.id}`;

// Reader-side validation is deliberately independent of the browser producer.
// This observes natural reference line boxes only; it does not change a
// comparison, normalize `normal`, or authorize unequal candidate inputs.
export function loadNormalLineBoxReport({ root = process.cwd(), reportPath, cases, inventory,
  controlTypography, expectedProvenance, readBytes }) {
  const targets = controlTypography.comparisons.filter((item) => item.case.startsWith('static:') &&
    item.properties.lineHeight.reference === 'normal');
  const pending = targets.map((item) => ({ case: item.case, element: item.element, referenceNode: item.referenceNode }));
  const result = { schemaVersion: 1, file: reportPath, observations: [], missing: pending, errors: [],
    scope: 'Validated static reference natural single-line boxes only. No input-equivalence, baseline or raster verdict.' };
  try {
    assert.equal(new Set(targets.map(identity)).size, targets.length, 'duplicate expected normal-line-box identity');
    assert.ok(expectedProvenance?.browser, 'missing selected-run capture provenance');
    assert.deepEqual(inventory.errors, [], 'invalid selected-run input inventory');
    const resolveFile = (file, source = false) => {
      assert.equal(typeof file, 'string', 'missing evidence path');
      const absolute = path.resolve(root, file);
      const boundary = path.resolve(root, source ? '.' : 'artifacts/material-parity');
      assert.ok(absolute.startsWith(boundary + path.sep), 'evidence path escapes its allowed directory');
      if (!readBytes) assert.ok(realpathSync(absolute).startsWith(realpathSync(boundary) + path.sep), 'evidence symlink escapes its allowed directory');
      return absolute;
    };
    const read = (file, source = false) => (readBytes ?? readFileSync)(resolveFile(file, source));
    const readHashed = (reference, source = false) => {
      assert.match(reference?.sha256 ?? '', /^[a-f0-9]{64}$/, 'missing evidence digest');
      const bytes = read(reference.file, source);
      assert.equal(digest(bytes), reference.sha256, `changed evidence: ${reference.file}`);
      return bytes;
    };
    const bytes = read(reportPath), report = JSON.parse(bytes);
    result.sha256 = digest(bytes);
    assert.equal(report.schemaVersion, 1, 'unsupported natural-line-box schema');
    const manifest = JSON.parse(readHashed(report.checkpointManifest));
    assert.equal(manifest.schemaVersion, 1, 'unsupported checkpoint manifest schema');
    assert.deepEqual(manifest.provenance, expectedProvenance, 'supplement belongs to a different capture run');
    assert.equal(report.browser, expectedProvenance.browser, 'supplement browser changed');
    assert.deepEqual(report.captureSources.map((item) => item.file).sort(), [...sourceFiles].sort(), 'missing or duplicate capture source');
    for (const source of report.captureSources) readHashed(source, true);
    const assetMap = new Map(expectedProvenance.browserFiles.map((item) => [item.file, item.sha256]));
    assert.equal(assetMap.size, expectedProvenance.browserFiles.length, 'duplicate runtime asset provenance');
    const candidates = cases.filter((item) => item.kind === 'static');
    assert.equal(new Set(candidates.map(caseKey)).size, candidates.length, 'duplicate selected static case');
    const casesByKey = new Map(candidates.map((item) => [caseKey(item), item]));
    const targetMap = new Map(targets.map((item) => [identity(item), item]));
    const observations = [], seen = new Set(), seenCases = new Set();
    assert.ok(Array.isArray(report.results), 'missing natural-line-box results');
    assert.equal(report.cases, report.results.length, 'case count differs from capture');
    for (const index of report.results) {
      assert.ok(!seenCases.has(index.case), 'duplicate captured case');
      seenCases.add(index.case);
      assert.equal(index.file, `${digest(index.case)}.json`, 'case filename does not match identity');
      const evidenceFile = path.relative(root, path.resolve(path.dirname(resolveFile(reportPath)), index.file)).replaceAll('\\', '/');
      const evidence = JSON.parse(readHashed({ file: evidenceFile, sha256: index.sha256 }));
      assert.equal(evidence.case, index.case, 'captured case identity changed');
      const selected = casesByKey.get(index.case);
      assert.ok(selected, 'captured case absent from selected run');
      assert.equal(evidence.family, selected.family, 'family changed');
      assert.equal(evidence.profile, selected.profile, 'profile changed');
      assert.deepEqual(evidence.viewport, selected.viewport, 'viewport changed');
      assert.deepEqual(evidence.errors, [], 'capture has runtime errors');
      const record = JSON.parse(read(evidence.checkpointRecord.file));
      assert.equal(record.sha256, evidence.checkpointRecord.sha256, 'checkpoint result digest changed');
      assert.equal(digest(JSON.stringify(record.result)), record.sha256, 'checkpoint result bytes changed');
      assert.equal(path.basename(evidence.checkpointRecord.file), `${digest(record.key)}.json`, 'checkpoint filename identity changed');
      assert.equal(path.dirname(resolveFile(evidence.checkpointRecord.file)), path.dirname(resolveFile(report.checkpointManifest.file)), 'checkpoint record belongs to a different directory');
      const recordKey = JSON.parse(record.key);
      assert.equal(recordKey.kind, 'static', 'interaction evidence cannot authorize a static measurement');
      assert.equal(recordKey.family, selected.family, 'checkpoint family changed');
      assert.equal(recordKey.profile, selected.profile, 'checkpoint profile changed');
      assert.deepEqual(recordKey.viewport, selected.viewport, 'checkpoint viewport changed');
      assert.ok(!recordKey.state && !selected.state, 'static evidence unexpectedly contains a state');
      const { kind, ...selectedResult } = selected;
      assert.deepEqual(record.result, selectedResult, 'checkpoint result differs from selected case');
      assert.deepEqual(evidence.inputTrees, selected.inputTrees, 'supplement input trees differ from selected case');
      for (const side of ['reference', 'astylar']) readHashed(evidence.inputTrees[side]);
      assert.ok(Array.isArray(evidence.assets), 'missing served runtime assets');
      assert.equal(new Set(evidence.assets.map((item) => item.file)).size, evidence.assets.length, 'duplicate served asset');
      for (const asset of evidence.assets) {
        assert.ok(['document', 'script', 'stylesheet', 'font'].includes(asset.type), 'unknown runtime asset type');
        assert.match(asset.sha256 ?? '', /^[a-f0-9]{64}$/, 'missing served asset digest');
        assert.equal(asset.sha256, assetMap.get(asset.file), 'served asset differs from selected run');
      }
      for (const type of ['document', 'script', 'stylesheet', 'font']) assert.ok(evidence.assets.some((item) => item.type === type), `missing served ${type} bytes`);
      const mappings = inventory.cases.filter((item) => item.case === index.case && item.side === 'reference');
      assert.equal(mappings.length, 1, 'ambiguous reference inventory');
      const tree = inventory.variants[mappings[0].variant];
      assert.ok(Array.isArray(evidence.measurements) && evidence.measurements.length > 0, 'missing measurements');
      assert.equal(index.observations, evidence.measurements.length, 'case observation count changed');
      for (const measurement of evidence.measurements) {
        const key = identity({ ...measurement, case: index.case });
        assert.ok(targetMap.has(key), 'unmapped natural-line-box observation');
        assert.ok(!seen.has(key), 'duplicate natural-line-box observation');
        seen.add(key);
        assert.equal(measurement.schemaVersion, 1, 'unsupported measurement schema');
        assert.equal(measurement.source, 'browser-natural-single-line-box', 'measurement source changed');
        assert.equal(measurement.fontReady, true, 'unsettled measurement fonts');
        assert.ok(Number.isFinite(measurement.naturalHeight) && measurement.naturalHeight > 0, 'invalid natural height');
        assert.ok(Number.isFinite(measurement.naturalWidth) && measurement.naturalWidth > 0, 'invalid natural width');
        assert.deepEqual(measurement.viewport, { width: selected.viewport.width, height: selected.viewport.height,
          deviceScaleFactor: selected.viewport.deviceScaleFactor }, 'measurement viewport or DPR changed');
        const nodes = tree.nodes.filter((node) => node.key === measurement.referenceNode);
        assert.equal(nodes.length, 1, 'ambiguous reference label');
        const node = nodes[0], parents = tree.nodes.filter((item) => item.key === node.parent);
        assert.equal(node.type, 'span', 'reference label is not a span');
        assert.ok(String(node.attributes?.class).split(/\s+/).includes('mdc-button__label'), 'reference label class changed');
        assert.equal(parents.length, 1, 'ambiguous reference parent');
        assert.equal(parents[0].type, 'button', 'reference label parent changed');
        assert.ok(!tree.nodes.some((item) => item.parent === node.key), 'reference label is not a leaf');
        assert.equal(measurement.text, node.ownText, 'reference label text changed');
        assert.ok(measurement.text.trim() && !/[\r\n\t]/.test(measurement.text), 'unsupported single-line text');
        const pooled = inventory.styles[node.style];
        assert.equal(pooled?.side, 'reference', 'invalid reference typography pool');
        for (const property of properties) {
          assert.equal(typeof measurement.typography[property], 'string', `missing measured ${property}`);
          assert.equal(measurement.typography[property], pooled.value[property], `measured typography changed: ${property}`);
        }
        assert.equal(measurement.typography.lineHeight, 'normal', 'not a normal line box');
        assert.equal(measurement.typography.writingMode, 'horizontal-tb', 'unsupported writing mode');
        assert.ok(Array.isArray(measurement.fonts) && measurement.fonts.length > 0 &&
          measurement.fonts.every((font) => font.status === 'loaded'), 'missing loaded font-face evidence');
        observations.push({ ...measurement, case: index.case, evidence: { file: evidenceFile, sha256: index.sha256,
          checkpointRecord: evidence.checkpointRecord, inputTrees: evidence.inputTrees,
          checkpointManifest: report.checkpointManifest, captureSources: report.captureSources } });
      }
    }
    assert.equal(report.observations, observations.length, 'total observation count changed');
    result.observations = observations;
    result.missing = pending.filter((item) => !seen.has(identity(item)));
  } catch (error) {
    // No partially validated observation survives a damaged capture.
    result.errors.push(String(error));
  }
  return result;
}
