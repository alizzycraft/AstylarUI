# Canonical integration: checkout provenance failures

The first prepared canonical generation terminated with exit 1. It retained
436/436 static cases, 1,875/1,875 interaction cases, 8,339 difference groups and
386,891 observations, but failed both prior classification bindings. Its 2,035
unresolved groups are **not accepted** as the intended 1,835-group remainder.
The failed candidate payload has compressed SHA-256
`15a2a0fdf314deb0def72a6771b6f54bd604d90a9fb2bf8ff4abd731a1789b61`.
The last accepted baseline remains `67db724` with 1,960 unresolved groups.

The independent binding diagnostic found:

- Reviewed 134-group replay: the original overlay runner's raw byte receipt
  rejected this worktree's LF-normalized checkout.
- Follow-up 66-group replay: the complete expansion owner proof differed only
  at `history[1].currentSourceSha256`, the recorded mixed-line-ending candidate
  source. Its 68 owner observations were unchanged.

The exact retained producer bytes were restored in the integration worktree
for two files, after checking each original raw hash and proving that current
and retained contents differed only in CRLF/LF representation:

| Source | Restored original raw SHA-256 |
| --- | --- |
| `tests/material-parity/run-material-parity.mjs` | `b2477a124293aec6bba3a2413ff58d41f409288dcf0cb53a54ed17d162b9fa97` |
| `examples/material-showcase/src/app/astylar.component.ts` | `2c2979adc26453138e25dffeaeed18d3669514994eea662236ca8649ea00a863` |

These are local restoration of the recorded inputs, not new renderer/fixture
edits or a claim that different source line endings always execute identically.
No historical receipt, original capture or transition proposal was rewritten.
The original running worktree was only read. Do not include these mechanical
checkout differences in an implementation commit.

## Independently exposed dependency-boundary defect

The default overlay reader then rejected the authenticated TypeScript source
because `node_modules` is a worktree junction. The previous injected-read test
did not exercise this default realpath boundary. The ordinary reader's full
suite exposed it: 10/12 combined tests passed, two failed.

`assertOriginalOverlayEvidencePath` now permits the **one recorded dependency**
`node_modules/typescript/lib/typescript.js` within the resolved TypeScript package
root. All other source files must remain within the real workspace, and artifacts
within the real artifact root. Logical containment and the existing raw byte
receipt remain mandatory. It does not permit arbitrary sibling packages or
source/artifact escapes.

The full overlay-context and source-recovery suites now pass **13/13**, exit 0,
92,060.6941ms, no skips or cancellations. The new test checks the real installed
dependency and simulated shared roots, and rejects six path escapes/misuses.
Log: `artifacts/material-parity/field-host-flow-input-audit/shared-dependency-overlay-source-tests-sep20.log`.
The first failed log remains `restored-raw-overlay-source-tests-sep20.log`.

The initial separate prior-binding test launch ended in an internal CLR error
with exit -1073741819, without test evidence. Its terminal status was confirmed
before retrying. A retry of both complete prior-binding suites is required before
regeneration. The failed candidate report must then be replaced, followed by
complete row conservation, CLI freshness and the current full harness/matrix.

## Preserve the historical font snapshot after fresh replay

The first prior-binding retry passed 9/10 tests. All five follow-up tests passed,
restoring the 66-group source boundary. The remaining reviewed-input failure
was a single source-fingerprint change in the overlay font proof: its corrected
reader now hashes to `e94b253c1c51105c785ee361863fc1d58d5b8b7b406911d6853d7b3c5b56016f`
instead of the historical `71422c360dcd115e4ee2f49162f3de882d757435aab1f531840355c7eea32c93`.
An independent complete-object comparison found no other difference.

`conserveOverlayFontInputSnapshot` now authenticates the original committed
snapshot at `67db724` (raw SHA-256
`3f06636fd36443605c6a5df9667ab159d2abc0a87672bd1546d5aabbfabfa759`).
It requires the entire current reader to match the reviewed `2144373` source
hash, checks the fresh proof's reader hash, and compares **every other field**
with the historical snapshot. Only then does it return that original snapshot.
Its source receipt is explicitly historical, not a claim that current source
bytes are unchanged. All 182 fresh font-owner observations, 91 context cases,
raw inputs, lineage and other source receipts must still match. No saved file,
capture receipt or proposal is rewritten.

The same historical-source module includes the three exact named-import shapes
required by the pending alignment integration. Its existing AST checks still
reject all other changes outside reviewed orchestration and references from
retained statements into changed functions.

The first expanded test attempt terminated with an allocation failure (exit 134);
its four completed source-recovery tests do not establish suite success. The
sequential bounded-heap retry passed **14/14**, exit 0, **128,296.599ms**, with no
skips or cancellations. Twelve new rejection controls cover altered observations,
claims, source identity, lineage, historical bytes and current reader bytes.
Log: `overlay-font-source-conservation-evening-sep20.log` in the same artifact
directory. Complete prior-binding verification and canonical regeneration follow
as conditional phases; neither is accepted from this focused result alone.

The failed canonical manifest, compressed payload and human report are retained
under `alignment-canonical-failed-sep20/` in that artifact directory. The original
171-suite harness is no longer live and has no terminal completion summary in
its log (last recorded test 187); it remains incomplete. The current discovered
inventory contains **182 suites**, which must receive its own full run.

The conditional complete prior-binding run then passed **10/10**, exit 0,
**145,102.8268ms**, without skips or cancellations. This restores independent
source verification for the 134-group/3,325-observation and
66-group/2,640-observation populations. Log:
`conserved-prior-source-binding-tests-evening-sep20.log`. The corrected canonical
generator has started (`alignment-canonical-conserved-retry-sep20.log`); its
output still requires validation and full-row conservation before acceptance.

The current historical-reconstruction and harness-discovery suites subsequently
passed **8/8**, exit 0, **170,944.0212ms**, with no failures, skips, cancellations
or TODOs:

```text
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/later-reviewed-input-conservation.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Log: `alignment-historical-conservation-current-sep20.log` in the same artifact
directory. The reconstruction checks independently replay the earlier 134-group /
3,325-observation source population with writes prohibited, preserve unrelated
differences, and reject 20 membership/raw-input/metadata mutations. The inventory
checks retain full discovery, real child execution and failure propagation. This
does **not** verify the new 125-group canonical transition, the separate earlier
66-group composition, or a complete harness run. The canonical generator remains
live with its source inputs unchanged; its result is still pending.

## Separate direct-entry failure retained

`node scripts/audit-material-overlay-font-inputs.mjs --check` fails before
collection with `Cannot access 'overlayFontTargets' before initialization` at
`scripts/audit-material-font-ownership-attribution.mjs:29`. The top-level
`Object.keys(overlayFontTargets)` participates in a circular import involving
the audit builder, its source bindings and the source collectors. Importing the
builder first allowed the diagnostic replay but is not a fix for the CLI.
Log: `overlay-font-direct-entry-sep20.log`.

Remove the module-initialization dependency at its owner in a subsequent bounded
instrumentation increment, retain the single target definition, and verify both
direct CLI and builder entry orders. Do not use an import-order shim as final
acceptance. This is a distinct harness initialization issue, not a renderer or
Material input discrepancy. Its source is frozen during the current generator.
