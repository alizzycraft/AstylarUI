# Historical field-host conservation and later caret reviews

## Preserve and explain the failure

After the field-host receipt refresh, the original two-file command produced
**2 passes / 1 failure**, exit **1**, **260,119.7492 ms**:

```powershell
node --test --test-concurrency=1 tests/material-parity/field-host-layout-canonical-integration.spec.mjs tests/material-parity/field-host-initial-style-integration.spec.mjs
```

The initial-style integration still passes its unchanged scalar and unrelated
row digests. The layout integration rejects its unrelated-row digest at line
73: historical `a0e04f275aa8a2aa0cb448fc99478c67b44dcb38e46c426bd15ee0433289e3c2`,
current `40a0a81d4d0fc33bd89e3623b5623ac6fdd0135782e8658252d6102e944b5ed5`.
The failing log is `artifacts/material-parity/field-host-flow-input-audit/caret-historical-field-host-before.log`,
SHA-256 `b6e70956e3783d01b981b1050ed2e5ca0a64f1de9f9c2c020e496dfdd72572fe`.

`scripts/diagnose-material-field-host-caret-conservation.mjs` executes the actual
test source pinned at `80bf887`, inserting a bounded report immediately before
that assertion. Removing the insertion reconstructs the original source;
AST comparisons constrain import relocation. The assertion remains and still
fails. This diagnostic does not replace its expected digest or waive a property.

The diagnostic proves that all **5,965 ordered scalar rows** across **607 cases**
are unchanged. Of the rows outside the original field-host and authenticated
later-gap scopes, exactly **55 rows / 55 observations** change, all from
unresolved to the two reviewed caret observation-stage attributions. Every raw
and authored field is unchanged. The other **5,702 complete rows** are identical;
their ordered per-row digest list has SHA-256
`05cce8616d4443fea3379e4d4e45bb62d4870e2519ee94de0ec2e9e4d978b897`.

The exact supplied caret population is independently authenticated against the
complete original capture and pinned caret proof, then matched to every current
caret classification. It contains **55 reviewed observations and seven pending
observations**; these subset counts are not replaced with the full report's
3,154 reviewed observations. This establishes the source of this checksum
change, not equivalent inputs or a renderer fix.

Command: `node scripts/diagnose-material-field-host-caret-conservation.mjs`.
Result: **0 pass / 1 retained failure**, exit **1**, **250,552.8118 ms**.
Log: `artifacts/material-parity/field-host-flow-input-audit/caret-historical-field-host-diagnostic.log`,
SHA-256 `677173edba2ff3c10d26eb8e2593903d579a8ca2a92d188916719e551e27153e`.

## Narrow historical guard

The existing later-classification helper now exports a separate caret guard.
Before returning any signature for exclusion, it authenticates the entire
original caret proof and exact supplied subset, validates complete classified
row coverage, and compares every non-classification field with the historical
row. It requires previously unresolved attribution and false equivalence/cause
claims. Pending caret rows must remain completely identical and unresolved.
All rows outside the returned signatures still undergo the original complete
unrelated-row comparison. This is not a blanket exclusion of `caretColor`.

The pure delta controls pass **3/3**, exit **0**, **878.0256 ms**, including 18
mutation rejections and three unauthenticated-source wrapper rejections.
Command: `node --test tests/material-parity/later-caret-integration-conservation.spec.mjs`.
Log: `artifacts/material-parity/field-host-flow-input-audit/caret-historical-guard-controls.log`,
SHA-256 `251f9defc7ed2a6dd1ea54c4a136e8a94810d49195e84f3696fb6f1fd15a7f45`.

The inventory guard passes **4/4**, exit **0**, **545.0366 ms**, explicitly
requiring the new test file. Discovery includes **114 files** (106 Material,
four general parity, four TTS), retaining all 43 legacy entries. Log:
`artifacts/material-parity/field-host-flow-input-audit/caret-historical-guard-inventory.log`,
SHA-256 `68f14549e92b7359b179d1f3cdac3212d6749323820076a2441edf8fd2cb0c6b`.

## Complete historical integration replay

Command: `node --test --test-concurrency=1 tests/material-parity/field-host-layout-canonical-integration.spec.mjs tests/material-parity/field-host-initial-style-integration.spec.mjs`.
Result: **3/3 pass**, exit **0**, **926,569.4412 ms**. The production layout
integration covers 102 static and 505 interaction cases, preserves all **5,965
ordered scalar rows**, and compares all **5,702 complete unrelated rows** after
the authenticated later-classification checks. Their complete-array SHA-256 is
`920aaf9c7a3da7ed34eb6e094c87abe6b448b4b462ed6989429acb367a2d6f1e`.
This serialization differs from the diagnostic's ordered per-row digest list;
neither expected checksum was substituted into the original assertion.

The initial-style integration separately preserves 105 complete unrelated rows,
SHA-256 `aa3a0af27874b69dd8c54a92a4bf972ff4d34e599b60c31b1cb44d530c1b6d4e`.
Log: `artifacts/material-parity/field-host-flow-input-audit/caret-historical-field-host-recheck.log`,
SHA-256 `c9d895211b32e2473d80420b0d7451a7060ad924154e9431a545bf22d56d27f2`.

No full current harness, canonical regeneration, or output-parity acceptance is
established by this focused replay. Renderer and comparison inputs are unchanged.
