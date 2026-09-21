# Disabled button foreground inputs

All 60 original disabled-button observations (four profiles, 15 cases each)
request different foreground colors before rendering. The reference host uses
the Material disabled-label token and is captured as an sRGB color with alpha
0.38. The candidate authors an opaque six-digit hex color at `#button-disabled`;
that literal survives normal, interaction and effective style inspection with
owner opacity 1.

Classification: **application/plugin authoring defect**, owned by showcase
disabled-button foreground authoring. This is not a demonstrated core alpha
defect or proof that the final composited pixels differ.

## Evidence

- `scripts/audit-material-disabled-button-ink.mjs` freshly replays the complete
  authenticated button-paint source census before selecting the 60 observations.
- `docs/material-disabled-button-ink.json` retains each original input hash,
  tree receipts, case, source declarations, raw colors, and current precise
  normalized values. Its four groups exactly match the corresponding
  foreground observations in the color-normalization transition report.
- Reference owner rules have a single disabled foreground declaration and no
  inline or `all` override. Captured motion rules are retained and checked:
  transition targets are `box-shadow` or `none`; animation names are `none`.
  This bounded foreground check is not a claim about all animation behavior.
- The candidate has the shared button rule followed by the ID-specific disabled
  rule, no inline style or child owners, and consistent captured color stages.

The first collector attempt rejected the reference's additional motion rules
instead of silently ignoring them. Inspection established their disjoint/no-op
targets; the corrected proof explicitly records them and rejects a transition
to `color` or a named animation. It also rejects missing disabled state, changed
owners, competing color rules, importance, conditions and stage values.

## Source and history

The reference template is in
`examples/material-showcase/src/app/reference.component.ts:98`. Candidate
authoring is in `examples/material-showcase/src/app/astylar.component.ts:490`:
`mixHex(theme.surfaceContainer, theme.onSurface, .38)` supplies the disabled
foreground. The helper is at `examples/material-showcase/src/app/theme.ts:53`.
`git blame -L 490,490 -- examples/material-showcase/src/app/astylar.component.ts`
attributes this line to `2f440115` (the initial showcase work). This establishes
that the substitution predates the later parity reviews; it does not establish
why it was chosen or that it was a deliberate renderer workaround.

## Verification and boundaries

