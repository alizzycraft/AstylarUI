# Historical integration baseline after caret attribution

On 2026-09-18 the complete, unfiltered five-file diagnostic run finished with
**10 tests: six passes and four failures**, exit **1**, in **2,801,497.1904 ms**.
There were no skips, cancellations or todos. The originating process handle
returned the terminal exit code; it was not inferred from a quiet log or timeout.

```powershell
node --test --test-concurrency=1 tests/material-parity/button-box-sizing-canonical-integration.spec.mjs tests/material-parity/owner-gap-canonical-integration.spec.mjs tests/material-parity/owner-grid-initial-canonical-integration.spec.mjs tests/material-parity/slider-border-canonical-integration.spec.mjs tests/material-parity/tooltip-wrapping-canonical-integration.spec.mjs
```

The [machine receipt](material-historical-caret-recheck-baseline.json) records
every test, duration, complete expected/actual failure digest, source digest and
command. Each of these five spec files was verified unchanged from `a6c98bd`.
The exact source and original failure assertions remain available at that
revision even after later corrections.

| Area | Result | Evidence boundary |
| --- | --- | --- |
| Button box sizing | One failure | Historical complete unrelated-row checksum differs. |
| Owner gap | One failure | Historical complete unrelated-row checksum differs. |
| Owner grid | One failure | Historical complete unrelated-row checksum differs. |
| Slider border | One failure, four passes | Frozen complete-row checksum differs; source/coverage/false-equivalence rejection controls pass. |
| Tooltip wrapping | Two passes | Positive historical integration and all original missing-evidence/false-equivalence controls pass unchanged. |

Log: `artifacts/material-parity/field-host-flow-input-audit/caret-historical-remaining-before.log`.
SHA-256: `af1224704008774f279b989cf393cec672464734441709bbac36e023104475aa`.
The receipt was checked against the complete terminal TAP log: all ten names
and durations, the four expected/actual hashes, and final totals were parsed
and asserted before recording. The five source texts were independently
compared with their Git objects after line-ending normalization.

## Next action and limitations

The three button/authoring failures in the earlier batch have a separate
[authenticated explanation](material-button-later-caret-conservation.md).
Do not assume it also explains these four failures. The new diagnostics retain
each original assertion and must show exact changed-record membership before
any historical comparison is corrected. In particular, the slider's frozen
`4e1f09fc...` checksum must not simply be replaced with the observed `06e2e601...`.

The subsequent [box/gap/grid diagnostics](material-box-gap-grid-caret-conservation.md)
now explain those three complete-row failures with exact authenticated caret
metadata changes and unchanged remaining records. Corrected replay is separate;
the slider cause is not inferred from their results.

The tooltip passes require no corresponding correction. They do not prove
tooltip rendering is correct: these tests concern audit classification and
conservation, not the reported positioning, size or blur symptoms.

This is a focused baseline within the 116-file current audit inventory, not a
complete harness run or enforced rendering matrix. The canonical audit still
contains 2,160 unresolved signatures. No renderer, comparison input, reference,
threshold or classification is changed by recording these results.
