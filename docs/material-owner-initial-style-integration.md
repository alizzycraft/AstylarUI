# Source-bound owner observation-stage integration

This increment integrates the shared-style investigation into the canonical
audit collector. It changes audit attribution, not the renderer, plugins,
reference application, comparison authoring, or visual acceptance thresholds.

## Owning defect and boundary

The comparison pairs browser computed properties with candidate local
declaration snapshots. A local omission is not a computed value. The new
`owner-initial-style-attribution.mjs` reuses the conservative owner inspector
and the existing inventory rehydration bridge. It retains both positive and
negative observations for the eight investigated properties. Unknown ancestry,
explicit relevant/reset/motion requests and unresolved identity remain negative
evidence. It does not reconstruct CSS inheritance or add missing declarations.

The canonical collector consults this proof **only after all earlier
classifications**, and only when they return `unresolved`. Previously reviewed
static retained-text observations therefore retain their own attribution.
Positive results are classified as `parity-harness-defect` with the specific
`reviewed-owner-initial-style-observation-stage` attribution. Candidate computed
values and rendering equivalence remain explicitly unverified.

## Independent evidence, not self-consistent bookkeeping

The collector requires an original parity-report path and independently checks
its cases, scalar inputs and tree references against the supplied report. No
path means no new source-bound attribution. Duplicate case/owner identities and
paths outside Material artifacts are refused.

Validation reopens the hash-bound original capture and every relevant original
tree. It replays all eligible observations, including negative results, rather
than trusting a report's own abbreviated list. It also replays inventory-based
evidence and the canonical classification sequence. New rows must match that
sequence exactly, including prior-classification precedence, values, complete
case lists, counts, states, owners, justifications and diagnostic witnesses.
Deleting both a finding and its observation cannot establish completion.

## Historical baseline remains reproducible

The original 600-group survey and membership binding now read the immutable
canonical payload from commit
`54ba5e136cee3256461b9f05daf00e38b1dca850`, independently checking compressed SHA-256
`a808df6d424a8bdd751e4066c0b895a2f522d6d68d357c5b694be7663b9209b3`.
This is the same baseline used before integration, not a new reference or an
updated expected outcome. The pinned commit must be present locally; missing
history fails rather than falling back to whichever canonical report is live.

The helper streams the original discrepancy array from the committed payload.
Advancing the live audit cannot silently change the historical population of
600 groups / 31,508 unresolved observations and 636 preserved static observations.
All 15 refreshed diagnostic JSON files have data identical to `02a62c0` after
excluding `sourceFingerprints`; only source-binding metadata changes.

## Verification and remaining work

The first focused command passes **3/3**, with no failures, skips or
cancellations, in **11,407.8857 ms**:

```powershell
node --test tests/material-parity/owner-initial-style-attribution.spec.mjs
```

The proof uses paired original static/activated stepper captures, preserving the
earlier static text-stage classification and leaving explicit visibility rules
unresolved. Negative controls reject altered capture selection and digests,
missing/extra observations, changed values and case identities, fabricated
computed/rendering claims, removed/duplicated canonical rows and forged case
coverage. This is diagnostic evidence, not current pointer or raster proof.

The package harness now registers the new attribution tests and the previously
standalone owner survey, membership and mapping suites: **43 files** in total.
The expanded focused regression command, canonical regeneration, full harness,
canonical no-write verification and complete enforced UI matrix require their
own terminal results; none is implied by the initial three-test pass.

The expanded six-file focused run completed **21/22 passing** in
**236,466.7461 ms**, with no skipped/cancelled tests. Its sole failure was the
mapping suite's no-write hash check: that suite was started before the report
generator had finished, so the report legitimately changed during verification.
The guard was not changed. After generation was terminal, the mapping suite
was rerun alone and passed **5/5** in **129,958.1588 ms**, including full no-write
replay. All other focused checks, including earlier field-host attribution and
data conservation, passed in the expanded run. This is not reported as a single
green 22-test run.

```powershell
node --test --test-concurrency=1 tests/material-parity/owner-initial-style-attribution.spec.mjs tests/material-parity/owner-initial-style-survey.spec.mjs tests/material-parity/owner-initial-style-membership.spec.mjs tests/material-parity/owner-initial-style-mappings.spec.mjs tests/material-parity/field-host-initial-style-evidence.spec.mjs tests/material-parity/field-host-initial-style-integration.spec.mjs
node --test tests/material-parity/owner-initial-style-mappings.spec.mjs
node scripts/verify-material-owner-initial-integration.mjs
```

The last command is a separate canonical conservation gate. It requires all
326 new groups to have the exact independently established case lists, all
8,339 original value/count/sample/state projections to remain identical, and
the other 8,013 complete discrepancy records to remain unchanged. It does not
replace original-tree replay or full parity verification.
Against the still-current pre-integration canonical report, the conservation
gate fails as expected with **0 new groups versus 326 required**. This records
the red baseline; the in-progress regeneration must supply verified new
evidence before this gate can pass.

