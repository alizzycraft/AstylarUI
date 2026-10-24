import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import path from 'node:path';
import { sourceAuditDefinitions } from './input-equivalence-policy.mjs';
import { loadCaseObligationReview } from '../../scripts/audit-findings-store.mjs';
import { createSliderStateInputReviewReader, sliderStateInputReview } from './slider-state-input-review-source.mjs';
import { restoreSliderStateInputExportSource, restoreSliderStateInputSharedRegistration, restoreSliderStateInputPreviousTest, restoreSliderStateInputPolicy, restoreSliderStateInputPreviousTableTest, restoreSliderStateInputProducer, restoreSliderStateInputPreviousReader } from './slider-state-registration.mjs';
import { restoreRetainedFocusExportSource, retainedStaticSemanticPopulation, restoreRootDepthPolicy, restoreRetainedFocusProducer } from './static-semantic-registration.mjs';

test('Slider state input inventory preserves accepted sources and proofs', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs', source = readFileSync(file, 'utf8');
  const prior = restoreSliderStateInputProducer(source);
  const collect = text => {
    const ast = ts.createSourceFile(file, text, 99, true);
    const owner = name => ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
    const code = ['proof', 'sourceFingerprints', 'focusedProofInventory'].map(name => owner(name).getText(ast)).join('\n');
    return new Function('readFileSync', 'path', 'createHash', code + ';return {sources:sourceFingerprints(process.cwd()),proofs:focusedProofInventory(process.cwd())};')
      (readFileSync, path, createHash);
  };
  const current = collect(source), accepted = collect(prior);
  assert.equal(current.sources.length, 968); assert.equal(current.proofs.length, 293);
  assert.equal(new Set(current.sources.map(row => row.file)).size, 968);
  assert.deepEqual(current.sources.slice(6), accepted.sources);
  assert.deepEqual(current.proofs.slice(8), accepted.proofs);
  assert.ok(current.proofs.slice(0, 8).every(row => row.line > 0));
  // Compare against the authenticated accepted-generation vector,not only two
  // evaluations using today's files. Reuse its bounded extract,not a2GB decode.
  const extract = readFileSync('artifacts/material-parity/slider-focus-candidate-structural-extraction-20261024.log');
  assert.equal(createHash('sha256').update(extract).digest('hex'),
    '79831b46ed0c0486237d03700456d3a72383d0d4f36a9d2ec606008d41601aa8');
  const archived = JSON.parse(extract.toString('utf16le').replace(/^\ufeff/, ''));
  assert.equal(archived.manifest.compressedSha256, 'a65965fb3c03198c1f50dccb10521dc7411bf9346da89416846975edfc1605af');
  const before = new Map(archived.sourceFingerprints.map(row => [row.file, row]));
  const after = new Map(current.sources.map(row => [row.file, row]));
  assert.deepEqual([...before.keys()].filter(file => !after.has(file)), []);
  assert.deepEqual(current.sources.filter(row => !before.has(row.file)).map(row => row.file), current.sources.slice(0, 6).map(row => row.file));
  const restores = new Map([
    ['scripts/run-material-input-audit.mjs', source => restoreSliderStateInputExportSource(source, 'runner')],
    ['scripts/export-material-input-audit-current-ancestry.mjs', source => restoreSliderStateInputExportSource(source, 'launcher')],
    ['tests/material-parity/static-semantic-registration.mjs', restoreSliderStateInputSharedRegistration],
    ['tests/material-parity/slider-hover-held-case-review-source.spec.mjs', restoreSliderStateInputPreviousTest],
    ['tests/material-parity/input-equivalence-policy.mjs', restoreSliderStateInputPolicy],
    ['tests/material-parity/table-label-case-review-source.spec.mjs', restoreSliderStateInputPreviousTableTest],
    ['tests/material-parity/input-equivalence-audit.mjs', restoreSliderStateInputProducer],
    ['tests/material-parity/slider-hover-held-case-review-source.mjs', restoreSliderStateInputPreviousReader],
  ]);
  const changed = current.sources.filter(row => before.has(row.file) && before.get(row.file).sha256 !== row.sha256);
  assert.deepEqual(changed.map(row => row.file).sort(), [...restores.keys()].sort());
  for (const row of changed) assert.equal(createHash('sha256').update(restores.get(row.file)(readFileSync(row.file))).digest('hex'), before.get(row.file).sha256);
  for (const [file, row] of before) if (!restores.has(file)) assert.deepEqual(after.get(file), row);
  const withoutLine = rows => rows.map(({ line, ...row }) => row);
  assert.deepEqual(withoutLine(current.proofs.slice(8)), withoutLine(archived.focusedProofs));
  assert.equal(restoreRetainedFocusProducer(source), restoreRetainedFocusProducer(prior));
  assert.throws(() => restoreSliderStateInputProducer(source + '\n// drift\n'));
  assert.throws(() => restoreRetainedFocusProducer(source + '\n// drift\n'));
  const restored = restoreSliderStateInputPreviousReader(readFileSync('tests/material-parity/slider-hover-held-case-review-source.mjs'));
  assert.equal(createHash('sha256').update(restored).digest('hex'),
    'e5928dd86ad6780d9de3b299890e13afd9c94eae6c5c5ecc0f70573b2d7d70a2');
});