```text
node --max-old-space-size=1024 --test --test-concurrency=1 tests/material-parity/disabled-button-ink.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Passed **6/6**, exit 0, in **12,354 ms**. The source replay covers all 60 cases;
17 negative controls reject altered proof inputs. Report SHA-256:
`7fc910200d9c6727bd72ced2e81fbef2d5bc81f4eae7eb6e2595fae2ce048ee5`.

No renderer, canonical fixture, or main audit classification changed. Canonical
membership integration remains pending. Token fallback provenance, descendant
text paint, compositing, and output parity remain separate obligations. Restore
equivalent token/transparency inputs in the later implementation task before
using this comparison to diagnose core alpha rendering; do not replace the
literal with a newly calibrated opaque color.

## Canonical control-typography classification regression

The canonical payload committed at `6833850` retains 60 unresolved control-texture
typography differences. Streaming and authenticating its full decoded payload
shows that all 60 are the disabled button's `color`, not outstanding line-height
cases. Their case identities, reference colors and painted candidate colors
match this review's 60 findings exactly.

`reviewedButtonPaintInput` in the main audit module requires integer reference
RGB channels with the guard `/^rgba\(\d+,\d+,\d+,0\.38\)$/`. The precise normalizer
now preserves fractional channels, for example
`rgba(28.999875,26.99991,31.99995,0.38)`. Consequently this prerequisite rejects
every one of the 60 records before attribution. An integer-channel control
still passes. This demonstrates a classifier/normalizer contract mismatch,
not a new core rendering defect or justification for rounding those values.

Verification: `node --max-old-space-size=768 scripts/check-material-disabled-ink-classifier-gap.mjs`.
The read-only checker completed with exit 0, authenticated all 2,016,962,991
decoded bytes, extracted the actual source guard through its AST, and confirmed
all 60 rejections. Full machine-readable output is retained at
`artifacts/material-parity/disabled-ink-classifier-gap-2f9680b.json`.
An independent case/value join to this review also passed for all 60 records.

The next integration must accept valid precise channels without rounding or
changing alpha, and replay the entire attribution's owner/rule/stage conditions,
not merely its regex. Preserve all other differences and reject changed alpha,
competing declarations and detached source evidence. The checker establishes
this failed prerequisite only; it does not replay every remaining classification
condition or change canonical attribution. The main audit module is left
unchanged while the full legacy suite runs.

### Prepared complete-classifier replay

`tests/material-parity/disabled-ink-precision-preparation.spec.mjs` extracts the
entire current `reviewedButtonPaintInput` function and changes only its reference
RGB-channel regex in memory to permit fractional decimal channels. It executes
both original and proposed functions with the unchanged, authenticated precise
normalizer and the original paired trees for all 60 owners. Reference label,
host, rules, normal/effective and actual painted-texture stages are retained.
No production audit function or captured input is changed by this test.

The original function returns no attribution for all 60; the prepared version
returns the existing unequal-authoring classification for all 60, preserving
the exact fractional reference and opaque painted colors. Ten negative controls
retain rejection for changed alpha, disabled identity/state, missing rules,
different parent ink and changed normal/effective/painted stages. Inputs remain
unchanged after both function calls.

Command: `node --max-old-space-size=768 --test tests/material-parity/disabled-ink-precision-preparation.spec.mjs`.
Result: **2/2 passed**, no skips or failures, **1,958.2016 ms**. This is preparation
for a bounded classifier correction, not its integration or a regenerated
canonical result. Broader declaration safety remains covered by the independent
17-control source review above; no new universal cascade claim is made.

### Source-transition conservation prepared

`disabled-ink-source-transition.mjs` authenticates the complete historical
`reviewedButtonPaintInput` function (SHA-256
`add6ee139c1c10ce7adca9e61099cec23fe328ee49c99fc8d65069e030b71a5c`).
It permits only the single exact decimal-channel guard replacement, restores
that guard for historical source comparison, and preserves every byte outside
the function in the normalized source. Changes elsewhere are deliberately not
removed: the enclosing source-conservation check must still reject them.
Alternative alpha checks, missing functions, extra boolean conditions and
duplicated guards are rejected. It makes no color-value equivalence claim.

Command: `node --max-old-space-size=1024 --test --test-concurrency=1 tests/material-parity/disabled-ink-source-transition.spec.mjs tests/material-parity/disabled-ink-precision-preparation.spec.mjs`.
Result: **4/4 passed**, no failures or skips, **3,771.8339 ms**, including the
complete 60-owner replay. This helper is prepared but not yet wired into the
historical source projection. The active full legacy run retains its original
inputs; the production audit classifier and canonical evidence remain unchanged.

### Classifier integration after the full legacy run

The full legacy run at `0a50c92` terminated with **387/388 passing**, one failure,
no skips or cancellations, **1,933,488.1386 ms**. Its retained TAP file is
`artifacts/material-parity/legacy-full-0a50c92.tap`, SHA-256
`b211ccf652d92d60036a34236c84574fed0396bcfaae8a2e862845d843ab442a`.
The sole failure is the stale source-inventory expectation:
392 actual versus 356 expected. The nine migrated case-index assertions passed.

After that run ended, the exact decimal-channel guard was applied to the audit
classifier. Historical source conservation now restores only this authenticated
guard before comparing all other retained statements. The three focused
transition/replay files are included in the audit source receipts. The replay
requires that the actual production declaration equals the reviewed correction;
all 60 original-owner classifications and ten rejection controls pass.

Command: `node --max-old-space-size=1024 --test --test-concurrency=1 tests/material-parity/disabled-ink-source-transition.spec.mjs tests/material-parity/disabled-ink-precision-preparation.spec.mjs tests/material-parity/alignment-survey-conservation.spec.mjs tests/material-parity/explicit-cursor-census-conservation.spec.mjs`.
Result: **10/10 passed**, no failures or skips, **22,654.8507 ms**, rerun after
adding the three source-receipt entries. Canonical regeneration and whole-record
conservation are still required. This is an audit-classifier correction; no
renderer, plugin, comparison fixture or reference color was changed.
