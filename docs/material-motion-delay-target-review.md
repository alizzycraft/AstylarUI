# Motion backlog: same-owner delay/target evidence

The [machine review](material-motion-delay-target-review.json) revisits all
35 groups / 2,546 observations retained by the earlier
[motion-target review](material-owner-initial-motion-review.md). It freshly
replays that entire parent proof, authenticates its saved bytes, and preserves
every group's original membership and proof identity.

## What the additional evidence establishes

Twelve tab-label groups (840 observations) have captured transition target
declarations that name only properties outside the eight audited initial-style
properties. Some states also include a separate `transition-delay: 100ms` rule
on the active label. That rule supplies timing, not a new target. The review
requires explicit, active, unconditional target declarations on the **same
captured node**; it never borrows a parent's transition target.

The original check required each motion rule to contain its own target. That
was conservative, but it left these labels pending because the active-state
delay is declared separately from `transition-property: color` and the
no-animation `transition-property: none` rule. All captured alternatives are
retained. This review does not select a cascade winner or claim motion is
inactive. The timing/target distinction follows
[CSS Transitions Level 1](https://www.w3.org/TR/css-transitions-1/#transition-delay-property).

| Population | Groups | Property observations | Disposition |
| --- | ---: | ---: | --- |
| Tab overview/activity labels | 12 | 840 | Captured same-owner target sets are disjoint |
| Chip hosts | 16 | 1,216 | Duration-only transition and animation metadata remain unresolved |
| Tab content panel | 7 | 490 | Empty captured transition values remain unresolved |

The original 86-group proposal is unchanged. These twelve additional groups are
not yet canonically attributed. No saved canonical classification, renderer,
plugin, comparison input or browser reference is modified.

## Limits and next action

This is evidence about captured declarations, not a substitute CSS cascade.
External inheritance, runtime animation state, candidate computed values,
indirect effects and current raster remain unproved. Raw omitted candidate
declarations stay omitted; there is no normalization to invented initial values.

Before integrating an observation-stage classification, join these twelve
groups to the exact current canonical rows and independently conserve all
other rows. The remaining 23 groups need further evidence; neither short
duration nor a class named `noopable` justifies treating them as equivalent.

## Verification

```text
node --max-old-space-size=1536 scripts/audit-material-motion-delay-targets.mjs
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/motion-delay-target-review.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation exits 0 with 12 reviewed groups / 840 observations and 23 retained
groups. Machine-report SHA-256:
`cbaa92d9fc5900bb7a0efc6b8f99a9ee0d3fde3edd0c1080840fc9ddd4c4ddd4`.
The full test run passes **7/7**, exit 0, **34,498.3585ms**, with no skips,
cancellations or TODOs. Coverage includes same-owner witnesses, immutable
inputs, 26 rejection controls, complete parent replay with writes prohibited,
and full harness discovery/runner checks. Logs are
`motion-delay-target-generation-sep20.log` and `motion-delay-target-full-sep20.log`
under `artifacts/material-parity/field-host-flow-input-audit/`.
