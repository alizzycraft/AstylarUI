// Pending definition for the next coherent registry batch, not live acceptance.
export const stepperLabelWrapperFinding = Object.freeze({
  id: 'fixture-stepper-label-clipping-wrappers-omitted',
  classification: 'application-plugin-authoring-defect',
  file: 'examples/material-showcase/src/app/astylar.component.ts',
  pattern: String.raw`selector: '\.step-text', marginLeft: '8px', whiteSpace: 'nowrap', fontWeight: '500', fontSize: '14px'`,
  introducedBy: '2f440115 initial Material showcase direct step-text children; later typography edits retain the omitted wrapper constraints.',
  owner: 'Material Stepper label-wrapper structure and CSS constraint translation',
  focusedProof: 'tests/material-parity/stepper-label-wrapper-inputs.spec.mjs',
  observation: {
    retainedCases: 68, nativeOuterLabels: 136, nativeInnerLabels: 136, candidateDirectLabels: 136,
    native: { outerMinWidth: '50px', innerMinWidth: '0px', display: 'block', overflowX: 'hidden', overflowY: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
    candidate: { display: 'inline', whiteSpace: 'nowrap', omitted: ['overflow', 'overflowX', 'overflowY', 'minWidth', 'textOverflow'] },
    firstDivergence: 'Candidate direct text spans omit the native outer and inner label wrappers and their clipping/minimum-width constraints.',
  },
  evidence: [{
    file: 'artifacts/material-parity/working-audit/3252368beb18426245167b716fe22c6af0d2c4ce8da283ef574f43b89cc686aa/index.json',
    sha256: 'ff2b1a1d86fb00467f1673f6db0f4b98febc1c2f33b12d45f8c37057aee54cb5',
  }],
  justification: 'All 68 authenticated retained Stepper trees place native text inside two clipped nowrap/ellipsis blocks, with a 50px outer minimum width. Candidate labels are direct tab children and omit those constraints. Complete node accounting is not proof that removing the wrappers is equivalent. Initial showcase authoring already contains this substitution; short labels looking similar cannot establish equal inputs.',
  recommendation: 'Restore equivalent native label structure and constraints before diagnosing residual layout or clipping behavior with equal-input public reproductions. Do not calibrate label offsets or widths to match current screenshots.',
  boundary: 'Retained input mismatch, not a proven core defect or long-label visual failure. Omitted properties are not asserted computed defaults. Does not close anonymous boxes, paint, current-source applicability or whole-case inspection.',
});
