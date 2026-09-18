# Complete original vertical-alignment input population

This source-bound survey reviews **116 scalar difference groups / 6,886
observations** across all **2,311 original cases**. It includes previously reviewed
groups; these are not 116 new canonical findings. It does not change comparison
inputs, rendering, normalizers, or canonical classifications.

## Findings

| Observed input boundary | Groups | Observations | Classification and limit |
| --- | ---: | ---: | --- |
| Browser computed `baseline`; neither side supplies a local alignment request; candidate local stage omits it | 90 | 5,315 | Harness observation-stage mismatch; candidate computed/used alignment remains unverified |
| Reference explicitly requests `middle`; candidate local authoring and all three captured stages omit it | 13 | 794 | Unequal local authoring; applicability, control defaults and visual consequences remain separate obligations |
| Candidate explicitly requests `middle`; reference computes `baseline` without an alignment declaration | 11 | 718 | Authoring substitution; not evidence that it fixes or conceals a particular core defect |
| Generated overlay owner is established, but scalar and full-tree authored-rule evidence disagree | 2 | 59 | Capture gap retained; no affirmative alignment-input conclusion |

There are also **52 equal scalar observations**, which are counted but not
promoted to whole-element equivalence, and **eight missing scalar observations**.
The latter are the tooltip `open` state across four themes and DPR 1/2. Their
original missing evidence is retained, not reinterpreted as proof of current
tooltip visibility or positioning.

The original ID-only survey left 12 groups / 442 observations unmapped: badge
count; bottom-sheet copy, dismissal, overlay and panel; dialog panel; paginator
range and size; snackbar overlay and surface; stepper content; and tooltip popup.
The updated collector reuses the existing generated-node, template-owner and
origin-alias proofs for all 442. These establish component ancestry, active
stepper ownership, exact list order, and all 89 scalar fields without injecting
IDs or choosing nodes by appearance. Ten groups / 383 observations now support
the observation-stage finding.

The remaining 25 bottom-sheet-overlay and 34 snackbar-overlay observations have
known owners but differing authored-rule records. Each full tree contains
`.cdk-global-overlay-wrapper { z-index: 1000; }`, absent from the scalar rule
list; there are no extra scalar rules. The survey preserves the exact missing
rule, both owner paths and the 89-field match. It does not discard that rule as
irrelevant to alignment or classify these observations as complete input proof.
All 59 cases, tree descriptors and complete generated-owner proofs also join
exactly to both gap-property observations in the
[existing scalar-layer loss review](material-gap-scalar-rule-loss.md). This is
the previously isolated scalar collector omission of `@layer` rules, not a new
renderer diagnosis. The alignment survey keeps its capture-gap status rather
than silently repairing the historical records.

## Historical compensation is broader than the four control labels

Scanning **102 revisions** of the candidate component traces all eight selectors
responsible for the 11 candidate-middle groups:

- `354084ea1f1a6abb3e010222062e3cea9f945b61`, **fix(example): center Material
  control labels**, introduced `middle` in seven selectors: `.checkbox-label`,
  `.radio-label`, `.switch-label`, `.expansion-title`, `.step-text`, `.tab`, and
  `.tab-panel`. This reaches ten groups / **686 observations**, not just the four
  checkbox/radio/switch label groups previously reviewed.
- `bc0e4493bdad98a694635ff57ff5746ee285d040`, **fix(material): match dialog
  content geometry**, introduced it in `.dialog-copy`, together with explicit
  height, line height, flex alignment and padding changes: **32 observations**.

The machine report preserves before/after source lines, commit subjects, current
lines, and the unchanged source endpoint
`9f713c0930ea5c3692e96f5f62a05d38863abcb8`. This establishes when the requests were
introduced, not a replay of historical rendering or a demonstrated motivation
beyond the recorded changes and commit subjects.

## First divergence and ownership

