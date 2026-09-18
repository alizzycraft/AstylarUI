# Pending-motion binding: stale parent receipt

The original 120-file full harness fails during module initialization of
`tests/material-parity/pending-motion-capture-binding.spec.mjs`, before its two
tests execute. The assertion is
`scripts/bind-material-pending-motion-capture.mjs:70`: the saved CSSOM proof
references parent-survey digest `77b6b28a7094731abbdd574007f0ef449748cb65020a69c4147c52f1f995b128`,
whereas the current join references
`2575edb57305d009386dd20864a1de56f36e6e49a709859e128a393e6121a7d3`.

## Demonstrated cause

The survey's findings have not changed. Comparing the entire survey with the
binding's historical baseline `a98ef5d70022f3b36c1d70f5edd73f20061a1732`
finds exactly one changed source-fingerprint entry, for
`tests/material-parity/input-equivalence-audit.mjs`. Restoring that fingerprint
in a detached comparison object makes the complete survey deep-equal to the
baseline. The current fingerprint is independently checked against current
source bytes, as are all other survey source fingerprints.

This explains the assertion mismatch; it is not enough by itself to justify a
receipt refresh. The read-only diagnostic therefore executes the original
browser verifier with only its output sink redirected to stdout. Its source
and browser assertions remain intact, and AST checks verify that import
relocation changes no other statements. It checks all 32 original dialog
captures and six browser controls, then independently reloads the existing gap
membership proof.

The fresh CSSOM result is completely unchanged except for the parent digest
and the recorded browser version: saved Chrome **152.0.7977.76**, fresh Chrome
**152.0.7977.84**. Those fields are recorded explicitly, not hidden as a passing
historical environment match. Both pending groups and all **64 observations**
deep-equal the original binding, including their unresolved-motion limitations.
Seven mutation controls reject changes to original membership, captured rule
text, scalar evidence, tree identity, computed browser results, case order and
assertion status.

See the [machine-readable receipt](material-motion-parent-receipt-diagnostic.json)
for exact hashes. This proves a stale dependent receipt, not original resolved
motion, candidate computed gaps, renderer causality or rendering equivalence.

## Verification and setup corrections

```text
node scripts/diagnose-material-motion-parent-receipt.mjs
node scripts/diagnose-material-motion-parent-receipt.mjs --check
```

Generation and the independent no-write replay both exited **0**, each with
six fresh browser controls, 32 original cases, 64
conserved pending observations and seven rejection controls. The diagnostic
checks that the original survey, CSSOM receipt, binding, verifier and canonical
audit files are byte-unchanged. The original failing assertion remains intact.

Two setup failures were corrected before this successful replay: the first
selected an earlier baseline whose CSSOM receipt predated a prior documented
parent refresh; the second resolved a bare package import via its CommonJS
entry instead of preserving the package's ESM resolution. The final diagnostic
uses the binding's own baseline and relocates relative imports only. Neither
correction changes proof expectations or production files. Logs are retained:

- `artifacts/material-parity/field-host-flow-input-audit/motion-parent-receipt-diagnostic-initial-baseline.log`
- `artifacts/material-parity/field-host-flow-input-audit/motion-parent-receipt-diagnostic-initial-import.log`
- `artifacts/material-parity/field-host-flow-input-audit/motion-parent-receipt-diagnostic.log`
- `artifacts/material-parity/field-host-flow-input-audit/motion-parent-receipt-diagnostic-check.log`

## Required correction after the original full run is terminal

Run the unchanged CSSOM verifier normally to refresh its parent/browser receipt,
then regenerate the dependent pending-motion binding and run its two original
tests. Require complete conservation of the original cases, controls, binding
rows and conclusions, with only the demonstrated receipt fields changing.
Do not change selected inputs while the original full-harness run is live.
Then run the complete current harness; this diagnostic is not a repaired-test
pass or full-suite acceptance.
