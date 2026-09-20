# Overlay-font cold entry: full-output causal proof

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
