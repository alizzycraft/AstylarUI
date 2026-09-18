# Leaf font-family classification membership

The [proposal](material-leaf-font-family-attribution-plan.json) joins the existing
[independent family-stage proof](material-leaf-font-family-stages.md) to all
8,339 complete rows of the frozen canonical audit at `06e50db`. The entire
compressed and decoded payload is authenticated, not sampled.

Of the **152 original leaf observations**, **56** belong to four already
reviewed static groups. Those remain unchanged. The remaining **96** belong to
four unresolved interactive groups: badge-label, card-copy, divider-above and
divider-below. All **8,335 other complete rows** are conserved in order, including
the earlier static findings with the same scalar values.

The proposal explains a measurement-stage difference: the local candidate
declaration omits font-family, while both authored inheritance paths and the
retained core-text family match the reference computed stack. It does not add a
local font override, synthesize a missing declaration or establish physical font
selection, fallback/loading, glyph raster, layout or whole-element equivalence.
Stepper content remains excluded because its reference component font token is
a different authored dependency.

This is a separately reviewed proposal, not part of the earlier seven-set
134-group integration. No canonical classification or renderer input changes
follow from generating it. It must be integrated with independently replayed
membership, precedence and conservation checks.

## Reproduction

```text
node --max-old-space-size=1024 scripts/audit-material-leaf-font-family-attribution.mjs
node --test --test-concurrency=1 tests/material-parity/leaf-font-family-attribution.spec.mjs tests/material-parity/leaf-font-family-stages.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation exits 0, with report SHA-256
`083fcfd56f2827be28c722540197a46e6bec3817ae17926e67c538dc920056f9`.
Other complete rows' ordered-row-digest SHA-256:
`37ee9529e98b793f18524666690e7860c350ba9d8198a0ad64e6e178e56fae44`.

Focused source/join/inventory tests pass **10/10**, exit **0**, zero failed,
skipped, cancelled or TODO, in **94,122.3334ms**. The unchanged source suite
also retains its 560 mutation controls and independent stepper exclusion.

The focused command independently checks the full source/canonical replay with
filesystem writes prohibited. Small synthetic membership projections exercise
30 rejection controls for missing/changed observations, incorrect retained
family, input/tree/state changes and overwritten prior classifications; these
small projections are not a substitute for the full replay.

Logs: `artifacts/material-parity/field-host-flow-input-audit/leaf-font-family-attribution-generation.log`
and `artifacts/material-parity/field-host-flow-input-audit/leaf-font-family-attribution-focused.log`.
