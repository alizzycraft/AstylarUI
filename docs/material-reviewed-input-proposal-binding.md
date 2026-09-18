# Consolidated source replay for pending input classifications

The [machine binding](material-reviewed-input-proposal-binding.json) independently
replays seven committed proposal sets against every complete row of the frozen
canonical audit at `06e50db`. This is preparation for canonical integration,
not an integration or rendering-parity claim.

| Proposal set | Groups | Original property observations |
| --- | ---: | ---: |
| Container font-size stages | 63 | 1,150 |
| Leaf font-size stages | 15 | 152 |
| Fixed container/range/disabled authoring | 9 | 136 |
| Component/overlay/plugin font ownership | 12 | 401 |
| Button state-layer paint composition | 8 | 24 |
| Host typography token omissions | 7 | 380 |
| Container font-family stages | 20 | 1,082 |
| Total | **134** | **3,325** |

All twelve underlying source collectors rerun against the authenticated original
capture and paired input trees. Their complete outputs must equal the checked-in
proofs. Each original proposal-join function then reruns with the production
normalization functions and all 8,339 complete canonical rows. Every field that
function returns is compared—not just proposed groups. Matching inputs, earlier
static classifications, counts, memberships and unrelated-row receipts remain
part of each independent replay.

The canonical compressed and decoded payload bytes are authenticated once and
shared by these joins; no proof or unrelated row is sampled away. Committed
proposal files must match their pinned revisions. The authoring equality
function is separately source-bound as before. Canonical rows, original capture,
and each source plan/proof retain their provenance in the machine binding.

## Collision and conservation checks

The first combined run rejected an ambiguous scalar tuple: prior reviewed static
rows and pending interactive rows can share family, element, property and values.
The corrected join selects the **complete original row hash**, never overwrites
a prior attribution, and rejects duplicated rows or cross-plan observations.
An explicit regression preserves a prior static row with the same scalar tuple.
The first rejection is retained in
`artifacts/material-parity/field-host-flow-input-audit/reviewed-input-proposal-binding-generate.log`.

There are no overlapping proposed rows or original property observations.
All **8,205 other complete rows** are conserved in order; their ordered-row-digest
SHA-256 is `d65133f5c8148f376ea6ff795d06e6760bea1b64052c53dcb90dbe66a2decfb8`.
No source scalar is normalized into an invented candidate value. The canonical
unresolved count remains **2,160** until a separately verified integration.
Later unjoined evidence, including the 152-observation leaf-family proof, is
explicitly outside this bounded proposal population—not implicitly cleared.

## Verification

```text
node --max-old-space-size=1536 scripts/bind-material-reviewed-input-proposals.mjs
node --test --test-concurrency=1 tests/material-parity/reviewed-input-proposal-binding.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation exits 0. Focused/inventory tests pass **8/8**, zero failures,
skips, cancellations or TODOs, in **133,902.3789ms**. The suite independently
runs `--check` with filesystem writes prohibited and compares unchanged saved
bytes, then exercises 35 rejection controls plus the static/interactive collision
guard. Small pure-join projections are clearly distinguished from the full
source/canonical replay; they are not substituted as evidence of full coverage.

Report SHA-256:
`26372ac95a2571442d24ade336e1a709a15049949aae09b187221716b5ce8b3b`.
Logs:
`artifacts/material-parity/field-host-flow-input-audit/reviewed-input-proposal-binding-generate-corrected.log`
and `artifacts/material-parity/field-host-flow-input-audit/reviewed-input-proposal-binding-focused.log`.

Discovery now includes **134 files** (126 Material, four general, four TTS),
including every legacy test. The historical gap-review correction remains in
its live original-population replay; no current full-harness pass is claimed.
Renderer and canonical fixture behavior remain untouched. Canonical integration,
remaining input reviews and the complete enforced rendering matrix are pending.
