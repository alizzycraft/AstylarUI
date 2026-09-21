# Complete visibility owner ancestry

`scripts/audit-material-visibility-ancestry.mjs` extends the prior 138 tab/stepper
traces to all **17 groups / 668 observations**, authenticating **646 distinct
captured trees**. The checked-in JSON preserves each case, scalar input digest,
paired tree receipts, exact owner keys, ancestry, computed visibility, and active
visibility rules. Inline visibility declarations are retained separately.

Reference correspondence follows authored IDs, visible parity owners, existing
reviewed generated aliases, and the exact sheet item order used by the harness.
Ambiguous owners, corrupt ancestry, missing styles/rules and receipt mismatches
fail; no first-match fallback is used. Synthetic candidate root style remains
explicitly unavailable rather than defaulted.

## Result

- All 668 reference owner chains have computed `visible` throughout.
- None of the candidate chains explicitly captures a visibility value.
- Tabs and stepper account for all 138 observations with ancestor visibility
  rules. The previously inspected state rules include hidden and visible values;
  visible is the computed result for these selected owners.
- The other 15 groups / 530 observations have no active visibility declarations
  or inline visibility on any captured ancestor. This includes all audited sheet,
  dialog, snackbar, tooltip and chip owners.

The [public browser reduction](material-public-visibility-audit.md) proves a
missing hidden-state capability, but it cannot explain these overlay symptoms
through a captured hidden rule: none exists in their owner chains. Continue
investigating placement, clipping, painting and lifecycle independently. Global
or unrecorded state and historical screenshots are not adjudicated by this census.

## Classification boundary

This evidence supports evaluating the 15 no-rule groups as possible equivalent
visible-state representations, separately from the two state-driven groups.
It does not silently assign a computed candidate value, normalize the raw
omission, or declare the corresponding elements otherwise equivalent. Final
classification must bind the applicable runtime default/public proof and must
remain scoped to visibility, not geometry or other styles.

Tabs/stepper require review of inactive and transitioning owners and their
candidate replacement/custom-paint mechanisms. A captured active owner alone
cannot prove that the missing visibility contract is harmless across states.

No canonical attribution changed. Reproduce with
`node --max-old-space-size=1024 scripts/audit-material-visibility-ancestry.mjs`.
Verify with `node --test tests/material-parity/visibility-ancestry.spec.mjs`.
