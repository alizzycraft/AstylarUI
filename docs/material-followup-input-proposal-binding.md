# Follow-up input proposals: cross-revision conservation

This is a source/membership check, not a renderer change or canonical promotion.
It joins four separately reviewed findings to the frozen canonical payload at
`957774a`:

| Finding | Proposed groups | Original observations |
| --- | ---: | ---: |
| Own-text local versus retained font family | 4 | 96 |
| Own-text local versus retained weight/tracking | 8 | 192 |
| Expansion panel incorrectly compared with header | 43 | 1,596 |
| Omitted control font-style inheritance request | 11 | 756 |
| Total | 66 | 2,640 |

The leaf-family proof predates the 134-group reviewed-input integration. Its
original baseline remains `06e50db`; the binding does not rewrite its receipt
to imply it was captured or verified against a newer parent. Instead, it
replays that original source/canonical join, then requires every complete
proposed row to survive unchanged in `957774a`. The other three original joins
already use `957774a`. Every source collector is rerun; saved flags and counts
alone cannot authenticate a proposal.

The combined join requires exact complete-row hashes, original property
values, case ordering, states, occurrence counts, source input/proof digests,
and nonoverlapping property observations. Already reviewed static rows with
the same scalar values cannot be mistaken for pending interactive rows.
The four-set proposal leaves 8,273 other complete rows outside the transition.
Its generation and independent full focused verification have passed.
The prior three-set result is retained separately below.

## What this means for remediation

The leaf findings explain the mismatch between two observation stages, not
physical font selection, glyph sharpness, layout or whole-element input
equivalence. Do not add explicit typography merely to eliminate a missing
local-declaration scalar when core already retains the inherited value.

The expansion finding identifies a mapping error before renderer attribution:
the reference owner is the whole panel, while the candidate owner is the
header button. All 102 original owner groups need role-correct recapture;
preserving the 59 earlier reviewed groups is not endorsement of that mapping.
The separately demonstrated disabled-header cursor mismatch remains an
authoring finding. Do not change the candidate header weight to match the
reference panel's unrelated weight.

The [control font-style finding](material-control-font-style-attribution.md)
is an authoring defect, not an observation-stage equivalence: the candidate
omits the reference's explicit inheritance reset. Captured button text already
reports normal, while range inputs have no captured text owner. Test genuinely
equivalent font-reset semantics under non-normal ancestors before proposing a
core fix; do not compensate with explicit normal styling.

## Verification

```text
node scripts/bind-material-followup-input-proposals.mjs
node --test --test-concurrency=1 tests/material-parity/followup-input-proposal-binding.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

The four-set generation exits 0 after independently replaying all source proofs
and full historical/current canonical joins. Binding SHA-256:
`fad7db90e601806414c32397c0c48b71c11ca3340fde5da57454ba30e4e3e43a`.
The ordered digest of the 8,273 other complete rows is
`c46a8886a4cb7d306fa879978581782a1ebe8a1224f1aeb2ddd6bac8608ffe1c`.

The four-set pure binding checks and follow-up transition checks pass **4/4**,
exit 0, in **5,122.3256ms**, including 45 binding and 34 transition rejection
controls. The complete four-set focused suite then passes **7/7**, exit 0, with
no skipped/cancelled/TODO tests, in **514,470.7977ms**. Independent no-write
source/full-payload replay takes **510,752.0536ms**; all three canonical files
remain byte-identical. Logs in the artifact directory below:
`followup-four-input-proposal-binding-generation.log`,
`followup-four-input-proposal-binding-focused.log`, and
`followup-four-transition-pure.log`.

### Prior verified three-set checkpoint (`3ba0d33`)

Before adding control font-style, generation completed with exit 0 and all three independent source/canonical
replays. The other complete rows' ordered-digest SHA-256 is
`11baa5102c342ca20661984d8a0e1ba59dd0cac4365673f017fe518e32c2e17d`;
the generated binding SHA-256 is
`b4d2bb917c28d063792ed63cdab9a5746324ab0da07e6467e92cf0701a586dda`.

The first combined focused run is terminal: 6/7 pass in 398,543.3817ms, exit 1.
Its independent source-replay test passes in 395,204.2198ms with filesystem
writes prohibited and all three canonical files byte-identical. All four
inventory tests pass. The sole failure is the already-loaded old mutation
control described below, not the production join. The corrected complete
focused run now passes **7/7**, exit 0, no skipped/cancelled/TODO tests, in
**392,055.816ms**. Its independent no-write source replay passes in
388,512.0106ms. This is focused audit-infrastructure evidence, not the complete
audit harness or rendering matrix.

The corrected pure checks pass 2/2 in 2,529.7293ms, including
39 rejection controls for changed/missing membership, cross-revision receipt
changes, overwritten prior classifications, overlapping observations and
unsupported equivalence claims. The first pure run failed because one test
replaced an already empty authored-rule array with another empty array. The
corrected control inserts an actual invented rule; no production assertion
was removed or weakened. Logs retain both runs under
`artifacts/material-parity/field-host-flow-input-audit/`:
`followup-input-proposal-binding-generation.log`,
`followup-input-proposal-binding-pure.log`,
`followup-input-proposal-binding-pure-corrected.log`,
`followup-input-proposal-binding-focused.log`, and
`followup-input-proposal-binding-focused-corrected.log`.

The canonical audit still contains **2,026 unresolved groups**. Neither this
proposal binding nor its focused pass reduces that number. Production
integration with precedence and exact row conservation, the remaining
classifications, full current harness, and enforced rendering matrix remain
outstanding.
