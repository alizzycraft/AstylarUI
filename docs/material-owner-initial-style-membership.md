# Exact original membership for the remaining default-style groups

The [machine binding](material-owner-initial-style-membership.json) resolves the
case-count ambiguity identified by the [600-group survey](material-owner-initial-style-survey.md).
It changes no canonical attribution, scalar value, renderer or comparison input.

All **600 unresolved groups** now have exact original case lists:

- **31,508 unresolved occurrences** remain assigned to those groups.
- **636 previously reviewed static occurrences**, across **51 split groups**,
  retain their independent `reviewed-stage-mismatch` evidence.
- Together these conserve all **32,144** raw observations from the survey.

The binding reads the complete canonical discrepancy array, checks the original
capture digest, and replays static retained typography through the existing
`collectFullTreeInventory` and `collectRetainedTypographyEvidence` readers. It
mirrors the narrow static-only `classifyReviewedTypographyStage` guard; the
owning source files are fingerprinted. It checks exact canonical occurrence
counts, ordered sample lists, state lists and the existing retained witness.
For each raw signature, only an unresolved group and its demonstrated static
stage sibling are accepted. Any different or duplicate competing classification
requires new review and fails the binding.

This is stronger than subtracting a count or dropping all static cases: each
preserved observation must independently reproduce its actual text-owner and
retained-value evidence. Normal/effective omissions remain omissions. Removing
undefined object entries from the small retained witness only reproduces normal
JSON serialization; `null` or explicit values are not treated as omission.

The distinction is especially important for `badge-label/fontStyle`: the 12
reviewed static cases are not the same evidence as the 40 unresolved interaction
cases. Divider has 16 static cases; a hardcoded twelve-case subtraction would
also have been wrong. The complete lists are retained without sampling.

## Verification

```powershell
node scripts/audit-material-owner-initial-membership.mjs
node --test tests/material-parity/owner-initial-style-membership.spec.mjs
node scripts/audit-material-owner-initial-membership.mjs --check
```

**4/4 tests pass**, zero failures/skips/cancellations, **8,031.6821 ms**.
Fifteen negative mutations cover missing/duplicate cases and scalar owners,
altered counts/samples/states, competing classifications, changed source
digests, wrong text, missing stage provenance and fabricated retained values.
The final test runs the full no-write `--check` replay.

This standalone proof does not certify computed-style or rendering equivalence,
does not resolve any of the canonical **3,138 unresolved attributions**, and is
not yet part of the 39-file harness. Generated-owner mapping and property/state
requests remain the next review before broader canonical integration.
