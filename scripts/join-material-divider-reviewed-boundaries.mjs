import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { createTextBackingReviewReader, textBackingRetainedReview } from '../tests/material-parity/text-backing-case-review-source.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const read = (file, expected) => { const bytes = readFileSync(file); assert.equal(hash(bytes), expected); return JSON.parse(bytes); };
const base = 'artifacts/material-parity/working-audit';
const predecessor = 'fe692b146f9c2ffc1755db931327220fa6f80b80c8dade503625cb7dea775dba';
const review = JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);

// Execute the exact previously validated read boundary, not a second receipt
// restoration implementation. It only authenticates/restores four old sources.
const readerOwner = 'scripts/join-material-divider-paint-boundaries.mjs', readerSource = readFileSync(readerOwner, 'utf8');
assert.equal(hash(readerSource), 'b187103f2f773955dd97ea3e0ee4e0b5d4b4b9faab4af0ebb6fe5d6627f681da');
const start = readerSource.indexOf("const suite = 'tests/material-parity/alignment-crop-provenance.spec.mjs'");
const end = readerSource.indexOf('const review = JSON.parse', start); assert.ok(start > 0 && end > start);
const boundary = readerSource.slice(start, end);
const { trackedRead } = new Function('assert', 'readFileSync', 'hash', 'path', 'createTextBackingReviewReader', 'predecessor',
  `${boundary}\nreturn {trackedRead};`)(assert, readFileSync, hash, path, createTextBackingReviewReader, textBackingRetainedReview);

