import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { evaluateFocusedRaster } from '../tests/material-parity/focused-raster-metrics.mjs';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';

// Reuse the existing exact-case census and original TAP observations. No browser
// capture,reinterpretation of profile labels,or whole-parent promotion.
const script = 'scripts/join-material-icon-retained-obligations.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const base = 'artifacts/material-parity/';
const predecessor = '117a41db956f86e1465b8de0fee9e3d5a0fd3073049c1698a837fd0eee4ec3cb';
const review = JSON.parse(readFileSync(`${base}working-audit/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
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
  for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']) {
    assert.equal(demo[stage].display, 'flex'); assert.equal(demo[stage].flexDirection, 'column');
    assert.equal(image[stage].display, 'inline-block');
  }
  const displayRules = candidate.rules.filter(r => r.selector === '#icon-root' && r.display !== undefined);
  assert.equal(displayRules.length, 1); assert.equal(displayRules[0].display, 'flex');
  const paired = [{ reference: frame.key, candidate: page.key }, { reference: host.key, candidate: demo.key }];
  for (const [type, id, text] of [['p', 'eyebrow', 'Angular Material 20 reference'], ['h1', 'title', 'icon']]) {
    const left = unique(reference.nodes.filter(n => n.parent === frame.key && n.type === type));
    const right = unique(candidate.nodes.filter(n => n.authored?.id === id));
    assert.equal(left.ownText.trim(), text); assert.equal(right.authored.textContent, text);
    assert.equal(right.parent, page.key); assert.equal(right.authored.type, type);
    paired.push({ reference: left.key, candidate: right.key });
  }
  return { referenceNodes: 7, candidateNodes: 6, paired,
    substitution: { reference: [icon.key, svg.key, leaf.key], candidate: image.key,
      classification: 'application-plugin-authoring-defect', definition: 'fixture-icon-svg-replaced-by-fixed-raster',
      nativePathSha256: hash(leaf.attributes.d), candidatePngSha256: hash(png), intrinsicPngSize: [24, 24] },
    extraDocumentNode: synthetic.key,
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
  if (!hierarchyNegativeControls) {
    const missing = structuredClone(trees.reference); missing.nodes.pop();
    assert.throws(() => inspectHierarchy(missing, trees.astylar)); hierarchyNegativeControls++;
    const wrong = structuredClone(trees.astylar); wrong.nodes.find(n => n.authored?.id === 'icon-primary').parent = 'root';
    assert.throws(() => inspectHierarchy(trees.reference, wrong)); hierarchyNegativeControls++;
    const wrongDisplay = structuredClone(trees.astylar); wrongDisplay.nodes.find(n => n.authored?.id === 'icon-root').normalResolvedStyle.display = 'block';
    assert.throws(() => inspectHierarchy(trees.reference, wrongDisplay)); hierarchyNegativeControls++;
  }
  originals.push({ row, semantics: row.obligations.semantics, history: row.obligations.historyOwnership, inputs: row.obligations.inputStyleStructure, paint: row.obligations.localPaint });
  const evidence = { census: { file: censusFile, sha256: hash(readFileSync(censusFile)) },
    logs: receipts.map(({ file, sha256 }) => ({ file, sha256 })), join: { file: script, sha256: hash(readFileSync(script)) } };
  row.obligations.semantics = { ...row.obligations.semantics, retainedActualIconTargetExposure: {
    disposition: 'inspected-failure', cohort: c.cohort, observations: pair, evidence,
    classification: 'application-plugin-authoring-defect',
    boundary: 'Retained direct target partial AX:reference ARIA-hidden versus exposed candidate image. Not whole-subtree associations,assistive technology or current runtime acceptance.' } };
  // Existing census binds the corresponding bounded update/disposal log. This
  // subrecord preserves that historical membership,not new async/remount proof.
  const lifecycle = receipts.find(r => r.file === base + c.updatesDisposal); assert.ok(lifecycle);
  row.obligations.historyOwnership = { ...row.obligations.historyOwnership, retainedIconUpdateDisposalMembership: {
    disposition: 'inspected-bounded-membership', cohort: c.cohort, evidence,
    sourceLog: { file: lifecycle.file, sha256: lifecycle.sha256 },
    boundary: 'Existing three-update/sampled-disposal cohort membership only;not fresh execution,current source validity,late image completion,remount or peer isolation.' } };
  row.obligations.inputStyleStructure = { ...row.obligations.inputStyleStructure,
    retainedIconRecordedHierarchy: { disposition: 'inspected-recorded-node-inventory', ...hierarchy,
      evidence: { pairedTrees: row.evidence.pairedTrees, join: evidence.join } } };
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
for (const { row, semantics, history, inputs, paint } of originals) { row.obligations.semantics = semantics; row.obligations.historyOwnership = history; row.obligations.inputStyleStructure = inputs; row.obligations.localPaint = paint; }
assert.equal(hash(JSON.stringify(review)), predecessor);
console.log(JSON.stringify({ predecessor, proposal, iconCases: 20, physicalCohorts: 16, negativeControls: rejected,
  cases: loaded.cases.length, dependencies: loaded.evidenceFingerprints.length, unrelatedReviewConserved: true,
  recordedReferenceNodes: 140, recordedCandidateNodes: 120, hierarchyNegativeControls,
  inspectPaintJoins, inspectSharpnessFailures,
  inspectionComplete: loaded.inspectionComplete, currentRenderingAccepted: loaded.currentRenderingAccepted }));
