# Owner gap motion declarations: property-local review

The [machine report](material-owner-gap-motion-review.json) reviews all **34**
motion-only groups from the [gap survey](material-owner-gap-input-survey.md):
**1,784 property observations across 676 distinct original cases**. The verifier
reopens hash-bound original trees and raw scalar inputs, validates the parent
survey's source fingerprints, and reproduces each complete per-group proof hash.
It does not extrapolate from the first witness to the other states.

## Findings

- **32 groups / 1,720 observations:** the captured local transition declarations
  name only `none`, `transform`, `box-shadow`, `border` or `opacity`; any captured
  animation declarations explicitly name `none`. Candidate local gap/motion
  requests remain absent in all three captured stages.
- **Two dialog-panel groups / 64 observations:** all five transition longhands
  are empty in one captured rule. Keep these unresolved; another rule saying
  `transition: none` is not by itself a verified cascade calculation.

This narrows a review question: the first 32 groups do not name a direct gap
target in their captured local motion declarations. It does **not** prove motion
is disabled, candidate computed values, equivalent component structure, used
spacing or matching animation/rendering. Border/transform motion can still
change output indirectly. No omitted candidate value is replaced with zero.
The explicit-gap chip groups are outside this motion-only subset and retain
their own motion declarations in the parent report.

The two remaining groups expose a capture-stage limitation. Their original
reference rule retains this shorthand in `cssText`:

```css
transition: transform var(--mat-dialog-transition-duration, 0ms) cubic-bezier(0, 0, 0.2, 1);
```

The enumerated longhand declaration fields are empty. The shorthand must not be
discarded or guessed from those empty fields. The separate
[browser proof](material-motion-cssom-capture-proof.md) now reproduces that
boundary in six cases and verifies all 32 original dialog captures; it is not a
renderer failure attribution.

## Verification and limits

```powershell
node scripts/audit-material-gap-motion-requests.mjs
node scripts/audit-material-gap-motion-requests.mjs --check
```

Generation and full no-write replay both exit **0**. Each run checks two positive
and **21 negative** controls: gap/all/reset/unknown targets, named animations,
missing targets, unresolved variables, empty declarations, scalar-rule gaps,
candidate-stage requests and unsupported equivalence claims. Every original
proof hash and observation count matches. Canonical manifest, payload and human
report hashes remain unchanged across execution.

This is a separate audit-only script added after the 91-file harness started at
`52ec632`; its checks are not represented as part of that run. Canonical
integration, exact canonical membership binding and the remaining root-cause
work are still required. The canonical unresolved count remains **2,438**.
