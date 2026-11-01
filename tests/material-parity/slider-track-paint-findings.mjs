// Pending audit finding: not registered in the accepted canonical policy/counts.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const captureEvidence = Object.freeze({
  report: Object.freeze({ file: 'artifacts/material-parity/current-full-20261005/latest-report.json',
    sha256: 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62' }),
  heldCheckpoint: Object.freeze({
    file: 'artifacts/material-parity/current-full-20261005/checkpoint/d849e7301ec5d9b03dca3df31e27e294f3f0e086b24a95ea1d1e00a709997988.json',
    sha256: '74e2ef9521bb94e80774ac356ebe931ab7708b224511465cf36ef2a47b7a69c5' }),
  capturedSourceMap: Object.freeze({
    file: 'artifacts/material-parity/retained-evidence/component-map-recovery-20261011/main.js.map',
    sha256: 'c0764b03e6a2e5332dc927a63b2f45396678ceb45abe23378377f343ab622473' }),
});
export const sliderTrackPaintFinding = Object.freeze({
  id: 'fixture-slider-track-thickness-substitution',
  classification: 'application-plugin-authoring-defect',
  introducedBy: 'Predates CSS-coordinate boundary refactor e4ca3db4; first-bad introduction and author motive not established',
  owner: 'showcase MaterialRangeVisualRenderer CSS-space track geometry',
  file: 'examples/material-showcase/src/app/material-plugin/material-showcase.plugin.ts',
  pattern: String.raw`const trackHeightCss = Math\.max\(4, Math\.min\(16, context\.dimensions\.height \* \.16\)\);`,
  focusedProof: 'tests/material-parity/slider-retained-state-layer.spec.mjs: retained Slider track thickness diverges before coordinate projection',
  observation: Object.freeze({
    component: 'slider', element: 'slider-visual track', property: 'paint height in CSS pixels',
    staticCases: 12, interactionCases: 66, pairedTrees: 156,
    referenceCssPx: 4, astylarCssPx: 7.68, visualHostHeightCssPx: 48,
    stage: 'application plugin computes different track geometry before toRenderSize',
  }),
  captureEvidence,
  evidence: Object.freeze(Object.values(captureEvidence)),
  history: Object.freeze({
    beforeCoordinateBoundaryRevision: '1399edfb43618eb71a1d40214a48b04f1f9f3b71',
    pluginSourceSha256: 'b07e7788472892b776936512b9d74bf0699db352cfd8488c8244ec8ec9c99c8f',
    conclusion: 'The pre-e4ca3db4 expression already uses the same 16%-of-host-height thickness algorithm with world scale included.',
    boundary: 'Not an introduction commit, author-motive claim or historical browser replay.',
  }),
  firstDivergence: 'All 78 recorded/configured visual hosts are 48CSSpx high. Native track/fill is 4CSSpx; the captured plugin derives 7.68CSSpx before coordinate conversion. Varying projection scale preserves the unequal incoming CSS request.',
  justification: 'The original report and 156 paired trees establish 4CSSpx native tracks and 48CSSpx visual hosts in all 78 configured cases. Executing the authenticated captured plugin expression requests 7.68CSSpx before projection. The unequal track geometry belongs to the application plugin, not a demonstrated failure to render equal CSS inputs. Historical source controls preserve the same algorithm before the coordinate-boundary refactor.',
  recommendation: 'In later implementation, express the reference-equivalent resolved track geometry through the supported public CSS-space paint contract and remove the host-height-derived substitute. First check that the required CSS input reaches the plugin unchanged; reduce any missing general style/paint capability separately at its core/public-API owner. Do not tune the visual-host height, offsets, camera scale or reference styling to reproduce the screenshot.',
  verificationPlan: 'Preserve the existing 78-case membership and native track/fill evidence. After equivalent track input is supplied, verify its pre-projection value, active/inactive geometry, DPR edges, disabled/theme states and hover/held paint independently of SSIM-only acceptance. Keep hit-domain, motion, state-layer alpha and black-fallback findings separate.',
  boundary: 'Confirmed unequal captured input geometry, not an equal-input renderer/projection defect, exact pixel-edge/compositing cause, 78 independently inspected rasters, current rendering parity or whole-case inspection closure.',
  inputEquivalent: false,
  currentRenderingAccepted: false,
  canonicalStatus: 'pending-not-registered',
});

