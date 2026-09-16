# Complete grid-integration audit harness: terminal result

The complete audit harness launched from `14aa5b5` has finished with **828/828
tests passing**, **zero failures**, skips, cancellations or todos, and **exit
code 0**. Its duration was **4,045,374.2352ms**. This is the full 80-file launch
inventory, not a collection of selected reruns.

```powershell
node scripts/run-material-audit-harness.mjs
```

The captured inventory retains all 43 legacy files and includes 72 Material,
four general and four TTS files. The test runner used file concurrency one.
The terminal exec session is 52997. The complete log is retained at
`artifacts/material-parity/grid-integration-full-harness/test.log`, **326,452
bytes**, SHA-256
`89ce9de1a3322b094cfed613b79604396aa40292141d3d48f7b220c7864aa3e7`.
The [machine-readable receipt](material-grid-harness-verification.json) records
the inventory, terminal totals, later focused runs and acceptance limitations.

The source/provenance assertion failures and four native test-process crashes
from the [earlier 73-file baseline](material-audit-harness-coverage.md) did not
recur in this complete run. That earlier failed log remains unchanged. This
pass is evidence of successful execution under the recorded conditions, not
proof of a single causal explanation for the earlier native allocation failures.

## Scope conservation

Between the launch commit and `f0cc806`, all nine changed paths were newly added
standalone button box-sizing evidence/classification files or documentation.
No selected launch spec or existing production/audit dependency was edited.
The new specs are:

- `button-box-sizing-source-binding.spec.mjs`, added by `93f5344`: separate
  **2/2** focused pass, 27,159.4575ms, exit 0;
- `button-box-sizing-classification.spec.mjs`, added by `f0cc806`: separate
  **3/3** focused pass, 14,951.7548ms, exit 0.

They were not selected by the already-running process. Do not add their five
tests to 828 or label the resulting total as one complete run. Fresh discovery
now finds **82 files** (74 Material plus the eight general/TTS files), still
retaining all 43 legacy files.

## Not completion of the input audit

The canonical input report still has unresolved differences, and standalone
button box-sizing classification is not yet integrated into its production
builder. This harness pass does not prove input equivalence or renderer
correctness and does not replace the required final enforced comparison matrix.
Complete remaining classifications and source/coverage integration, then run
the final current harness and comparison matrix with their full inventories.
No renderer or canonical comparison input was changed for this verification.
