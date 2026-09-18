# Alignment review: exact canonical membership proposal

This is a classification proposal, not a renderer fix, canonical promotion, or
input-equivalence claim. It binds the complete original alignment survey to the
authenticated canonical payload at `957774a`, preserving prior classifications
and reserving an overlapping finding for the existing expansion-owner review.

## Scope and disposition

| Disposition | Groups | Original observations |
| --- | ---: | ---: |
| Propose observation-stage mismatch: computed browser baseline versus omitted candidate local declaration | 53 | 2,936 |
| Propose unequal authoring: reference explicitly requests middle, candidate omits it | 4 | 194 |
| Propose unequal authoring: candidate explicitly adds middle against reference baseline | 11 | 718 |
| Retain original scalar/full-tree overlay rule gaps | 2 | 59 |
| Preserve classifications already present in the frozen canonical report | 45 | 2,911 |
| Reserve the expansion-panel/header mismatch for its existing proposal | 1 | 68 |
| Total original difference population | 116 | 6,886 |

The **68 proposed groups / 3,848 observations** are the remaining alignment
review candidates after accounting for the separately integrated follow-up
population. The frozen baseline contains 69 otherwise eligible groups: its
`expansion-primary` row is still unresolved there, but the existing follow-up
proposal already assigns its first divergence to comparing the reference panel
with the candidate header. This join reserves that exact complete row rather
than creating a competing alignment classification. It does not re-prove or
adopt the reserved proposal's semantic conclusion.

All **8,271 other complete canonical rows** remain outside the proposed change.
Their ordered-row-digest SHA-256 is
`0adeecbd06eec2b152a31995a819a62041fcb10675ba8a75ecfcedc191af6e02`.
The report retains the complete original row digest
for every mapped alignment group, and exact case/state membership with original
scalar-input, tree-descriptor and source-proof hashes for every observation.
The 52 equal scalar observations and eight missing tooltip-open records remain
accounted for without being promoted to whole-element equivalence.

## Evidence boundary

The collector independently regenerates the source-bound survey pinned at
`4d940bd`, authenticates the original 2,311-case capture, and uses the unchanged
production normalizers. It streams and authenticates every byte of the frozen
canonical payload rather than accepting sampled rows. The prior follow-up
proposal is pinned at `11bd538`; overlap exclusion requires exact complete-row
equality and membership, not a property/family exemption.

The source history and [public alignment proof](material-public-vertical-align-audit.md)
remain separate evidence. The public reduction demonstrates a core alignment
applicability/default defect, but this membership join does not demonstrate that
it caused the Material composition discrepancies. Candidate computed/used
alignment, CSS applicability in differing owner structures, glyph placement,
private plugin text consumption and historical rendering remain unproved.

The two retained gaps concern 25 bottom-sheet and 34 snackbar overlay records.
Their known scalar-layer capture loss is not repaired or silently discarded.
The eight missing tooltip scalar records are not evidence that a current tooltip
is visible, clipped, or positioned correctly.

## Verification

Generation exits 0. Independent write-prohibited replay, pure membership checks,
34 changed-evidence rejection controls and four inventory tests pass **7/7**,
exit 0, zero failures/skips/cancellations/TODOs, in **197,776.0105ms**.
The report SHA-256 is
`74766ae604171d8ee70f20261cf2ad6b4fa30cad8440d1b6135744e0524c2c90`.
Commands:

```text
node --max-old-space-size=1536 scripts/bind-material-vertical-align-population.mjs
node --test --test-concurrency=1 tests/material-parity/vertical-align-canonical-plan.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

The focused suite includes a write-prohibited independent replay, pure membership
and conservation checks, and changed-evidence rejection controls. Logs are in
`artifacts/material-parity/field-host-flow-input-audit/`:
`vertical-align-canonical-plan-generation-final.log` and
`vertical-align-canonical-plan-verification.log`.

An initial generation assertion expected 68 proposals directly from the frozen
baseline and failed because it found 69. Inspection established the one-group
overlap described above; the collector now explicitly reserves it. The original
failure is retained in `vertical-align-canonical-plan-generation.log`.

No renderer, plugin, reference, comparison fixture, visual threshold, or
canonical classification is changed by this increment. Promotion requires a
separate integration and complete-row conservation proof. The overall audit,
complete audit harness, and enforced parity matrix remain incomplete.
