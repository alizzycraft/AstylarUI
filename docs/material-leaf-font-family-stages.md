# Plain-text font-family measurement stages

The [source proof](material-leaf-font-family-stages.json) authenticates all
2,311 original cases and checks 152 observations: badge-label 52, card-copy 52,
divider-above 24 and divider-below 24. Both sides inherit the explicit page
stack `Roboto, Arial, sans-serif`; no captured local family/reset/motion request
interrupts those paths. The candidate's three local declaration stages omit
the property, while its retained **core-text-registry** record supplies exactly
the browser's computed family stack.

Classification: **parity-harness-defect** (local declaration compared with
inherited text input). Adding local font overrides to these leaves would hide
the stage mismatch rather than repair a renderer. The original scalar omission
is retained, not replaced by a synthesized computed value. Source/tree hashes,
full relevant declarations, owner paths, text and retained records are recorded.

This proof reuses the earlier leaf font-size proof only for identity, ancestry,
text and retained-owner validation. Font-family requests, scalar observations,
all three stages and retained family are checked independently. It excludes
stepper content: that reference inherits a component `Roboto` token, while the
candidate retains the page stack. Identical-looking glyphs cannot justify
treating those authoring dependencies as equivalent.

Matching family stacks does not establish the physical font used, font loading,
fallback behavior, glyph sharpness, layout, other properties or whole-element
rendering. No fixture, renderer, plugin or canonical attribution is changed.
Exact canonical membership/precedence is still required before promotion.

## Verification

```text
node scripts/audit-material-leaf-font-family-stages.mjs
node scripts/audit-material-leaf-font-family-stages.mjs --check
node --test tests/material-parity/leaf-font-family-stages.spec.mjs
```

Generation exits 0. Focused tests pass **3/3**, no failures/skips/cancellations,
in **4,085.8349ms**. They replay the full selected original population, execute
**560 rejection controls** (four owners, four profiles, 35 mutations each), and
reject stepper content separately. Controls cover changed requests, stages,
ancestors, text, unknown selectors, resets, motion, retained records and scalar
capture evidence. No-write replay is also required before committing.

Proof SHA-256: `d698711b80fb4a6f9fb6540c553b82d0d535247262930e7c8e99ab14b56962b1`.
Log: `artifacts/material-parity/field-host-flow-input-audit/leaf-font-family-stages-focused.log`.
