# Field-host layout: production classifier integration

The production audit builder now uses the independently bound field-host layout
evidence. It distinguishes unequal authored layout requests from the shared-width
observation-stage mismatch, and gives source-backed minimum-width requests
precedence over the former generic zero-versus-omission equivalence shortcut.
Renderer code, plugins, reference input, comparison authoring and thresholds are
unchanged. The full canonical report has now been regenerated and its bounded
conservation check passes. Complete no-write replay and the current full harness
remain separate outstanding gates.

## Actual old/new builder proof

The integration test executes the actual builder from commit `f987b7f` alongside
the current builder. Import paths are relocated without changing the historical
module's other syntax. It asserts that production normalization, scalar
equivalence and the generic classifier functions are unchanged.

The diagnostic capture retains every original field-host case plus one static
negative case from each other family: **102 static + 505 interaction = 607**
cases covering all 36 families. The field-host population remains all **577**
original hosts: **72** measured static boxes and **505** interaction geometry gaps.

- All **5,965** raw scalar rows preserve values, counts, sampled case order and
  state order.
- All **5,893** unrelated complete rows are unchanged, SHA-256
  `79f8a7edbc9aaf3b6b401eceae9a24c9be1c4e68009edb75d803abccb7e7535c`.
- Exactly **72** groups / **4,616** observations gain reviewed field-host
  attribution: **54** application/plugin-authoring groups and **18** width
  observation-stage groups.
- The replaced treatments are **48** unresolved groups, **six** unsupported
  generic minimum-width equivalence labels, and **18** generic width harness
  labels. The six equivalence labels are explicitly checked, not lost through
  an unresolved-only fallback.
- Authored examples, prior button box-sizing and grid ledgers, and all explicit
  false flags for whole-input equivalence, candidate computed values and original
  renderer causality are retained. Input data is not mutated.
- The production validator checks the new independent source replay and exact
  classification coverage. Removing the bound ledger is rejected even with
  `requireComplete:false` when reviewed classifications remain in the report.

This is actual production precedence and conservation over a diagnostic capture,
not complete saved-report conservation or final matrix acceptance.

## Verification

```powershell
node --test tests/material-parity/field-host-layout-canonical-integration.spec.mjs
node --test tests/material-parity/field-host-layout-input-evidence.spec.mjs tests/material-parity/field-host-layout-canonical-join.spec.mjs
node --test --test-name-pattern="records source fingerprints" tests/material-parity/input-equivalence-audit.spec.mjs
node scripts/audit-material-field-host-layout-inputs.mjs --check
node scripts/audit-material-field-host-layout-join.mjs --check
```

- Integration session **16919**, exit **0**, **1/1 passing**, zero failures/
  skips/cancellations/todos, **456,308.2054 ms** (test body 453,788.7297 ms).
- Integration log:
  `artifacts/material-parity/field-host-flow-input-audit/layout-production-integration.log`,
  **1,028 bytes**, SHA-256
  `f625f5fdb6149afd8e0f2c71def0bab911d9146d414dd1a608313a5aa0fbd7fc`.
- Original survey/join replay: **4/4 passing**, exit **0**, **8,926.2328 ms**.
  No survey findings changed: independent JSON comparison proves the only survey
  change is its audit-builder fingerprint, and the only join change is the
  dependent survey digest. Both no-write checks pass.
- Source-inventory test initially failed **209 != 204**. Its expected inventory
  now includes the five new layout evidence/binding/integration sources, with
  exact entry/digest assertions and no previous source removed. Repeat:
  **1/1 passing**, exit **0**, **1,592.4289 ms**.
- The prior independent binding tests pass **3/3**, **41,499.6952 ms**, exit **0**.
  Log `layout-binding-tests.log` in the same directory is **1,012 bytes**,
  SHA-256 `67748b72382d779365e631a7366275fb3ed9a132ff8d181e57b6a332262866c8`.

## Historical integration regression replay

The earlier button-box integration first failed its complete-row conservation
assertion (session 87523, exit 1, 27,619.3895 ms): its baseline correctly retained
the old field-host classifications. The test was not made to ignore arbitrary
differences. Both affected all-family integration tests now explicitly check the
later field-host population, original scalars, six former minimum-width
equivalence labels, and independent production source/coverage validation before
requiring every remaining complete finding to match. Their original button/grid
counts, precedence checks and mutation controls remain intact.

```powershell
node --test --test-concurrency=1 tests/material-parity/button-box-sizing-canonical-integration.spec.mjs tests/material-parity/owner-grid-initial-canonical-integration.spec.mjs
```

