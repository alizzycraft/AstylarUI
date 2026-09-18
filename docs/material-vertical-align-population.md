# Complete original vertical-alignment input population

This source-bound survey reviews **116 scalar difference groups / 6,886
observations** across all **2,311 original cases**. It includes previously reviewed
groups; these are not 116 new canonical findings. It does not change comparison
inputs, rendering, normalizers, or canonical classifications.

## Findings

| Observed input boundary | Groups | Observations | Classification and limit |
| --- | ---: | ---: | --- |
| Browser computed `baseline`; neither side supplies a local alignment request; candidate local stage omits it | 80 | 4,932 | Harness observation-stage mismatch; candidate computed/used alignment remains unverified |
| Reference explicitly requests `middle`; candidate local authoring and all three captured stages omit it | 13 | 794 | Unequal local authoring; applicability, control defaults and visual consequences remain separate obligations |
| Candidate explicitly requests `middle`; reference computes `baseline` without an alignment declaration | 11 | 718 | Authoring substitution; not evidence that it fixes or conceals a particular core defect |
| No unique corresponding reference owner using ID or parity ID | 12 | 442 | Unresolved mapping; no fallback by matching text, style or appearance |

There are also **52 equal scalar observations**, which are counted but not
promoted to whole-element equivalence, and **eight missing scalar observations**.
The latter are the tooltip `open` state across four themes and DPR 1/2. Their
original missing evidence is retained, not reinterpreted as proof of current
tooltip visibility or positioning.

The unmapped groups are badge count; bottom-sheet copy, dismissal, overlay and
panel; dialog panel; paginator range and size; snackbar overlay and surface;
stepper content; and tooltip popup. These need their existing selector/owner
mappings joined to the full capture before this survey can classify them.

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
4. For the 12 unresolved mappings, bind the measurement selectors to exact owners;
   preserve missing tooltip evidence. Then join source-proven classifications to
   canonical rows with full membership and unrelated-row conservation.

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

Final generation exits **0**. The final focused run passes **10/10**, exit **0**,
with zero failures, skips, cancellations or TODOs, in **29,026.6242ms**. This
includes six population/history/source tests and four harness-inventory tests,
25 inconsistent/competing-evidence rejection cases and four mapping-gap cases.
The earlier nine-test run passed before the explicit history assertion was
added; a subsequent ten-test run passed before the extra scalar/tree authoring
disagreement guards. Neither earlier pass substitutes for the final replay.

Logs are `artifacts/material-parity/field-host-flow-input-audit/vertical-align-population-final-generation.log`
and `vertical-align-population-final-verification.log`. The final machine report
SHA-256 is
`f650af18267a5a7e3d324ae30b603ac203189e343de93637115b10664c56c106`.

Discovery now includes **159 suites** (151 Material, four general, four TTS;
all 43 legacy suites retained). Canonical integration, the complete current
harness and the complete enforced parity matrix remain outstanding.

[Machine evidence](material-vertical-align-population.json).