// Stage/reverse only this exact addition. These functions never write live files.
export const sliderTrackPolicyPriorSha256 = '7381e8fba08553caec77947e88ce5246e1c3fc01a6da18b81f3c07ea945a336f';
const policyHash = source => createHash('sha256').update(source).digest('hex');
const policyAnchor = ']);\n\nexport const pluginBoundaryVerdict';
const { captureEvidence: _captureEvidence, canonicalStatus: _canonicalStatus, ...policyDefinition } = sliderTrackPaintFinding;
const policyAddition = `  Object.freeze(${JSON.stringify(policyDefinition, null, 2).replaceAll('\n', '\n  ')}),\n`;

export function prepareSliderTrackPolicy(bytes) {
  const source = bytes.toString().replaceAll('\r\n', '\n');
  assert.equal(policyHash(source), sliderTrackPolicyPriorSha256, 'Unrecognized pre-Slider-track policy');
  assert.equal(source.split(policyAnchor).length, 2, 'Ambiguous policy insertion boundary');
  return source.replace(policyAnchor, policyAddition + policyAnchor);
}

export function restoreSliderTrackPolicy(bytes) {
  const source = bytes.toString().replaceAll('\r\n', '\n');
  if (policyHash(source) === sliderTrackPolicyPriorSha256) return source;
  assert.equal(source.split(policyAddition + policyAnchor).length, 2, 'Unrecognized Slider-track policy addition');
  const prior = source.replace(policyAddition + policyAnchor, policyAnchor);
  assert.equal(policyHash(prior), sliderTrackPolicyPriorSha256, 'Complete prior policy must recover');
  return prior;
}

export const sliderTrackProducerPriorSha256 = '89e3475e7e4df473b3f0a1ea51b7335b6cfc4c1570be91d90488f0fdf33a1877';
const trackFile = 'tests/material-parity/slider-track-paint-findings.mjs';
const trackSuite = 'tests/material-parity/slider-retained-state-layer.spec.mjs';
const trackProofTitles = [
  'pending Slider track finding fits the existing source scanner without canonical mutation',
  'retained Slider track thickness diverges before coordinate projection',
];
const trackPlan = { priority: 2.05, rootCause: 'Range plugin substitutes host-relative track thickness for native track geometry',
  action: sliderTrackPaintFinding.recommendation + ' ' + sliderTrackPaintFinding.verificationPlan };
const producerChanges = [
  ['function sourceFingerprints(root) {\n  const files = [\n', `    ${JSON.stringify(trackFile)},\n`],
  ['function focusedProofInventory(root) {\n  return [\n', trackProofTitles.map(title =>
    `    proof(root, ${JSON.stringify(trackSuite)}, new RegExp(${JSON.stringify("test\\('" + title + "'")}), ${JSON.stringify(title)}, ${JSON.stringify(sliderTrackPaintFinding.boundary)}),\n`).join('')],
  ['function implementationPlan() {\n  return [\n', `    ${JSON.stringify(trackPlan)},\n`],
];

export function prepareSliderTrackProducer(bytes) {
  let source = bytes.toString().replaceAll('\r\n', '\n');
  assert.equal(policyHash(source), sliderTrackProducerPriorSha256, 'Unrecognized pre-Slider-track producer');
  for (const [anchor, addition] of producerChanges) {
    assert.equal(source.split(anchor).length, 2, 'Ambiguous Slider-track producer boundary');
    source = source.replace(anchor, anchor + addition);
  }
  return source;
}

export function restoreSliderTrackProducer(bytes) {
  let source = bytes.toString().replaceAll('\r\n', '\n');
  if (policyHash(source) === sliderTrackProducerPriorSha256) return source;
  for (const [anchor, addition] of producerChanges.toReversed()) {
    assert.equal(source.split(anchor + addition).length, 2, 'Unrecognized Slider-track producer addition');
    source = source.replace(anchor + addition, anchor);
  }
  assert.equal(policyHash(source), sliderTrackProducerPriorSha256, 'Complete prior producer must recover');
  return source;
}
