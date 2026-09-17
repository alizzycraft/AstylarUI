# Full-harness field-host failures: stale receipts, unchanged original evidence

## Verified dependent refresh after the nine case indexes

After `4947e2f`, the original layout, historical-membership-join, and initial-style
generators were run in dependency order, each followed by its no-write `--check`:

```powershell
node scripts/audit-material-field-host-layout-inputs.mjs
node scripts/audit-material-field-host-layout-inputs.mjs --check
node scripts/audit-material-field-host-layout-join.mjs
node scripts/audit-material-field-host-layout-join.mjs --check
node scripts/audit-material-field-host-initial-styles.mjs
node scripts/audit-material-field-host-initial-styles.mjs --check
```

All six commands exit **0**. The separate weight/tracking index's single stale
audit-module receipt was refreshed using the complete original-source replay
documented below. Comparison of the four entire JSON objects against `4947e2f`
proves exactly six changed hashes: two layout source receipts, one join survey
receipt, two initial-style source receipts, and one weight/tracking source
receipt. Every other field remains identical. In particular, no historical
classification, authored declaration, missing value, case, geometry gap, or
proof digest was replaced.

The original focused tests were run unchanged:

```powershell
node --test --test-concurrency=1 tests/material-parity/field-host-layout-input-evidence.spec.mjs tests/material-parity/field-host-layout-canonical-join.spec.mjs tests/material-parity/field-host-initial-style-evidence.spec.mjs tests/material-parity/field-host-weight-tracking-evidence.spec.mjs
```

**13/13 pass**, exit **0**, no failed, cancelled, skipped, or todo tests;
**181,703.856 ms**. This verifies complete source/case replay and original
mutation controls, not merely receipt equality. Historical canonical integration
tests are a separate check, and the complete audit is still unfinished.

Logs under `artifacts/material-parity/field-host-flow-input-audit/`:

- `caret-field-host-receipt-conservation.log`, SHA-256
  `143aea20d3f8cf00dbeb25fd8ddd4a6bf742bac5398640e180117116e16f2b4e`.
- `caret-field-host-refresh-focused.log`, SHA-256
  `84c3ff4c7467cc71ba87e6d565281a2051b35d2d0d9a83b8670d683c16da4469`.

Earlier diagnostic scripts deliberately expect stale source receipts; they are
not current acceptance commands after this refresh. Their original runs and
failure evidence remain recorded below.

## Recheck after caret integration

At `ebd5898`, the same unchanged diagnostic was rerun against audit-module
SHA-256 `b6b4e62bab949ce5bc955a823225d93085accb67bb27f1c0f9d98796fb66ec73`.
Both complete replay records match the non-receipt and membership digests below:
**577 layout cases / 72 groups / 4,616 observations**, and **577 weight/tracking
cases / 1,154 proofs / 12 groups**. Only the same two layout receipts and one
weight/tracking receipt differ. No evidence artifact was rewritten.

The original stale-fingerprint assertion remains: **4 pass / 1 fail**, exit
**1**, **168,982.9665 ms**. The assertions beyond that guard were independently
executed by the diagnostic insertion. Log:
`artifacts/material-parity/field-host-flow-input-audit/caret-field-host-receipts-recheck.log`,
SHA-256 `5b998799c24221903c39985b086d2534eee20f81389a0321e96ee9309308de7d`.
This is complete evidence replay with a preserved provenance failure, not a
green suite. The earlier run below is retained as historical evidence.

## Earlier full-harness diagnosis

The running 110-file audit harness exposed three additional failures:

- Field-host layout canonical join: the saved layout survey's typography-index
  fingerprint is stale.
- Field-host layout survey: complete saved/current replay differs.
- Field-host weight/tracking: the recorded audit-module fingerprint is stale.

`scripts/diagnose-material-field-host-receipts.mjs` isolates these failures without
changing the running harness, its tests, recorded findings, or production code.
This is diagnostic evidence, not a passing full harness or renderer fix.

## Layout and canonical membership

The diagnostic invokes the existing complete layout evidence loader and report
builder. Across **577 cases / 72 groups / 4,616 property observations**, the only
changed top-level field is `sourceFingerprints`. Every other field, including
all groups, cases, geometry, limitations, flags and proof digests, is deeply equal.

Exactly two receipts differ:

| Source | Recorded SHA-256 | Current SHA-256 |
| --- | --- | --- |
| `docs/material-field-host-typography-audit.json` | `dd9c514ec8900e3200b4dec35d945c20f5e0426224de56b1d434d360afa9fa17` | `7a81fb6fa7305a69e067179963a05d49895c9060addaaa961b2231f758fdfb66` |
| `tests/material-parity/input-equivalence-audit.mjs` | `c57c725b10a0b94bf9c21ccf85e3764f47bccd9d629d004010429fd239c820c1` | `252754869d5683cc76ba0784a96fc55d5c50aa8eeeb8a0441c131ec0a62eb6d4` |

The unchanged complete non-receipt object has SHA-256
`1652fd5d6948afda3dd734d3ea291d509ce2e89e9f81d55d11dcdd2cb42e7ea4`;
the original complete proof digest remains
`1c58fb84c391e96b21d20501bb3cfb38eecb898b6bca22e2aec722ca575cf4ed`.

The diagnostic also reopens the original scalar capture and the authenticated
canonical payload at `b059b4345b5d513b9eecf1b4a804498e31094d41`, then reruns the
existing membership join with the freshly derived survey. All **72 complete
historical join rows**, including original case memberships and interpretations,
remain equal to the saved join. Their ordered digest is
`68e0e65abfc525d0eda92403eb8ab66909fe391a844436858a9d15731d5ab2ac`.

## Weight/tracking

The diagnostic executes the original five-test file in memory, relocating only
relative import URLs and inserting a bounded report immediately before the
failing receipt assertion. AST statement comparisons verify import relocation;
removing the insertion reconstructs the exact original source. The failing
assertion is retained.

All **577 cases / 1,154 proofs / 12 scalar groups** are rederived through the
existing builder and classifier. The insertion additionally checks the durable
group/count/capture assertions that the stale receipt otherwise prevents the
original test from reaching. The groups and all memberships remain unchanged,
with SHA-256
`f61b09390fefa65baf73b0a1ed38b3e11b03f99c9f6d98ef7d9a34bf33599cbe`.
The only changed source receipt is the audit-module hash shown above.

The original test file has SHA-256
`0eb054b63f89c949c22ad38a9e571b5fc9a384f1be171a279980e7472cf03379`.
No fixture input, interpretation or original test assertion was replaced.

## Verification and next step

```powershell
node scripts/diagnose-material-field-host-receipts.mjs
```

The command intentionally exits **1**, preserving the original stale-receipt
failure. The relocated suite reports **4 passes / 1 failure**, no skips, todos or
cancellations, in **142,907.9407 ms**. Both diagnostic records are emitted before
the retained failure. This is not reported as a green test run.

Log: `artifacts/material-parity/field-host-flow-input-audit/field-host-stale-receipt-diagnostic.log`,
SHA-256 `12e53044f4780def3d9c6d00eb59cf420c214f4f7ca3b68f2b5357bb0bba65d2`.
Diagnostic script SHA-256:
`69810e169e929ed7c4505106d99647c7d994b12f516530cb5a04cd459fed7b4d`.

After the current full harness is terminal, refresh the three dependent receipt
artifacts in dependency order, preserving every non-provenance field and original
historical classification. Rerun the three unchanged focused suites and then the
complete current harness. Do not merely replace hashes to obtain green output:
the complete original-source and membership replay above is the prerequisite.
The complete enforced parity matrix and the broader audit remain outstanding.
