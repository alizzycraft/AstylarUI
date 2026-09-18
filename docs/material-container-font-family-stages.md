# Container font-family: computed inheritance versus local declarations

The [original-source proof](material-container-font-family-stages.json) reviews
**1,082 observations across 20 mapped owners**, scanning all 2,311 original
cases. It covers badge, button-toggle, card, checkbox, chips, divider,
expansion, grid-list and both grid tiles, radio, sidenav, slide-toggle, sort,
tabs, tree, icon, both progress controls and the slider visual owner.

The browser computes `Roboto, Arial, sans-serif` at each selected container.
Its captured path to the frame contains no local font-family or font reset;
the frame explicitly supplies that stack. The corresponding candidate path
omits local font-family declarations until the page, which explicitly supplies
the same stack. All three candidate local style stages preserve that omission.
Neither selected owner has captured own text or a core retained/control text
record. Descendant text and plugin drawing are not inferred from this fact.

Classification: **parity-harness-defect**, specifically comparison of different
measurement stages. This is not a missing-host-token finding like the
[toolbar, paginator and stepper audit](material-host-font-token-inputs.md).
The stepper's explicit component font token is deliberately rejected by this
collector, even though Roboto currently appears in both resulting stacks.

The matched authoring dependency does **not** prove a computed candidate font,
physical font selection, font loading, plugin consumption, descendant glyphs,
layout or raster equivalence. No candidate computed inheritance is fabricated
to turn the raw scalar omission into a passing value.

## Motion evidence is preserved

An initial strict collector stopped on the progress-bar's transition request;
it did not establish a missing font declaration. Inspection of all progress
captures found literal `opacity 250ms cubic-bezier(0.4, 0, 0.6, 1)` transitions,
plus the spinner's literal `none !important` override. The final proof records
all **60 captured motion rules** separately and checks the complete shorthand
text, all five enumerated longhands, importance and delay serialization. Their
named targets exclude font family. This is not a reconstruction of resolved
motion or a waiver for empty/pending-variable shorthand captures. Unknown
targets, `all`, variables and animation requests are rejected.

All original scalar values, matched declarations, owner paths and paired tree
hashes remain in the proof. Exact mappings reuse existing font-size identity
checks, but the family declarations and stages are independently inspected.
This extends the input audit; it neither reauthors a fixture nor changes core.

## Recommended boundary

Keep authored/local, inherited-computed, used, and painted typography stages
distinct in the comparison harness. These owners must not receive local font
overrides merely to make their scalar values look like browser computed styles.
Investigate actual inheritance consumers through equal-input public reductions
when geometry or text differs; this stage finding does not rule those bugs out.

## Verification

```text
node scripts/audit-material-container-font-family-stages.mjs
node scripts/audit-material-container-font-family-stages.mjs --check
node --test tests/material-parity/container-font-family-stages.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation and no-write replay exit **0**. The focused/inventory suite passes
**7/7**, zero failures/skips/cancellations/TODOs, in **17,476.1766ms**.
It executes **2,440 rejection controls** across all 20 owners and four profiles,
plus a separate stepper exclusion check. Controls cover page and local requests,
unknown selectors, resets, inline attributes, ancestry, own-text changes,
retained text, inspection stages, scalar discrepancies and motion targets.
Report SHA-256:
`7d25e9c9c71f4b57f6ee3b471f2c37b2e079c2b9c17b8f20701754bff6769bc1`.
Log: `artifacts/material-parity/field-host-flow-input-audit/container-font-family-stages-focused.log`.

Discovery now contains 131 files: 123 Material, four general and four TTS.
Canonical attribution remains unchanged, with 2,160 unresolved groups. These
proofs require an exact canonical membership join before promotion. They are
not full-harness or enforced rendering acceptance.
