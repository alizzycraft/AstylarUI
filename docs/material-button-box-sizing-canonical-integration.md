# Shared-button box-sizing: production audit integration

## Invariant

Integrate only the previously source-bound box-sizing observation-stage finding.
Preserve authored inputs, all normalized scalar differences, every unrelated
classification, existing fixed-width inequality and all missing interaction
measurements. Do not synthesize a candidate computed value or infer rendering
equivalence from static dimensions.

The production builder now collects the complete original-source ledger, checks
the new classification only after existing classifiers retain precedence, and
retains every reviewed case in grouped rows. Production validation requires both
the full tree/declaration/geometry replay and independent scalar/geometry
classification coverage. Missing binding, removed observations, changed claims
or a claimed whole-input success are rejected. The human report reports measured
static cases separately from missing interaction geometry.

## Initial red/green integration evidence

```powershell
node --test --test-concurrency=1 tests/material-parity/button-box-sizing-canonical-integration.spec.mjs
```

Before implementation, session **28332** exited **1**, **0/1 pass**, with
`0 !== 9`: the production builder had no reviewed box-sizing attribution.
Duration: **21,831.9684ms**.

After integration, session **71978** exited **0**, **1/1 pass**, zero failures,
skips, cancellations or todos, **98,039.6313ms**. The test uses the actual
pre-integration builder from `0165f76`, relocating only relative import paths.
AST checks preserve all other historical statements and verify that the actual
production mapping and value-normalization functions remain unchanged.

The diagnostic population includes one original light/desktop static case from
each of **36 families**, plus **52 original shared-button interaction cases**.
It retains **73 button observations**, comprising **nine measured static cases**
and **64 original interaction geometry gaps**, across nine attributed groups.

All **6,554 scalar rows** remain exactly unchanged. All **6,545 unrelated
complete discrepancy rows** remain unchanged, SHA-256:
`67801c7b6acb9a387a84c47f85255dc725ffab1243fc2489298d1eb56fbbfca1`.
The nine selected rows retain their authored examples and scalar values; only
their supported attribution/evidence changes. The fixed-width and grid ledgers
remain exactly unchanged. Four full production-validation negative controls
reject missing binding, dropped interaction observations, an inflated layout
claim and a false whole-input success.

The captured diagnostic report is retained at
`artifacts/material-parity/button-box-sizing-integration-EPn6Ja/report.json`.
This bounded integration test complements, but does not replace, the complete
600-observation source-binding and classification tests.

The source-inventory check also passes **1/1**, exit **0**, **1,628.8431ms**:

```powershell
node --test --test-name-pattern="records source fingerprints and actual visual acceptance fields" tests/material-parity/input-equivalence-audit.spec.mjs
```

The canonical producer inventory gains the eight box-sizing evidence, binding,
classification, coverage and integration-test files: **196 → 204** dependencies.
No previous dependency is removed.

## Historical compatibility verification

The earlier historical integration tests compare against builders predating
this new attribution. A four-file conservation recheck (session **77604**)
terminated with exit **1**, **0/4 pass**, **537,181.9244ms**. The fixed-width
assertion showed the later box-sizing rows in its otherwise-unrelated population.
Its failure diagnostic was exceptionally large (the tool reported more than
17MB of omitted output). The same run reported `Array buffer allocation failed`
and `FATAL ERROR: Committing semi space failed`; a contemporaneous PowerShell
check failed to load CoreCLR with HRESULT `0x800705AF`. These observations do
not prove a single initiating cause or make an allocation failure into a valid
conservation result. The reviewed-authoring test separately reported the
expected old/new complete-row checksum difference at its unchanged assertion.

The historical checks now explicitly include exactly nine later box-sizing
groups in their reviewed change sets, require their complete source-bound
owner coverage and production validation, and retain original scalar arrays
and exact equality of all other complete rows. No historical builder or value
normalizer is replaced. Two formerly enormous deep-equality diagnostics now use
`assert.ok(isDeepStrictEqual(...))`: the structural predicate is unchanged, but
failure does not format the entire capture into an assertion message. Existing
hash-based guards stay hash-based. This is a diagnostic change, not weaker
comparison or a new accepted checksum.

```powershell
node --test --test-concurrency=1 --test-name-pattern="production integration preserves" tests/material-parity/button-fixed-width-canonical-integration.spec.mjs tests/material-parity/button-requests-canonical-integration.spec.mjs tests/material-parity/owner-grid-initial-canonical-integration.spec.mjs tests/material-parity/reviewed-authoring-canonical-integration.spec.mjs
```

The revised run (session **78412**) produced verified passes for fixed-width
and button-request conservation, **338,192.1104ms** and **544,922.7337ms**
respectively. Fixed-width retains all **1,201 scalar rows** and **1,184**
unrelated complete rows, SHA-256
`062661098c4ef1fb88aeabe5b68d54cad3b6f42f053064c4915d2ed75e14107a`.
Button requests retain all **2,938 scalar rows** and **2,867** unrelated
complete rows, SHA-256
`0409a86e461033764e7529b52475a8e2b8e3479ba567c54307f2b736ca2fe5f7`.
The final output of that session was not recoverable; its missing handle and
absence of a live test process do not establish the remaining results.

