# Root background input authoring: complete captured population

The separate fractional-color investigation identified 144 root-background
groups (2,311 observations) hidden by integer color normalization. This follow-up
checks their original source trees individually rather than extrapolating from
the four card/theme witnesses.

## Result

All **2,311 cases, 144 groups and 36 component families** have a source-bound
**application/plugin authoring defect**: the reference root requests a fractional
CSS sRGB color mix, whereas the candidate root receives an integer hex color
produced by the showcase's `mixHex` function.

The reference request is `color-mix(in srgb,var(--surface) 94%,var(--primary))`.
Each captured frame supplies the literal surface and primary colors. For each
case, the proof verifies the root's own matched background rule, absence of the
checked competing overrides, corresponding section identity, and the candidate's
authored request and all three captured local-style stages. Both full input-tree
files are authenticated against the descriptors in the original capture.

The blend is independently represented as integer channel numerators divided
by 100; candidate channels are compared in that same scale. Every reviewed case
has a genuine nonzero authored difference. No approximate RGB comparator or
legacy audit normalization is used to reach this classification.

The proof executes the actual TypeScript `mixHex` function from
`examples/material-showcase/src/app/theme.ts` and checks the `surfaceContainer`
call with `.06`. Per-case evidence retains the original input hash, both source
tree descriptors, and the replayed proof hash. The 144 group memberships are
joined exactly to the independently recorded fractional-color diagnostic; no
root observation is added or dropped.

## Ownership and limits

- The first demonstrated input difference belongs to showcase theme
  prequantization, before core rendering. These are not 144 core paint bugs.
- The original normalizer independently has a harness defect: it hides these
  unequal inputs. Its correction remains necessary.
- This does not prove a visible pixel difference, a core `color-mix` limitation,
  the equivalence of other root styles, or full component parity.
- Initial showcase commit `2f44011` already contains the mixing/rounding helper,
  as recorded in `material-fractional-color-loss.md`. No later-regression or
  workaround motivation is inferred.
- Canonical fixtures, renderer code and canonical classifications are unchanged.
  This is source evidence ready for the normalization correction and subsequent
  explicit canonical-population transition, not an assertion that the old
  canonical discrepancy inventory is complete.

After the audit normalization is corrected, retain these raw color requests and
associate the newly exposed root groups with this source proof. In a later
implementation task, preserve the reference color intent through authoring and
core style/paint handling; do not tune theme values against screenshots.

## Verification

```text
node scripts/audit-material-root-background-inputs.mjs
node --test tests/material-parity/root-background-inputs.spec.mjs
node scripts/audit-material-root-background-inputs.mjs --check
```

All three commands completed successfully. Tests: **3/3 pass**, exit 0,
16,438.1457 ms, with no skips, cancellations or TODOs. They include twelve
negative controls for changed ownership, expression, variables, inline overrides,
conditional rules and mismatched captured style stages, plus a fresh replay of
every root's source trees. The final report-freshness command exited 0 and
reproduced the complete report and the digest below.

Machine-readable report: `docs/material-root-background-inputs.json`.
SHA-256: `4f1e38d3ea7f31946f5374a0cb5f429a2479e6899ce689d6b1fecaf52a82104b`.
Test log:
`artifacts/material-parity/field-host-flow-input-audit/root-background-inputs-sep20.log`.

These focused checks do not replace the remaining full audit or enforced parity
matrix.
