import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { verifyCaseIndexAssertionMigration } from './case-index-assertion-migration.mjs';
import { restoreScalarReviewExtraction } from './position-composition-producer-transition.mjs';
import { verifyRootInitialSourceApplicability } from '../../scripts/diagnose-material-root-initial-receipt.mjs';
const file = 'tests/material-parity/input-equivalence-audit.spec.mjs';
const previous = execFileSync('git', ['show', `6833850:${file}`], { maxBuffer: 8 * 1024 * 1024 });
const current = readFileSync(file, 'utf8');

test('entire legacy suite conserves statements outside nine receipt checks and the exact inventory extension', () => {
  const producerFile = 'tests/material-parity/input-equivalence-audit.mjs';
  const registration = "    'scripts/diagnose-material-root-initial-receipt.mjs',\n" +
    "    'tests/material-parity/case-index-assertion-migration.mjs',\n";
  const rawProducer = readFileSync(producerFile, 'utf8').replaceAll('\r\n', '\n');
  // Reuse the exact late-proof/extraction transition before applying the
  // unchanged complete predecessor assertion; do not waive new source drift.
  const producer = restoreScalarReviewExtraction(rawProducer);
  assert.throws(() => restoreScalarReviewExtraction(rawProducer.replace(
    'original SVG GPU upload adaptation boundary', 'unreviewed SVG conclusion')));
  assert.throws(() => restoreScalarReviewExtraction(rawProducer.replace(
    'configured progress focus cap and lifecycle evidence boundary', 'unreviewed progress acceptance')));
  assert.throws(() => restoreScalarReviewExtraction(rawProducer + '\nconst unrelatedProducerChange = true;\n'));
  const predecessor = execFileSync('git', ['show', `c3e0be17:${producerFile}`],
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }).replaceAll('\r\n', '\n');
  assert.equal(producer.split(registration).length, 2, 'exact two dependency registrations');
  assert.ok(producer.replace(registration, '') === predecessor,
    'entire producer conserved except the two appended applicability dependencies');
  const result = verifyCaseIndexAssertionMigration(previous, current);
  assert.equal(result.replacedReceiptAssertions, 9);
  assert.equal(result.allOtherStatementsConserved, true);
  assert.equal(result.mappingReadAdapterAuthenticated, true);
  assert.equal(result.captureDiagnosticsProjectionAuthenticated, true);
  assert.deepEqual(result.addedIsolatedTests, [
    'disabled radio registration preserves the complete finding and producer predecessors',
    'retained disabled composite focus binds exact current authoring and radio-only Tab divergence',
    'outline token divider extension requires zero-width currentColor other sides and rejects forged coverage',
    'mapped border initial proof covers original aliases without erasing scalar rule gaps',
    'mapped card border token preserves shorthand and proves omitted style and color',
    'card border token classification preserves all membership and rejects forged rows',
    'mapped dialog action border proof retains explicit top border and limits classification to other sides',
    'mapped dialog panel border proof requires its exact serialized no-motion override',
    'mapped button reset verifies every dialog owner and rejects competing or incomplete evidence',
    'mapped button reset classification preserves full membership and rejects forged rows',
    'mapped border integration rejects classifications without authenticated original cases',
    'border initial-color heading owners retain conservative declaration and provenance checks',
    'divider runtime registration preserves complete predecessor source and rejects altered entry',
    'passive proof registration conserves complete predecessor production source and inventory',
    'popup proof batch adds four registrations without changing predecessor inventory',
    'recent public and popup proofs join existing inventories without changing predecessor entries',
    'retained progress paint binds plugin geometry and unequal track inputs',
    'retained compact empty and filled inputs bind authored inset before projection',
    'retained keyboard profiles replay original assertions and bind the Escape-only handler',
    'retained empty caret rasters preserve visibility and unequal ink inputs',
    'retained applied-theme popup focus states preserve action boundaries',
    'retained selection states preserve palettes and original geometry failures',
    'retained tooltip textures separate popup placement from raster phase',
    'retained Tab, popup-state and email-edit boundaries preserve exact action evidence',
    'retained standalone visibility disabled and selection cohorts preserve exact receipts and failures',
    'recent source diagnostics conserve predecessor findings and reject altered receipts or conclusions',
    'descendant color ancestry rejects broken links and intervening requests without claiming owner equivalence',
  ]);
  assert.deepEqual(result.addedFocusedImports, ['./border-initial-input-evidence.mjs', './audit-normalization-contracts.mjs']);
  assert.match(result.originalSuiteAstSha256, /^[a-f0-9]{64}$/);
});