The explicit-middle groups diverge at authoring. The initial/omitted groups
diverge at the audit's observation boundary: browser computed styles versus
candidate local declaration inspection. Neither finding establishes equal used
values or correct glyph placement.

The [public equal-input reduction](material-public-vertical-align-audit.md)
separately proves a core defect in formatting-context applicability and default
handling. It does not yet causally explain these Material compositions. In that
reduction, omitted alignment already places non-inline text correctly; adding
`middle` moves it away. Do not infer that every historical `middle` request was
a successful workaround for that particular defect.

Owner differences are retained explicitly. Dialog copy maps
`mat-dialog-content` to `p`; tab labels map spans to buttons; tab content maps a
span to `showcase.material:tab-panel`. The latter has no captured core retained
text owner. A property stored on that private plugin node is not proof that its
independent text painter consumes it. These differences must remain visible
when investigating core versus plugin responsibility.

## Implementation plan after the audit

1. Keep CSS `vertical-align` applicability and baseline handling in the owning
   core formatting/text subsystem; do not introduce alignment offsets in world
   space or plugins. Preserve the failing public equal-input matrix.
2. Reduce the actual Material parent compositions for the explicit substitutions,
   including span/button and core/private-text ownership differences. Establish
   whether parent layout, line-box sizing or a separate typography path causes
   each remaining displacement.
3. Remove compensating authoring only alongside the appropriate verified general
   correction, keeping the reference inputs authoritative. Do not mechanically
   replace all omissions with `baseline` or all substitutions with another value.
4. Carry forward the existing scalar-layer capture diagnosis for the 59 overlay
   observations and preserve the eight missing tooltip observations. Join source-proven classifications to canonical
   rows with complete membership and unrelated-row conservation; do not substitute
   this population survey for that integration proof.

## Verification

```text
node scripts/audit-material-vertical-align-population.mjs
node --test --test-concurrency=1 tests/material-parity/vertical-align-population.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

The collector authenticates the complete original capture SHA-256, checks every
consumed tree against its capture descriptor, compares all 89 reference scalar
properties and all three candidate style snapshots, and binds active reference
rules plus inline declarations to the original scalar evidence. Inactive rules
remain available in the full tree; conservative candidate selector checks do
not synthesize cascade winners. Attribute escapes, resets, unknown selectors,
conditional requests, and ambiguous owners cannot become affirmative findings.

Focused verification includes exhaustive source replay in a process where file
writes are prohibited, independent full population membership, one original
owner replay per group, changed-evidence rejection controls, and explicit
mapping-gap tests. These are input-evidence tests, not a full parity pass.

Final generation exits **0**. The current focused run passes **12/12**, exit **0**,
with zero failures, skips, cancellations or TODOs, in **34,871.3864ms**. This
includes eight population/history/source/alias tests and four harness-inventory
tests, 25 inconsistent/competing-evidence rejection cases, four direct mapping-gap
cases, and five generated-owner rejection cases. The alias test replays all 442
original mapping observations and explicitly asserts the 59 retained rule gaps.
The conservation test authenticates the preceding `d514acc` report, preserves
every original observation and group membership, and proves all 6,444 unrelated
complete proofs unchanged. The 59 rule-gap witnesses also match the existing
layer-capture diagnosis's exact cases, tree descriptors and owner proofs.
The preceding ID-only ten-test run took 29,026.6242ms and is superseded by this
complete replay.

Logs are `artifacts/material-parity/field-host-flow-input-audit/vertical-align-owner-join-generation-final.log`
and `vertical-align-owner-join-final-verification.log`. The current machine report
SHA-256 is
`a5e1371c957747b557be82b149cef346e07dcc36144115dd2e74601b01342451`.

Discovery now includes **160 suites** (152 Material, four general, four TTS;
all 43 legacy suites retained). Canonical integration, the complete current
harness and the complete enforced parity matrix remain outstanding.

[Machine evidence](material-vertical-align-population.json).
