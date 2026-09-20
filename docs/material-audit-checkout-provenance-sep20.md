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
