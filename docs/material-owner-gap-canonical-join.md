# Owner gap evidence: exact canonical membership

The [machine join](material-owner-gap-canonical-join.json) binds all **162**
unresolved gap groups in the saved canonical audit at
`2408285b0a3cff2a6366825bb9dee214758bf91d` to the
[original-capture survey](material-owner-gap-input-survey.md). It accounts for
**9,254 property observations** across **2,311 original cases**. This closes the
membership question left by the survey's count-only comparison; it does not
change classifications or establish equivalent inputs or rendering.

## What is verified

- The actual saved compressed canonical report is read from Git and checked
  against its manifest hash and byte count, rather than reconstructed with a
  newer report builder. All 8,339 discrepancy groups are traversed.
- All 2,311 original cases are reopened from the hash-checked capture. The
  production comparison's seven normalization functions are extracted unchanged
  and their source digest verified. No independent gap normalizer is introduced.
- Each group's complete ordered case membership, occurrence count, ordered
  states, and canonical first-12 sample agree. Every case's paired input-tree
  descriptors also agree with the source-bound survey.
- Every observation retains its original scalar-record digest and raw reference
  and candidate fields. **1,032** observations omit the separate candidate
  longhand while supplying a `gap` shorthand. Their raw omissions are not
  rewritten as zero or absence of a spacing request.
- Each joined group records the exact canonical-row and survey-group hashes,
  plus the existing original declaration/tree proof digest. The latter proof
  remains a separate required replay, not a conclusion inferred from membership.

## Verification

```powershell
node scripts/check-material-owner-gap-canonical-join.mjs
node scripts/audit-material-owner-gap-canonical-join.mjs --check
```

Both commands exit **0**. The checker reproduces the saved report and rejects
**21** mutations covering removed or duplicated groups/cases/observations,
changed sample/order/state/count, invented membership, altered tree descriptors,
changed gap values, and unsupported equivalence or attribution upgrades. It
also hashes all three current canonical audit files before and after execution;
none change. Full no-write regeneration independently matches the saved JSON,
including the generator's source fingerprint.

These standalone checks were added after the current 91-file harness began at
`52ec632`; they are not counted as part of that running test inventory.

## Remaining work and ownership

The canonical unresolved count remains **2,438**. This join proves provenance
and membership, not CSS semantics. Local omission, computed defaults, motion,
formatting context, wrapper/margin composition and used gap behavior remain
separate questions. The motion and chip-history supplements retain their own
evidence and limitations. Any subsequent canonical attribution must consume
those proofs and preserve unrelated findings. Renderer fixes and comparison
rewrites are outside this audit increment.
