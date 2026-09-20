# Fractional color normalization loses input evidence

## Finding and scope

The audit's `normalizeColor` in
`tests/material-parity/input-equivalence-audit.mjs:2229` rounds the three
`color(srgb ...)` channels to integers after multiplying by 255. Its legacy
`rgb(...)` branch does not apply that integer rounding. This is a confirmed
**harness/instrumentation defect**, not evidence of a core paint defect.

The exact production functions demonstrate the inconsistency:

- `color(srgb 0.5 0 1)` becomes `rgba(128,0,255,1)`.
- `rgb(127.5, 0, 255)` becomes `rgba(127.5,0,255,1)`.
- The first therefore compares equal to `#8000ff`, although it requests a
  different channel value. This is not merely alternative serialization.

No canonical normalizer, renderer, plugin or comparison fixture was changed in
this increment. The checked-in JSON is separate diagnostic evidence, not an
accepted replacement canonical report or a declaration that parity is achieved.

## Complete original-capture census

`material-fractional-color-loss.json` authenticates the original capture with
SHA-256 `b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a`
and binds the exact executed production normalization functions. It scans all
2,311 cases and 6,946 mapped owners, retaining complete case membership and an
original-input hash for each observation.

| Current normalization outcome | Groups | Observations |
| --- | ---: | ---: |
| Rounding makes the compared values equal | 144 | 2,311 |
| Reference value changes, but a difference remains | 50 | 496 |
| Reference value changes; candidate local property is omitted | 16 | 116 |
| Total inspected fractional sRGB values | 210 | 2,923 |

All 2,311 suppressed scalar comparisons are the `backgroundColor` of each
family's `*-root` element. These are additional observations absent from the
canonical discrepancy inventory, not 2,311 independently diagnosed renderer
bugs. In particular, the existing 1,835 unresolved-group count does **not**
describe every input difference once this blind spot is considered.

Browser decimal serialization can itself round channels. Do not interpret every
floating-point difference in the other 612 observations as unequal authored
intent, and do not synthesize a candidate computed color where the capture
contains only an omitted local declaration.

## Authored-input corroboration

Four authenticated card/root desktop witnesses cover light, dark, contrast and
custom themes. The captured reference rule requests
`background: color-mix(in srgb,var(--surface) 94%,var(--primary))` and its frame
provides the two literal custom-property colors. The candidate root instead
receives an integer hex color in its normal, effective and comparison stages.

`examples/material-showcase/src/app/theme.ts:49` calls `mixHex(..., .06)`;
`theme.ts:53` implements it with `Math.round` per channel. The diagnostic executes
that actual TypeScript function and confirms the captured candidate values. It
also records exact integer-numerator/100 blend arithmetic independently of the
browser's decimal serialization.

For the light theme, the authored blend has channel values
`[245.88, 240.74, 248.60]`; the candidate requests `[246, 241, 249]` (`#f6f1f9`).
The audited browser serialization is
`color(srgb 0.964235 0.944078 0.974902)`. Its small serialization error is recorded
separately from the candidate's deliberate channel quantization. All four theme
witnesses have at least one authored channel difference of 0.1 or more.

This establishes unequal prequantized authoring for the four witnesses. It does
not establish visible raster error or that `color-mix` is unsupported in core.
The same mix and integer rounding already exist in initial showcase commit
`2f44011` (`git show 2f44011:examples/material-showcase/src/app/theme.ts`). It is
not justified to label this a later regression or infer an attempted renderer
workaround from history alone.

## Required follow-up

1. Correct the audit normalization in a separately verified instrumentation
   increment. Preserve meaningful fractional channels and distinguish unit
   conversion from browser serialization uncertainty. Do not introduce a blanket
   RGB tolerance or silently bless prequantized fixture input.
2. Rebuild the discrepancy population and explicitly account for newly exposed
   rows. Revalidate prior source-bound classifications; do not merely update
   hash constants until tests pass. Historical proof remains historical.
3. Extend authoring/cascade verification from these four witnesses to every
   affected root before giving all 144 groups a definitive owner classification.
4. In the later implementation task, keep the original color intent through
   style resolution. Determine whether public authoring, parsing or paint support
   needs a general correction; do not tune candidate theme colors to screenshots.
5. Keep rendered color, alpha composition and final quantization verification
   separate from this input audit.

This correction should precede treating the pending discrepancy inventory as
complete. The running canonical freshness check remains useful only for its
original, explicitly frozen normalization contract.

## Verification

Executed from `D:/dev/github/AstylarUI-audit-integration`:

```text
node scripts/audit-material-fractional-color-loss.mjs
node --test tests/material-parity/fractional-color-loss.spec.mjs
node scripts/audit-material-fractional-color-loss.mjs --check
```

All three tests passed, including synthetic loss, alpha/omission controls and
complete original-capture replay. The canonical manifest and normalizer bytes
were unchanged by the test. The diagnostic `--check` also passed.

Diagnostic report SHA-256:
`ea0fb1de4f5af13f3aeb1c4148227ee45b46c65644cbe9ec3a6a86e2c00aa302`.
These checks are not the full enforced parity matrix.
