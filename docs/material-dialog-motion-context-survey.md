# Dialog motion: original-state reference replay

This reference-only supplement investigates the two dialog-panel gap groups
whose original authored transition longhands are empty. It preserves those
original values and observes the browser's actual resolved motion in a fresh
replay; it does not silently replace the original scalar evidence.

## Coverage and binding

The [machine survey](material-dialog-motion-context-survey.json) covers all
**32 original cases**: four profiles (light, dark, contrast, custom), desktop
1440 × 1000 at DPR 1 and 2, and `activate`, `activate-leave`, `open` and
`open-hover-content`. These are the exact original case IDs behind the two gap
groups / **64 observations**, not an inferred or reduced cross product.

The producer reuses eight exact action/theme/settlement functions extracted from
the existing harness. Chrome **152.0.7977.76** loads the frozen original runtime;
document, script, stylesheet and font bytes are checked against the checkpoint.
Each fresh dialog owner reproduces the original structural mapping, all **89**
scalar values and original candidate style-stage proof. The independent reader
checks **2,848 original scalar values**, exact case membership, checkpoint and
tree hashes, source/function hashes, motion/tree consistency and owner ancestry.
The candidate is not replayed or reinterpreted as computed browser values.

## Observed result

Every fresh settled dialog surface has:

- `transition-property: none`, duration and delay `0s`;
- `animation-name: none`, duration and delay `0s`;
- no active animation whose effect targets that surface;
- an empty computed `--mat-dialog-transition-duration` value and no ancestor
  with a nonempty inline declaration of that variable.

This establishes the fresh resolved reference motion in those original-state
replays. It supports excluding an active **reference surface** transition as an
explanation at this capture boundary. It does not rule out descendant motion,
earlier transient behavior, candidate behavior, or geometry/paint defects.

The [CSSOM proof](material-motion-cssom-capture-proof.md) remains relevant:
empty authored longhands alone could not establish this result. Here the result
comes from the browser after the original actions and settlement, not a regex,
an assumed default, or a custom cascade resolver. Fresh context is not represented
as a historical value that the original capture never recorded.

Canonical gap attribution, exact canonical membership binding and original
candidate computed/used-gap questions remain open. No renderer, comparison
input or canonical classification changes; **2,438** groups remain unresolved.

## Verification

```powershell
node scripts/capture-material-dialog-motion-context.mjs --base-url=http://127.0.0.1:4431 --checkpoint=artifacts/material-parity/current-ancestry-audit/checkpoint --output=artifacts/material-parity/dialog-motion-current-ancestry-audit
node scripts/audit-material-dialog-motion-context.mjs
node scripts/audit-material-dialog-motion-context.mjs --check
node scripts/check-material-dialog-motion-context.mjs
```

The producer completed in session **11831**, exit **0**, all 32 cases. Generation,
no-write replay and independent controls each exit **0**. The **21 negative
controls** reject incomplete/duplicate coverage, wrong browser/source/action
provenance, omitted properties, changed state/DPR/assets/scalars/ownership,
inconsistent motion, truncated ancestry and upgraded historical/candidate/parity
claims. Two additional in-memory controls preserve and count a different motion
observation rather than normalizing it to the expected result. Original evidence
files are not modified by these controls.

These standalone scripts were added after the full 91-file harness started at
`52ec632`. Their results are separate; they are not added to that run's totals.
The complete enforced parity matrix and broader audit remain outstanding.
