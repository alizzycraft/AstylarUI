# Historical explicit-gap conservation correction

The original full harness failure and its
[independent diagnosis](material-explicit-gap-later-conservation.md) are
preserved. The test compares the current builder with revision
`3abdb781279462cd1ca1a78e8cf2b6cdc618f3b5`, before later caret reviews. Its old
unrelated-row assertion did not account for nine subsequently verified caret
metadata changes.

The corrected test invokes the existing source-replaying caret conservation
boundary before excluding **exactly nine signatures / 332 observations** from
its unrelated-complete-row comparison. It does not exempt a property, arbitrary
attribution name, or family. The helper verifies original scalar/raw fields,
complete source membership, exact review evidence and false parity claims, and
preserves unresolved caret rows. The test additionally pins the independently
diagnosed complete-row count and digest.

## Verified result

The original test now passes in **698,451.2773ms**:

- All 296 original cases and 892 ordered scalar rows unchanged.
- Original explicit-gap findings retained: 16 groups / 1,032 observations.
- Exactly nine source-bound later caret groups / 332 observations accounted for.
- 184 pending caret observations remain unpromoted.
- All 867 other complete rows deeply unchanged; digest
  `148228a933f26e3b3e1ff6604bd175717194c4cbd57012f463fe8d1d70f1704b`.
- Original explicit-gap validator rejection checks still execute.

The unchanged shared helper's separate regression suite passes **3/3** in
1,301.6343ms, including 18 changed-membership/raw-field/pending-claim mutations
and three missing/forged-source-binding controls.

```text
node --test --test-concurrency=1 tests/material-parity/explicit-gap-canonical-integration.spec.mjs tests/material-parity/gap-review-canonical-integration.spec.mjs
node --test tests/material-parity/later-caret-integration-conservation.spec.mjs
```

The first command is a sequential two-file replay. Both children are now
terminal and passed: **2/2**, zero failed/skipped/cancelled/TODO, in
**2,264,725.0812ms**. The [gap-review result](material-post-full-gap-review-repair.md)
records its separate conservation boundaries. Log:
`artifacts/material-parity/field-host-flow-input-audit/post-full-gap-conservation-correction.log`.

No renderer, reference, fixture, normalization or canonical attribution changes.
Canonical source fingerprints require refresh after these audit-test edits;
complete current-harness and enforced rendering verification remain outstanding.
