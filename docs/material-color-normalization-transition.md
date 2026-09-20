# Color normalization correction and scalar transition

## Owning correction

`normalizeColor` in `tests/material-parity/input-equivalence-audit.mjs` now keeps
fractional RGB channels and alpha separate from layout's three-decimal rounding.
The sRGB-to-RGB unit conversion uses decimal integer arithmetic, not an early
conversion to 8-bit color. Equivalent finite decimal spellings and scientific
notation normalize without discarding their value. Malformed or excessively
large unsupported notation is left unnormalized, not silently rounded to zero.

Hex alpha retains the precision of its numeric byte/255 conversion rather than
being rounded to three decimals. This does not claim infinite-precision
representation of recurring fractions. No rendered-pixel tolerance was added.
Renderer, plugin and canonical comparison authoring are unchanged.

The new focused regression file had **0/3 passing** before the correction and
**3/3 passing** afterward. The failures demonstrated both the integer sRGB loss and
three-decimal RGB/alpha loss, plus acceptance of an invalid five-channel RGB
value. This correction is not a fixture-specific color substitution.

## Complete original-capture transition

The separate transition collector executes the exact seven normalization
functions from the accepted pre-correction commit
`4650791a7208b841dd29f1ced015f98234949623` and the current working source. It
authenticates the original 2,311-case / 6,946-owner capture and compares all
normalized properties in reference, candidate comparison, candidate normal and
candidate interaction stages.

- **No non-color value changes.**
- **No candidate-stage value changes** in this captured population.
- 2,371 reference background values change.
- 92 values each change for reference text color, caret color and the four
  border colors.
- **2,311 newly visible differences**, all in the previously reviewed 144 root
  background groups.
- **612 existing differences retain unequal inputs but have corrected reference
  values**; these form 66 additional transition groups.
- No formerly unequal comparison becomes equal through this correction.

The test joins every newly exposed root's case, component, element and property
to the complete independent source review in `material-root-background-inputs`.
The other 612 observations are not automatically reclassified. They include
browser decimal-serialization uncertainty, which is not a core defect by itself.

An authenticated read of every canonical discrepancy row from commit `4650791`
locates the prior owners of these 66 changed-value groups:

| Prior attribution | Groups | Affected original observations |
| --- | ---: | ---: |
| Border initial/current-color observation divergence | 32 | 128 |
| Material button border-reset omission | 8 | 240 |
| Motion-bearing caret observation-stage mismatch | 2 | 60 |
| Other owner caret observation-stage mismatch | 8 | 32 |
| Still unresolved | 16 | 152 |

This is an impact map, not revalidation of those classifications under the new
normalizer. The whole prior payload was authenticated while reading its rows;
matching uses family, element, property and both old scalar values, and records
the complete matched-row hashes. Log:
`artifacts/material-parity/field-host-flow-input-audit/color-normalization-prior-attribution-impact-sep20.log`,
raw SHA-256 `5035629a8b0ce4233532f122ee0f37fe4af0f8588db19733e0d1cf6ba611c2a0`.

Normalization-function SHA-256 values:

- Previous: `8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e`
- Current: `27fcf8d751bb10a5a7e9426a4d21b83de3c0d9242387d75a67613b953940c773`

Machine-readable transition:
`docs/material-color-normalization-transition.json`, SHA-256
`8578efa6882d25a5ad82f58edf36f327542f4ec9c9c5c31d73479931a644cd81`.

## Historical evidence is not rewritten as current evidence

The original loss diagnostic now reads its normalizer from pinned commit
`65a122f2b8be2ed83fccdac59491a949c8771a7b`. Its machine report adds that explicit
revision receipt and otherwise remains field-for-field identical to the
committed historical report. It no longer requires live code to retain the bug.

Other historical source-bound plans still name the earlier normalization
contract. Their current-code binding guards must not be defeated by replacing
hashes without replaying and reviewing the actual affected values. Historical
joins should stay tied to historical source; current classification must then
verify the current property values and original observation identity.

## Integration status and next work

The correction and full scalar census are verified in isolation. **The canonical
report has not been regenerated, prior classifications have not all been
revalidated, and whole-audit acceptance remains false.** The last canonical
freshness result is the frozen pre-correction result recorded in the font-tool
proof; it does not establish freshness for this new normalizer.

Next, inspect the 66 changed-value groups against the authenticated prior
canonical rows, adapt historical/current normalization bindings explicitly, and
replay their owning source proofs. Integrate the 144 source-reviewed root groups
without dropping raw observations. Then regenerate and verify the full canonical
report, including earlier classifications and the remaining unresolved inventory.
The full enforced parity matrix is still required after audit changes settle.

## Verification

```text
node --test tests/material-parity/color-normalization-precision.spec.mjs
node scripts/audit-material-fractional-color-loss.mjs
node scripts/audit-material-color-normalization-transition.mjs
node --test tests/material-parity/color-normalization-precision.spec.mjs tests/material-parity/fractional-color-loss.spec.mjs
```

The combined focused run passes **7/7**, exit 0, 7,189.4429 ms, with no skips,
cancellations or TODOs. Log:
`artifacts/material-parity/field-host-flow-input-audit/color-normalization-precision-transition-sep20.log`.
The broader `input-equivalence-audit.spec.mjs` run was started separately and is
not claimed as passing while it remains live. The transition report's explicit
`priorClassificationsRevalidated: false` and `canonicalReportRegenerated: false`
flags remain part of the evidence.

Both report `--check` commands subsequently passed. A combined run of the
precision, historical-loss and complete root-source test files passes **10/10**,
exit 0, 26,959.5156 ms, with no skips, cancellations or TODOs:

```text
node scripts/audit-material-color-normalization-transition.mjs --check
node scripts/audit-material-fractional-color-loss.mjs --check
node --test --test-concurrency=1 tests/material-parity/color-normalization-precision.spec.mjs tests/material-parity/fractional-color-loss.spec.mjs tests/material-parity/root-background-inputs.spec.mjs
```

Combined log: `color-normalization-combined-sep20.log` in the same artifact
directory. These focused checks still do not establish full integration.
