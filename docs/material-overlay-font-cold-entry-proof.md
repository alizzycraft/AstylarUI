# Overlay-font cold entry: full-output causal proof

Current status: the one-line owning-module correction has now been applied in
the working tree. Normal cold imports and direct CLI execution pass without a
loader replacement. Broader source-binding checks pass; renewed canonical
verification remains pending. The intervention evidence below describes the
pre-correction state; see the implementation checkpoint at the end.

The overlay-font CLI has a confirmed audit-instrumentation initialization defect,
not a renderer defect. Its import graph reaches
`scripts/audit-material-font-ownership-attribution.mjs:29`, whose eager
`Object.keys(overlayFontTargets)` reads an imported binding before the exporting
module initializes it. Starting from the main builder conceals the entry-order
failure; changing invocation order is not an acceptable fix.

The earlier import-only intervention is now an executable two-test proof in
`tests/material-parity/overlay-font-cold-entry-proof.spec.mjs`.

## Controlled intervention

Each invocation uses a fresh child process. The diagnostic module loader changes
exactly one expression, and only in memory:

```js
// Existing eager module initialization:
targets: Object.keys(overlayFontTargets),
// Proposed deferred read from the same authoritative target definition:
get targets() { return Object.keys(overlayFontTargets); },
```

There is no copied target list and no builder-first import shim. A guard requires
exactly one owning module replacement. The filesystem source is unchanged.

| Entry | Existing source | In-memory deferred read |
| --- | --- | --- |
| Overlay collector import first | Fails with imported-binding initialization error | Passes |
| Main builder import first | Passes | Passes |
| Actual overlay CLI `--check` | Fails before collection | Passes complete collection and saved-output comparison |

The actual CLI replay preserves **182 observations / 91 context cases**, including
all six overlay owners, 94 matching page-size observations, 88 differing sizes,
and all 59 scalar-rule gaps. Writes are prohibited during the intervention.
The production CLI compares its entire freshly serialized report, not just these
summary counts. The test also checks original source and report bytes afterward.

- Unchanged source raw SHA-256:
  `1fca79efc22041545ed05c8778e9af9b8d7ed86ed63a9bcdd29e74084fe92579`.
- Unchanged report normalized SHA-256:
  `3f06636fd36443605c6a5df9667ab159d2abc0a87672bd1546d5aabbfabfa759`.

## Verification and remaining work

```text
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/overlay-font-cold-entry-proof.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

**6/6 pass**, exit 0, **13,472.7086ms**, no skips, cancellations or TODOs.
Log: `artifacts/material-parity/field-host-flow-input-audit/overlay-font-cold-entry-full-sep20.log`.

These passing tests demonstrate the existing failure and the proposed correction;
they do not mean the production CLI is fixed. No production source, comparison,
renderer or canonical report was changed. The canonical freshness run continues
with its source dependencies frozen.

After that freeze ends, apply the deferred read at the owning module. Replace the
diagnostic's expected baseline failure with mandatory successful cold imports and
direct CLI execution **without** a loader intervention; retain the eager-read
negative control separately if useful. Re-run the full font-ownership proposal,
prior source bindings and canonical freshness because this module is part of the
canonical source inventory. Do not carry the diagnostic module loader into the
production execution path or use this scoped report replay as whole-audit proof.

## Owning-module correction: focused verification

After the stable-input alignment verification completed, the owning module's
eager target-list read was replaced with the deferred getter shown above.
The authoritative target definition, collector, planner and report remain
unchanged. No copied target list or invocation-order shim was introduced.

The updated regression test requires cold imports of the overlay collector,
main builder and owning planner to succeed normally. A separate isolated
negative control reinstates the original eager read and reproduces the exact
overlay-first initialization failure. The direct overlay CLI now replays its
entire saved report without a loader replacement, with writes prohibited.
All **182 observations / 91 contexts**, owner counts and scalar-rule gaps remain.

```text
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/overlay-font-cold-entry-proof.spec.mjs
```

**2/2 pass**, exit 0, **12,877.0203ms**, no skips, cancellations or TODOs.
Log: `artifacts/material-parity/field-host-flow-input-audit/overlay-font-owner-cold-focused-sep20.log`.
New source raw SHA-256:
`5dce082e4a6e310afd5f418daefd1ff61f7d59af9f2968d0a734e0cbdcc75d70`.
The complete report digest remains
`3f06636fd36443605c6a5df9667ab159d2abc0a87672bd1546d5aabbfabfa759`.

The broader six-file source-binding/font/inventory run now passes **20/20**,
exit 0, **509,731.41ms**, with no skips, cancellations or TODOs. It covers the
font-ownership proposal, overlay source inputs, all seven earlier reviewed-input
proposal sets and all four follow-up proposal sets, including independent source
and historical-payload replay. Log: `overlay-font-owner-fix-sep20.log`.

This source is fingerprinted by the main audit, so its previously accepted
canonical freshness result predates this correction. A full canonical generation
completed in `overlay-font-owner-canonical-generation-sep20.log`, using the same
five source-report/root arguments as the accepted alignment check. It exits 1
solely for the same **1,835 unresolved** findings, with 436/436 static and
1,875/1,875 interaction cases, 8,339 difference groups, 386,891 observations and
132 source findings. The log's raw SHA-256 is
`b7e80de624a26abb69546238f43b53fc7ace33ba01123d77a1940a735211ddfd`.

The complete decoded-payload conservation test passes **2/2**, exit 0,
**9,860.4509ms**, with no skips, cancellations or TODOs. It compares all
**1,993,322,418 decoded bytes** against accepted commit `7cd5cb7`, permitting
exactly one source-fingerprint substitution. Every other byte, including every
observation and classification, is identical. The Markdown report is also
byte-identical. The test verifies that the owning source changed only by the
one-line initialization correction; synthetic cross-chunk and altered-output
controls reject broader changes.

```text
node --max-old-space-size=1536 --test tests/material-parity/overlay-font-owner-payload-conservation.spec.mjs
```

Log: `overlay-font-owner-payload-conservation-sep20.log`.
New compressed SHA-256:
`ea3c521a06ea51ac79f7730cf6dde758713a0b4d3783d986b4fd978d42548e76`.
New decoded SHA-256:
`ac5026a8ef40415f7bf98822eca1a52254f4de97cf580ac0ee11f11d3771162e`.

The full CLI `--check` replay completed in
`overlay-font-owner-canonical-freshness-sep20.log`, exit 1 solely for the same
**1,835 unresolved** findings. It reports no stale payload, Markdown, source
binding or other validation errors. Coverage and all counts match the generation
above. Raw log SHA-256:
`fc41880d698e9154041267d1dac8294546e425695f9c0b147c77b7dad45118ee`.
Together with the complete decoded-byte conservation proof, this verifies the
bounded font-tool correction and its canonical source-receipt refresh. No
renderer or canonical comparison behavior changed.

This is consistency under the then-current normalization contract, not full
audit acceptance. The separately discovered fractional-color loss is documented
in `material-fractional-color-loss.md` and the complete root-source investigation
in `material-root-background-inputs.md`. Those findings require a subsequent
normalization correction and explicit population transition; the source freeze
for this replay has now ended.
