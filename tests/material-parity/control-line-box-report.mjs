import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { validateControlLineBoxMeasurement } from './control-line-box-validation.mjs';
import { bindControlLineBoxNormalization, historicalControlLineBoxReportSha256,
  reconcileControlLineBoxMeasurement } from './control-line-box-normalization.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const identity = item => JSON.stringify([item.case, item.element, item.referenceNode]);
const caseKey = item => `interaction:${item.family}@${item.profile}/${item.viewport.id}/${item.state}`;
const captureFiles = ['scripts/audit-material-control-line-boxes.mjs', 'tests/material-parity/supplemental-capture-evidence.mjs',
  'tests/material-parity/input-tree-evidence.mjs'];
const measurementFiles = ['tests/material-parity/control-line-box-evidence.mjs', 'tests/material-parity/input-equivalence-audit.mjs',
  'tests/material-parity/input-equivalence-policy.mjs'];

// Independent reader: no producer assertions or self-reported counts substitute
// for target, checkpoint, source, tree, font and asset validation.
export function loadControlLineBoxReport({ root = process.cwd(), reportPath, cases, inventory, controlTypography,
  expectedProvenance, styleProperties, readBytes }) {
  const selectedCases = cases.filter(item => item.kind === 'interaction');
  const selectedKeys = new Set(selectedCases.map(caseKey));
  const targets = controlTypography.comparisons.filter(item => selectedKeys.has(item.case) && item.properties.lineHeight.reference === 'normal');
  const pending = targets.map(item => ({ case: item.case, element: item.element, referenceNode: item.referenceNode }));
  const result = { schemaVersion: 1, file: reportPath, observations: [], missing: pending, errors: [],
    scope: 'Validated main-checkpoint interactive reference CSS natural single-line metrics. No input-equivalence, interaction-parity, baseline, visibility or raster verdict.' };
  if (reportPath === undefined) return result;
  try {
    assert.ok(expectedProvenance?.browser, 'missing selected-run provenance');
    assert.deepEqual(inventory.errors, [], 'invalid selected input inventory');
    assert.equal(selectedKeys.size, selectedCases.length, 'duplicate selected interaction case');
    assert.equal(new Set(targets.map(identity)).size, targets.length, 'duplicate target identity');
    const resolve = (file, source = false) => {
      assert.equal(typeof file, 'string', 'missing evidence path');
      const absolute = path.resolve(root, file), boundary = path.resolve(root, source ? '.' : 'artifacts/material-parity');
      assert.ok(absolute.startsWith(boundary + path.sep), 'evidence path escapes boundary');
      if (!readBytes) assert.ok(realpathSync(absolute).startsWith(realpathSync(boundary) + path.sep), 'evidence symlink escapes boundary');
      return absolute;
    };
    const read = (file, source = false) => (readBytes ?? readFileSync)(resolve(file, source));
    const hashed = (item, source = false) => {
      assert.match(item?.sha256 ?? '', /^[a-f0-9]{64}$/, 'missing evidence digest');
      const bytes = read(item.file, source); assert.equal(digest(bytes), item.sha256, `changed evidence: ${item.file}`); return bytes;
    };
    const reportBytes = read(reportPath), raw = JSON.parse(reportBytes);
    result.sha256 = digest(reportBytes);
    assert.equal(raw.schemaVersion, 1, 'unsupported report schema');
    assert.equal(raw.capture?.schemaVersion, 1, 'unsupported capture schema');
    assert.equal(raw.browser, expectedProvenance.browser, 'changed browser');
    const manifest = JSON.parse(hashed(raw.capture.checkpointManifest));
    assert.equal(manifest.schemaVersion, 1, 'unsupported checkpoint schema');
    assert.deepEqual(manifest.provenance, expectedProvenance, 'different capture run');
    assert.deepEqual(raw.capture.styleProperties, styleProperties, 'changed captured style set');
    assert.deepEqual(raw.capture.sources.map(item => item.file).sort(), [...captureFiles].sort(), 'missing or duplicate capture source');
    for (const item of raw.capture.sources) hashed(item, true);
    assert.deepEqual(raw.measurementSources.map(item => item.file).sort(), [...measurementFiles].sort(), 'missing or duplicate measurement source');
    for (const item of raw.measurementSources) {
      assert.equal(path.dirname(resolve(item.snapshot)), path.dirname(resolve(reportPath)), 'source snapshot outside report directory');
      assert.equal(path.basename(item.snapshot), `source-${item.sha256}.txt`, 'source snapshot filename changed');
      hashed({ file: item.snapshot, sha256: item.sha256 });
      // The measurement algorithm must still be the reviewed implementation.
      // Target-selection code may evolve; the expected target set is rebuilt
      // independently above. Only the separately authenticated normalization
      // functions may be extracted from its snapshot for the pinned transition.
      if (item.file === measurementFiles[0]) hashed(item, true);
    }
    const normalizationSource = raw.measurementSources.find(item => item.file === measurementFiles[1]);
    const normalization = result.sha256 === historicalControlLineBoxReportSha256
      ? bindControlLineBoxNormalization(result.sha256, normalizationSource,
        read(normalizationSource.snapshot), read(normalizationSource.file, true)) : undefined;
    const assets = new Map(expectedProvenance.browserFiles.map(item => [item.file, item.sha256]));
    assert.equal(assets.size, expectedProvenance.browserFiles.length, 'duplicate expected assets');
    const selectedByKey = new Map(selectedCases.map(item => [caseKey(item), item]));
    const targetByKey = new Map(targets.map(item => [identity(item), item]));
    const seen = new Set(), seenCases = new Set(), observations = [];
    assert.ok(Array.isArray(raw.results), 'missing result index');
    assert.equal(raw.cases, raw.results.length, 'case count changed');
    for (const index of raw.results) {
      assert.ok(!seenCases.has(index.case), 'duplicate captured case'); seenCases.add(index.case);
      assert.equal(path.dirname(resolve(index.file)), path.dirname(resolve(reportPath)), 'case outside report directory');
      assert.equal(path.basename(index.file), `${digest(index.case)}.json`, 'case filename changed');
      const evidence = JSON.parse(hashed(index)), selected = selectedByKey.get(index.case);
      assert.ok(selected, 'unselected interaction case');
      assert.equal(evidence.case, index.case, 'changed case identity');
      for (const field of ['family', 'profile', 'state', 'viewport']) assert.deepEqual(evidence[field], selected[field], `changed case ${field}`);
      const recordBytes = read(evidence.checkpointRecord.file), record = JSON.parse(recordBytes);
      assert.equal(record.sha256, evidence.checkpointRecord.sha256, 'changed checkpoint digest');
      assert.equal(digest(JSON.stringify(record.result)), record.sha256, 'changed checkpoint result');
      assert.equal(path.dirname(resolve(evidence.checkpointRecord.file)), path.dirname(resolve(raw.capture.checkpointManifest.file)), 'different checkpoint directory');
      assert.equal(path.basename(evidence.checkpointRecord.file), `${digest(record.key)}.json`, 'changed checkpoint filename');
      const recordKey = JSON.parse(record.key);
      assert.equal(recordKey.kind, 'interaction', 'static evidence cannot justify interaction metric');
      for (const field of ['family', 'profile', 'state', 'viewport']) assert.deepEqual(recordKey[field], selected[field], `changed checkpoint ${field}`);
      const { kind, ...selectedResult } = selected;
      assert.deepEqual(record.result, selectedResult, 'checkpoint differs from selected case');
      assert.deepEqual(evidence.checkpointInputTrees, selected.inputTrees, 'different paired input trees');
      for (const side of ['reference', 'astylar']) hashed(evidence.checkpointInputTrees[side]);
      for (const [item, suffix] of [[evidence.inputTree, '-reference.json'], [evidence.screenshot, '.png']]) {
        assert.equal(path.dirname(resolve(item.file)), path.dirname(resolve(reportPath)), 'observation outside report directory');
        assert.equal(path.basename(item.file), `${digest(index.case)}${suffix}`, 'observation filename changed');
      }
      const fresh = JSON.parse(hashed(evidence.inputTree)); hashed(evidence.screenshot);
      assert.equal(fresh.schemaVersion, 1); assert.deepEqual(fresh.errors, [], 'invalid fresh input tree');
      assert.equal(new Set(fresh.nodes.map(n => n.key)).size, fresh.nodes.length, 'duplicate fresh node identity');
      assert.deepEqual(evidence.runtime?.errors, [], 'missing runtime evidence or runtime errors');
      for (const type of ['document', 'script', 'stylesheet', 'font']) assert.ok(evidence.runtime.assets.some(a => a.type === type), `missing runtime ${type}`);
      for (const asset of evidence.runtime.assets) {
        assert.ok(['document', 'script', 'stylesheet', 'font'].includes(asset.type), 'unexpected runtime type');
        assert.match(asset.sha256 ?? '', /^[a-f0-9]{64}$/); assert.equal(asset.sha256, assets.get(asset.file), 'changed served asset');
      }
      assert.ok(Array.isArray(evidence.events), 'missing action trace');
      assert.equal(typeof evidence.activeId, 'string', 'missing observed focus ID');
      for (const event of evidence.events) {
        assert.ok(['pointerdown', 'pointerup', 'click', 'keydown', 'focusin', 'focusout'].includes(event.type), 'unknown action event');
        assert.equal(typeof event.trusted, 'boolean', 'missing trusted flag');
      }
      if (!['focus', 'hover', 'disabled'].includes(selected.state))
        assert.ok(evidence.events.some(event => event.type === 'pointerdown' && event.trusted), 'missing real pointer activation');
      if (selected.state === 'held') assert.ok(!evidence.events.some(event => event.type === 'pointerup'), 'held state was released');
      if (selected.state === 'open-dismiss') assert.equal(evidence.events.filter(event => event.type === 'keydown' && event.key === 'Escape' && event.trusted).length, 3, 'missing dismissal cycles');
      const maps = inventory.cases.filter(item => item.case === index.case && item.side === 'reference');
      assert.equal(maps.length, 1, 'ambiguous reference inventory');
      const original = inventory.variants[maps[0].variant];
      assert.ok(Array.isArray(evidence.measurements) && evidence.measurements.length, 'missing measurements');
      assert.equal(evidence.measurements.length, index.observations, 'case observation count changed');
      for (const measurement of evidence.measurements) {
        const id = identity({ ...measurement, case: index.case }), target = targetByKey.get(id);
        assert.ok(target, 'unmapped metric'); assert.ok(!seen.has(id), 'duplicate metric'); seen.add(id);
        let observation = measurement, validationTarget = target;
        if (normalization) {
          const owners = original.nodes.filter(node => node.key === target.referenceNode);
          assert.equal(owners.length, 1, 'ambiguous normalization owner');
          const rawStyle = inventory.styles[owners[0].style];
          assert.equal(rawStyle?.side, 'reference', 'wrong normalization style owner');
          const reconciled = reconcileControlLineBoxMeasurement(measurement, target, rawStyle.value, normalization);
          validationTarget = reconciled.historicalTarget; observation = reconciled.observation;
        }
        validateControlLineBoxMeasurement({ measurement, target: validationTarget, fresh, original, inventory, selected });
        observations.push({ ...observation, case: index.case, evidence: { file: index.file, sha256: index.sha256,
          inputTree: evidence.inputTree, screenshot: evidence.screenshot, checkpointRecord: evidence.checkpointRecord,
          checkpointInputTrees: evidence.checkpointInputTrees, capture: raw.capture, measurementSources: raw.measurementSources } });
      }
    }
    assert.equal(raw.observations, observations.length, 'total observation count changed');
    result.observations = observations;
    result.missing = pending.filter(item => !seen.has(identity(item)));
  } catch (error) { result.errors.push(String(error)); }
  return result;
}

