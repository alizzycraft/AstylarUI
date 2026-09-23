# Positioning canonical transition

## September 24: completed scalar/control conservation

The v2 export finished; its terminal log retains the expected audit rejection
for **1,668 unresolved** signatures. This is a completed export, not an accepted
input-equivalence audit. The existing conservation CLI now passes against its
authenticated predecessor and current package:

`node --max-old-space-size=1536 scripts/check-material-position-canonical-conservation.mjs`

Exactly six groups / 316 observations change classification. All **8,477 other
complete scalar rows** remain identical, with total rows unchanged at 8,483.
The unresolved count moves from 1,674 to 1,668. All control evidence is conserved
except the **48** anticipated normalization producer-receipt transitions.
Current ordered scalar-row digest:
`1c715f91bdc4dc40781976278570c5e51873081bfdd221f5a39b7d5353fbeb2a`.

Current compressed digest:
`7ee36a2c3716d39b0194e5c1e2dead7ef5ae3786f8724dd70814a38e37d6cc69`;
decoded digest:
`dd44f6b5597014617876fa21d8d144adf7451a3a17a4438c6f95384da6005d00`.
Source receipts are historical: the later workflow optimization changes twelve
of the 424 normalized source fingerprints. This conservation pass does not
silently refresh them or establish current-builder freshness or rendering parity.

The authenticated whole-package section comparison completed: **76** current
sections, one added (`positionAuditInputs`), eight changed, none removed, and
**67 identical**. Changed sections are `sourceFingerprints`, `controlLineBoxes`,
`summary`, `discrepancies`, `ownerCaretInputs`, `reviewedSourceBatchInputs`,
`controlTypography` and `focusedProofs`. The scalar/control comparator above
accounts for discrepancies and control typography. Subsequent complete
field-level comparison accounts for the other six changed sections:

- `sourceFingerprints`: exactly the fifteen independently enumerated position
  files are prepended; all 409 old paths retain their order. Six existing hashes
  change, matching the reviewed `9a4a234` producer, source-verifier/import,
  visibility-transition and assertion edits. This historical transition is
  separate from the later twelve stale current-worktree receipts.
- `controlLineBoxes`: only 48 `normalizationReconciliation.currentModuleSha256`
  values change from `4ac2017e...` to `345051b8...`, the exact producer transition
  already checked by the scalar/control comparator.
- `summary`: authoring-defect groups +6, harness-defect groups -6, unresolved -6;
  no other summary field changes.
- `ownerCaretInputs`: one complete-source current-module receipt changes by the
  same producer transition; every other field is identical.
- `reviewedSourceBatchInputs`: only that current-module receipt and the derived
  current motion-report digest change. Fresh `replayReviewedBatchMotion()`
  independently reproduces digest
  `7bf064c1eff89930d1f1865be69eeb8dc2db286868d8dddd2891d839e7846373`,
  checks all twelve reachable mapping declarations and conserves all non-receipt
  motion evidence (121 groups / 7,254 observations), plus delay replay.
- `focusedProofs`: exactly 34 line references shift after the 17-line position
  inventory insertion; no proof text, file, status or membership changes.

The added `positionAuditInputs` section was extracted from the authenticated
package and passed `validatePositionAuditInputs` against **cold** current source
replay: all six groups / 316 observations and the complete serialized section
match, not just its counts. The export is retained as a verified historical
classification checkpoint. It must not be labelled current-source acceptance;
the next coherent integration needs source/proof inventory reconciliation,
fresh export/check and the applicable final gates.

## Original transition procedure

Producer wiring is committed in `9a4a234`; `dbb0dc2` removes a trailing blank
line in its transition helper. The first regeneration was intentionally stopped
early to make that formatting correction before capturing source receipts.
Its log is retained as `position-canonical-regeneration-v1.log`; the final-source
run uses `position-canonical-regeneration-v2.log`. Neither is accepted evidence
until terminal validation and conservation have been inspected.

The pre-position baseline is preserved at
`artifacts/material-parity/pre-position-e62e846`. All three files were individually
hash-verified against the accepted canonical version. Its decoded payload digest
is `287ebb396d68ab064dca40a0c372879e8a0c3fd2c7f56498110577615bd430a2`.

After regeneration finishes, run:

```powershell
node --max-old-space-size=1536 scripts/check-material-position-canonical-conservation.mjs
node --max-old-space-size=1536 scripts/material-audit-section-digests.mjs artifacts/material-parity/pre-position-e62e846 docs
```

The first command authenticates both whole decoded payloads and independently
replays the six source-backed classifications against complete prior rows.
It verifies serialized predecessor integrity, exact ordered current-row equality,
six changed groups / 316 observations, and preservation of every other complete
scalar record. In control typography, only 48 authenticated producer-source
receipt updates are permitted; all other control evidence must remain identical.
The second command identifies changes elsewhere in the report, which require
separate explanation and validation. Neither command proves rendering parity.

Comparator verification:
`node --max-old-space-size=1536 --test tests/material-parity/position-canonical-conservation.spec.mjs`
passed **2/2**, zero skips, **968.3546 ms**. Ten negative controls reject lost or
reordered rows, changed inputs, missing control evidence, changed comparison
text, forged receipts and duplicate cases; inputs are not mutated. These are
comparator tests, not a claim that pending canonical regeneration has passed.
