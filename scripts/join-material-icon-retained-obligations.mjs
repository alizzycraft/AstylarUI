import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { PNG } from 'pngjs';
import { evaluateFocusedRaster } from '../tests/material-parity/focused-raster-metrics.mjs';
import { compareBottomShadowProfiles } from '../tests/material-parity/shadow-profile-metrics.mjs';
import { openMaterialCheckpoint, materialCaseKey, fingerprintModuleGraph } from '../tests/material-parity/run-checkpoint.mjs';
import { saveReviewProposal, loadCaseObligationReview, queryFindings } from './audit-findings-store.mjs';
import { readHistoricalBenchmarkSource } from '../tests/material-parity/semantic-text-transform-registration.mjs';
import { restoreEvidenceReaderLookupSource } from '../tests/material-parity/historical-audit-module-source.mjs';

// Reuse the existing exact-case census and original TAP observations. No browser
// capture,reinterpretation of profile labels,or whole-parent promotion.
const script = 'scripts/join-material-icon-retained-obligations.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const base = 'artifacts/material-parity/';
const inlineOutput = execFileSync(process.execPath, ['--test',
  '--test-name-pattern=public inline image line boxes|inline image line height divergence',
  'tests/material-parity/icon-asset-input.spec.mjs'], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
assert.match(inlineOutput, /# pass 2\b/); assert.match(inlineOutput, /# fail 0\b/);
console.log(inlineOutput.trimEnd());
const inlineFile = base + 'public-inline-image-linebox-20261017/latest-report.json';
assert.equal(hash(readFileSync(inlineFile)), 'f7120e8e0aba684a3d0ea5cebf47ea37b9f79158ebd58e5eff2d193e11d22bc1');
const inlineEvidence = { report: { file: inlineFile, sha256: hash(readFileSync(inlineFile)) },
  sources: ['scripts/audit-public-inline-image-linebox.mjs', 'tests/material-parity/icon-asset-input.spec.mjs',
    'src/app/services/dom/elements/element-creation.service.ts'].map(file => ({ file, sha256: hash(readFileSync(file)) })),
  execution: { assertions: 2, failures: 0, browserRecapture: false } };
// Integrate the completed public border distinction,not a new Material capture.
const borderOutput = execFileSync(process.execPath, ['--test',
  '--test-name-pattern=public border live frame|public border contact capture binds|public border contact reduction',
  'tests/material-parity/icon-asset-input.spec.mjs'], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
assert.match(borderOutput, /# pass 3\b/); assert.match(borderOutput, /# fail 0\b/);
console.log(borderOutput.trimEnd());
const borderEvidence = {
  reports: [
    ['public-border-contact-20261017/latest-report.json', '89e5abb3b94d0b1aadbd3d2e8e7818c760f34fe54675946c5d4a284003640aab'],
    ['public-border-contact-geometry-20261017/latest-report.json', '6d9dd5c43393d686cdebb7b3c014f08b2cc97d1908298860c161e2e2fe98a952'],
  ].map(([name, sha256]) => { const file = base + name; assert.equal(hash(readFileSync(file)), sha256); return { file, sha256 }; }),
  sources: ['scripts/audit-public-border-contact.mjs', 'scripts/audit-public-border-contact-geometry.mjs',
    'src/app/services/babylon-mesh.service.ts', 'src/app/services/dom/elements/element-border.service.ts',
    'src/app/services/dom/elements/element-creation.service.ts', 'src/app/services/css-render-boundary.ts']
    .map(file => ({ file, sha256: hash(readFileSync(file)) })),
};
// Coherent integration of the two existing source-bound assertions. Their
// output is retained by this command's caller, not a new browser capture.
const iconProofFile = 'tests/material-parity/icon-asset-input.spec.mjs';
const iconProofSha256 = hash(readFileSync(iconProofFile));
const sourceProofOutput = execFileSync(process.execPath, ['--test',
  '--test-name-pattern=Icon viewport owner keeps|Icon-specific compensation history|Icon shared ancestor history', iconProofFile],
{ encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
assert.equal(hash(readFileSync(iconProofFile)), iconProofSha256);
const sourceProofRows = sourceProofOutput.split(/\r?\n/).filter(line => line.startsWith('# {')).map(line => JSON.parse(line.slice(2)));
assert.equal(sourceProofRows.length, 3);
const rootProof = sourceProofRows.find(row => row.capturedRootMethodsMatch);
const historyProof = sourceProofRows.find(row => row.currentIconInputsMatchRasterIntroduction);
const sharedHistoryProof = sourceProofRows.find(row => row.sharedAncestorHeadingHistory);
assert.equal(sharedHistoryProof.headingStages, 2); assert.equal(sharedHistoryProof.themeContentStages, 2);
assert.equal(sharedHistoryProof.negativeControls, 2);
assert.equal(rootProof.cases, 20); assert.equal(rootProof.executions, 40);
assert.equal(historyProof.iconLeafStages, 2); assert.ok(historyProof.componentRevisions >= 106);
const sourceProofEvidence = {
  test: { file: iconProofFile, sha256: iconProofSha256 },
  sources: ['src/app/services/dom/elements/root.service.ts', 'src/app/services/css-layout-geometry.ts',
    'examples/material-showcase/src/app/astylar.component.ts', 'examples/material-showcase/src/app/reference.component.ts',
    'examples/material-showcase/src/app/theme.ts', 'examples/material-showcase/src/app/material-assets.ts',
    'examples/material-showcase/public/icons/favorite.svg',
    'artifacts/material-parity/retained-evidence/component-map-recovery-20261011/chunk-3JXWRYJY.js.map']
    .map(file => ({ file, sha256: hash(readFileSync(file)) })),
  execution: { command: `node --test --test-name-pattern="Icon viewport owner keeps|Icon-specific compensation history|Icon shared ancestor history" ${iconProofFile}`,
    // TAP timing is diagnostic output,not an input to an immutable review ID.
    assertionSummarySha256: hash(JSON.stringify(sourceProofRows)), exitCode: 0 },
};
console.log(sourceProofOutput.trimEnd());
const lifetimeSuite = 'tests/material-parity/input-boundary-evidence.spec.mjs';
const lifetimeSuiteSource = readFileSync(lifetimeSuite, 'utf8');
const originalLifetimeSuiteSha = 'f3f554b3d08bb8ad7018ff1fb6dc9f588fb17afe984d2c8835b68590269c9116';
let restoredLifetimeSuite = lifetimeSuiteSource;
for (const [before, after] of [
  ["import { restoreCursorInspectorCaptureSource } from './public-cursor-defaults-evidence.mjs';\n", ''],
  [`  for (const receipt of [provenance.script, ...provenance.bundleInputs]) {
    const current = readFileSync(receipt.file);
    if (receipt.file === 'examples/material-showcase/node_modules/astylarui/dist/lib/lib/astylar.js'
      && hash(current) === 'a18630bdc31067ac75907e41f9031865fa192edc164ebf93edacb8b836b09abd') {
      // Exact existing inspector-only transition;captured bundle remains original.
      assert.equal(hash(restoreCursorInspectorCaptureSource(current.toString())), receipt.sha256);
    } else assert.equal(hash(current), receipt.sha256);
  }`, '  for (const receipt of [provenance.script, ...provenance.bundleInputs]) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);'],
  ["  assert.deepEqual(verifyRetainedMaterialBrowserFiles(manifest.provenance.browserFiles),\n    { authenticatedFiles: 1887, currentRenderingAccepted: false });\n  const assets = new Map(manifest.provenance.browserFiles.map(receipt => [receipt.file, receipt.sha256]));",
    "  assert.deepEqual(fingerprintDirectory('examples/material-showcase/dist/material-showcase/browser'), manifest.provenance.browserFiles);\n  const assets = new Map(manifest.provenance.browserFiles.map(receipt => [receipt.file, receipt.sha256]));"],
]) {
  assert.equal(restoredLifetimeSuite.split(before).length, 2);
  restoredLifetimeSuite = restoredLifetimeSuite.replace(before, after);
}
assert.equal(hash(restoredLifetimeSuite), originalLifetimeSuiteSha, 'Every original behavioral assertion survives the two historical verification boundaries');
const sourceTransitions = new Map([[lifetimeSuite, { previous: originalLifetimeSuiteSha, current: hash(lifetimeSuiteSource) }]]);
for (const file of ['tests/material-parity/input-equivalence-policy.mjs', 'tests/material-parity/benchmark-config.spec.mjs']) {
  sourceTransitions.set(file, { previous: hash(readHistoricalBenchmarkSource(file, 'utf8')), current: hash(readFileSync(file)) });
}
const cropSuite = 'tests/material-parity/alignment-crop-provenance.spec.mjs';
let oldCropSuite = readFileSync(cropSuite, 'utf8');
for (const [before, after] of [
  ["    ['scripts/check-retained-paragraph-font-box.mjs', '--compare-current-browser'],", "    ['scripts/check-retained-paragraph-font-box.mjs'],"],
  [`  ]) {
    const output = execFileSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 4_000_000 });
    if (args[0] === 'scripts/check-retained-paragraph-font-box.mjs') {
      const proof = JSON.parse(output);
      assert.equal(proof.comparison.mode, 'fresh-current-browser-versus-retained-measurements');
      assert.equal(proof.comparison.recordedBrowser, '155.0.8059.40');
      assert.ok(proof.comparison.observedRuntime.browser);
      assert.equal(proof.comparison.observationsCompared, 8);
      assert.equal(proof.comparison.allNumericComparisonsUnchanged, true);
      assert.equal(proof.comparison.currentRenderingAccepted, false);
    }
  }`, "  ]) execFileSync(process.execPath, args, { stdio: 'pipe', maxBuffer: 4_000_000 });"],
]) {
  assert.equal(oldCropSuite.split(before).length, 2); oldCropSuite = oldCropSuite.replace(before, after);
}
assert.equal(hash(oldCropSuite), 'd55afc2c7e4e1b5eafbfc7af6bc0fbda285ea2791554992368988a7cf041614c');
sourceTransitions.set(cropSuite, { previous: hash(oldCropSuite), current: hash(readFileSync(cropSuite)) });
const lifetimeOutput = execFileSync(process.execPath, ['--test', '--test-name-pattern=Icon pending image Angular remount|Icon live theme replacement queues|minimal public mount cancellation|current initial-render reporter', lifetimeSuite], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
assert.match(lifetimeOutput, /# pass 4\b/); assert.match(lifetimeOutput, /# fail 0\b/);
const supplementalLifetimeReports = [
  ['icon-pending-remount-failure-bound-20261010/failure-observations.json', '2dbbcbf1baafc2ace9104fdac481be7e4ace436b4ddbdda8c8acd821b1f5c2db'],
  ['icon-live-replacement-queued-20261010/latest-report.json', '8041e452348889e80c8819365d9135fe265f9962c788374c2f8c0a0582d25048'],
  ['public-initial-cancellation-20261010/failure-observations.json', '887682d6ac5b4e9291186d5b8d97407872b4173364d72fa7a9f206999005323d'],
].map(([name, sha256]) => { const file = base + name; assert.equal(hash(readFileSync(file)), sha256); return { file, sha256 }; });
const supplementalLifetimeEvidence = { reports: supplementalLifetimeReports,
  sources: [lifetimeSuite, 'tests/material-parity/historical-audit-module-source.mjs',
    'tests/material-parity/public-cursor-defaults-evidence.mjs', 'src/lib/astylar.ts', 'src/lib/astylar-render-session.ts']
    .map(file => ({ file, sha256: hash(readFileSync(file)) })),
  execution: { assertions: 4, failures: 0, browserRecapture: false } };
console.log(lifetimeOutput.trimEnd());
const visibleFile = base + 'icon-visible-heading-paint-20261017/latest-report.json';
const visibleBytes = readFileSync(visibleFile);
assert.equal(hash(visibleBytes), '9b2df5c9ac47320641dee96698f475d1b49c12221ed8db775f53cbb18cad4b69');
const visible = JSON.parse(visibleBytes), visibleDriver = 'scripts/audit-material-visible-heading-paint.mjs';
const visibleVerification = JSON.parse(execFileSync(process.execPath, [visibleDriver, '--verify', visibleFile], { encoding: 'utf8' }));
assert.deepEqual(visibleVerification, { contexts: 16, measuredHeadingPairs: 32, currentRenderingAccepted: false });
const visibleEvidence = { report: { file: visibleFile, sha256: hash(visibleBytes) },
  driver: { file: visibleDriver, sha256: hash(readFileSync(visibleDriver)) },
  checkpoint: visible.capture.checkpointManifest, sources: visible.capture.sources, theme: visible.themeSource };
const headingAxFile = base + 'icon-heading-ax-20261017/latest-report.json';
const headingAxBytes = readFileSync(headingAxFile);
assert.equal(hash(headingAxBytes), '1e2136092c03bab263e22e45ef6d548eceae2ce91783f158dad2c3584eb3e46f');
const headingAx = JSON.parse(headingAxBytes);
const headingAxCheck = JSON.parse(execFileSync(process.execPath, ['scripts/check-material-icon-heading-ax.mjs'], { encoding: 'utf8' }));
assert.equal(headingAxCheck.contexts, 16); assert.equal(headingAxCheck.targetObservations, 64);
assert.equal(headingAxCheck.matchingTitles, 0); assert.equal(headingAxCheck.equalTransformInputs, 64);
assert.equal(headingAxCheck.negativeControlsRejected, 4);
const publicHeadingOwner = JSON.parse(execFileSync(process.execPath, ['scripts/check-public-text-transform-owner.mjs'], { encoding: 'utf8' }));
assert.equal(publicHeadingOwner.verification.equalInputSemanticMismatches, 4);
assert.equal(publicHeadingOwner.verification.noTransformControls, 2);
assert.equal(publicHeadingOwner.verification.negativeControlsRejected, 3);
const headingEvidence = {
  report: { file: headingAxFile, sha256: hash(headingAxBytes) },
  checkpoint: headingAx.capture.checkpointManifest, sources: headingAx.capture.sources, theme: headingAx.themeSource,
  publicReproduction: { file: base + 'public-text-transform-ax-20261017/latest-report.json', sha256: publicHeadingOwner.reportSha256 },
  owningSources: publicHeadingOwner.files,
  verifiers: ['scripts/check-material-icon-heading-ax.mjs', 'scripts/check-public-text-transform-owner.mjs',
    'scripts/audit-public-text-transform-ax.mjs'].map(file => ({ file, sha256: hash(readFileSync(file)) })),
};
const predecessor = '117a41db956f86e1465b8de0fee9e3d5a0fd3073049c1698a837fd0eee4ec3cb';
const review = JSON.parse(readFileSync(`${base}working-audit/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const lifetimeReceiptChanges = [];
function refreshLifetimeSourceReceipt(value) {
  if (!value || typeof value !== 'object') return;
  const transition = sourceTransitions.get(value.file);
  if (transition && typeof value.sha256 === 'string') {
    assert.equal(value.sha256, transition.previous);
    lifetimeReceiptChanges.push({ receipt: value, previous: transition.previous }); value.sha256 = transition.current;
  }
  for (const child of Object.values(value)) refreshLifetimeSourceReceipt(child);
}
refreshLifetimeSourceReceipt(review); assert.ok(lifetimeReceiptChanges.length > 0);
const receipts = [
  ['icon-update-disposal-20261007.log', '18229d6c75d784e13b6014d040277a3313976798136dd9bb948b04d0e376f098'],
  ['icon-responsive-update-disposal-20261007.log', '22b822f1921a10a843c8cd9cb1c3f8ff52636fd12c8dee832638cb3f722e954a'],
  ['passive-badge-icon-ax-verified-20261006.log', 'be9aab6af9e9033e6d81efaee354bdb1aa5b4b237d4074edacda499f241a2516'],
  ['icon-remaining-ax-20261007.log', '3613ac867242858953e2d4a31342b319e0d2c504ce15590682718354979d8612'],
].map(([name, sha256]) => {
  const file = base + name, bytes = readFileSync(file); assert.equal(hash(bytes), sha256);
  return { file, sha256, records: bytes.toString().split(/\r?\n/).filter(s => s.startsWith('# {')).map(s => JSON.parse(s.slice(2))) };
});
const censusFile = base + 'icon-case-obligation-join-20261007-retry.log';
const censusBytes = readFileSync(censusFile);
assert.equal(hash(censusBytes), '1bcab2aec1654311852a6e9c1766f162e1ce8434aff943ecb018f9337645967f');
const census = JSON.parse(censusBytes);
assert.equal(census.configuredCases, 20); assert.equal(census.physicalCohorts, 16);
const reportBytes = readFileSync(base + 'current-full-20261005/latest-report.json');
assert.equal(hash(reportBytes), census.reportSha256);
assert.equal(census.reportSha256, 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
const report = JSON.parse(reportBytes);
const freshDirectory = base + 'icon-fresh-producer-retained-build-20261016';
const freshFile = freshDirectory + '/latest-report.json', freshBytes = readFileSync(freshFile);
assert.equal(hash(freshBytes), 'ec08642c4a7d5b7830805bf2de4489c318a4b1d338d7148483004ba16a5a4e26');
const fresh = JSON.parse(freshBytes), manifestFile = freshDirectory + '/checkpoint/manifest.json';
const manifestBytes = readFileSync(manifestFile), manifest = JSON.parse(manifestBytes);
assert.deepEqual(manifest.provenance.harnessFiles, fingerprintModuleGraph(process.cwd(), 'tests/material-parity/run-material-parity.mjs'));
const freshCheckpoint = openMaterialCheckpoint({ directory: freshDirectory, provenance: manifest.provenance, resume: true });
const freshCases = new Map([
  ...fresh.results.map(r => [`static/icon/${r.profile}/${r.viewport.id}/initial`, { kind: 'static', result: r }]),
  ...fresh.interactions.map(r => [`interaction/icon/${r.profile}/${r.viewport.id}/${r.state}`, { kind: 'interaction', result: r }]),
]);
assert.equal(freshCases.size, 20);
const rootPaintFile = base + 'icon-retained-root-paint-verified-20261017.json';
const rootPaintBytes = readFileSync(rootPaintFile);
assert.equal(hash(rootPaintBytes), 'ff56c512ab65121267e163640613147df59e047204d07862e9fbc321ef469a31');
const rootPaint = JSON.parse(rootPaintBytes);
const verifyReceipt = receipt => {
  const bytes = readFileSync(receipt.file);
  assert.equal(hash(receipt.file === 'scripts/audit-findings-store.mjs'
    ? restoreEvidenceReaderLookupSource(bytes) : bytes), receipt.sha256, receipt.file);
};
const rootPaintSources = rootPaint.sources.map(receipt => {
  verifyReceipt(receipt);
  return receipt.file === 'scripts/audit-findings-store.mjs' ? { ...receipt,
    capturedSha256: receipt.sha256, sha256: hash(readFileSync(receipt.file)),
    applicability: 'Exact tested lookup-only transition;complete query/closure/hash and other source conserved' } : receipt;
});
[rootPaint.sourceReport, rootPaint.checkpointManifest, rootPaint.canonicalIndex].forEach(verifyReceipt);
assert.equal(rootPaint.sourceReport.sha256, hash(freshBytes));
const oldRootPointer = { generation: path.basename(path.dirname(rootPaint.canonicalIndex.file)), indexSha256: rootPaint.canonicalIndex.sha256 };
assert.equal(hash(JSON.stringify(oldRootPointer, null, 2) + '\n'), rootPaint.canonicalPointer.sha256);
const shadowRows = snapshot => queryFindings(base + 'working-audit', 'icon', snapshot)
  .filter(row => row.element === 'icon-root' && row.property === 'boxShadow');
const oldShadow = shadowRows(oldRootPointer), currentShadow = shadowRows();
assert.equal(oldShadow.length, 1); assert.equal(currentShadow.length, 1);
assert.deepEqual(rootPaint.existingShadowInputClassification, oldShadow[0]);
assert.equal(oldShadow[0].evidence.completeRowSha256, currentShadow[0].evidence.completeRowSha256);
function verifyRootPaintRecord(record) {
  const matched = [...freshCases.values()].filter(({ kind, result }) => record.case ===
    `${kind}:icon@${result.profile}/${result.viewport.id}${kind === 'interaction' ? '/' + result.state : ''}`);
  assert.equal(matched.length, 1);
  const row = matched[0].result;
  assert.deepEqual(record.viewport, row.viewport);
  for (const [name, id] of [['root', 'icon-root'], ['child', 'icon-primary']])
    assert.deepEqual(record.geometry[name], row.geometry.elements.find(element => element.id === id));
  const input = row.styleInputs.find(style => style.id === 'icon-root');
  assert.deepEqual(record.inputs, { reference: input.reference, candidate: input.astylar });
  verifyReceipt(record.evidence.checkpoint);
  const images = {};
  for (const side of ['reference', 'astylar']) {
    assert.deepEqual(record.evidence.pairedTrees[side], row.inputTrees[side]);
    verifyReceipt(record.evidence.pairedTrees[side]); verifyReceipt(record.evidence.images[side]);
    images[side] = PNG.sync.read(readFileSync(record.evidence.images[side].file));
  }
  for (const raster of Object.values(record.rasters)) {
    const actual = evaluateFocusedRaster(recordedCrop(images.reference, raster.bounds),
      recordedCrop(images.astylar, raster.bounds), { maximumPhaseOffset: 0 });
    // Preserve the original finite JSON/-0 contract,not a phase correction.
    assert.deepEqual(JSON.parse(JSON.stringify(actual)), raster.metrics);
  }
  const actualShadow = compareBottomShadowProfiles(images.reference, images.astylar,
    record.geometry.root.expected, record.geometry.root.actual, row.viewport.deviceScaleFactor);
  for (const name of Object.keys(actualShadow)) assert.deepEqual(actualShadow[name], record.shadow[name]);
}
assert.equal(rootPaint.records.length, 20);
const rootPaintCases = new Map(rootPaint.records.map(record => [record.case, record]));
assert.equal(rootPaintCases.size, 20);
rootPaint.records.forEach(verifyRootPaintRecord);
for (const change of [record => { record.geometry.root.expected.left++; }, record => { record.shadow.rowErrors[0]++; }]) {
  const forged = structuredClone(rootPaint.records[0]); change(forged);
  assert.throws(() => verifyRootPaintRecord(forged));
}
assert.equal(rootPaint.records.filter(record => !record.shadow.matches).length, 3);
const rootPaintEvidence = { report: { file: rootPaintFile, sha256: hash(rootPaintBytes) },
  sources: rootPaintSources, sourceReport: rootPaint.sourceReport, checkpoint: rootPaint.checkpointManifest,
  readerTransitionVerifier: { file: 'tests/material-parity/historical-audit-module-source.mjs', sha256: hash(readFileSync('tests/material-parity/historical-audit-module-source.mjs')) },
  historicalIndex: rootPaint.canonicalIndex };
assert.equal(fresh.summary.meetsAcceptance, false); assert.equal(fresh.interactionSummary.meetsAcceptance, false);
const inspectFile = base + 'icon-inspect-local-paint-20261007.log', inspectBytes = readFileSync(inspectFile);
assert.equal(hash(inspectBytes), 'a253a8331dfffa856f1f886451487cb6a4a394a56837054fdb7a4eb448b6b1d7');
const [inspectReceipt, ...inspectRows] = inspectBytes.toString().trim().split(/\r?\n/).map(JSON.parse);
assert.equal(inspectReceipt.reportSha256, hash(reportBytes)); assert.equal(inspectRows.length, 8);
const metricSources = [
  ['tests/material-parity/focused-raster-metrics.mjs', 'c84839968d5ba77534a0af4d56f31f187cd941e607a8418959a1b0771f92e1e0'],
  ['tests/parity/sharpness-metrics.mjs', '70deaaecebd87fa0b8778fdd7a4c8e9e0666886cb110af049e65c34e15654125'],
  ['tests/tts-parity/interaction-metrics.mjs', '171423516c4afac56e696ca7da13e9bc412bdca89e70d4bec308caf6bf6cd3bc'],
].map(([file, sha256]) => { assert.equal(hash(readFileSync(file)), sha256); return { file, sha256 }; });
function recordedCrop(image, bounds) {
  const { left, top, right, bottom } = bounds;
  assert.ok([left, top, right, bottom].every(Number.isSafeInteger));
  assert.ok(left >= 0 && top >= 0 && right <= image.width && bottom <= image.height && right > left && bottom > top);
  const width = right - left, height = bottom - top, data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const start = ((top + y) * image.width + left) * 4;
    data.set(image.data.subarray(start, start + width * 4), y * width * 4);
  }
  return { width, height, data };
}
const originalCases = new Map([
  ...report.results.filter(r => r.family === 'icon').map(r => [`static/icon/${r.profile}/${r.viewport.id}/initial`, r]),
  ...report.interactions.filter(r => r.family === 'icon').map(r => [`interaction/icon/${r.profile}/${r.viewport.id}/${r.state}`, r]),
]);
assert.equal(originalCases.size, 20);
for (const receipt of census.receipts) assert.equal(hash(readFileSync(base + receipt.file)), receipt.sha256);
const key = (profile, viewport) => `${profile}/${viewport.width}/${viewport.height}/${viewport.deviceScaleFactor}`;
const visibleContexts = new Map(visible.results.map(row => [key(row.profile, row.viewport), row]));
assert.equal(visibleContexts.size, 16);
assert.deepEqual([...visibleContexts.keys()].sort(), [...new Set(census.cases.map(c => c.cohort))].sort());
const headingContexts = new Map(headingAx.results.map(row => [key(row.profile, row.viewport), row]));
assert.equal(headingContexts.size, 16);
assert.deepEqual([...headingContexts.keys()].sort(), [...visibleContexts.keys()].sort());
const ax = new Map();
for (const r of receipts[3].records.filter(r => r.family === 'icon')) {
  const k = key(r.profile, r.viewport); const pair = ax.get(k) ?? {}; assert.equal(pair[r.mode], undefined);
  pair[r.mode] = r; ax.set(k, pair);
}
const first = receipts[2].records.find(r => r.observations).observations.filter(r => r.family === 'icon');
assert.equal(first.length, 2); ax.set('light/1440/1000/1', Object.fromEntries(first.map(r => [r.mode, r])));
assert.equal(ax.size, 16);
function checkExposure(pair) {
  assert.equal(pair.reference.dom.hidden, 'true');
  assert.ok(pair.reference.nodes[0].ignored);
  assert.ok(pair.reference.nodes[0].ignoredReasons.some(r => r.name === 'ariaHiddenElement' && r.value.value === true));
  assert.equal(pair.astylar.dom.hidden, null);
  assert.equal(pair.astylar.nodes[0].ignored, false);
  assert.equal(pair.astylar.nodes[0].role.value, 'image');
  assert.equal(pair.astylar.nodes[0].name.value, 'Favorite');
}
for (const pair of ax.values()) checkExposure(pair);
let rejected = 0;
for (const mutate of [p => { p.reference.dom.hidden = null; }, p => { p.reference.nodes[0].ignoredReasons = []; },
  p => { p.astylar.nodes[0].ignored = true; }, p => { p.astylar.nodes[0].name.value = 'wrong'; }]) {
  const p = structuredClone(ax.values().next().value); mutate(p); assert.throws(() => checkExposure(p)); rejected++;
}
const originals = [];
function inspectHierarchy(reference, candidate) {
  assert.equal(reference.nodes.length, 7); assert.equal(candidate.nodes.length, 6);
  const unique = nodes => { assert.equal(nodes.length, 1); return nodes[0]; };
  const host = unique(reference.nodes.filter(n => n.attributes?.id === 'icon-root'));
  const icon = unique(reference.nodes.filter(n => n.attributes?.id === 'icon-primary'));
  assert.equal(host.type, 'section'); assert.equal(icon.type, 'mat-icon'); assert.equal(icon.parent, host.key);
  const svg = unique(reference.nodes.filter(n => n.parent === icon.key));
  const leaf = unique(reference.nodes.filter(n => n.parent === svg.key));
  assert.equal(svg.type, 'svg'); assert.equal(svg.attributes.viewBox, '0 0 24 24');
  assert.equal(leaf.type, 'path'); assert.equal(leaf.attributes.fill, 'currentColor');
  assert.ok(leaf.attributes.d.startsWith('M12 21.35 '));
  const page = unique(candidate.nodes.filter(n => n.authored?.id === 'page'));
  const demo = unique(candidate.nodes.filter(n => n.authored?.id === 'icon-root'));
  const image = unique(candidate.nodes.filter(n => n.authored?.id === 'icon-primary'));
  assert.equal(page.authored.type, 'main'); assert.equal(demo.parent, page.key);
  assert.equal(demo.authored.type, 'section'); assert.equal(image.parent, demo.key);
  assert.equal(image.authored.type, 'img'); assert.equal(image.authored.alt, 'Favorite');
  // The existing configured-relationships proof establishes applicability for
  // every recorded node, not hypothetical IDREF variants of this example.
  const idrefs = new Set(['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns',
    'aria-activedescendant', 'aria-flowto', 'aria-details', 'aria-errormessage', 'headers', 'for', 'list', 'form',
    'ariaLabelledby', 'ariaDescribedby', 'ariaControls', 'ariaOwns', 'ariaActivedescendant',
    'ariaFlowto', 'ariaDetails', 'ariaErrormessage', 'htmlFor']);
  for (const [nodes, attributes] of [[reference.nodes, n => n.attributes ?? {}], [candidate.nodes, n => n.authored ?? {}]])
    for (const node of nodes) assert.ok(!Object.keys(attributes(node)).some(key => idrefs.has(key)), 'new Icon relationship requires review');
  assert.equal(icon.attributes['aria-label'], 'Favorite'); assert.equal(icon.attributes['aria-hidden'], 'true');
  assert.equal(icon.attributes.role, 'img'); assert.equal(image.authored.ariaHidden, undefined);
  assert.equal(host.attributes['aria-label'], 'icon showcase'); assert.equal(demo.authored.ariaLabel, 'icon showcase');
  assert.ok(image.authored.src.startsWith('data:image/png;base64,'));
  const png = Buffer.from(image.authored.src.slice('data:image/png;base64,'.length), 'base64');
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), 24); assert.equal(png.readUInt32BE(20), 24);
  const frame = unique(reference.nodes.filter(n => n.key === host.parent)); assert.equal(frame.type, 'main');
  const synthetic = unique(candidate.nodes.filter(n => n.key === page.parent)); assert.deepEqual(synthetic.authored, {});
  const nativeRootStyle = reference.styles[host.style];
  assert.equal(nativeRootStyle.display, 'block');
  assert.equal(reference.styles[frame.style].display, 'block');
  assert.equal(reference.styles[icon.style].display, 'inline-block');
  assert.equal(page.normalResolvedStyle.display, 'block');
  for (const node of [frame, host]) {
    const style = reference.styles[node.style];
    assert.equal(style.overflowX, 'visible'); assert.equal(style.overflowY, 'visible');
    assert.equal(style.clipPath, 'none'); assert.equal(style.clip, 'auto');
  }
  for (const node of [icon, svg]) {
    const style = reference.styles[node.style];
    assert.equal(style.overflowX, 'hidden'); assert.equal(style.overflowY, 'hidden');
    assert.equal(style.clipPath, 'none'); assert.equal(style.transform, 'none');
    assert.equal(style.width, '24px'); assert.equal(style.height, '24px');
  }
  for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']) {
    assert.equal(demo[stage].display, 'flex'); assert.equal(demo[stage].flexDirection, 'column');
    assert.equal(image[stage].display, 'inline-block');
    for (const node of [page, demo, image]) for (const property of ['overflow', 'overflowX', 'overflowY', 'clipPath', 'clip'])
      assert.equal(node[stage][property], undefined, 'Recorded candidate clipping omission must remain explicit');
  }
  const displayRules = candidate.rules.filter(r => r.selector === '#icon-root' && r.display !== undefined);
  assert.equal(displayRules.length, 1); assert.equal(displayRules[0].display, 'flex');
  const paired = [{ reference: frame.key, candidate: page.key }, { reference: host.key, candidate: demo.key }];
  const inheritedHeadingInputs = [];
  assert.equal(demo.authored.textContent, undefined); assert.equal(image.authored.textContent, undefined);
  assert.equal(demo.retainedText, undefined); assert.equal(image.retainedText, undefined);
  for (const [type, id, text] of [['p', 'eyebrow', 'Angular Material 20 reference'], ['h1', 'title', 'icon']]) {
    const left = unique(reference.nodes.filter(n => n.parent === frame.key && n.type === type));
    const right = unique(candidate.nodes.filter(n => n.authored?.id === id));
    assert.equal(left.ownText.trim(), text); assert.equal(right.authored.textContent, text);
    assert.equal(right.parent, page.key); assert.equal(right.authored.type, type);
    assert.equal(right.retainedText.source, 'core-text-registry');
    const nativeStyle = reference.styles[left.style], retained = right.retainedText.style;
    for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']) {
      assert.equal(right[stage].fontFamily, undefined);
      assert.equal(retained.fontFamily, page[stage].fontFamily);
    }
    for (const property of ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle'])
      assert.equal(retained[property], nativeStyle[property]);
    inheritedHeadingInputs.push({ id, referenceNode: left.key, candidateNode: right.key,
      parentFamily: page.normalResolvedStyle.fontFamily, localFamily: 'omitted at all three captured stages',
      retainedTextSource: right.retainedText.source,
      reference: Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing'].map(property => [property, nativeStyle[property]])),
      retained: Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing'].map(property => [property, retained[property]])) });
    paired.push({ reference: left.key, candidate: right.key });
  }
  return { referenceNodes: 7, candidateNodes: 6, paired,
    substitution: { reference: [icon.key, svg.key, leaf.key], candidate: image.key,
      classification: 'application-plugin-authoring-defect', definition: 'fixture-icon-svg-replaced-by-fixed-raster',
      nativePathSha256: hash(leaf.attributes.d), candidatePngSha256: hash(png), intrinsicPngSize: [24, 24] },
    extraDocumentNode: synthetic.key,
    typographyInputConsumption: { disposition: 'inspected-retained-stage', headings: inheritedHeadingInputs,
      rootAndImageRetainedGlyphText: false,
      boundary: 'Declared parent family reaches retained heading text despite local omissions. Captured registry style is not physical font selection,all inheritance/default semantics,normal line-box equality,paint-time texture inputs or glyph raster acceptance. Root/image typography scalars do not imply root/image glyph text.' },
    clippingInputs: { disposition: 'inspected-unequal-input',
      reference: { mainAndRootOverflow: 'visible', iconAndSvgOverflow: 'hidden', iconAndSvgSize: [24, 24], clipPath: 'none' },
      candidate: { mainRootAndImageLocalClipDeclarations: 'omitted at all three captured stages', replacementImageSize: [24, 24] },
      existingAttribution: 'reviewed-control-clipping-request-omission',
      boundary: 'Hidden-overflow owners exist and cannot be excluded as passive. Root/image containment is not used clipping proof. Native SVG viewport clipping versus replaced PNG composition is unequal input;no core clipping diagnosis,general overflow acceptance or hypothetical oversized-content coverage.' },
    formattingContext: { disposition: 'inspected-unequal-input', firstDivergence: 'authored-demo-root-display-before-layout',
      classification: 'application-plugin-authoring-defect',
      reference: { rootDisplay: nativeRootStyle.display, parentDisplay: reference.styles[frame.style].display,
        childDisplay: reference.styles[icon.style].display, childIsFlexItem: false, rootHeight: nativeRootStyle.height,
        boxSizing: nativeRootStyle.boxSizing },
      candidate: { authoredRootRule: displayRules[0], rootDisplay: demo.normalResolvedStyle.display,
        flexDirection: demo.normalResolvedStyle.flexDirection, parentDisplay: page.normalResolvedStyle.display,
        childDisplay: image.normalResolvedStyle.display, childIsFlexItem: true, rootHeight: demo.normalResolvedStyle.height,
        boxSizing: demo.normalResolvedStyle.boxSizing },
      boundary: 'Reuses established icon context finding;matching child display/longhands do not make block-inline and flex-item placement equivalent. Not equal-input anonymous-line layout or current paint acceptance.' },
    boundary: 'Recorded DOM/SiteData element inventory only. Synthetic-root behavior,anonymous formatting boxes,computed property equality,scaling/raster fidelity and current runtime remain unproved.' };
}
let hierarchyNegativeControls = 0;
let inspectPaintJoins = 0, inspectSharpnessFailures = 0;
for (const c of census.cases) {
  const captured = originalCases.get(c.case); assert.ok(captured);
  assert.equal(key(captured.profile, captured.viewport), c.cohort);
  const parts = c.case.split('/'), id = `${parts[0]}:${parts[1]}@${parts[2]}/${parts[3]}${parts[0] === 'interaction' ? '/' + parts[4] : ''}`;
  const row = review.groups.find(r => r.case === id); assert.equal(row?.family, 'icon');
  const pair = ax.get(c.cohort); assert.ok(pair); checkExposure(pair);
  const trees = {};
  for (const side of ['reference', 'astylar']) {
    const receipt = row.evidence.pairedTrees[side], bytes = readFileSync(receipt.file);
    assert.equal(hash(bytes), receipt.sha256); trees[side] = JSON.parse(bytes);
  }
  const hierarchy = inspectHierarchy(trees.reference, trees.astylar);
  const unmasked = visibleContexts.get(c.cohort); assert.equal(unmasked?.family, 'icon');
  const headingInputDifference = {};
  for (const [tag, id] of [['p', 'eyebrow'], ['h1', 'title']]) {
    const native = trees.reference.nodes.find(n => n.type === tag);
    const candidate = trees.astylar.nodes.find(n => n.authored?.id === id);
    assert.equal(trees.reference.styles[native.style].opacity, '0');
    const surface = trees.astylar.nodes.find(n => n.authored?.id === 'page').normalResolvedStyle.background;
    assert.equal(candidate.normalResolvedStyle.color, surface);
    headingInputDifference[id] = { referenceBenchmarkOpacity: '0', candidateBenchmarkInk: surface,
      ordinaryModeEvidence: 'Original visible-heading verifier authenticates actual ordinary input trees,theme,owner bounds and pixels.' };
  }
  if (!hierarchyNegativeControls) {
    const missing = structuredClone(trees.reference); missing.nodes.pop();
    assert.throws(() => inspectHierarchy(missing, trees.astylar)); hierarchyNegativeControls++;
    const wrong = structuredClone(trees.astylar); wrong.nodes.find(n => n.authored?.id === 'icon-primary').parent = 'root';
    assert.throws(() => inspectHierarchy(trees.reference, wrong)); hierarchyNegativeControls++;
    const wrongDisplay = structuredClone(trees.astylar); wrongDisplay.nodes.find(n => n.authored?.id === 'icon-root').normalResolvedStyle.display = 'block';
    assert.throws(() => inspectHierarchy(trees.reference, wrongDisplay)); hierarchyNegativeControls++;
    const newRelation = structuredClone(trees.reference); newRelation.nodes[0].attributes['aria-describedby'] = 'new-help';
    assert.throws(() => inspectHierarchy(newRelation, trees.astylar)); hierarchyNegativeControls++;
    const changedName = structuredClone(trees.astylar); changedName.nodes.find(n => n.authored?.id === 'icon-primary').authored.alt = 'Other';
    assert.throws(() => inspectHierarchy(trees.reference, changedName)); hierarchyNegativeControls++;
  }
  originals.push({ row, semantics: row.obligations.semantics, history: row.obligations.historyOwnership, inputs: row.obligations.inputStyleStructure, paint: row.obligations.localPaint, currentness: row.obligations.sourceCurrentness });
  const evidence = { census: { file: censusFile, sha256: hash(readFileSync(censusFile)) },
    logs: receipts.map(({ file, sha256 }) => ({ file, sha256 })), join: { file: script, sha256: hash(readFileSync(script)) } };
  row.obligations.semantics = { ...row.obligations.semantics, retainedIconRelationshipApplicability: {
    disposition: 'inspected-authored-applicability', authoredIdRefs: 0,
    reference: { regionName: 'icon showcase', targetName: 'Favorite', role: 'img', ariaHidden: 'true' },
    candidate: { regionName: 'icon showcase', targetName: 'Favorite', type: 'img', ariaHidden: '<omitted>' },
    evidence: { pairedTrees: row.evidence.pairedTrees, join: evidence.join },
    boundary: 'All recorded nodes inspected for authored IDREF relationships;none authored. Existing paired AX observations establish target hiding failure. Not whole generated bridge/AX subtree,assistive-technology behavior or current whole-case acceptance.' }, retainedActualIconTargetExposure: {
    disposition: 'inspected-failure', cohort: c.cohort, observations: pair, evidence,
    classification: 'application-plugin-authoring-defect',
    boundary: 'Retained direct target partial AX:reference ARIA-hidden versus exposed candidate image. Not whole-subtree associations,assistive technology or current runtime acceptance.' },
    actualBenchmarkHeadingTextTransform: {
      disposition: 'inspected-failure', classification: 'confirmed-core-renderer-defect', cohort: c.cohort,
      owner: 'core semantic bridge resolved-style projection', property: 'textTransform accessibility name/text',
      observations: Object.fromEntries(['reference', 'astylar'].map(side => {
        const observation = headingContexts.get(c.cohort)[side];
        assert.equal(observation.benchmarkMode, true);
        return [side, { appliedTheme: observation.appliedTheme, inputTree: observation.inputTree,
          targets: observation.ax }];
      })),
      publicFailure: publicHeadingOwner.verification, currentOwningMethods: publicHeadingOwner.methods,
      evidence: { ...headingEvidence, join: evidence.join },
      boundary: 'Actual benchmark title/eyebrow AX at exact physical context. Heading role/level agree;transformed name/child text fail despite equal textTransform inputs. Public package-root reproduction and complete current/installed owning methods bind the support gap. Not AT behavior,ordinary unmasked AX,all inherited/locale/update cases or whole current-package acceptance.' } };
  // Existing census binds the corresponding bounded update/disposal log. This
  // subrecord preserves that historical membership,not new async/remount proof.
  const lifecycle = receipts.find(r => r.file === base + c.updatesDisposal); assert.ok(lifecycle);
  row.obligations.historyOwnership = { ...row.obligations.historyOwnership, retainedIconUpdateDisposalMembership: {
    disposition: 'inspected-bounded-membership', cohort: c.cohort, evidence,
    sourceLog: { file: lifecycle.file, sha256: lifecycle.sha256 },
    boundary: 'Existing three-update/sampled-disposal cohort membership only;not fresh execution,current source validity,late image completion,remount or peer isolation.' },
    iconSpecificCompensationHistory: { disposition: 'inspected-bounded-history', ...historyProof,
      evidence: { ...sourceProofEvidence, join: evidence.join },
      remaining: ['whole-case ownership/currentness and other shared state branches'] },
    sharedIconAncestorCompensationHistory: { disposition: 'inspected-bounded-history', ...sharedHistoryProof,
      evidence: { ...sourceProofEvidence, join: evidence.join } },
    supplementalIconLifetimeReview: { disposition: 'inspected-bounded-supplemental',
      scope: { configuredCohortMembership: false, materialViewport: [1440, 900, 1], profile: 'light',
        publicCancellation: 'minimal package-root immediate-versus-settled disposal control' },
      observations: { queuedThemeUpdate: 'same surface waits for held native load before replacing source',
        pendingAngularRemount: 'retired sampled resources remain zero;replacement sampled state unchanged',
        runtimeValidation: 'failed:expected initial cancellation reported as render-failed',
        currentReporter: 'actual disposal cancellation and genuine reflow failure both reported as errors' },
      evidence: { ...supplementalLifetimeEvidence, join: evidence.join },
      sourceTransition: { file: lifetimeSuite, sha256: hash(lifetimeSuiteSource),
        previousSha256: originalLifetimeSuiteSha, reviewedChanges: 'inspector-only restoration and original browser-asset verification;all behavior assertions conserved' },
      boundary: 'Supplemental900px lifetime evidence and current cancellation-policy execution,not runtime coverage of the configured1000px cases,all callbacks,race timings,simultaneous peers,paint or current whole-package acceptance. Do not exercise impossible replacement-before-held-load completion ordering.' } };
  row.obligations.inputStyleStructure = { ...row.obligations.inputStyleStructure,
    publicInlineImageFlowFailure: { disposition: 'inspected-supplemental-public-failure',
      finding: 'core-inline-replaced-row-omits-parent-line-box', evidence: inlineEvidence,
      observations: { publicPairs: 16, inlineHeightFailures: 8, blockControls: 8,
        inlineErrorsCSSpx: [-4, -5, -6, -7], currentInstalledMethodsMatch: 4,
        firstDivergence: 'CSS inline-row maximum child margin-box height omits parent line-box contribution before projection' },
      boundary: 'Public PNG/block-inline reduction,not the configured Material SVG/mat-icon versus fixed-flex input pair. Relevant shared layout gap,not sole compensation cause,all fonts/vertical-align/wrapping coverage or whole-case closure.' },
    iconViewportOwnerCssBoundary: { disposition: 'inspected-bounded-source-behavior',
      cssViewport: captured.viewport, origin: { x: 0, y: 0 }, padding: { top: 0, right: 0, bottom: 0, left: 0 },
      projectedPlaneProbes: [[9, 7], [99, 31]], sourceProof: rootProof,
      evidence: { ...sourceProofEvidence, pairedTrees: row.evidence.pairedTrees, join: evidence.join },
      remaining: ['authored-page descendant flow/default/inheritance/clipping and full rendering applicability'] },
    retainedIconRecordedHierarchy: { disposition: 'inspected-recorded-node-inventory', ...hierarchy,
      evidence: { pairedTrees: row.evidence.pairedTrees, join: evidence.join } } };
  const freshCase = freshCases.get(c.case); assert.ok(freshCase);
  const freshKey = materialCaseKey(freshCase.kind, freshCase.result);
  assert.deepEqual(freshCheckpoint.load(freshKey), freshCase.result);
  assert.equal(freshCase.result.meetsAcceptance, true);
  const reproducedImages = {};
  for (const side of ['reference', 'astylar']) {
    const oldImage = path.join(path.dirname(row.evidence.pairedTrees[side].file), side + '.png');
    const freshImage = path.join(path.dirname(freshCase.result.inputTrees[side].file), side + '.png');
    const sha256 = hash(readFileSync(oldImage)); assert.equal(hash(readFileSync(freshImage)), sha256);
    reproducedImages[side] = { original: { file: oldImage, sha256 }, fresh: { file: freshImage, sha256 } };
  }
  const freshEvidence = { report: { file: freshFile, sha256: hash(freshBytes) },
    manifest: { file: manifestFile, sha256: hash(manifestBytes) },
    checkpoint: { file: path.join(freshDirectory, 'checkpoint', hash(freshKey) + '.json'),
      sha256: hash(readFileSync(path.join(freshDirectory, 'checkpoint', hash(freshKey) + '.json'))) },
    harnessFiles: manifest.provenance.harnessFiles, pairedTrees: freshCase.result.inputTrees, join: evidence.join };
  row.obligations.sourceCurrentness = { ...row.obligations.sourceCurrentness, freshProducerRetainedBuildExecution: {
    disposition: 'inspected-bounded-provenance', case: row.case, browser: fresh.browser, evidence: freshEvidence,
    boundary: 'Fresh current readable producer/browser,exact retained build bytes. Not a newly built renderer,current complete package acceptance,full matrix or recovery of historical runner source.' } };
  row.obligations.localPaint = { ...row.obligations.localPaint,
    retainedRootPaint: { disposition: 'inspected-diagnostic-with-failures', observations: rootPaintCases.get(row.case),
      evidence: { ...rootPaintEvidence, join: evidence.join },
      boundary: 'Exact20-case retained root/corner metric and five-row shadow replay. Original failures and unequal background/shadow inputs survive. Center samples are not full fill uniformity;contained image boxes are not general clipping proof. Public border reproduction is not proved the sole Material residual cause. No new release target,current rendering acceptance or whole-case closure.' },
    publicFractionalBorderPaintFailure: { disposition: 'inspected-supplemental-public-failure',
      finding: 'core-fractional-border-edge-paint-disagrees-with-native', evidence: borderEvidence,
      observations: { publicPairs: 8, dpr: [1, 2], shadowFreeIntegerMatches: true,
        shadowFreeFractionalChannelErrors: [22, 44], liveFrameThickness: 1, originalImagesConserved: 16, currentOwnerMethodsMatch: 15 },
      boundary: 'Public equal-input primitive,not exact configured Material input/state coverage or sole cause of its contact residual. Existing Material shadow alpha/structure mismatches,remaining paint work and partial inspection remain.' },
    freshProducerPixelReproduction: {
    disposition: 'inspected-full-frame-reproduction', reproducedImages, metrics: freshCase.result.focusedRasters,
    evidence: freshEvidence,
    boundary: 'Full paired PNGs reproduce byte-for-byte. Static local gates remain configured;inspect local targets remain absent. Not equivalent inputs,all pixel mechanisms or whole-case acceptance.' },
    ordinaryVisibleIconHeadings: { disposition: 'inspected-diagnostic', cohort: c.cohort,
      browser: visible.browser, headingInputDifference,
      observations: Object.fromEntries(['reference', 'astylar'].map(side => [side, {
        headings: unmasked[side].headings, inputTree: unmasked[side].inputTree, screenshot: unmasked[side].screenshot,
      }])), paint: unmasked.paint, evidence: { ...visibleEvidence, metricSources, join: evidence.join },
      boundary: 'Ordinary unmasked Icon headings in the exact physical context. Deliberately different from benchmark masking;not the complete configured interaction/state,whole-input equivalence,new release gates,newly built renderer or whole-case acceptance.' } };
  if (parts[0] === 'interaction') {
    const observed = inspectRows.filter(r => r.profile === captured.profile && r.viewport === captured.viewport.id);
    assert.equal(observed.length, 1); const sample = observed[0];
    assert.deepEqual(captured.focusedRasters, []); assert.equal(sample.configuredLocalTargets, 0);
    const crops = {}, images = {};
    for (const side of ['reference', 'astylar']) {
      const file = path.join(path.dirname(row.evidence.pairedTrees[side].file), side + '.png'), bytes = readFileSync(file);
      assert.equal(hash(bytes), sample[side === 'reference' ? 'referenceSha256' : 'astylarSha256']);
      images[side] = { file, sha256: hash(bytes) }; crops[side] = recordedCrop(PNG.sync.read(bytes), sample.bounds);
    }
    const metrics = evaluateFocusedRaster(crops.reference, crops.astylar);
    assert.deepEqual(metrics, sample.diagnostic);
    inspectPaintJoins++; if (!metrics.sharpness.meetsTarget) inspectSharpnessFailures++;
    row.obligations.localPaint = { ...row.obligations.localPaint, retainedIconInspectPixelDiagnostic: {
      disposition: 'inspected-diagnostic', bounds: sample.bounds, metrics,
      evidence: { report: { file: inspectFile, sha256: hash(inspectBytes) }, images, metricSources, join: evidence.join },
      originalRunnerReceipt: inspectReceipt.runnerSha256,
      originalRunnerProvenance: 'unavailable-unresolved',
      originalCaptureProcedureVerified: false,
      currentRenderingAccepted: false,
      boundary: 'Exact recorded-bounds pixel/metric replay only. No configured interaction raster gate existed. Original runner bytes/crop-owner provenance remain unavailable;unequal SVG/PNG and block/flex inputs prevent an equal-input blur diagnosis. Not current rendering or whole-case acceptance.' } };
  }
  assert.equal(row.inspection, 'partial'); assert.equal(row.currentRendering, 'unverified');
}
assert.equal(originals.length, 20);
assert.equal(inspectPaintJoins, 8); assert.equal(inspectSharpnessFailures, 4);
const pointer = JSON.parse(readFileSync(base + 'working-audit/current.json'));
const indexBytes = readFileSync(`${base}working-audit/${pointer.generation}/index.json`); assert.equal(hash(indexBytes), pointer.indexSha256);
const coverage = JSON.parse(indexBytes).metadata.coverage;
const proposal = saveReviewProposal(base + 'working-audit', review);
const loaded = loadCaseObligationReview(proposal.file, proposal.sha256, [...coverage.caseInventory.static, ...coverage.caseInventory.interaction]);
for (const { row, semantics, history, inputs, paint, currentness } of originals) { row.obligations.semantics = semantics; row.obligations.historyOwnership = history; row.obligations.inputStyleStructure = inputs; row.obligations.localPaint = paint; row.obligations.sourceCurrentness = currentness; }
for (const { receipt, previous } of lifetimeReceiptChanges) receipt.sha256 = previous;
assert.equal(hash(JSON.stringify(review)), predecessor);
console.log(JSON.stringify({ predecessor, proposal, iconCases: 20, physicalCohorts: 16, negativeControls: rejected,
  cases: loaded.cases.length, dependencies: loaded.evidenceFingerprints.length, unrelatedReviewConserved: true,
  recordedReferenceNodes: 140, recordedCandidateNodes: 120, hierarchyNegativeControls,
  relationshipApplicabilityJoins: originals.length, authoredIconIdRefs: 0,
  boundedSourceHistoryJoins: originals.length, viewportOwnerCssJoins: originals.length,
  supplementalInlineLayoutFailureJoins: originals.length,
  sharedAncestorHistoryJoins: originals.length, supplementalLifetimeJoins: originals.length,
  reconciledLifetimeSourceReceipts: lifetimeReceiptChanges.length,
  reconciledSourceFiles: [...sourceTransitions].map(([file, transition]) => ({ file, ...transition })),
  ordinaryHeadingPaintJoins: originals.length, ordinaryPhysicalContexts: visibleContexts.size,
  benchmarkHeadingAxFailureJoins: originals.length, benchmarkHeadingAxPhysicalContexts: headingContexts.size,
  rootPaintJoins: rootPaintCases.size, rootPaintShadowFailures: 3, rootPaintNegativeControls: 2,
  inspectPaintJoins, inspectSharpnessFailures,
  freshProducerJoins: freshCases.size, reproducedFullImages: freshCases.size * 2,
  inspectionComplete: loaded.inspectionComplete, currentRenderingAccepted: loaded.currentRenderingAccepted }));