const placementFile = 'artifacts/material-parity/divider-inline-owner-placement-20261019.log';
const placement = read(placementFile, 'b911b73595017da188e3b4fba461d15d162ee9def82d9db237f6cd8bf4a9f418');
assert.deepEqual(receipt(placement.producer.file), placement.producer); assert.equal(placement.observations.length, 48);
assert.equal(placement.rejectedOffsetControls, 48); assert.equal(placement.changedMethodControl, 1);
const nativeFile = 'artifacts/material-parity/divider-native-canvas-visible-control-verification-20261019.log';
const native = read(nativeFile, '29425dc24fc6c821c5009cac3299c608b3c2caf67663920e393161f4dcc921b3');
assert.equal(native.owners, 8); assert.equal(native.opaqueMatches, 16); assert.equal(native.transparentDifferences, 16); assert.equal(native.pixelMutationControls, 32);
const nativeCapture = read(native.capture.file, native.capture.sha256);
assert.equal(receipt('scripts/audit-material-divider-native-canvas.mjs').sha256, nativeCapture.producerSha256);
const freshFile = 'artifacts/material-parity/divider-font-freshness-verification-20261019.log';
const fresh = read(freshFile, '7f424dc5f8693fd074c4a077f4a22d113ad98c851caa7bce8c63af255e30f2d3');
assert.equal(fresh.owners, 8); assert.equal(fresh.rejectedFallbackAndAlphaControls, 16);
const freshCapture = read(fresh.capture.file, fresh.capture.sha256);
assert.equal(receipt('scripts/audit-material-divider-font-freshness.mjs').sha256, freshCapture.producerSha256);
const libraryFile = 'artifacts/material-parity/divider-current-library-new-capture-20261019.log';
const library = read(libraryFile, '6a393093c6b9462218d6578c52e478e8f374791126f07ca2b4103c6c24025036');
assert.equal(library.linkedCompleteModules, 88); assert.equal(library.currentClassMembersEqual, 1584); assert.deepEqual(library.memberDifferences, []);
assert.equal(receipt('scripts/check-divider-current-library-members.mjs').sha256, library.producerSha256);
const wiringFile = 'artifacts/material-parity/divider-current-runtime-wiring-20261019.log';
assert.equal(receipt(wiringFile).sha256, '5b7063881f6196b90a1f860530e99cb4fbddbe4ff6dc1e5dd441555efd67e3a2');
assert.match(readFileSync(wiringFile, 'utf8'), /# tests 2\r?\n# suites 0\r?\n# pass 2\r?\n# fail 0/);
const dependenciesFile = 'artifacts/material-parity/divider-current-application-capture-join-20261019.log';
const dependencies = read(dependenciesFile, 'fb70d461c6b1f0ce8941331d7cc79ea5456939a456fe234cf838fe52f7dfc594');
assert.equal(dependencies.applicationSourcesEqual.length, 17); assert.equal(dependencies.unchangedMappedSourceBytes, 2278);
assert.equal(dependencies.mediaAssetsEqual, 55); assert.equal(dependencies.styleFilesEqual, 5);
for (const item of dependencies.applicationSourcesEqual) assert.equal(receipt(item.file).sha256, item.rawCurrentSha256);
const comparison = read(dependencies.comparison.file, dependencies.comparison.sha256);
assert.equal(receipt('scripts/check-divider-capture-dependency-reuse.mjs').sha256, comparison.producerSha256);
const angularFile = 'artifacts/material-parity/divider-angular-cohorts-independent-20261019.log';
const angular = read(angularFile, 'dfd344840505861cd7b59679be44b98c9c017123cca0aaccee0d5d56119f6a8f');
assert.equal(angular.physicalCohorts, 20); assert.equal(angular.configuredCaseMembership, 24); assert.equal(angular.negativeControls, 240);
assert.equal(receipt('scripts/check-divider-angular-cohorts.mjs').sha256, angular.producerSha256);
const angularCapture = read(angular.capture.file, angular.capture.sha256);
for (const item of angularCapture.capture.sources) assert.deepEqual(receipt(item.file), item);

const modifications = [], counts = { placement: 0, native: 0, fontFreshness: 0, sourceApplicability: 0, angularLifetime: 0 };
const add = (owner, key, value) => { assert.equal(owner[key], undefined); owner[key] = value; modifications.push([owner, key]); };
const join = receipt('scripts/join-material-divider-reviewed-boundaries.mjs');
for (const group of review.groups.filter(group => group.family === 'divider')) {
  assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
  const observations = placement.observations.filter(row => `${row.state ? 'interaction' : 'static'}:divider@${row.profile}/${row.viewport}${row.state ? `/${row.state}` : ''}` === group.case);
  assert.equal(observations.length, 2);
  add(group.obligations.inputStyleStructure, 'retainedInlinePlacementAttribution', {
    disposition: 'inspected-recorded-owner-attribution', observations,
    conclusion: placement.conclusion, boundary: placement.boundary,
    evidence: { proof: receipt(placementFile), producer: placement.producer, join },
  }); counts.placement++;
  add(group.obligations.sourceCurrentness, 'newerMappedRuntimeApplicability', {
    disposition: 'inspected-bounded-source-applicability', modules: 88, currentClassMembers: 1584,
    mappedSources: 2280, byteIdenticalAcrossCaptures: 2278, applicationSourcesEqualCurrent: 17, mediaAssets: 55, styleFiles: 5,
    evidence: { library: receipt(libraryFile), wiring: receipt(wiringFile), dependencies: receipt(dependenciesFile), comparison: dependencies.comparison, join },
    boundary: 'Exact newer mapped core/app/dependency/media/style correspondence;original recipe boundaries remain. Not execution coverage,browser/clock/font/settlement equivalence,current output or whole-case closure.',
  }); counts.sourceApplicability++;
  const rows = angularCapture.results.filter(row => row.cases.includes(group.case)); assert.equal(rows.length, 1);
  const row = rows[0];
  add(group.obligations.historyOwnership, 'actualAngularComponentLifetime', {
    disposition: 'inspected-angular-destroy-recreate-boundary', profile: row.profile, viewport: row.viewport,
    observedViewport: row.observation.viewport, observedDpr: row.observation.dpr,
    physicalCohortCases: row.cases, remounts: 3, deactivations: 4,
    conclusion: 'Actual routed and surface DestroyRef witnesses,new identities,zero retired tracked/live objects and active registrations,detached-canvas callbacks inactive;passive peer survives and independently disposes.',
    evidence: { report: angular.capture, verifier: receipt(angularFile), producer: receipt('scripts/audit-material-divider-angular-cohorts.mjs'), join },
    boundary: angular.boundary,
  }); counts.angularLifetime++;
  if (/^static:divider@[^/]+\/desktop$/.test(group.case)) {
    const profile = group.case.split('@')[1].split('/')[0];
    const nativeRows = native.totals.filter(row => row.profile === profile); assert.equal(nativeRows.length, 2);
    add(group.obligations.localPaint, 'actualNativeCanvasGeneration', {
      disposition: 'inspected-diagnostic-backing-boundary', observations: nativeRows,
      finding: 'core-text-transparent-backing-and-local-raster-phase',
      conclusion: 'Measured native crops match opaque controls exactly;transparent controls differ before Babylon. Tested rounded Y controls are identical here;no production opaque-atlas/layout snapping workaround.',
      evidence: { verification: receipt(nativeFile), capture: native.capture, producer: receipt('scripts/audit-material-divider-native-canvas.mjs'), join }, boundary: native.boundary,
    }); counts.native++;
    const freshRows = fresh.observations.filter(row => row.profile === profile); assert.equal(freshRows.length, 2);
    add(group.obligations.localPaint, 'actualSettledFontFreshness', {
      disposition: 'inspected-diagnostic-font-freshness', observations: freshRows,
      conclusion: 'Live backing equals fresh same-font/draw/copy bytes and differs from Arial fallback;settled fallback hypothesis excluded only in this observed context.',
      evidence: { verification: receipt(freshFile), capture: fresh.capture, producer: receipt('scripts/audit-material-divider-font-freshness.mjs'), join }, boundary: fresh.boundary,
    }); counts.fontFreshness++;
  }
}
assert.deepEqual(counts, { placement: 24, native: 4, fontFreshness: 4, sourceApplicability: 24, angularLifetime: 24 });
assert.equal(modifications.length, 80);
const proposed = saveReviewProposal(base, review);
const loaded = loadCaseObligationReview(proposed.file, proposed.sha256, review.groups.map(group => group.case), { read: trackedRead });
for (const [owner, key] of modifications) delete owner[key];
assert.equal(hash(JSON.stringify(review)), predecessor);
console.log(JSON.stringify({ predecessor, proposed, counts, addedChildren: modifications.length,
  dependencies: loaded.evidenceFingerprints.length, cases: loaded.cases.length, predecessorRecovered: true,
  readBoundaryOwner: receipt(readerOwner), readBoundaryBlockSha256: hash(boundary),
  scope: 'Bounded evidence joins only. Existing statuses,remaining tasks,classifications and original acceptance are unchanged;not canonical publication.' }));
