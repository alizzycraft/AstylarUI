# Radio group: inline flow replaced by absolute placement

The complete 68-case `radio-primary` position population has a static inline
reference group containing two static inline Material radio-button hosts.
The candidate uses a relative group with absolutely positioned options:
40-pixel height, top -10 pixels, left 0/73 pixels and width 68/80 pixels.
All 68 captures preserve those option-placement inputs at their corresponding
normal, interaction and effective positioning stages.

This is an **application/plugin authoring defect** in the comparison: the first
divergence is the requested option layout, before renderer layout/projection.
It is not a claim that relative positioning alone is wrong or that an existing
core bug explains the discrepancy. The separate radio/checkbox label-position
rows remain pending: their relative positioning plus z-index requires its own
paint/ownership analysis and is not automatically covered by the host proof.

History matters here: `git show 2f44011:examples/material-showcase/src/app/astylar.component.ts`
already contains the relative group and absolute option offsets. Unlike the
stepper's documented later rewrite, this is an original alternate composition,
not proven to be a subsequent parity fix. Current rules are at lines 491–503,
and option composition at 935–937 of the same source.

`material-radio-position-substitution.json` retains all case identities, original
row digest, authenticated full-tree receipts and focused proofs. Canonical
integration remains pending. `node tests/material-parity/radio-position-substitution.mjs`
generates it; `node --test tests/material-parity/radio-position-substitution.spec.mjs`
passed 2/2, exit 0, 667.5269 ms. Four negative controls reject altered reference
flow, candidate ownership, normal-stage positioning and offsets.

The implementation reduction should exercise equivalent inline option hosts,
their intrinsic sizes, labels and interaction descendants. Investigate any core
flow or hit-test failure there before removing the absolute composition. Do not
replace the existing offsets with another set of screenshot-specific constants.
