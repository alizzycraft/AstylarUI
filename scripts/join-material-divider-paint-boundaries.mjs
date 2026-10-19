import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { createTextBackingReviewReader, textBackingRetainedReview } from '../tests/material-parity/text-backing-case-review-source.mjs';

const base = 'artifacts/material-parity/working-audit', predecessor = textBackingRetainedReview;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const read = (file, expected) => {
  const bytes = readFileSync(file); assert.equal(hash(bytes), expected); return JSON.parse(bytes);
};
const wrapperFile = 'artifacts/material-parity/divider-paragraph-paint-inputs-20261019.log';
const wrappers = read(wrapperFile, 'a94ccbd6c3f86e1f9c426d784258a2aef57309d338d21a6aa2b7e86d780f0fec');
assert.equal(receipt(wrappers.producer.file).sha256, wrappers.producer.sha256);
assert.equal(wrappers.reviewSha, predecessor); assert.equal(wrappers.observations.length, 48);
assert.equal(wrappers.stages, 144); assert.equal(wrappers.rejectedControls, 336);
const materialFile = 'artifacts/material-parity/divider-material-state-20261019.log';
const materials = read(materialFile, 'b29387269259568893908dcfa09a28942e05be26fdb0ee247afdf4f82482f2a3');
assert.equal(receipt('scripts/audit-material-divider-material-state.mjs').sha256, materials.producerSha256);
const verifiedFile = 'artifacts/material-parity/divider-material-state-method-verification-20261019.log';
const verified = read(verifiedFile, 'c62385d808719444cfe11b310d9630e6113980e1a7049abb692204c0620ba579');
assert.deepEqual(verified.capture, receipt(materialFile)); assert.equal(verified.owners, 8);
assert.equal(verified.rejectedControls, 49);
for (const r of [verified.currentOwner, verified.installedOwner, verified.capturedMap]) assert.deepEqual(receipt(r.file), r);
const edgeFile = 'artifacts/material-parity/divider-configured-edge-halo-fixed-20261019.log';
assert.equal(receipt(edgeFile).sha256, '2653ad7b3b72a51da6d131db1f1c33f21caee6a4d8e2b0f5fc613ff0430ebd4c');
const edgeLog = readFileSync(edgeFile, 'utf8'); assert.match(edgeLog, /# tests 1\r?\n# suites 0\r?\n# pass 1\r?\n# fail 0/);
assert.ok(edgeLog.includes('1916 edge/halo pixels exactly (36 nonbackground)'));
const textureFile = 'artifacts/material-parity/divider-configured-texture-boundary-20261015/latest-report.json';
const texture = read(textureFile, 'e78434351000b4ec6802a229578f4b5729c35816e419104c57bc424aaa0c050d');

// The old review references the pre-extension suite. Authenticate the complete
// current file and reverse ONLY this exact additive assertion extension.
const suite = 'tests/material-parity/alignment-crop-provenance.spec.mjs', current = readFileSync(suite, 'utf8');
assert.equal(hash(current), 'c35322fcba43f166fd85eda9b4216c61e0ce58fcbc106844fea3e747d4dd1d85');
let historical = current;
const replace = (before, after) => { assert.equal(historical.split(before).length, 2); historical = historical.replace(before, after); };
replace('  let edgeHaloPixels = 0, edgeHaloInkPixels = 0, changedPixelControls = 0;\n', '');
const start = historical.indexOf('      // Extend the SAME retained model');
const end = historical.indexOf("      assert.equal(target.retainedStyle.fontSize, '14.4px');", start);
assert.ok(start > 0 && end > start); historical = historical.slice(0, start) + historical.slice(end);
replace('  assert.equal(edgeHaloPixels, 1916); assert.equal(edgeHaloInkPixels, 36); assert.equal(changedPixelControls, 8);\n', '');
replace(' and1916 edge/halo pixels exactly (36 nonbackground);wrong-row and8 changed-edge-pixel controls reject. Empirical retained fit,not hardware sample locations,shader identity,native glyph equality or full-case acceptance.',
  ';wrong-row controls reject. Not plane-edge coverage,native glyph equality or full-case acceptance.');
assert.equal(hash(historical), '043d4663e152f51548887d93776fc393684ad7e46d356cf3fdd51eb011106024');
const reader = createTextBackingReviewReader({ root: process.cwd(), read: readFileSync, reviewSha256: predecessor });
const trackedRead = (file, ...args) => {
  if (path.resolve(file) !== path.resolve(suite)) return reader.read(file, ...args);
  const actual = readFileSync(file, ...args); assert.equal(hash(actual), hash(current));
  return args[0] === 'utf8' ? historical : Buffer.from(historical);
};
const review = JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const additions = [];
const add = (owner, key, value) => { assert.equal(owner[key], undefined); owner[key] = value; additions.push([owner, key]); };
let wrapperCases = 0, materialCases = 0, footprintCases = 0;
const producer = receipt('scripts/join-material-divider-paint-boundaries.mjs');
for (const group of review.groups.filter(group => group.family === 'divider')) {
  assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
  const pairs = wrappers.observations.filter(row => row.case === group.case); assert.equal(pairs.length, 2);
  for (const pair of pairs) assert.deepEqual(pair.evidence, group.evidence.pairedTrees);
  add(group.obligations.inputStyleStructure, 'retainedWrapperPaintRequests', {
    disposition: 'inspected-recorded-stage-correspondence', observations: pairs,
    evidence: { log: receipt(wrapperFile), producer: wrappers.producer, join: producer },
    boundary: wrappers.boundary,
  }); wrapperCases++;
  if (/^static:divider@[^/]+\/desktop$/.test(group.case)) {
    const profile = group.case.split('@')[1].split('/')[0];
    const result = materials.results.find(row => row.profile === profile && row.side === 'astylar'); assert.ok(result);
    add(group.obligations.localPaint, 'observedTextMaterialState', {
      disposition: 'inspected-diagnostic-material-state', profile, viewport: '1440x1000 DPR1',
      targets: result.observation.materialState.map(target => ({ id: target.id, material: target.material,
        ready: target.ready, chain: target.chain, allRecordedOpacityRequestsUnit: target.opacityRequests.every(row => row.opacity === null || Number(row.opacity) === 1) })),
      evidence: { capture: receipt(materialFile), verification: receipt(verifiedFile), producer: receipt('scripts/audit-material-divider-material-state.mjs'), join: producer },
      boundary: 'Fresh candidate-only diagnostic matches this physical viewport/profile,not replay of the original case. Unit text alpha/visibility and present emissive flag do not prove compiled shader/native raster/group-compositing equivalence. No extension to interaction or other viewport IDs.',
    }); materialCases++;
  }
  const row = texture.results.find(row => {
    const key = JSON.parse(row.case);
    return `${key.kind}:${key.family}@${key.profile}/${key.viewport.id}${key.state ? `/${key.state}` : ''}` === group.case;
  });
  if (row) {
    add(group.obligations.localPaint, 'retainedFullTextureFootprint', {
      disposition: 'inspected-retained-model-boundary', textureOwners: row.observation.targets.map(target => target.id),
      conclusion: 'Same retained nearest-texel straight-alpha model fits the complete local edge/halo exactly and interior within1RGB level in this four-case population;no unexplained larger post-canvas transfer failure is demonstrated here.',
      population: { cases: 4, owners: 8, interiorPixels: 5287, oneLevelInteriorResiduals: 68, edgeHaloPixels: 1916, edgeHaloInkPixels: 36, changedEdgeControls: 8 },
      evidence: { originalTextureReport: receipt(textureFile), focusedTestLog: receipt(edgeFile), join: producer },
      boundary: 'Population totals are shared,not additional cases. Empirical retained fit,not actual GPU sample locations,shader identity,native glyph equality,public DPR2 attribution or whole-case closure.',
    }); footprintCases++;
  }
  add(group.obligations.sourceCurrentness, 'retainedPaintSuiteApplicability', {
    logicalFile: suite, currentSha256: hash(current), historicalSha256: hash(historical),
    evidence: { focusedTestLog: receipt(edgeFile), join: producer },
    boundary: 'Complete-file restoration removes only additive edge/halo assertions for original historical receipts. Current test success is separate evidence;no old receipt rewrite or rendering-currentness claim.',
  });
}
assert.equal(wrapperCases, 24); assert.equal(materialCases, 4); assert.equal(footprintCases, 4); assert.equal(additions.length, 56);
const proposed = saveReviewProposal(base, review);
const loaded = loadCaseObligationReview(proposed.file, proposed.sha256, review.groups.map(group => group.case), { read: trackedRead });
for (const [owner, key] of additions) delete owner[key];
assert.equal(hash(JSON.stringify(review)), predecessor);
console.log(JSON.stringify({ predecessor, proposed, wrapperCases, materialCases, footprintCases,
  addedChildren: additions.length, dependencies: loaded.evidenceFingerprints.length, cases: loaded.cases.length,
  sourceApplicability: [...reader.sourceApplicability.transitions, { logicalFile: suite, currentSha256: hash(current), historicalSha256: hash(historical) }],
  predecessorRecovered: true, scope: 'Exact bounded evidence joins only;all whole-case/current-rendering flags and remaining tasks preserved.' }));
