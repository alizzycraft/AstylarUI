// Pending source findings: intentionally outside the frozen canonical registry.
// These do not duplicate the existing Menu activation/navigation finding.
const source = 'examples/material-showcase/src/app/astylar.component.ts';
const proof = 'tests/material-parity/menu-popup-ax.spec.mjs';
export const menuPopupSemanticInputFindings = Object.freeze([
  Object.freeze({
    id: 'fixture-menu-popup-programmatic-focusability-omitted',
    file: source, classification: 'application-plugin-authoring-defect',
    owner: 'showcase menu popup semantic authoring',
    introducedBy: 'Initial2f440115 and current popup object omit tabindex;intermediate history and motive unproven.',
    focusedProof: proof,
    evidence: [{ file: 'artifacts/material-parity/menu-popup-ax-contexts-retry-20261024/latest-report.json',
      sha256: '819932e79b0bae14534f399643ac01a05942d581a2c28239d1ce88f39e49c9a1' }],
    observation: { component: 'menu', element: 'menu-popup', states: ['open'],
      profiles: ['light', 'dark', 'contrast', 'custom'], dpr: [1, 2],
      property: 'authored tabindex and actual AX focusability', reference: 'tabindex=-1;AX focusable=true',
      astylar: 'tabindex omitted;AX focusable absent',
      stage: 'authored popup object before semantic DOM projection' },
    justification: 'Actual popup/menuitem roles,names and exact controls backend associations match across eight retained desktop contexts. Popup focusability differs with unequal authored tabindex. Initial/current AST and retained trees show the omission. This is not evidence that core loses a supplied tabindex or that matching numeric DOM tabIndex properties imply equivalent attributes. Existing opening-focus/navigation failure remains under its original finding.',
    boundary: 'Retained desktop open contexts only;not initial runtime,all history,mobile,AT speech,equal-input core proof,current rendering or case closure.',
    implementationOrder: 'Later restore reference-equivalent tabindex intent through the public lowercase tabindex field;verify shared core support with equal inputs rather than adding custom focus/layout behavior.',
  }),
  Object.freeze({
    id: 'fixture-menu-controls-association-outlives-popup',
    file: source, classification: 'application-plugin-authoring-defect',
    owner: 'showcase menu trigger/popup relationship lifecycle',
    introducedBy: 'Initial2f440115 and current trigger object author literal ariaControls=menu-popup independent of conditional popup existence.',
    focusedProof: proof,
    evidence: [{ file: 'artifacts/material-parity/menu-dismissal-ax-retry-20261024/latest-report.json',
      sha256: '6cca3cbb686397037da63b543ad3544039fa26356e60fb5d62ac5643d3997b86' }],
    observation: { component: 'menu', element: 'menu-primary/menu-popup',
      states: ['supplementary Escape after maintained open'], profiles: ['light', 'dark', 'contrast', 'custom'], dpr: [1, 2],
      property: 'aria-controls after popup removal', reference: 'controls absent',
      astylar: 'controls retains removed popup ID',
      stage: 'unconditional authored trigger association versus conditional popup object' },
    justification: 'All eight paired contexts remove the menu DOM/AX owner,mark trigger expanded=false and return focus to the trigger. Candidate DOM retains a dangling popup ID while native clears it;Chrome omits controls from both closed trigger AX nodes. This is not stale popup AX retention or failure to clear an omitted renderer input:the candidate still authors the relationship. Existing Escape success does not establish complete lifetime or current-renderer acceptance.',
    boundary: 'Supplementary trusted Escape only,not configured open-dismiss replay,other dismissal paths,mobile,AT speech,current rendering or whole-case closure.',
    implementationOrder: 'Later make relationship lifecycle match popup lifecycle at the authoring boundary;retain exact AX IDREF and no-stale-owner checks without coordinate/style compensation.',
  }),
]);
