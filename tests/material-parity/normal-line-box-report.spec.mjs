import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { test } from 'node:test';
import { loadNormalLineBoxReport } from './normal-line-box-report.mjs';

const digest = (value) => createHash('sha256').update(value).digest('hex');
function fixture() {
  const root = process.cwd(), files = new Map();
  const put = (file, value) => { const bytes = typeof value === 'string' ? value : JSON.stringify(value);
    files.set(path.resolve(root, file), bytes); return { file, sha256: digest(bytes) }; };
  const base = 'artifacts/material-parity/normal-line-box-loader-test';
  const viewport = { id: 'desktop', width: 1440, height: 1000, deviceScaleFactor: 1 };
  const caseId = 'static:button@light/desktop';
  const style = { fontFamily: 'Roboto', fontSize: '14px', fontWeight: '500', fontStyle: 'normal',
    lineHeight: 'normal', letterSpacing: '0.096px', wordSpacing: '0px', textAlign: 'center',
    textTransform: 'none', textDecoration: 'none', whiteSpace: 'normal' };
  const node = { key: 'frame/0/0', parent: 'frame/0', type: 'span',
    attributes: { class: 'mdc-button__label' }, ownText: 'Save', style: 0 };
  const tree = { nodes: [{ key: 'frame/0', type: 'button' }, node] };
  const inputTrees = { reference: put(`${base}/reference.json`, tree), astylar: put(`${base}/astylar.json`, { nodes: [] }) };
  const selected = { family: 'button', profile: 'light', viewport, inputTrees };
  const cases = [{ ...structuredClone(selected), kind: 'static' }];
  const record = { key: JSON.stringify({ kind: 'static', family: 'button', profile: 'light', viewport }), result: selected };
  const recordFile = `${base}/checkpoint/${digest(record.key)}.json`;
  const assets = ['document', 'script', 'stylesheet', 'font'].map((type) => ({ file: `test-${type}`, sha256: digest(type), type }));
  const provenance = { browser: 'test-browser', browserFiles: assets.map(({ file, sha256 }) => ({ file, sha256 })), enforce: true };
  const manifest = { schemaVersion: 1, provenance: structuredClone(provenance) };
  const measurement = { element: 'save', schemaVersion: 1, source: 'browser-natural-single-line-box',
    referenceNode: node.key, text: node.ownText, typography: { ...style, writingMode: 'horizontal-tb' },
    naturalHeight: 17, naturalWidth: 32, fontReady: true,
    fonts: [{ family: 'Roboto', status: 'loaded' }],
    viewport: { width: 1440, height: 1000, deviceScaleFactor: 1 } };
  const capture = { case: caseId, family: 'button', profile: 'light', viewport: structuredClone(viewport),
    checkpointRecord: { file: recordFile }, inputTrees: structuredClone(inputTrees),
    measurements: [measurement], assets, errors: [] };
  const reportPath = `${base}/report/latest-report.json`, captureFile = `${digest(caseId)}.json`;
  const report = { schemaVersion: 1, browser: provenance.browser, checkpointManifest: { file: `${base}/checkpoint/manifest.json` },
    captureSources: ['scripts/audit-material-normal-line-boxes.mjs', 'tests/material-parity/normal-line-box-evidence.mjs']
      .map((file) => put(file, `test source: ${file}`)),
    cases: 1, observations: 1, results: [{ case: caseId, file: captureFile, observations: 1 }] };
  const options = { root, reportPath, cases, expectedProvenance: provenance,
    controlTypography: { comparisons: [{ case: caseId, element: 'save', referenceNode: node.key,
      properties: { lineHeight: { reference: 'normal' } } }] },
    inventory: { errors: [], cases: [{ case: caseId, side: 'reference', variant: 0 }],
      variants: [tree], styles: [{ side: 'reference', value: style }] },
    readBytes: (absolute) => { assert.ok(files.has(absolute), `missing test file: ${absolute}`); return files.get(absolute); } };
  const save = () => {
    record.sha256 = digest(JSON.stringify(record.result));
    put(recordFile, record); capture.checkpointRecord.sha256 = record.sha256;
    report.checkpointManifest.sha256 = put(report.checkpointManifest.file, manifest).sha256;
    const captureHash = put(`${base}/report/${captureFile}`, capture).sha256;
    for (const item of report.results) item.sha256 = captureHash;
    put(reportPath, report);
  };
  save();
  return { options, files, put, save, report, capture, record, recordFile, manifest, measurement, node, tree };
}

test('line-box loader retains exact occurrence evidence without claiming input equivalence', () => {
  const f = fixture(), result = loadNormalLineBoxReport(f.options);
  assert.deepEqual(result.errors, []); assert.deepEqual(result.missing, []);
  assert.equal(result.observations.length, 1);
  assert.equal(result.observations[0].naturalHeight, 17);
  assert.equal(result.observations[0].case, 'static:button@light/desktop');
  assert.equal(result.observations[0].typography.lineHeight, 'normal');
  assert.equal(result.observations[0].evidence.checkpointRecord.sha256, f.record.sha256);
  assert.equal(result.observations[0].inputEquivalent, undefined);
});

