# Plan/check argument-order defect

Two audit scripts accepted both `--plan` and `--check`, but tested only
`args[0] === '--check'` when selecting their output operation:

- `scripts/audit-material-host-font-token-inputs.mjs`
- `scripts/audit-material-container-font-family-stages.mjs`

Consequently, their documented `--plan --check` invocation replayed evidence
and **wrote** its output instead of comparing it with the saved report. The
previous execution receipts establish that source replay ran, but their claim
to have verified a no-write/stale-output check in that argument order was too
strong. No meaningful input difference may be hidden by this instrumentation
mistake.

## Reproduction and owning correction

The new test executes each script's actual TypeScript-parsed CLI block with
read/write spies and collector stubs. It does not duplicate the argument
branching in a separate implementation. Before the correction, both selected
tests fail with `check mode attempted an output write`: **0/2 passed**, exit 1,
580.6721ms. The old source remains available in revision `5cb56e6`.
Log: `artifacts/material-parity/field-host-flow-input-audit/font-plan-cli-check-original-failure.log`.

The owning correction is `args.includes('--check')` in the two existing CLI
blocks. Collectors, source proofs, normalization, classifications, saved outputs,
and canonical inputs are unchanged. The already-correct container font-size
script uses the same order-independent check and needs no change.

The regression covers valid and stale saved output in all three check forms
(`--check`, `--check --plan`, `--plan --check`), both generation modes, and
unknown/duplicate arguments. It also executes both real complete source and
frozen-canonical replays in child processes whose `writeFileSync` throws. Those
children must pass with `--plan --check`, and saved report bytes must remain
unchanged. Only the child filesystem API is instrumented; no workspace report
is altered to test rejection.

## Verification

```text
node --test --test-name-pattern="CLI check mode" tests/material-parity/font-plan-cli-check.spec.mjs
node --test tests/material-parity/font-plan-cli-check.spec.mjs
node --test tests/parity/material-audit-harness-inventory.spec.mjs
```

The first command above records the pre-correction failure. The full corrected
suite passes **4/4**, exit 0, no skipped/cancelled/TODO results, in
**188,168.142ms**. Both real source/frozen-canonical replays pass with output
writes prohibited; saved reports remain byte-for-byte unchanged. Each parsed
CLI also passes 11 argument/staleness/generation cases, 22 total.
Log: `artifacts/material-parity/field-host-flow-input-audit/font-plan-cli-check-corrected.log`.

Inventory tests pass 4/4 in 672.8687ms. Discovery includes 133 files (125
Material, four general, four TTS), including all 43 legacy files. No full
harness or rendering-parity acceptance is implied.
