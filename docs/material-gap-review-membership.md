# Remaining gap reviews: original canonical membership

The [machine binding](material-gap-review-membership.json) joins the existing
[motion review](material-owner-gap-motion-review.md) and
[scalar-layer capture-loss review](material-gap-scalar-rule-loss.md) to their
complete original canonical memberships. It reuses both original full-tree
verifiers and the original canonical join; it does not implement another
composition review, CSS parser or cascade calculation.

| Existing evidence | Groups | Property observations | Retained conclusion |
| --- | ---: | ---: | --- |
| Local motion targets | 32 | 1,720 | Captured declarations do not name a direct gap target; resolved motion and indirect effects are not established. |
| Empty dialog transition longhands | 2 | 64 | `requires-review`; original absent computed motion is not filled from a fresh replay. |
| Overlay scalar-layer rule loss | 4 | 118 | Confirmed scalar capture omission of a layered z-index rule, not a demonstrated gap-layout or overlay-rendering cause. |
| Total | 38 | 1,902 | 676 distinct original cases; no input/rendering equivalence claim. |

Every property observation retains its original case, state, scalar-input hash,
reference `normal`, omitted raw candidate longhand **and shorthand**, and both
input-tree descriptors. Complete ordered membership, canonical display samples,
state lists and per-group proof digests match the original join. The motion
patterns cover every case exactly once; no first-witness extrapolation replaces
the existing full-tree proof. Scalar-loss review objects are additionally
rechecked with the existing `reviewGapScalarRuleLoss` function.

The canonical row hashes refer explicitly to historical revision
`2408285b0a3cff2a6366825bb9dee214758bf91d`, the established source of the original
gap join. Its original compressed payload is reopened and validated by
`loadGapJoinInputs`, using the original production normalization functions.
The saved current join is compared with that complete replay. This binding is
**not** a claim that new classifications are integrated into the current audit.

## Verification

```powershell
node scripts/bind-material-gap-review-membership.mjs
node scripts/bind-material-gap-review-membership.mjs --check
node --test tests/material-parity/gap-review-membership.spec.mjs
```

Generation and no-write replay both exit **0**, each with 38 groups, 1,902
observations, 676 cases and unchanged canonical files. Both invoke the existing
motion and scalar-layer no-write verifiers, preserving their 21 and 17 negative
controls respectively. The generation output is retained in
`artifacts/material-parity/field-host-flow-input-audit/gap-review-membership-generation.log`.

The two focused tests pass **2/2**, exit **0**, no skips, failures, cancellations
or todos, **19,657.9732 ms**. They compare the full generated binding and reject
**22** mutated populations/provenance/membership/value/disposition/claim inputs.
Controls include missing or duplicate groups, reordered cases, missing motion
pattern coverage, upgrading unresolved dialog motion, changed raw shorthand,
altered scalar-loss proof/tree ownership and fabricated equivalence.

## Owning-boundary follow-up and limits

### Bounded classifier preparation

`tests/material-parity/gap-review-classification.mjs` now consumes this verified
membership without changing production audit precedence or the canonical report.
It attributes 1,720 local-motion observations to the unequal observation-stage
boundary and 118 overlay observations to the original scalar capture defect.
The 64 unresolved dialog observations return no classification. All six
equivalence/computed-value/used-gap/rendering/cause flags remain false.

The classifier is not an independent authenticator: its future production
consumer must replay source authentication and enforce complete coverage before
using any finding. The focused test already reopens the original capture,
checks its full hash, and replays the original full-tree membership verifiers.

```powershell
node --test tests/material-parity/gap-review-classification.spec.mjs
```

Result: **2/2 pass**, no failures, skips, cancellations or todos;
**20,987.2655 ms**. Every one of the 1,902 observations is checked, including
the unresolved population. The second test rejects **34** altered inputs across
the two attributable kinds. Stage mutations rehash the changed input to ensure
that the declaration guards independently reject them rather than merely
failing a stale hash. The retained log is
`artifacts/material-parity/field-host-flow-input-audit/gap-review-classification-focused.log`,
SHA-256 `e53fc5689ee6ede1f0e22fc002d1b6e70a9b118cc7ee602f9556786fe7fb37ac`.

### Remaining work

1. Consume the local-motion evidence as a bounded observation-stage finding,
   retaining the authored transition/animation requests. Do not equate missing
   candidate declarations with browser-computed gaps or waive animation parity.
2. For the two dialog groups, separately bind the existing CSSOM substitution
   proof and fresh original-state motion replay. Preserve the distinction
   between original values and newly observed context before assigning the
   appropriate capture-stage classification.
3. Correct scalar grouping-rule capture in its shared harness owner during a
   later implementation phase, then recapture separately. The missing z-index
   declaration must not be retroactively inserted into the original inputs.
4. Integrate these findings with independent source/coverage validation and
   current production precedence/conservation checks. The new spec must enter
   the next full current harness inventory, not be added to an earlier run's
   counts. The complete enforced parity matrix is still required.

No production renderer, plugin, comparison fixture, reference, threshold or
canonical classification changed. The saved canonical snapshot still has 2,330
unresolved groups; this supplement does not silently reduce that count.
