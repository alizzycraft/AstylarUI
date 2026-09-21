# Tabs: border and positioned-strip substitution

The complete 70-case `tabs-primary` position population is reviewed in
`material-tab-position-substitution.json`. Each record retains authenticated
reference/candidate tree receipts, case identity, reference border owner,
candidate baseline/indicator values, and explicit non-equivalence flags.

The reference outer tab group is static. Its label-container descendant has a
solid one-pixel bottom border in every capture. The candidate outer group is
relative and has direct absolute children `tab-baseline` and `tab-indicator`.
The baseline is painted as a background strip rather than the reference border.
Its height falls to 0.67 px in three captured mobile cases even though the
reference border remains 1 px. Indicator width is explicitly 50.7%, 51%, or
51.9%, selected by viewport rules rather than the measured selected-tab box.

Classification: **application/plugin authoring defect**, with first divergence
in border/indicator ownership before renderer layout. This is not a claim that
the static/relative keyword alone proves a defect. The containing owner,
separate absolute children and original border request establish the mismatch.
Canonical attribution is unchanged until separately integrated and verified.

## History and ownership

Current source is `examples/material-showcase/src/app/astylar.component.ts`,
lines 725–737 and 974. Initial commit `2f44011` already used a relative group and
absolute 50%-wide indicator, so that structural choice is not itself evidence of
a later repair. The diff of `2f14e60` adds mobile density/typography/theme-specific
baseline and indicator offsets and thicknesses, including 0.67-pixel baseline
and 2.67-pixel indicator values. This is demonstrable later candidate-only
calibration. Inspect the diff, not only its “align tab baselines” title.

Do not remove the relative group in isolation: its absolute children depend on
it. First prove the reference border and selected-tab sizing semantics through
equivalent public-API inputs, address any general core failures they expose,
then remove the alternate paint/layout structure together. The already-reviewed
tab-panel ownership replacement is a separate issue; this finding does not
reclassify its content or semantics evidence.

## Verification

`node scripts/audit-material-tab-position-substitution.mjs` writes the complete
report. `node --test tests/material-parity/tab-position-substitution.spec.mjs`
passed **2/2**, exit 0, 754.1775 ms. Fresh collection equals the checked report.
Seven negative controls reject changed reference border/ancestry, candidate
host/strip positioning, indicator parent/width, and capture errors.

No core cause, actual output equivalence, or repair is claimed. Equivalent-input
browser proof and canonical integration remain outstanding.
