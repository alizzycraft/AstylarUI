// Pending audit finding: not registered in the accepted canonical policy/counts.
export const sliderTrackPaintFinding = Object.freeze({
  id: 'fixture-slider-track-thickness-substitution',
  classification: 'application-plugin-authoring-defect',
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
  evidence: Object.freeze({
    report: Object.freeze({ file: 'artifacts/material-parity/current-full-20261005/latest-report.json',
      sha256: 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62' }),
    heldCheckpoint: Object.freeze({
      file: 'artifacts/material-parity/current-full-20261005/checkpoint/d849e7301ec5d9b03dca3df31e27e294f3f0e086b24a95ea1d1e00a709997988.json',
      sha256: '74e2ef9521bb94e80774ac356ebe931ab7708b224511465cf36ef2a47b7a69c5' }),
    capturedSourceMap: Object.freeze({
      file: 'artifacts/material-parity/retained-evidence/component-map-recovery-20261011/main.js.map',
      sha256: 'c0764b03e6a2e5332dc927a63b2f45396678ceb45abe23378377f343ab622473' }),
  }),
  history: Object.freeze({
    beforeCoordinateBoundaryRevision: '1399edfb43618eb71a1d40214a48b04f1f9f3b71',
    pluginSourceSha256: 'b07e7788472892b776936512b9d74bf0699db352cfd8488c8244ec8ec9c99c8f',
    conclusion: 'The pre-e4ca3db4 expression already uses the same 16%-of-host-height thickness algorithm with world scale included.',
    boundary: 'Not an introduction commit, author-motive claim or historical browser replay.',
  }),
  firstDivergence: 'All 78 recorded/configured visual hosts are 48CSSpx high. Native track/fill is 4CSSpx; the captured plugin derives 7.68CSSpx before coordinate conversion. Varying projection scale preserves the unequal incoming CSS request.',
  recommendation: 'In later implementation, express the reference-equivalent resolved track geometry through the supported public CSS-space paint contract and remove the host-height-derived substitute. First check that the required CSS input reaches the plugin unchanged; reduce any missing general style/paint capability separately at its core/public-API owner. Do not tune the visual-host height, offsets, camera scale or reference styling to reproduce the screenshot.',
  verificationPlan: 'Preserve the existing 78-case membership and native track/fill evidence. After equivalent track input is supplied, verify its pre-projection value, active/inactive geometry, DPR edges, disabled/theme states and hover/held paint independently of SSIM-only acceptance. Keep hit-domain, motion, state-layer alpha and black-fallback findings separate.',
  boundary: 'Confirmed unequal captured input geometry, not an equal-input renderer/projection defect, exact pixel-edge/compositing cause, 78 independently inspected rasters, current rendering parity or whole-case inspection closure.',
  inputEquivalent: false,
  currentRenderingAccepted: false,
  canonicalStatus: 'pending-not-registered',
});
