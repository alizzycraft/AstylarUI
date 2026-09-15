# Field-host initial styles: observation-stage audit

This is an audit finding, not a renderer fix or accepted input equivalence.

The original source-bound inventory contains 577 form-field, input,
autocomplete, select, datepicker and timepicker cases. Reopening their paired
trees produces 48 family/property groups and 4,616 observations for `fontStyle`,
`wordSpacing`, `textTransform`, `whiteSpace`, `overflowWrap`, `wordBreak`,
`pointerEvents` and `visibility`.

For these properties, the captured browser frame/section/Material-host chain
has no competing authored requests and reports computed defaults. The mapped
Astylar page/section/field-shell chain also omits requests, but its three
diagnostic snapshots describe local declarations, not computed inherited
values. Consequently the scalar mismatch cannot by itself establish missing
authoring or a renderer defect. Its demonstrated cause is a mismatch between
the observation stages used by the audit.

The [machine inventory](material-field-host-initial-style-audit.json) preserves
the original report digest, all 577 case keys and paired tree references,
property-specific values, all group occurrences, eight source fingerprints,
and a digest of the complete independently replayed paths. The browser's
`wordSpacing: 0px` remains recorded separately from the canonical scalar `0`;
candidate omission is never replaced with either value.

## Verification

- `node --test tests/material-parity/field-host-initial-style-evidence.spec.mjs`:
  4/4 pass, zero skips/cancellations, 12.536 seconds. This includes the complete
  577-case replay and exact joins to all 4,616 original scalars.
- Negative controls reject incomplete/duplicate cases, wrong style provenance,
  changed ancestry, ancestor inline requests, potentially matching unknown
  selectors, changed browser values, populated candidate local stages,
  mismapped scalar identities and fabricated computed/raster verification.
- `node scripts/audit-material-field-host-initial-styles.mjs --check` replays
  the complete source population and checks the generated inventory exactly.

## Ownership and limits

The audit observation boundary owns this finding. It must expose and compare
equivalent stages without synthesizing candidate computed values. Core
inheritance, wrapping, pointer-event/visibility consumption, layout and final
paint still require their independent proofs. Existing Material component
font-family, font-size, line-height, weight/tracking and alignment authoring
findings are not changed by this survey.

The source survey is now consumed by the canonical classifier and its tests are
registered in the package harness. The separate
[integration record](material-field-host-initial-style-integration.json)
retains the two expected failing tests before integration and their passing
results afterward. All original scalar values and 105 unrelated complete rows
in the reduced two-case proof retain their pre-integration hashes. Independent
validation rejects lost/duplicate property groups, changed paths, forged
equivalence and incomplete case/state coverage.

Complete canonical regeneration now attributes exactly 48 groups / 4,616
occurrences, reducing unresolved attributions from 3,186 to **3,138**. All 8,339
original groups retain their values and occurrence counts; the complete 8,291
unrelated rows retain their pre-integration digest. All 148 source fingerprints
verify and the complete 1,715,204,637-byte decoded payload passes its recorded
SHA-256. The separate canonical re-check and 39-file harness remain running. The
source-survey generator's `canonicalIntegration: false` intentionally means
that its standalone replay does not itself verify integration. The separate
integration tests and canonical checks own that claim. No renderer, plugin,
canonical example, reference or visual threshold was changed.
