# Versioned interactive line-box evidence reconciliation

## Owning defect and boundary

The audit's precise-color correction exposed a historical evidence-format
mismatch, not a renderer failure. The v3 measurement capture embeds checkpoint
typography produced by the old rounded normalizer. The current reader compared
that embedded object directly against precise current targets and rejected the
whole report. The census in `material-line-box-normalization-census.json`
demonstrates that 48 of 671 measurements differ only in reference color.

The correction is confined to the audit reader and a new
`control-line-box-normalization.mjs` helper. No renderer, plugin, showcase input,
reference, captured metric, or historical receipt is changed.

## Contract

- Only the exact authenticated v3 report digest can use reconciliation.
  Other reports continue through the original strict validator.
- The original snapshot bytes and both extracted normalization implementations
  are independently authenticated. Current precise values are never rounded.
- The reference owner and raw captured style supply both old and current
  values. The old target must equal the embedded checkpoint in every property
  and stage; only reference color may transition.
- The original measurement is validated against that derived historical target.
  Font metrics, physical dimensions, ownership, text, readiness and all other
  measurement checks remain mandatory.
- The complete reader still enforces paths, immutable capture/source digests,
  checkpoint/run identity, target membership, paired trees, action traces,
  assets, counts and atomic failure. No partial success is returned on error.
- A changed observation is explicitly projected into the current checkpoint
  contract for downstream attribution. Its `normalizationReconciliation`
  field retains the exact historical checkpoint typography, original
  measurement digest, raw color, before/after values, both normalization
  contracts, historical source receipt and current module digest. The original
  capture stays byte-identical. Unchanged observations need no projection.
- This restores measurement evidence only. It does not prove input equivalence,
  line-box/baseline equivalence, rendering correctness or screenshot parity.

The main audit's fingerprint list includes the new instrumentation and focused
proofs. Its mapping and attribution algorithms were not changed. The motion
source-conservation report was regenerated because that fingerprint inventory
changed the main module bytes; its independent mapping-conservation checks
remain required.

## Verification

The full-reader reproduction authenticates the complete original capture
(`b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a`),
rebuilds targets from all 1,875 interaction cases, and obtains 671 observations,
zero missing targets and zero reader errors. Exactly 48 observations contain
reconciliation metadata. Removing that metadata and restoring the preserved
historical typography reproduces every original measurement digest. A mutated
current font-size target rejects the entire report, leaving all 671 pending.

Standalone commands:

```text
node --max-old-space-size=768 --test tests/material-parity/normal-line-box-report.spec.mjs
node --max-old-space-size=3072 --test --test-concurrency=1 tests/material-parity/control-line-box-reconciliation.spec.mjs
```

Results: existing reader suite 110/110 passed (5,262.1024 ms); reconciliation
suite 2/2 passed (36,224.4457 ms). The latter includes report/source/normalizer
binding controls and rejects unrelated owner, property, stage and precision
mutations. These are focused results, not a complete audit gate.

Combined verification also includes historical source conservation, alignment
conservation, census replay and harness inventory. Its complete TAP output is
retained at `artifacts/material-parity/line-box-reconciliation-94cf46b.tap`.
Result: **124/124 passed**, no failures, cancellations or skips;
97,842.9256 ms. The command used `--test-reporter=tap` and
`--test-reporter-destination=artifacts/material-parity/line-box-reconciliation-94cf46b.tap`
with `--max-old-space-size=3072 --test --test-concurrency=1` and these suites:

- `tests/material-parity/control-line-box-reconciliation.spec.mjs`
- `tests/material-parity/control-line-box-normalization-transition.spec.mjs`
- `tests/material-parity/line-box-normalization-census.spec.mjs`
- `tests/material-parity/normal-line-box-report.spec.mjs`
- `tests/material-parity/motion-source-conservation.spec.mjs`
- `tests/material-parity/alignment-survey-conservation.spec.mjs`
- `tests/material-parity/historical-audit-module-source.spec.mjs`
- `tests/parity/material-audit-harness-inventory.spec.mjs`

## Remaining work

Regenerate and independently validate the canonical audit only after the next
classification integration is ready; verify old-to-new row conservation and
restored line-box attribution. The uncommitted prior generated audit still
records the rejected old checkpoint and must not be presented as current
acceptance. The ten failures in the earlier 388-test suite and all remaining
unclassified differences remain open, as does the complete enforced parity
matrix.