test('root initial applicability authenticates every receipt and rejects unrelated source mutations', () => {
  const saved = JSON.parse(readFileSync('docs/material-root-initial-style-audit.json'));
  assert.equal(verifyRootInitialSourceApplicability(saved).testProjection.allOtherStatementsConserved, true);
  assert.throws(() => verifyRootInitialSourceApplicability(saved, { readSource: file => {
    const bytes = readFileSync(file);
    return file === 'tests/material-parity/input-equivalence-policy.mjs'
      ? Buffer.from(bytes.toString().replace('fixture-progress-host-focusability-input-omitted', 'unreviewed-progress-equivalence')) : bytes;
  } }));
  for (const descriptor of saved.sourceFingerprints) {
    const forged = structuredClone(saved);
    forged.sourceFingerprints.find(s => s.file === descriptor.file).sha256 = '0'.repeat(64);
    assert.throws(() => verifyRootInitialSourceApplicability(forged), descriptor.file);
    assert.throws(() => verifyRootInitialSourceApplicability(saved, { readSource: file => {
      const bytes = readFileSync(file);
      return file === descriptor.file ? Buffer.concat([bytes, Buffer.from('\nconst unrelatedSourceChange = true;\n')]) : bytes;
    } }), descriptor.file);
  }
});
test('migration proof rejects unrelated assertion changes, missing checks and wrong index identity', () => {
  for (const changed of [
    current.replace('currentRegistered.length, 150', 'currentRegistered.length, 149'),
    current.replace('const registered = currentRegistered.slice(0, -2)', 'const registered = currentRegistered.slice(0, -3)'),
    current.replace('actualSourceFingerprints.length, 542', 'actualSourceFingerprints.length, 541'),
    current.replace('actualSourceFingerprints.slice(0, -1)', 'actualSourceFingerprints.slice(0, -2)'),
    current.replace("const svgSource = 'tests/material-parity/icon-asset-input.spec.mjs'", "const svgSource = 'tests/material-parity/unreviewed.spec.mjs'"),
    current.replace('e0deae3e16d9c5414383fc5e45ce071aa44193f48ee8d4908337712aff53dde4', '0'.repeat(64)),
    current.replace('registered.length, 148', 'registered.length, 147'),
    current.replace('assert.equal(index.sourceFingerprints.length, 11)', 'assert.equal(index.sourceFingerprints.length, 10)'),
    current.replace("assertHistoricalCaseIndexSources('docs/material-container-caret-audit.json', index);", ''),
    current.replace("assertHistoricalCaseIndexSources('docs/material-container-caret-audit.json', index)", "assertHistoricalCaseIndexSources('docs/material-root-height-audit.json', index)"),
    current.replace('audit.sourceFingerprints.length, 541', 'audit.sourceFingerprints.length, 540'),
    current.replace('laterFiles.length, 111', 'laterFiles.length, 110'),
    current.replace('stage424Files.length, 424', 'stage424Files.length, 423'),
    current.replace("ts.createSourceFile('inventory.mjs', source", "ts.createSourceFile('inventory.mjs', baselineSource"),
    current.replace('calls.every(n => ts.isCallExpression(n)', 'calls.some(n => ts.isCallExpression(n)'),
    current.replace('345051b81ed3305bd3fa14ee97e67407936e4b50659df44f420089de1d370a6f', '0'.repeat(64)),
    current.replace(' && !recentProofFiles.includes(f)', ''),
    current.replace("'scripts/diagnose-material-root-initial-receipt.mjs',", "'scripts/unreviewed-applicability.mjs',"),
    current.replace('elements.slice(-8)', 'elements.slice(-7)'),
    current.replace('b5a012e6363332a86a27f4fcdbd68cd44b85bd0eb5a73c5655363171f3eba593', '0'.repeat(64)),
    current.replace('...expectedFiles, ...launchFiles, ...recentProofFiles', '...expectedFiles, ...recentProofFiles'),
    current.replace("'reviewed-source-batch-pipeline.spec.mjs',", "'wrong-source.spec.mjs',"),
    current.replace(' && !additions.includes(f)', ''),
    current + "\ntest('additional case index', () => {});\n",
    current + "\ntest('additional focused check', createCallback());\n",
    current + "\ntest('additional focused check', { skip: true }, () => {});\n",
    current + "\nconst eagerChange = mutateSharedState();\n",
    current.replace('? restoreMappingReadAdapterSource(source, readFileSync(source.file))', '? source.sha256'),
    current.replace("from './border-initial-input-evidence.mjs'", "from './unreviewed-module.mjs'"),
    current.replace('borderColorProperties } from', 'borderColorProperties, unreviewed } from'),
    current + "\nimport './unreviewed-side-effects.mjs';\n",
    current.replace("restoreGapCaptureDiagnostics(readFileSync(source.file, 'utf8'))", 'source.sha256'),
  ]) {
    assert.ok(changed !== current, 'negative control must change the current suite');
    assert.throws(() => verifyCaseIndexAssertionMigration(previous, changed));
  }
});
