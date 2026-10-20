import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { controlInputReview, createDividerReviewedBoundariesReader } from '../tests/material-parity/text-backing-case-review-source.mjs';

// Add existing,case-bounded observations. No new capture or inspection closure.
const base = 'artifacts/material-parity/working-audit';
const hash = value => createHash('sha256').update(value).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
function load(name, expected) {
  const file = `artifacts/material-parity/${name}-20261020.log`, bytes = readFileSync(file);
  assert.equal(hash(bytes), expected); return { data: JSON.parse(bytes), receipt: { file, sha256: expected } };
}
const line = load('divider-natural-line-box-contexts-recovered', 'cc4839ff5ce689aec6bf01689d15abb41cacd4a3e2b675083cd0f37d8b304416');
const domain = load('divider-paragraph-svg-replaced-inputs', 'c3c8ba4792937aab7c76aa0958a9805049a2a8cade386ffb60be694181f85b95');
const clamp = load('divider-paragraph-constraint-inputs-final', '8be7667a27f58b57d5f91e0a15e1e9be51616f191a3f6492f7ae272f64a51132');
const flex = load('divider-flex-context-inputs-final', '762f23bf2d0f9e94876cb14367c2ed0e1f582d694ae5976c2cd35daf4391f513');
const paint = load('divider-native-property-domain-verified', '8d53ed0ef75df6746f88c8fde3ea564f7a8379b1d1dbe1d0051c6aac8b544ad6');
const independent = receipt('artifacts/material-parity/divider-property-domain-independent-20261020.log');
const sourceVerification = receipt('artifacts/material-parity/divider-property-domain-source-verification-20261020.log');
const review = JSON.parse(readFileSync(`${base}/proposals/${controlInputReview}.json`)).review;
assert.equal(hash(JSON.stringify(review)), controlInputReview);
const groups = review.groups.filter(group => group.family === 'divider'); assert.equal(groups.length, 24);
const sameTrees = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sources = [line.data.producer, clamp.data.producer, flex.data.producer,
  clamp.data.source, clamp.data.installed, clamp.data.map, clamp.data.selectorExclusionHelper,
  clamp.data.selectorPrimitiveHelper, ...flex.data.sourceReceipts.flatMap(s => [s.current, s.installed]), flex.data.map];