test('Slider state-layer source finding preserves every accepted definition and production detection', () => {
  const file = 'tests/material-parity/input-equivalence-policy.mjs', current = readFileSync(file, 'utf8');
  const prior = restoreSliderStateInputPolicy(current);
  const ast = ts.createSourceFile(file, prior, 99, true);
  const owner = ast.statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations])
    .find(node => node.name.getText(ast) === 'sourceAuditDefinitions');
  const accepted = new Function('return ' + owner.initializer.getText(ast))();
  assert.equal(sourceAuditDefinitions.length, 193); assert.equal(accepted.length, 192);
  assert.deepEqual(sourceAuditDefinitions.slice(0, 192), accepted);
  assert.deepEqual(retainedStaticSemanticPopulation(sourceAuditDefinitions), retainedStaticSemanticPopulation(accepted));
  assert.equal(restoreRootDepthPolicy(current), restoreRootDepthPolicy(prior));
  const producer = readFileSync('tests/material-parity/input-equivalence-audit.mjs', 'utf8');
  const tree = ts.createSourceFile('producer.mjs', producer, 99, true);
  const scan = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'scanMaterialSources');
  const execute = definitions => new Function('sourceAuditDefinitions', 'path', 'readFileSync',
    scan.getText(tree) + ';return scanMaterialSources(process.cwd());')(definitions, path, readFileSync);
  const findings = execute(sourceAuditDefinitions); assert.equal(findings.length, 193);
  assert.deepEqual(findings.slice(0, 192), execute(accepted));
  const added = findings[192]; assert.equal(added.id, 'fixture-slider-state-layer-composition');
  assert.equal(added.detected, true); assert.equal(added.locations.length, 1);
  assert.equal(added.classification, 'application-plugin-authoring-defect');
  assert.match(added.boundary, /not whole-case/);
  const altered = structuredClone(sourceAuditDefinitions); altered[192].owner = 'invented core alpha diagnosis';
  assert.throws(() => retainedStaticSemanticPopulation(altered));
  assert.throws(() => restoreSliderStateInputPolicy(current + '\n// drift\n'));
  assert.equal(createHash('sha256').update(restoreSliderStateInputPreviousTableTest(
    readFileSync('tests/material-parity/table-label-case-review-source.spec.mjs'))).digest('hex'),
  '99d0fe415834800b1ebdefbb076a2618ec2d1b79045e8e34910b0d73c9e1daa5');
});