const invalid = [
  ['schema', (f) => { f.report.schemaVersion = 2; }],
  ['manifest schema', (f) => { f.manifest.schemaVersion = 2; }],
  ['run provenance', (f) => { f.manifest.provenance.enforce = false; }],
  ['browser', (f) => { f.report.browser = 'another browser'; }],
  ['missing provenance', (f) => { delete f.options.expectedProvenance; }],
  ['missing capture source', (f) => { f.report.captureSources.pop(); }],
  ['duplicate capture source', (f) => { f.report.captureSources.push(f.report.captureSources[0]); }],
  ['changed source bytes', (f) => { f.put(f.report.captureSources[0].file, 'changed producer'); }],
  ['duplicate case', (f) => { f.report.results.push({ ...f.report.results[0] }); f.report.cases++; f.report.observations++; }],
  ['case count', (f) => { f.report.cases++; }],
  ['observation count', (f) => { f.report.observations++; }],
  ['case observation count', (f) => { f.report.results[0].observations++; }],
  ['case filename traversal', (f) => { f.report.results[0].file = '../../escaped.json'; }],
  ['case identity', (f) => { f.capture.case = 'static:button@dark/desktop'; }],
  ['profile', (f) => { f.capture.profile = 'dark'; }],
  ['viewport', (f) => { f.capture.viewport.width++; }],
  ['runtime error', (f) => { f.capture.errors.push('console error'); }],
  ['checkpoint identity', (f) => { f.record.key = JSON.stringify({ ...JSON.parse(f.record.key), kind: 'interaction' }); }],
  ['selected result', (f) => { f.record.result.extra = 'changed since main run'; }],
  ['duplicate selected case', (f) => { f.options.cases.push(f.options.cases[0]); }],
  ['changed input tree', (f) => { f.put(f.capture.inputTrees.reference.file, { changed: true }); }],
  ['different paired input tree', (f) => { f.capture.inputTrees.astylar.file = f.capture.inputTrees.reference.file; }],
  ['external tree path', (f) => { f.capture.inputTrees.reference.file = '../../outside.json'; }],
  ['changed asset', (f) => { f.capture.assets[0].sha256 = digest('wrong bytes'); }],
  ['missing asset digest', (f) => { delete f.capture.assets[0].sha256; }],
  ['missing font bytes', (f) => { f.capture.assets.pop(); }],
  ['duplicate runtime asset', (f) => { f.capture.assets.push(f.capture.assets[0]); }],
  ['unknown asset type', (f) => { f.capture.assets[0].type = 'image'; }],
  ['duplicate observation', (f) => { f.capture.measurements.push(f.measurement); f.report.results[0].observations++; f.report.observations++; }],
  ['unmapped observation', (f) => { f.measurement.element = 'another button'; }],
  ['measurement schema', (f) => { f.measurement.schemaVersion = 2; }],
  ['measurement source', (f) => { f.measurement.source = 'inferred-from-texture'; }],
  ['font readiness', (f) => { f.measurement.fontReady = false; }],
  ['natural height', (f) => { f.measurement.naturalHeight = 0; }],
  ['natural width', (f) => { f.measurement.naturalWidth = null; }],
  ['DPR', (f) => { f.measurement.viewport.deviceScaleFactor = 2; }],
  ['duplicate reference mapping', (f) => { f.options.inventory.cases.push(f.options.inventory.cases[0]); }],
  ['invalid inventory', (f) => { f.options.inventory.errors.push({ error: 'bad tree' }); }],
  ['reference text', (f) => { f.measurement.text = 'Other'; }],
  ['reference class', (f) => { f.node.attributes.class = 'other'; }],
  ['reference parent', (f) => { f.tree.nodes[0].type = 'div'; }],
  ['reference child', (f) => { f.tree.nodes.push({ key: 'child', parent: f.node.key }); }],
  ['missing typography', (f) => { delete f.measurement.typography.fontSize; }],
  ['changed typography', (f) => { f.measurement.typography.fontWeight = '700'; }],
  ['wrong style pool', (f) => { f.options.inventory.styles[0].side = 'astylar'; }],
  ['writing mode', (f) => { f.measurement.typography.writingMode = 'vertical-rl'; }],
  ['font-face status', (f) => { f.measurement.fonts[0].status = 'unloaded'; }],
];
for (const [name, mutate] of invalid) test(`line-box loader rejects ${name} without partial observations`, () => {
  const f = fixture(); mutate(f); f.save();
  const result = loadNormalLineBoxReport(f.options);
  assert.equal(result.errors.length, 1, name);
  assert.deepEqual(result.observations, []);
  assert.equal(result.missing.length, 1);
});

test('line-box loader reports missing observations rather than inferring normal equals 17px', () => {
  const f = fixture(); f.report.results = []; f.report.cases = 0; f.report.observations = 0; f.save();
  const result = loadNormalLineBoxReport(f.options);
  assert.deepEqual(result.errors, []); assert.deepEqual(result.observations, []);
  assert.equal(result.missing.length, 1);
});

test('line-box loader rejects a changed supplemental file even when its JSON remains valid', () => {
  const f = fixture();
  f.put(path.join(path.dirname(f.options.reportPath), f.report.results[0].file), { ...f.capture, extra: true });
  const result = loadNormalLineBoxReport(f.options);
  assert.equal(result.errors.length, 1); assert.deepEqual(result.observations, []);
});

test('line-box loader rejects a report path outside the artifact boundary before reading', () => {
  const f = fixture(); f.options.reportPath = 'package.json';
  const result = loadNormalLineBoxReport(f.options);
  assert.match(result.errors[0], /escapes its allowed directory/);
});