for (const source of sources) assert.deepEqual(receipt(source.file), source);
// Preserve historical dependency keys. Current sources are checked now and
// explicitly referenced,not silently substituted for old source receipts.
const currentSources = sources.map(source => ({ currentFile: source.file, currentSha256: source.sha256 }));
const join = receipt('scripts/join-material-divider-property-contexts.mjs');
const touched = []; let controls = 0, staticLineBoxes = 0, domainRows = 0, clampRows = 0, flexRows = 0;
function validate(group, rows) {
  assert.equal(group.family, 'divider'); assert.equal(group.inspection, 'partial');
  assert.equal(group.currentRendering, 'unverified');
  assert.equal(rows.domains.length, 2); assert.equal(rows.clamps.length, 4); assert.equal(rows.flex.length, 12);
  assert.deepEqual(rows.domains.map(r => r.target).sort(), ['divider-above', 'divider-below']);
  assert.equal(new Set(rows.clamps.map(r => r.target)).size, 4);
  assert.equal(new Set(rows.flex.map(r => `${r.target}:${r.stage}`)).size, 12);
  for (const row of rows.domains) {
    assert.equal(row.case, group.case); assert.deepEqual(row.evidence, group.evidence.pairedTrees);
    for (const property of Object.values(row.properties)) {
      for (const name of ['candidateParagraph', 'candidateSpan']) {
        assert.equal(property[name].length, 3);
        assert.ok(property[name].every(stage => stage.status === 'omitted'));
      }
    }
  }
  for (const row of rows.clamps) {
    assert.deepEqual(row.trees, group.evidence.pairedTrees);
    assert.deepEqual(row.reference, { minWidth: '0px', maxWidth: 'none', minHeight: '0px', maxHeight: 'none' });
    assert.equal(Object.keys(row.candidateStages).length, 3);
    for (const stage of Object.values(row.candidateStages)) assert.ok(Object.values(stage).every(v => v.status === 'omitted'));
  }
  for (const row of rows.flex) {
    assert.deepEqual(row.treeEvidence, group.evidence.pairedTrees);
    assert.ok(['positioned-not-flex-item', 'inline-child-of-block-not-flex-item'].includes(row.disposition));
  }
  if (group.case.startsWith('static:')) {
    assert.ok(rows.lineBox); assert.equal(rows.lineBox.case, group.case);
    assert.deepEqual(rows.lineBox.inputTree, group.evidence.pairedTrees.reference);
    assert.equal(rows.lineBox.observations.length, 2);
    for (const observation of rows.lineBox.observations) {
      assert.equal(observation.measured.source, 'browser-natural-single-line-box');
      assert.equal(observation.measured.naturalHeight, observation.before.parentBox.height);
      assert.equal(observation.measured.fontReady, true);
    }
  } else assert.equal(rows.lineBox, undefined);
}
for (const group of groups) {
  const rows = {
    domains: domain.data.observations.filter(r => r.case === group.case),
    clamps: clamp.data.rows.filter(r => sameTrees(r.trees, group.evidence.pairedTrees)),
    flex: flex.data.rows.filter(r => sameTrees(r.treeEvidence, group.evidence.pairedTrees)),
    lineBox: line.data.captures.find(r => r.case === group.case),
  };
  validate(group, rows);
  for (const mutate of [r => r.domains.pop(), r => r.clamps.pop(), r => r.flex.pop(),
    r => { r.domains[0].evidence.reference.sha256 = '0'.repeat(64); },
    r => { r.clamps[0].reference.minWidth = '1px'; },
  ]) { const changed = structuredClone(rows); mutate(changed); assert.throws(() => validate(group, changed)); controls++; }
  domainRows += rows.domains.length; clampRows += rows.clamps.length; flexRows += rows.flex.length;
  if (rows.lineBox) staticLineBoxes += rows.lineBox.observations.length;
  const owner = group.obligations.inputStyleStructure, key = 'retainedDividerPropertyContexts';
  assert.equal(owner[key], undefined);
  owner[key] = {
    disposition: 'inspected-bounded-owner-input-contexts', rows,
    evidence: { domain: domain.receipt, constraints: clamp.receipt, flex: flex.receipt,
      ...(rows.lineBox ? { naturalLineBoxes: line.receipt } : {}), currentSources, join },
    conclusion: 'These exact paragraph/span owners retain raw paint-domain fields and candidate omissions;no min/max clamp is requested;five flex-item fields do not enter flex sizing in the recorded contexts. Static cases additionally retain fresh native single-line natural-height observations.',
    boundary: 'Paint-domain tag-only no-consumer wording is conditional,not universal. No default aliases or scalar reclassification. Fresh native line boxes use Chrome155.0.8059.80,not historical155.0.8059.40 replay;interaction cases receive no borrowed line boxes. No full dimension/renderer execution,normal/stretch alignment equivalence,complete owner mapping,current rendering or case closure. Existing flow authoring failure and all remaining obligations survive.',
  };
  touched.push([owner, key]);
}
assert.equal(domainRows, 48); assert.equal(clampRows, 96); assert.equal(flexRows, 288);
assert.equal(staticLineBoxes, 32); assert.equal(controls, 120);
assert.equal(paint.data.runtime.historicalBrowserReplay, false);
assert.equal(paint.data.runtime.actualBrowser, '155.0.8059.80');
assert.equal(paint.data.images.length, 17); assert.equal(paint.data.observations.length, 11);
for (const image of paint.data.images) assert.deepEqual(receipt(image.file), image);
const paintOwner = groups.find(group => group.case === 'static:divider@light/desktop').obligations.localPaint;
const paintKey = 'freshNativeDividerPropertyControls'; assert.equal(paintOwner[paintKey], undefined);
paintOwner[paintKey] = {
  disposition: 'inspected-native-only-diagnostic-controls', observations: paint.data.observations,
  runtime: paint.data.runtime, evidence: { capture: paint.receipt, images: paint.data.images,
    checkpoint: paint.data.checkpoint, independentPixels: independent, sources: sourceVerification, join },
  conclusion: 'Six fill/stroke/object-fit interventions leave the two native paragraphs unchanged;two direct text-color,SVG fill/stroke and replaced-image fit positive controls alter pixels. Restored native images match baseline.',
  boundary: 'Only this fresh light/desktop native observation. Not candidate paint,historical-browser replay or any other case. CSS Fill/Stroke text applicability is evolving;tag-only inactivity is not inferred globally. No case disposition,remaining work or acceptance change.',
};
touched.push([paintOwner, paintKey]);
const proposed = saveReviewProposal(base, review);
const reader = createDividerReviewedBoundariesReader({ root: process.cwd(), read: readFileSync, reviewSha256: controlInputReview });
const loaded = loadCaseObligationReview(proposed.file, proposed.sha256, review.groups.map(g => g.case), { read: reader.read });
assert.equal(loaded.cases.length, 2311); assert.equal(loaded.inspectionComplete, false);
assert.equal(loaded.currentRenderingAccepted, false); assert.deepEqual(loaded.unjoinedCases, []);
assert.ok(loaded.cases.every(g => g.inspection === 'partial'));
for (const [owner, key] of touched) delete owner[key];
assert.equal(hash(JSON.stringify(review)), controlInputReview, 'Removing only25 added children must recover the complete predecessor');
console.log(JSON.stringify({ predecessor: controlInputReview, proposed, addedChildren: touched.length,
  casesTouched: 24, staticNativeLineBoxes: staticLineBoxes, domainRows, clampRows, flexStageRows: flexRows,
  nativePaintCase: 'static:divider@light/desktop', rejectedControls: controls,
  validatedDependencies: loaded.evidenceFingerprints.length, completePredecessorRecovered: true,
  inspectionComplete: false, currentRenderingAccepted: false, selectedForExport: false, canonicalPublication: false,
  scope: 'Queued exact-case integration only. All2311 parent statuses,remaining work and original findings conserve. Current-source references are separate from historical receipts;no capture,renderer/fixture fix or canonical export.' }));