Session **59639** exits **0**, **2/2 passing**, zero failures/skips/cancellations/
todos, **374,835.8926 ms**. Both diagnostic captures contain exactly **48** later
field-host groups. The button-box proof preserves all **6,554** scalar rows and
**6,497** unrelated complete findings (SHA-256
`408a11b8973b946417bae4a7d9e33183204acb99ee17ac8268c9bb4a335e95e6`).
The grid proof preserves all **6,423** scalar rows and **6,266** unrelated complete
findings (SHA-256
`7d961c07460aa4c36ede63acb0258765d9b0cf7c6284a05bc69d35e11d7f4aea`).
The log is `artifacts/material-parity/field-host-flow-input-audit/layout-legacy-integration-replay.log`,
SHA-256 `79ee2c14eb749ff4f304a5638bde9b9920cb808794e85c64222b8c360d7e7f65`.
These scoped replays do not substitute for the full current harness.

## Complete saved-report conservation

Generation session **87671** finishes with exit **1** solely because **2,438**
resolved-style signatures still lack root-cause attribution. It retains all
**436/436 static + 1,875/1,875 interaction** cases, **8,339** groups,
**386,891** occurrences and **132** source findings. Input equivalence remains
false. This expected incomplete-audit result is not final acceptance.

```powershell
node scripts/run-material-input-audit.mjs --parity-report=artifacts/material-parity/current-ancestry-audit/latest-report.json --normal-line-box-report=artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json --control-line-box-report=artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json --supplemental-line-box-report=artifacts/material-parity/supplemental-line-box-current-ancestry-audit/latest-report.json --supplemental-root=artifacts/material-parity/supplemental-current-ancestry-audit
node scripts/verify-material-field-host-layout-integration.mjs
```

The verifier compares the actual committed saved payload at
`1834d32421378fcd575d74a68689906ece11b4ff`, not a reconstructed old builder.
Session **4788** exits **0**. All **8,339** original scalar rows and all **8,267**
unrelated complete findings are unchanged. The latter have SHA-256
`308c17923219470257fe78645afc0ae8ca6670e34e66a2977d335764624c6f19`.
Exactly **72** groups / **4,616** observations change as described above:
54 authoring groups and 18 observation-stage groups. The summary changes only
by the supported reclassification: unresolved **2,486 → 2,438**, authoring
**805 → 859**, equivalence **2,088 → 2,082**, harness **5,110 → 5,062**.

Coverage, previous fixed-width/grid/box-sizing ledgers, authored examples and
explicit false equivalence/computed-value/causal flags are conserved. All **209**
source fingerprints match current normalized bytes. Original-capture replay
independently validates every one of the 577 hosts, including 72 measured static
boxes and 505 interaction geometry gaps. Human-report changes are restricted to
the supported paragraph, counts and moved source locations. A pre-generation
negative control rejected the old report (**0 != 72** reviewed groups); it was
not accepted as current evidence.

The new compressed payload is **51,469,342 bytes**, SHA-256
`39ca1c9adbc05df351e72126e126ca722214556cfe5a8da23d4be86f8af0d992`;
decoded **1,923,780,358 bytes**, SHA-256
`75b767a7d4b4c94ce9a7ee1fa01bb7c19dc0afaf43b29ff3b5e3574b0fca742b`.
Logs under `artifacts/material-parity/field-host-flow-input-audit/`:

- `layout-full-generation.log`, 350 bytes, SHA-256
  `37b3f9c7e36e949ee4ca5046fc3878866d76581828e767a9553bfa419ba98372`.
- `layout-full-conservation.log`, 1,489 bytes, SHA-256
  `86f6a311506bbf90b077872c77a7d4ed6044872e7c8f1a0764de0685c74fc825`.

This checks the full discrepancy population, selected earlier ledgers, source
inventory, summary and original field-host replay. It does **not** replace full
no-write regeneration or establish candidate computed layout, original renderer
causality or rendering equivalence.

## Still required

1. Run the remaining historical integration tests in the complete current harness;
   the two affected all-family checks above now pass with explicit later-change
   validation and unchanged original controls.
2. The [dependent provenance replay](material-audit-harness-coverage.md#field-host-layout-integration-provenance-closure)
   now passes with every non-metadata finding conserved across 17 updated JSON
   reports. Include those checks in the complete current harness; the historical
   membership join is pinned to its pre-integration committed canonical payload.
3. Run complete no-write validation, the current full harness and the unfiltered
   enforced parity matrix. The earlier 842-test/87-file harness predates this
   production integration and cannot verify it.

The separate equal-input inline-parent sizing defect remains core evidence. It
does not establish why the original showcase was authored differently or prove
the renderer cause of every original Material discrepancy.