The two unverified checks were therefore rerun with a durable log:

```powershell
node --test --test-concurrency=1 --test-name-pattern="production integration preserves" tests/material-parity/owner-grid-initial-canonical-integration.spec.mjs tests/material-parity/reviewed-authoring-canonical-integration.spec.mjs
```

Session **63135** terminated with exit **0**, **2/2 passed**, zero failures,
skips, cancellations or todos, **285,837.5853ms**. The grid test preserves
**6,423 scalar rows** and **6,314** unrelated complete rows, SHA-256
`f6c86c9792d5920bfa5bd57376e322f8cef0922efee47fd84e5f656a40b0e4d4`.
Its original 100 grid groups remain independently checked alongside exactly
nine later box-sizing groups. Reviewed-authoring conservation also passes.
Log: `artifacts/material-parity/button-box-sizing-historical-recheck.log`,
SHA-256 `516c6a6f371966e5d98381f25dda5fd1af75583fcbe596e940dab59458803862`.
These are separate verified runs, not a claimed single four-test terminal pass.

## Evidence provenance replays

### Completed root/field case-index provenance replay

The nine existing case-index proofs were replayed after updating only their
audit-builder fingerprint. The root box-model companion was also checked:

```powershell
node --test --test-name-pattern="container caret case index|root box model case index|root height case index|field host color case index|root color case index|root typography case index|field host alignment case index|field host case index|non-widget appearance case index|button appearance case index" tests/material-parity/input-equivalence-audit.spec.mjs
node scripts/audit-material-field-host-initial-styles.mjs
node scripts/audit-material-field-host-initial-styles.mjs --check
node --test --test-concurrency=1 tests/material-parity/root-initial-style-evidence.spec.mjs tests/material-parity/field-host-weight-tracking-evidence.spec.mjs tests/material-parity/field-host-initial-style-evidence.spec.mjs
```

The case-index run (session **33225**) exits **0**, **10/10 passed**,
**39,092.7006ms**. Log:
`artifacts/material-parity/button-box-sizing-case-index-replay.log`, SHA-256
`913b1fcef96ef8e2640184a6ac348f15011afb3c3d67e73b29ce51138ba84946`.
The field-host initial-style generator and no-write replay both exit 0.
The subsequent three-file run (session **39155**) exits **0**, **14/14 passed**,
**163,620.1638ms**, with zero failures, skips, cancellations or todos.
Log: `artifacts/material-parity/button-box-sizing-provenance-replay.log`, SHA-256
`dd56e6f56f401893d0942dee2c031a3cbb97ec5b6f249c5e72d95b94bdb86e54`.

Independent deep comparisons against `58ac4bb` retain every non-fingerprint
field in all twelve reports. Their unchanged data hashes match the prior grid
replay recorded in `docs/material-audit-harness-coverage.md`. Nine case indices
and the field weight/tracking index change only the builder fingerprint; the
root-initial index changes builder and builder-test fingerprints; the dependent
field-initial report changes builder and parent typography-index fingerprints.
The complete 2,311 root cases, 577 field cases, original tree hashes, scalar
values, classifications, case membership and uncertainty flags are preserved.
These are proof replays, not blind acceptance of new source hashes.

### Completed owner/overlay provenance replay

```powershell
node scripts/audit-material-owner-initial-membership.mjs
node scripts/audit-material-owner-initial-mappings.mjs
node scripts/audit-material-remaining-overlay-ancestry.mjs
node --test --test-concurrency=1 tests/material-parity/owner-initial-style-membership.spec.mjs tests/material-parity/owner-initial-style-mappings.spec.mjs tests/material-parity/remaining-overlay-ancestry-review.spec.mjs
```

All three generators exit 0. Session **11175** then exits **0**, **14/14 tests
passed**, **76,545.1521ms**, zero failures, skips, cancellations or todos.
Log: `artifacts/material-parity/button-box-sizing-owner-provenance-replay.log`,
SHA-256 `26be9177727dee3c318a2bb3b81d05b3edbd8d169870008488d3197a770694ce`.
The membership and mapping reports retain all non-fingerprint data, with hashes
`e7b4cff4aa3cd86047654d19373d36137c97240086cfc5942eeaa13c5b08d320`
and `1789a08d0cadeff09a5ed25a24723daff4b53142a4f703bed4bcacc5896678c6`.
The remaining-overlay report changes only its parent mapping digest and audit
builder fingerprint; all other data retains SHA-256
`09a267525e65e8314e1a240fc07ed3423c051d2a18e9e3e49e5326564051046c`.
The 600 membership groups, 31,508 observations, 636
separately reviewed static observations, 51 split groups, 48 overlay groups,
1,424 overlay observations, 50 cases, 178 owners and 18 tooltip context gaps
are unchanged. No frozen runtime capture or historical overlay-mapping receipt
was rewritten. The tests include independent no-write source replay.

## Verification still pending

Full canonical generation/conservation,
source-provenance replays, full no-write validation and the final current harness
and enforced comparison matrix remain pending. The checked-in canonical report
has not yet been regenerated for this integration, so its unresolved count must
not be described as updated. No renderer or canonical comparison input is changed.
