# Root initial-style index: complete replay before metadata refresh

## Verified caret-era refresh

Following `80bf887`, the two enclosing audit-module/spec receipts were refreshed
again, without changing any root observation. The saved hashes were first
matched to actual source at `222ca7f54cb30ff9cd85f5607f57b8349a5686b5`.
AST comparisons verified unchanged `collectFullTreeInventory`,
`collectReferenceContextGaps`, `caseKey`, and `referenceContextProperties`.
Every audit-spec statement remains identical except its source-inventory test;
all other saved root-index source fingerprints still match current files.

Only the module receipt `252754...` to `b6b4e62bab949ce5bc955a823225d93085accb67bb27f1c0f9d98796fb66ec73`
and spec receipt `ce70ce...` to `0a373bad2e438a5f0a633fa69f734cd4e5ec8dc03690aba488397011557c8e2e`
changed. A whole-object comparison against `80bf887` retains the complete
non-receipt digest `a43e00eeb2d4223a28b0b6feafd91776fca883ffea15ab135a4ac2954dd83286`.

The unchanged command `node --test tests/material-parity/root-initial-style-evidence.spec.mjs`
passes **5/5**, exit **0**, **26,741.904 ms**, with no failures, skips,
cancellations or todos. It replays all **2,311 cases / 30,043 observations /
468 groups**, including original membership and false-claim controls. This is
not descendant-consumer or rendering equivalence.

Logs under `artifacts/material-parity/field-host-flow-input-audit/`:

- `caret-root-initial-source-boundary.log`, SHA-256
  `e3cb25a27635cc6701c1d822e075f6c31efe50de6e6a0897617edf11ff93fc94`.
- `caret-root-initial-receipt-conservation.log`, SHA-256
  `ac56785e76cae762eb4b52899ff327305609d08653a8ed4f22a06acf69c7d787`.
- `caret-root-initial-refresh-focused.log`, SHA-256
  `06e45110e0b7c363d5fae78e4babb5050771f839274d55be8d66f0ddad77915f`.

The earlier diagnostic and refresh below remain historical records, not
instructions to replace the current provenance with those older hashes.

## Earlier gap-era investigation

The full harness's root-index failure is attributable to **two stale source
fingerprints**, not a missing or changed root observation. The original assertion
stops at the first mismatch; the diagnostic enumerates both before retaining that
failure. No saved report, canonical input, classification or renderer was changed.

```powershell
node scripts/diagnose-material-root-initial-receipt.mjs
```

The unfiltered five-test replay exits **1**: **four pass, one fail**, no skipped,
cancelled or todo tests; duration **30,054.7664 ms**. The expected failure remains
the original source-fingerprint assertion. Original malformed-evidence, scalar,
coverage and false-claim controls pass. The diagnostic additionally executes the
assertions after the failing guard before reaching it, checking omitted candidate
values and false computed/consumer/raster-equivalence flags for every proof.

## Evidence retained

- All **2,311 cases**, **13 properties**, **30,043 observations** and **468 groups**
  are independently replayed against the original captured trees.
- Sorted complete case/property membership SHA-256:
  `589686924674e7e8f6cb23074f3570f4d293c9922ef8ad75180560b68da45646`.
- Every non-fingerprint field of the saved report remains unchanged, SHA-256:
  `a43e00eeb2d4223a28b0b6feafd91776fca883ffea15ab135a4ac2954dd83286`.
- The original test source remains unchanged, normalized SHA-256:
  `b1fc7ec4c17fc277d5813cc13a82f3d773827dbecae479a093c82c8d6e28fba4`.
- Complete log:
  `artifacts/material-parity/field-host-flow-input-audit/root-initial-receipt-diagnostic.log`,
  SHA-256 `3fb6f66c262af714d9c10b5dd6d44abcbea332ebf16bee2e555b11ec833a3759`.

The saved audit-module receipt matches the actual committed source at
`5fbae633a7a932ab0e0d781df697238fbb45d9cc`. AST comparisons establish that
`collectFullTreeInventory`, `collectReferenceContextGaps`, `caseKey`, and the
reference-context property declaration are unchanged from that source. The root
collector and other saved source receipts also still match. In the separately
fingerprinted audit spec, all top-level statements are unchanged except the
source-inventory test; its diff adds later explicit-gap/motion-gap sources and
updates the expected source count from 218 to 243. No root assertions changed.

The two observed receipt changes are:

| Source | Saved SHA-256 | Current SHA-256 |
| --- | --- | --- |
| `tests/material-parity/input-equivalence-audit.mjs` | `c57c725b10a0b94bf9c21ccf85e3764f47bccd9d629d004010429fd239c820c1` | `252754869d5683cc76ba0784a96fc55d5c50aa8eeeb8a0441c131ec0a62eb6d4` |
| `tests/material-parity/input-equivalence-audit.spec.mjs` | `d9f1f0a6b24a6efdd4ed90228d259c8926c9ce075c996c63235467600c2b3b56` | `ce70ce7a9bdeec90e8778dfc856e2d1c8da910ed602592985a34c989d4130a94` |

An exploratory run rejected the diagnostic's initial assumption of a single
changed receipt. Enumerating the complete receipt list and comparing the second
source established the evidence above. The original test was not weakened.

## Next action and limits

Refresh only these two metadata entries after active dependent checks finish;
verify the non-receipt digest remains identical and rerun the unchanged original
test file. The diagnostic deliberately expects the stale state and is not a
production acceptance command. Preserve this historical result after refresh.

This diagnoses an audit index's provenance maintenance, not candidate computed
styles, descendant consumption, visible parity, or a renderer fix. Complete
canonical integration, unresolved attribution and the final enforced matrix
remain separate requirements.

## Verified metadata-only correction

After the dependent historical tests finished, only the two entries listed above
were updated. An independent JSON comparison against committed pre-refresh
`c7a0cd6` proves every non-receipt field remains identical, retaining SHA-256
`a43e00eeb2d4223a28b0b6feafd91776fca883ffea15ab135a4ac2954dd83286`.
All saved current-source receipts were then checked against normalized file bytes.

```powershell
node --test tests/material-parity/root-initial-style-evidence.spec.mjs
```

The unchanged file passes **5/5**, exit **0**, no failures, cancellations, skips
or todos; duration **28,115.4193 ms**. This includes the complete root population
and all original negative controls, not only a fingerprint assertion.

Log: `artifacts/material-parity/field-host-flow-input-audit/root-initial-receipt-refresh-recheck.log`,
SHA-256 `aed1a3dc23207341f4e25a9a19c472a77ecdbe9666ea7a45b551058e0a4f8491`.
The prior diagnostic and original failure remain preserved in `c7a0cd6` and its
recorded log; its stale-state precondition is no longer true after this correction.
This is a focused evidence-index pass, not full audit acceptance.