Canonical regeneration subsequently completed with exit code 1, reporting only
the expected strict acceptance failure: **2,812** remaining unattributed
differences. Coverage remains 436 static and 1,875 interaction cases, with
8,339 groups, 386,891 occurrences and 132 source findings. No input-equivalence
claim is made.

The independent conservation gate then passed: exactly **326 groups / 18,356
observations** acquired the new observation-stage attribution, all **8,013
other complete rows** remained identical, and all **8,339** original scalar
value/count/sample/state projections were conserved. There were no unexpected
partial-state replacements. The new evidence pool contains 54,139 eligible
property observations, including negative evidence; it is not a count of
equivalent rendered properties or newly attributed occurrences.

The conserved scalar projection SHA-256 is
`d5e916fb99193565c6be9a6428d8616a3ca87424d8f658d09f7df9824b693d03`.
The 8,013 unchanged complete rows have SHA-256
`7e0b7a23aa044e4e559fabce438e9d27fbe9164049b9fca4e42961b93b3ccad0`.
The generated gzip payload is 48,413,240 bytes with SHA-256
`bc51756963cfd2c0f81cfb099f48f7776cd608224d0c997a6f703edc6f48378d`.
Its 1,795,180,227 decoded bytes have SHA-256
`d8d776394aaf5d3830146cc5967150eaf7da69877751441852059db58ec31da9`.

The unfiltered 43-file harness subsequently finished with **708/710 passing,
2 failing**, zero skipped/cancelled tests, in **2,178,545.2152 ms**. All 47
recorded start-of-run source hashes remained unchanged. The log is
`artifacts/material-parity/owner-initial-full-harness.log`, SHA-256
`ced043e2b7897e79c34012191232c85490d9be1522dc14ecaed5f797ee1b2c5b`.

Failures are preserved, not dismissed as a green run:

- `input-equivalence-audit.spec.mjs:1376` expects 148 source fingerprints but
  the collector now returns 156. Exact source membership must be checked before
  updating the expectation.
- `slider-border-canonical-integration.spec.mjs:53` rejects the complete-row
  hash of 220 non-border rows in its two-case fixture. The expected hash is
  `4e1f09fc03af948aec7b2d1d927ee13c298b6439ceaa3bb0145a72122eb315ee`;
  actual is `08822637348df515eecd57ef53bb9652a932a2b5e03e3b835ba14633948fc87d`.
  New shared owner attribution is a plausible explanation, but exact row
  conservation must be demonstrated before changing the historical guard.

Canonical no-write replay subsequently completed with exit 1 solely on the
2,812 unattributed differences, without stale-source or regenerated-evidence
mismatches. The successful conservation and no-write checks do not substitute
for resolving the two harness failures or the final enforced UI matrix.

The [exact failure diagnosis](material-owner-integration-harness-diagnosis.md)
now proves the source-list delta is precisely the eight intended files and
restoring only 22 explicitly identified shared-owner attributions reproduces
the slider test's original 220-row hash. That isolates stale expectations
without weakening the historical guard. After that replay completed, the
expectations were corrected and all three focused regression tests passed in
10,874.5903 ms. The original digest remains enforced. Full harness rerun and
canonical regeneration for the two updated test-source fingerprints are next.

Remaining obligations include inherited/used-value consumption, wrapping,
visibility, hit testing, plugin/core ownership, all other unresolved input
differences and the full goal acceptance matrix. No UI issue is marked fixed.

## Test-expectation refresh: canonical generation and full-row conservation

After `04b7b4a`, canonical generation completed with exit 1 **only** for the
2,812 unattributed groups. Coverage remains 436 static / 1,875 interaction cases,
8,339 groups / 386,891 occurrences and 132 source findings; input equivalence
remains false.

```powershell
node scripts/verify-material-owner-initial-integration.mjs
node scripts/verify-material-owner-test-refresh.mjs
```

Both gates exit 0. The original integration gate preserves the exact 326-group
membership, all scalar projections and all 8,013 unrelated complete rows.
The new gate additionally compares **every complete one of the 8,339 rows**
and the full summary with commit `37fbb5a13f4ccfbef1d6249edda3ac3dad8902d9`.
All are identical, including the 326 owner witnesses. Their complete-row SHA-256
is `bab20490a8fcbcb7bc39d0fdf327dc2ecc8675bc21df50cefbd241bfdc036e70`.

The 156 source paths are unchanged, and every fingerprint matches current source.
Only `input-equivalence-audit.spec.mjs` and
`slider-border-canonical-integration.spec.mjs` have changed hashes, as intended.
The human report is identical apart from source line references; the verifier
checks that separately. This does not assert equality of all other machine-report
sections; a full no-write replay has been launched for that obligation and is
still pending at this checkpoint.

The refreshed compressed payload is 48,413,260 bytes, SHA-256
`41e9c7c896086ef0b50f3872e9af509b3171c9d0dac6e82f62c550bff9c264af`.
Its manifest records 1,795,180,227 decoded bytes, SHA-256
`ebe493b1e3c2f7db81513d99e054db432969a8268b9372955aa6e02419cb829c`.
The full 43-file rerun remains live; all 47 start-of-run source hashes were
rechecked unchanged during execution. No terminal pass is claimed yet.
