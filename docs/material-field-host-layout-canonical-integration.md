# Field-host layout: production classifier integration

The production audit builder now uses the independently bound field-host layout
evidence. It distinguishes unequal authored layout requests from the shared-width
observation-stage mismatch, and gives source-backed minimum-width requests
precedence over the former generic zero-versus-omission equivalence shortcut.
Renderer code, plugins, reference input, comparison authoring and thresholds are
unchanged. The saved full canonical report has **not** yet been regenerated.

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

## Still required

1. Review historical integration tests against these newly justified changes;
   preserve their original controls and validate later classifications explicitly
   rather than weakening unrelated-row conservation assertions.
2. Replay dependent current provenance receipts affected by builder/test
   fingerprints, preserving every non-metadata finding. Historical receipts must
   not be blindly rewritten to current metadata.
3. Generate the complete canonical report and compare it against the actual saved
   pre-integration report: every original scalar row, every unrelated complete
   finding, full case/state coverage and earlier ledgers must be conserved.
   Subject to that verification, unresolved groups should decrease by **48**,
   from **2,486** to **2,438**. That is an expectation, not a verified new total.
4. Run complete no-write validation, the current full harness and the unfiltered
   enforced parity matrix. The earlier 842-test/87-file harness predates this
   production integration and cannot verify it.

The separate equal-input inline-parent sizing defect remains core evidence. It
does not establish why the original showcase was authored differently or prove
the renderer cause of every original Material discrepancy.