// Report validation has the full-tree case inventory, not the original large
// result objects. Recover those objects from the bound checkpoint, requiring
// the entire main interaction case set, then use the same independent reader.
export function replayControlLineBoxReport(options) {
  const { root = process.cwd(), reportPath, inventory, readBytes, readDirectory } = options;
  const keys = [...new Set(inventory.cases.filter(c => c.side === 'reference' && c.case.startsWith('interaction:')).map(c => c.case))];
  const invalidKeys = [];
  const skeletal = keys.flatMap(key => {
    const match = /^interaction:([^@]+)@([^/]+)\/([^/]+)\/(.+)$/.exec(key);
    if (!match) { invalidKeys.push(key); return []; }
    return [{ kind: 'interaction', family: match[1], profile: match[2], viewport: { id: match[3] }, state: match[4] }];
  });
  const empty = loadControlLineBoxReport({ ...options, cases: skeletal, reportPath: undefined });
  if (invalidKeys.length) return { ...empty, file: reportPath, errors: [`Invalid interaction inventory keys: ${invalidKeys.join(', ')}`] };
  if (reportPath === undefined) return empty;
  try {
    const boundary = path.resolve(root, 'artifacts/material-parity');
    const resolve = file => {
      assert.equal(typeof file, 'string'); const absolute = path.resolve(root, file);
      assert.ok(absolute.startsWith(boundary + path.sep), 'checkpoint replay path escapes boundary');
      if (!readBytes) assert.ok(realpathSync(absolute).startsWith(realpathSync(boundary) + path.sep), 'checkpoint replay symlink escapes boundary');
      return absolute;
    };
    const read = file => (readBytes ?? readFileSync)(resolve(file));
    const raw = JSON.parse(read(reportPath)), manifest = raw.capture.checkpointManifest;
    assert.equal(digest(read(manifest.file)), manifest.sha256, 'changed replay manifest');
    const directory = path.dirname(resolve(manifest.file));
    const cases = (readDirectory ?? readdirSync)(directory).filter(name => /^[a-f0-9]{64}\.json$/.test(name)).flatMap(name => {
      const record = JSON.parse(read(path.join(directory, name))), key = JSON.parse(record.key);
      assert.equal(name, `${digest(record.key)}.json`, 'changed replay checkpoint key');
      assert.equal(digest(JSON.stringify(record.result)), record.sha256, 'changed replay checkpoint result');
      if (key.kind !== 'interaction') return [];
      for (const field of ['family', 'profile', 'state', 'viewport']) assert.deepEqual(record.result[field], key[field], `changed replay ${field}`);
      return [{ ...record.result, kind: 'interaction' }];
    });
    assert.deepEqual(cases.map(caseKey).sort(), [...keys].sort(), 'checkpoint interaction set differs from inventory');
    return loadControlLineBoxReport({ ...options, cases });
  } catch (error) { return { ...empty, file: reportPath, errors: [String(error)] }; }
}
