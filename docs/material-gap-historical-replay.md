# Historical gap replay after color-precision correction

## Cause and boundary

The broad audit test run after `704b2eb` repeatedly failed in historical gap
readers. Their saved survey authenticated the entire live audit module against
its pre-correction hash, and some readers also required its color normalizer to
remain unchanged. The new color precision exposed this dependency error; it did
not change gap inputs or establish a renderer regression.

The run was deliberately terminated after confirming the repeated dependency
failure. It is incomplete, not a passing broad test run. Its retained log is
`artifacts/material-parity/field-host-flow-input-audit/color-normalization-main-regressions-sep20.log`.

## Correction

`tests/material-parity/gap-survey-source-replay.mjs` reads the historical audit
module explicitly from `4650791a7208b841dd29f1ced015f98234949623`. Both its complete
source digest and its seven executed normalization functions must still match
the original survey. Other survey dependencies remain authenticated against
their current sources; there is no fallback that accepts arbitrary changed code.

Historical normalization alone is insufficient for current classification.
The replay therefore executes the live normalizer separately and requires exact
equality of `rowGap` and `columnGap` for each consumed input. It returns only those
two verified properties, never the old rounded color values. A live gap change
fails this check even when every historical receipt remains valid.

The original survey generator, canonical membership join, explicit composition
review, motion review, scalar-layer review and downstream bindings use this
boundary. Existing historical conservation assertions now explicitly replay the
completed integration at `4650791`, rather than requiring all future generators
to stay byte-identical. Separate current tests still run all seven generators
with writes prohibited.

## Evidence and unchanged findings

- The initial focused checks passed 3/3: dependency authentication, all 27,784
  style stages across 6,946 original owners, and deliberate live gap mutations.
- The complete original capture is authenticated as
  `b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a`.
- All seven reports regenerated successfully. The gap join still contains 162
  groups and 9,254 observations across 2,311 cases.
- Explicit composition remains 16 groups / 1,032 observations. The separate
  membership review remains 38 groups / 1,902 observations, including 64
  unresolved motion observations. No classification was upgraded.
- A focused conservation assertion compares all seven complete reports to
  `4650791`: exactly 16 authenticated dependency receipts may change; every
  finding, source input, proof hash, membership, limitation and classification
  must remain identical. Forged receipts and upgraded conclusions are rejected.

Generation log:
`artifacts/material-parity/field-host-flow-input-audit/gap-historical-replay-refresh-final-sep20.log`.

Focused verification command:

```powershell
node --test --test-concurrency=1 tests/material-parity/gap-survey-source-replay.spec.mjs tests/material-parity/explicit-gap-canonical-binding.spec.mjs tests/material-parity/gap-review-membership.spec.mjs tests/material-parity/explicit-gap-source-binding.spec.mjs tests/material-parity/gap-review-source-binding.spec.mjs tests/material-parity/reviewed-input-gap-receipts.spec.mjs
```

Its result is recorded in
`artifacts/material-parity/field-host-flow-input-audit/gap-historical-replay-focused-sep20.log`;
the terminal result is **15/15 passed**, zero failures/skips, in 258,620.4668 ms.
This includes all seven current generators executing with writes prohibited,
historical conservation, current source binding, and mutation rejection.

The independent color-precision regression command also passed **4/4** in
6,225.9181 ms after the gap changes:

```powershell
node --test tests/material-parity/color-normalization-precision.spec.mjs
```

## Remaining work

This is an instrumentation correction, not a renderer, plugin or fixture fix.
It does not revalidate color-dependent classifications, regenerate the canonical
audit, or complete the full enforced parity matrix. Other historical readers
that depend on the old normalizer still need explicit migration and current-value
verification. The precision correction must not be rolled back to make their
old hashes pass.
