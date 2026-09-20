# Root background classification preparation

This increment prepares the already source-proven root background differences
for canonical integration. It does not change the renderer, theme, fixtures,
reference inputs, or canonical audit report.

`tests/material-parity/root-background-classification-preparation.mjs` replays
the original root background source investigation, authenticates the captured
report, requires its complete original input population, and binds the current
precise color-normalization contract. All 144 groups / 2,311 observations retain
different reference and candidate values. The reference requests a fractional
CSS mix; the showcase theme prequantizes channels to integer hex before core
receives the background. This establishes unequal authored inputs, not a core
color-mix support gap or a visible raster defect.

Classification contexts are keyed by exact case, element, and property. Each
classification checks the complete captured input hash and both precise scalar
values. The source finding, theme source receipt, rational channel values, and
original observation proof remain attached. Missing contexts classify nothing;
duplicate contexts and changed properties, owners, inputs, or values fail.

Verification:

```text
node --max-old-space-size=1536 --test tests/material-parity/root-background-classification-preparation.spec.mjs
```

Passed 1/1 tests in 21,386 ms. The test traverses all 2,311 original cases and
checks five rejection mutations for each, plus missing/unbound and duplicate
context controls. This is source-classification preparation, not proof that
the canonical pipeline has applied these classifications. Both
`canonicalIntegration` and `canonicalCoverageProven` remain explicitly false.

The existing source proof and audit-discovery checks also passed 7/7 in
17,076 ms:

```text
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/root-background-inputs.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Independent evidence replay and classified-row coverage checks are now supplied
by `validateRootBackgroundEvidence` and
`validateRootBackgroundClassifications`. The former recomputes the entire
source-bound preparation from the fixed original capture; the latter checks all
144 group signatures, metadata, observation counts, complete case memberships,
sampled case lists, and state lists. Row order and unrelated classifications do
not affect coverage.

The expanded focused test passed 1/1 in 57,426 ms. In addition to the original
per-observation mutations, it rejects 11 row-coverage mutations and unbound
evidence. It also demonstrates why both checks are necessary: a forged
renderer-cause claim can be internally consistent with its own rows, but fails
independent source replay. Neither validator promotes this preparation into a
claim of canonical coverage.

The builder-facing collector now additionally checks that its caller matches
the supplied capture and that the capture resolves inside this worktree's
Material artifact boundary. Missing provenance stays unbound; invalid paths,
another worktree, and incomplete callers produce invalid evidence with no
classification contexts. A successful collection still performs the complete
source replay and precise-scalar binding. These checks do not implement a
new cascade or change comparison inputs.

Collector verification passed 2/2 in 66,029 ms using
`node --max-old-space-size=1024 --test tests/material-parity/root-background-classification-preparation.spec.mjs`.
After making the other-worktree negative control portable (`..` rather than a
machine-specific checkout), that control was rerun with
`--test-name-pattern="collector refuses"`: 1/1 passed in 2,288 ms.

Next: wire the prepared evidence and both validators into the production
discrepancy pipeline. Verify
that unrelated rows and observations remain conserved before regenerating the
canonical report. The earlier report regeneration was already running when this
preparation was added and does not include it.
