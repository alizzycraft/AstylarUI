# Pending dialog motion: original capture-loss binding

This [machine binding](material-pending-motion-capture-binding.json) connects the
existing [CSSOM browser proof](material-motion-cssom-capture-proof.md) to the
complete original memberships of the two remaining dialog-panel gap review
groups: **32 cases / 64 property observations**. It reuses the original full-tree
and canonical membership verifiers and all six browser controls. It does not
implement a CSS parser, cascade resolver or replacement layout calculation.

## What is demonstrated

For every original mapped dialog surface, the scalar authored-rule record has
five empty enumerated transition longhands and omits the rule's complete text.
The corresponding original full-tree record retains the variable-containing
transition shorthand. The isolated browser controls demonstrate why empty
longhands cannot establish absent motion or its resolved targets.

The bound finding is **a harness capture/interpretation defect**:
`original-pending-transition-shorthand-capture-loss`. Its owner is the shared
scalar authored-rule collector and interpretation of pending CSS shorthand
substitution. The appropriate later instrumentation fix is to preserve complete
rule text and record browser-resolved motion/custom-property context when that
context is required. Do not infer a target by inspecting only the leading word
of a variable-containing shorthand.

## What remains uncertain

This finding does not establish the original resolved transition, custom
property value, active animation or candidate computed/used gap. Every row
retains the original `requires-review` motion disposition. All equivalence,
computed-value, used-gap, rendering and renderer-cause flags remain false.
There is no assertion that the capture loss caused a layout or visual defect.

The [fresh reference replay](material-dialog-motion-context-survey.md) is a
separate observation at a later capture boundary. Its values are deliberately
not inserted into this original-data binding. No original scalar, tree, fixture
or canonical attribution was rewritten.

## Authentication and verification

The loader replays the complete existing membership proof, checks all dependency
hashes and compares the browser proof with its committed original, allowing only
the independently replayed parent-receipt hash to advance. It then runs the
unchanged browser verifier with `--check`. Each original case retains both tree
descriptors, the whole scalar-input digest, original canonical row/proof hashes,
mapped reference owner, rule source, full captured text and empty longhands.

```powershell
node scripts/bind-material-pending-motion-capture.mjs
node scripts/bind-material-pending-motion-capture.mjs --check
node --test tests/material-parity/pending-motion-capture-binding.spec.mjs
```

Generation and no-write replay both exit **0**, each reporting two groups,
32 cases, 64 property observations, six browser controls and unchanged canonical
files. The focused tests pass **2/2**, exit **0**, with no failures, skips,
cancellations or todos, **22,842.6568 ms**. Seventeen negative controls reject
changed or missing case memberships, trees, rule text, longhands, source owner,
scalar-text retention and fabricated claims. The proof loader also preserves
the existing motion and scalar-layer review controls rather than replacing them.

The subsequent no-write replay also exits **0**. A retained focused test run
passes **2/2**, exit **0**, no failures, skips, cancellations or todos,
**21,922.0503 ms**. Its log is
`artifacts/material-parity/field-host-flow-input-audit/pending-motion-capture-binding-focused.log`,
SHA-256 `205c5edef8b6c684c5fc8899e2d1772d85802949f86d91bd9cec8a0c08b3c44a`.
The dependent CSSOM report was replayed against the current survey; only its
parent receipt changed. Comparing the complete object with `3ebcff3` after
restoring that one hash preserves every original case, browser result and
conclusion. The new binding records the current source hashes rather than
retroactively changing the original captured motion context.

This is source-bound preparation for a bounded capture-stage attribution.
Production classification, complete classification coverage, prior/current
conservation, the full current harness and enforced parity remain separate
requirements. The saved canonical report remains the 2,330-unresolved snapshot.
