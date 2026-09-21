# Positioning canonical transition

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
