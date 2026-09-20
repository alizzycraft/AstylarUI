# Overlay alignment: recover paths without erasing the capture gap

This audit-only increment recovers the two remaining overlay text-alignment
groups: **25 bottom-sheet and 34 snackbar observations**, with four distinct
proof patterns. It does not change renderer/plugin code, comparison inputs,
original captures or canonical classifications.

## What the evidence now establishes

The earlier alignment collector stopped when the generated-owner mapping
reported `mapped-with-scalar-rule-gap`. The independent identity proof already
verified all 89 reference scalar properties, all three candidate local stages,
the owner structure and both owner-to-root paths. Its one remaining discrepancy
was the layered `.cdk-global-overlay-wrapper { z-index: 1000 }` declaration:
present in the full tree, absent from the scalar authored-rule list.

That is a real capture discrepancy, but it does not make the independently
verified owner paths unavailable. The new recovery replays the existing complete
91-state / 200-owner verifier, then joins each of the 59 original scalar
observations and paired trees to its hash-bound context record. It keeps the
missing rule verbatim; it neither inserts it into the scalar capture nor changes
the original mapping status to `mapped`.

For every recovered path:

- The reference wrapper and overlay container compute `textAlign: start`,
  `direction: ltr`, `writingMode: horizontal-tb` and `unicodeBidi: isolate`.
- All four candidate owner-to-root local-stage paths omit those properties.
  No relevant or motion declarations occur in these captured paths for those
  four properties. This is not a computed candidate value or a default-value
  equivalence assertion.
- The later same-state reference replay supplies the overlay-container → body
  → html path. All three compute start/LTR/horizontal writing; body/html retain
  `unicode-bidi: normal`, not the wrapper's `isolate`.
- The complete external stylesheet snapshots remain hash-bound. Their selector
  applicability and cascade are not resolved by this recovery.

Thus the prior `unresolved-context` record now has recoverable owner paths and
separately observed external reference context. The canonical alignment review
still needs an explicit stage-aware disposition. Full element input equivalence,
candidate inheritance, glyph placement, overlay positioning and visual parity
remain unproved. No default, direction or alignment is invented for AstylarUI.

## Cause, owner and next action

The demonstrated obstruction is in audit instrumentation, specifically the early
return in `inspectTextAlignAncestry` after `inspectVerticalAlignPopulationInput`
reports the alias rule gap. `resolveOriginAliasPair` retains valid measurement
identity and ancestry with that status; it explicitly does not equate the two
elements' rendering roles. The existing `inspectOverlayOwnerDeclarations`
already supports tracing this status without concealing its missing/extra rules.

This increment adds a separate diagnostic reader instead of altering a source
collector currently being verified by the live integration run. A subsequent
classification can use the recovered evidence while retaining the rule gap,
external-CSSOM and computed/local distinctions. It must not label the entire
wrapper equivalent: the separate bottom-sheet wrapper/backdrop/pane composition
differences remain in `material-overlay-owner-declaration-review.md`.

The missing layered z-index declaration is **not** claimed to explain alignment,
clipping, low positioning, a missing snackbar, or a shared tooltip/snackbar
defect. Those questions still require their respective geometry, visibility,
paint and ownership evidence.

## Verification and provenance

The original evidence worktree is selected explicitly because the capture binds
raw source bytes. An initial replay in the LF-normalized integration worktree
correctly rejected `run-material-parity.mjs`: its LF hash is `c3cabcf...e10`,
whereas the recorded mixed-line-ending source is `b2477a1...a97`. The original
worktree still contains those exact recorded bytes and the same normalized
source. No source receipt was rewritten or hash comparison bypassed.

Commands run from `D:/dev/github/AstylarUI-audit-integration`:

```powershell
node scripts/audit-overlay-alignment-recovery.mjs --evidence-root=D:/dev/github/AstylarUI-material
node scripts/audit-overlay-alignment-recovery.mjs --check --evidence-root=D:/dev/github/AstylarUI-material
$env:ASTYLAR_OVERLAY_EVIDENCE_ROOT='D:/dev/github/AstylarUI-material'
node --max-old-space-size=1024 --test --test-concurrency=1 tests/material-parity/overlay-alignment-recovery.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation and no-write checking exit 0. Focused verification passes **8/8**,
with no failures, cancellations, skips or TODOs, in **5,677.1779 ms**. The recovery
tests prohibit writes during the complete replay and hash-check the canonical
manifest/payload and earlier review before and after. Forty rejection controls
cover altered identity, removed rule gaps, path corruption, missing context,
invented computed evidence and rendering claims. An additional sensitivity
check preserves a changed explicit request and changes the external-CSSOM
digest without manufacturing a candidate computed value.

The full inventory now discovers **176 suites**, including this new suite.
That does not extend the separately live frozen 171-suite run retroactively.
The 125-group canonical integration verification is also still separate.

Machine report: [material-overlay-alignment-recovery.json](material-overlay-alignment-recovery.json).
SHA-256: `4a8ebe5ebbf65de9789af6f563062e2bb4b8ae7eb1714ff9cff7948f4d8d5019`.
Verification log: `artifacts/material-parity/field-host-flow-input-audit/overlay-alignment-recovery-tests-sep20.log`.
