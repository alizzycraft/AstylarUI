# Visibility: confirmed public input-support gap

CSS `visibility` is absent from the current public `StyleRule`, the core
validator's supported property set, and the loaded-document-CSS mapping.
This is a core capability gap, not a reason to construct a different fixture.

The minimal public-package input is:

```ts
import type { StyleRule } from 'astylarui';
const rule: StyleRule = { selector: '#probe', visibility: 'hidden' };
```

It produces TS2353: `visibility` does not exist in `StyleRule`. Substituting
`overflow: 'hidden'` compiles without diagnostics. This is a type-contract
reduction, not a browser/rendering reduction. No renderer or fixture changed.

The executable probe compiles an in-memory consumer using TypeScript's bundler
resolution, compares the complete installed/source interface declarations, and
requires the imported type to resolve to 87 actual properties. A preliminary
NodeNext probe incorrectly appeared diagnostic-free because the package's
extensionless declaration references resolved to an unusable type under that
mode. The final probe rejects `any`/`unknown` explicitly; it does not infer
support from an empty diagnostic list alone. This audit does not classify the
separate NodeNext package-resolution behavior.

Machine evidence: `docs/material-visibility-support.json`, including exact
source receipts, both input snippets and compiler results. Regenerate with
`node --max-old-space-size=768 scripts/audit-material-visibility-support.mjs`.

Verification:
`node --max-old-space-size=768 --test tests/material-parity/visibility-support.spec.mjs`
passes **1/1**, no skips, in **12,307.3983 ms**.

The [visibility population](material-visibility-input-population.md) remains
unresolved canonically. The support gap must be distinguished from omitted
local values, inherited values and state-owner substitutions. It does not prove
the snackbar is offscreen or hidden, explain tooltip positioning, or establish
that visible-state raster output is wrong. The implementation handoff now
requires general visibility/inheritance/paint/interaction proof before any
component-specific workaround is considered.
