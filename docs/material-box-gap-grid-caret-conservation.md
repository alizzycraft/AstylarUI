# Historical box/gap/grid failures: exact later caret attribution

This explains three failures in the [unchanged five-file
baseline](material-historical-caret-recheck-baseline.md). It does not yet accept
their corrected tests or explain the slider's separate frozen checksum.

The diagnostic executes each exact original spec at `a6c98bd`, inserts a bounded
comparison immediately before the failing assertion, and retains that assertion.
Removing the insertion reconstructs the source; AST comparisons constrain
import relocation. The source hashes match the baseline receipt.

| Original test | Cases | Ordered scalar rows | Changed caret rows | Reviewed observations | Pending observations retained | Complete unchanged other rows |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Button box sizing | 88 | 6,554 | 55 | 119 | 53 | 6,282 |
| Owner gap | 149 | 6,605 | 55 | 169 | 143 | 6,390 |
| Owner grid | 110 | 6,423 | 55 | 108 | 97 | 6,055 |

Every changed row belongs to the exact independently authenticated caret source
population. The only changed fields are `justification`, `recommendedOwner`,
`attribution`, `reviewEvidence` and `reviewedCases`; no raw value, authored field,
count or ordered scalar changes. Attributions move from unresolved to the
bounded local/motion observation-stage reviews. Pending caret records remain
complete, unchanged and unresolved. All equivalence and renderer-cause claims
remain false.

Complete unchanged-row array SHA-256 values, in table order:

- `9f2623ea77e8ae158048b5a5c80c5229579d4f87ca81179575e9872bc065245a`
- `816bd4887331fd7a3479489385fe4d2fbc028dcb9f618b5d1304b0c0f99ccd77`
- `1806826fdc512ae004b3451c134daa29a81611af8544917c6b844d6d825d5258`

## Executed verification

```powershell
node scripts/diagnose-material-button-caret-conservation.mjs button-box-sizing
node scripts/diagnose-material-button-caret-conservation.mjs owner-gap
node scripts/diagnose-material-button-caret-conservation.mjs owner-grid-initial
```

Each emits its successful conservation evidence and then fails the retained
original assertion with the same expected/actual hashes as the baseline:
**zero pass / one failure**, exit **1**. Durations are **153,639.5049**,
**184,187.5873** and **157,990.6535 ms**, respectively. The queue's terminal
exit codes were observed directly; exit 1 alone is not the diagnosis.

Logs under `artifacts/material-parity/field-host-flow-input-audit/`:

- `caret-button-box-sizing-diagnostic.log`: SHA-256
  `c2fde378d5ff673757dbbfc04dad9b8259809f5791bab8e7c345079a2a0e6d7a`.
- `caret-owner-gap-diagnostic.log`: SHA-256
  `1955b2e1c7ce91834a75c56e802b03f9535fcea4ea7224882244c2fd12d84939`.
- `caret-owner-grid-initial-diagnostic.log`: SHA-256
  `0e612a49f6eba7fd21c2653443a44eccfcb56f3f0d1ab87b0ac6857072cecaf2`.

The extension preserves the earlier three diagnostic insertions byte-for-byte;
both script ASTs parse without diagnostics. It changes only the selected
historical assertion and the original helper name (`other` versus `others`).
The strict independent caret validator is unchanged, with its latest three
passing controls recorded in the [button conservation evidence](material-button-later-caret-conservation.md).

## Required corrected replay

Corrections must authenticate these exact populations, require disjointness
from the original and previously reviewed groups, and compare every remaining
record in full. Pending records must remain inside that full comparison. Keep
all original source, authoring, precedence and invalid-evidence checks.

The corrected box-sizing replay is running; corrected gap/grid replays are
queued after it. These corrections are not included in this diagnostic commit
and must not be accepted before their unfiltered checks finish. The complete
current harness, canonical source-inventory refresh, 2,160 unresolved signatures
and final enforced rendering matrix remain separate acceptance work. No renderer
or canonical comparison input is changed here.