test('Slider state-input export selection preserves prior sources and actual routing', () => {
  const launcher = 'scripts/export-material-input-audit-current-ancestry.mjs';
  const launch = flags => spawnSync(process.execPath, [launcher, '--dry-run', ...flags], { encoding: 'utf8', windowsHide: true });
  const selected = launch(['--slider-state-inputs']); assert.equal(selected.status, 0, selected.stderr);
  const args = JSON.parse(selected.stdout).args;
  assert.ok(args.includes(`--case-obligation-review-sha256=${sliderStateInputReview}`));
  assert.ok(args.includes(`--case-obligation-review=artifacts/material-parity/working-audit/proposals/${sliderStateInputReview}.json`));
  for (const flag of ['--static-ax', '--card-inputs', '--expansion-semantics', '--stepper-inputs', '--tabs-menu-sheet',
    '--static-semantic-inputs', '--popup-depth-inputs', '--scrollbar-paint', '--table-label-paint', '--radio-caret-paint',
    '--retained-focus', '--slider-hover-held']) {
    const older = launch([flag]); assert.equal(older.status, 0, older.stderr);
    assert.ok(!older.stdout.includes(sliderStateInputReview));
    const conflict = launch([flag, '--slider-state-inputs']); assert.notEqual(conflict.status, 0);
    assert.match(conflict.stderr, /Choose one case-review supplement/);
  }
  const ordinary = launch([]); assert.equal(ordinary.status, 0); assert.ok(!ordinary.stdout.includes(sliderStateInputReview));
  const check = launch(['--slider-state-inputs', '--check']); assert.notEqual(check.status, 0); assert.match(check.stderr, /Usage:/);
  for (const [file, kind] of [['scripts/run-material-input-audit.mjs', 'runner'], [launcher, 'launcher']]) {
    const current = readFileSync(file, 'utf8'), prior = restoreSliderStateInputExportSource(current, kind);
    // Direct shared historical entry,not merely a wrapper used by this successor.
    assert.equal(restoreRetainedFocusExportSource(current, kind), restoreRetainedFocusExportSource(prior, kind));
    assert.throws(() => restoreSliderStateInputExportSource(current + '\n// drift\n', kind));
    assert.throws(() => restoreRetainedFocusExportSource(current + '\n// drift\n', kind));
  }
  const runner = readFileSync('scripts/run-material-input-audit.mjs', 'utf8');
  const ast = ts.createSourceFile('runner.mjs', runner, 99, true), owners = [];
  const visit = node => { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'currentReaderFactory') owners.push(node); ts.forEachChild(node, visit); };
  visit(ast); assert.equal(owners.length, 1);
  const choose = new Function('options', 'sliderStateInputReview', 'createSliderStateInputReviewReader', 'effectiveReaderFactory',
    `return ${owners[0].initializer.getText(ast)};`);
  const prior = () => {};
  assert.equal(choose({ caseObligationReviewSha256: sliderStateInputReview }, sliderStateInputReview, createSliderStateInputReviewReader, prior), createSliderStateInputReviewReader);
  assert.equal(choose({ caseObligationReviewSha256: '0'.repeat(64) }, sliderStateInputReview, createSliderStateInputReviewReader, prior), prior);
  const hash = source => createHash('sha256').update(source).digest('hex');
  assert.equal(hash(restoreSliderStateInputSharedRegistration(readFileSync('tests/material-parity/static-semantic-registration.mjs'))),
    '68db8454d18727ef1aeee13a39d1f96a619ae4389713b7d5c961d349f5d36654');
  assert.equal(hash(restoreSliderStateInputPreviousTest(readFileSync('tests/material-parity/slider-hover-held-case-review-source.spec.mjs'))),
    '30e3cd3f3c40e5455787a1bd4b5c576f025639bf6b8f29591cfa4a85dc27b999');
});

test('Slider state-input successor authenticates the whole review and every evidence dependency', () => {
  const root = process.cwd(), read = readFileSync;
  const file = `artifacts/material-parity/working-audit/proposals/${sliderStateInputReview}.json`;
  const envelope = JSON.parse(read(file));
  const reader = createSliderStateInputReviewReader({ root, read, reviewSha256: sliderStateInputReview });
  const loaded = loadCaseObligationReview(file, sliderStateInputReview,
    envelope.review.groups.map(group => group.case), { root, read: reader.read });
  assert.equal(loaded.cases.length, 2311);
  assert.equal(loaded.evidenceFingerprints.length, 17552);
  assert.equal(reader.sourceApplicability.children, 52);
  assert.ok(loaded.cases.every(group => group.inspection === 'partial' && group.currentRendering === 'unverified'));
  assert.throws(() => createSliderStateInputReviewReader({ root, read, reviewSha256: '0'.repeat(64) }));
  assert.throws(() => createSliderStateInputReviewReader({ root, reviewSha256: sliderStateInputReview,
    read: (file, ...options) => file.endsWith('slider-retained-state-layer.spec.mjs')
      ? Buffer.from('unreviewed source drift') : read(file, ...options) }));
});
