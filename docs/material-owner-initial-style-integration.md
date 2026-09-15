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

Until canonical regeneration and conservation checks finish, the last verified
canonical unresolved count remains **3,138**. The earlier standalone mapping
survey identifies 326 groups / 18,356 observations with observation-stage
evidence; this is an expected integration population, not an assumed final
canonical count. Partial-state groups, if any, must be accounted for separately.

Remaining obligations include inherited/used-value consumption, wrapping,
visibility, hit testing, plugin/core ownership, all other unresolved input
differences and the full goal acceptance matrix. No UI issue is marked fixed.
