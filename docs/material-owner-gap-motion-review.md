# Owner gap motion declarations: property-local review

## Provenance replay after explicit-spacing integration

The production integration in `7cc8e93` advances the parent gap survey's audit
source receipt. The existing motion generator and its `--check` replay both
exit **0** against that current parent, reproducing all **34 groups / 1,784
observations**, **two positive / 21 negative controls**, 32 locally non-gap
target groups and two remaining review groups. A complete object comparison
against the prior report confirms that **only `parent.sha256` changed**;
restoring that one descriptor reproduces the prior evidence SHA-256
`7c0c95fe48c88262d9e850a809ab988690b4c464b0a98e411836194707266662`.

```powershell
node scripts/audit-material-gap-motion-requests.mjs
node scripts/audit-material-gap-motion-requests.mjs --check
```

The retained combined motion/layer replay log is
`artifacts/material-parity/field-host-flow-input-audit/explicit-gap-motion-layer-provenance.log`,
SHA-256 `4bcc16543f3273fcb2380fcc6a48665f58192daf7bdbd2be7e7e0cc7458d8ace`.
The original trees, values, memberships, dispositions and canonical audit files
are unchanged. This refresh does not promote local target observations into
resolved motion, candidate computed gap, input equivalence or rendering proof.
Canonical integration of these groups and the complete audit remain pending;
the saved overall canonical snapshot still has **2,330 unresolved groups**.
The older counts below describe their recorded historical checkpoints.

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

The subsequent [original-state dialog replay](material-dialog-motion-context-survey.md)
now supplies fresh resolved reference motion for all 32 cases: transition target
and animation name `none`, with no active owner animation. It verifies all 89
original owner scalars per case and remains distinct from the original unrecorded
motion values, candidate computed behavior and canonical attribution.

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
