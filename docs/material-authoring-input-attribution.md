# Source-bound authoring input attribution proposal

This increment joins three independently replayed authoring investigations to
the frozen canonical discrepancy inventory. It does not change canonical
classifications, the renderer, comparison fixtures, or the browser reference.

## Findings and scope

| Investigation | Original owner observations | Unequal scalar observations | Numerically matching observations |
| --- | ---: | ---: | ---: |
| List/table fixed container font | 104 | 52 | 52 |
| Range-input font reset omission | 156 | 76 | 80 |
| Slider visual disabled opacity omission | 78 | 8 | 70 |

The first two populations retain an authoring difference even where the
numeric font sizes agree. The 70 equal-opacity slider observations are retained
as numeric matches, not promoted into proof that their complete authoring or
rendering is equivalent. Detailed disabled-state proof covers the eight unequal
observations only. Across the three populations there are 338 owner observations,
268 detailed source witnesses, 136 unequal scalars, and 202 numeric matches.

The underlying investigations are
[container font inheritance](material-container-font-inputs.md),
[range font reset translation](material-range-font-reset.md), and
[slider disabled visual state](material-slider-disabled-inputs.md).
They retain authenticated original trees and historical evidence. The causes
established here are unequal authoring before projection; they do not establish
a core font-inheritance defect, final glyph paint, group-opacity composition,
or the cause of swapped thumbs, black state rings, or jerky dragging.

## Independent join and conservation

The collector reruns each source proof and compares its complete serialized
result with the checked-in proof. It authenticates the original capture and
rescans all 2,311 original static/interaction cases. Group membership comes from
that source population, not a filter of remaining canonical discrepancies.

The frozen canonical revision is
`06e50dbcd3594c5987d63a4ec38e792b87b08dde`. The streaming reader authenticates
both compressed and decoded payloads. Each selected group must have exactly
the original occurrences, ordered capped case examples, and states, and must
still be unresolved. Existing classifications cannot be replaced. Every other
complete row contributes to the ordered conservation digest.

The proposal executes the seven existing production normalization functions
and the separately source-bound production `equivalentValue` function. This
distinction matters: `canonicalStyle` retains opacity strings `1` and `1.0`,
while the production equality function accepts their numeric equivalence.
The initial development run incorrectly used string equality after
normalization and failed at `static:slider@light/desktop`. That failure was
not waived or converted into a discrepancy. The join now executes the actual
production equality function and rejects changes to its source fingerprint.

Machine-readable output:
[material-authoring-input-attribution-plan.json](material-authoring-input-attribution-plan.json).
This is a proposed mapping only. The canonical unresolved count remains 2,160.

## Verification

Generation:

```powershell
node --max-old-space-size=512 scripts/audit-material-authoring-input-attribution.mjs
```

Independent no-write replay and focused mutation/inventory tests:

```powershell
node --test tests/material-parity/authoring-input-attribution.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

The first focused test invokes the collector with `--check`, independently
replaying the complete source proofs and frozen canonical payload. Other tests
use explicit small canonical projections only to exercise rejection behavior;
those projections are not offered as full-payload authentication.

Generation completed with exit **0**. Independent replay plus focused/inventory
verification completed with **9 tests / 9 passes**, exit **0**, no skips,
cancellations, or TODOs, in **95,760.0833ms**. This includes 61 rejection-control
executions: 45 source-witness mutations, six population/count mutations, eight
canonical membership/attribution mutations, and two production-function changes.
The complete replay itself took 89,089.8861ms.

The proposal maps **nine unresolved groups / 136 observations**: four container
font groups (52), four range font groups (76), and one disabled opacity group
(8). The other **8,330 complete rows** have ordered-row-digest SHA-256
`71c536227ccf549c907a73a30173abcb2d6564f08ce40bb74a4708ac5a2bd79a`.
The proposal file SHA-256 is
`b389d16b0a77468d8b509aaaa52e5ef82de2def988d4467a1998e40e0a545430`.
The local focused log is
`artifacts/material-parity/field-host-flow-input-audit/authoring-input-attribution-focused.log`.

Discovery now contains 122 files (114 Material, four general, four TTS), retaining
all 43 legacy files. The independently running full harness was launched at
`9933ac1` with 120 files, before the range-reset and this proposal test were
added. Its eventual result cannot establish complete coverage of the current
122-file inventory. No selected source/test file from that run was changed by
this increment.

## Recommended implementation boundary

Restore equivalent authored rules in a later implementation task: scaled
container font inheritance, the full reference control font reset intent, and
disabled state propagation to the slider visual owner. If the shared public
API/core cannot express or execute those rules, retain that support gap and
prove/fix it at its general owner. Do not substitute sampled font sizes,
fixture-specific pixel overrides, or unrelated visual patches.

Canonical integration must separately preserve all unrelated rows and prior
reviews. Neither the proposal nor its focused tests satisfy the complete
enforced parity matrix or close the manual slider/overlay reports.
