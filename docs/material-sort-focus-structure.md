# Sort focus paint: confirmed authored substitution

The complete original sort population contains 60 captured cases. All 120
reference/candidate input-tree files were authenticated against their receipts
in the original capture before inspection. Eight cases have reference focus
border paint; those same eight cases have a separate candidate focus-line child.
The other 52 have neither. This state agreement does **not** prove equivalent
layout or paint inputs.

## First divergence and ownership

Material applies `border-bottom: 1px solid currentColor` to the focusable
`.mat-sort-header-container` for keyboard/program focus. The captured matched
rule retains its selector, declarations and stylesheet source in the accompanying
JSON. The reference container also has `position: relative` from
`.mat-focus-indicator`. Its outer `sort-primary` host is static.

AstylarUI instead gives `sort-primary` relative positioning and a fixed height,
leaves `sort-trigger` with zero border width, and inserts an absolute
`sort-focus-line` sibling of the trigger. That child has a 1px background-painted
height and a top equal to the host's fixed height. This is an application-authored
paint/layout substitution **before projection**, not equal inputs failing at
the rendering boundary.

In the light desktop focus capture, the reference focus container has a 19px
content height and a 1px bottom border, while its parent reports 20px height.
The candidate host requests 19px height and the child line starts at 19px.
Unlike an in-flow border, an absolute child does not itself contribute to the
host's normal-flow height. This explains why matching line pixels alone cannot
justify the translation. These are captured style values, not a new geometry
or raster acceptance measurement.

Current authoring: `examples/material-showcase/src/app/astylar.component.ts`,
rules at lines 708–709 and structure at lines 855–881. Historical commit
`994da86bcf4b119ab194958f52788982be8bb672` (`fix(material): complete shared
control parity`) added the relative host and separate absolute line together.
The diff establishes the substitution; neither the commit title nor this audit
proves an underlying core border bug or the author's motivation.

Classification: **application authoring difference; equivalence unproven**.
Suspected compensation remains a hypothesis. This finding does not promote the
60 canonical position observations or claim rendering equivalence.

## Next diagnostic

Create a minimal public-API pair preserving the reference focusable container's
bottom border, natural height, text and state transition. Compare normal-flow
height, border paint, focus updates and sibling placement. If core diverges,
retain that failing proof and fix its owning subsystem in the later implementation
phase. If it passes, the alternate authoring is unnecessary for that primitive;
composition still requires verification. Remove the extra child and its host
positioning only as a coordinated future change, not as an isolated offset edit.

## Evidence and verification

- Machine-readable evidence: `material-sort-focus-structure.json`.
- Collector: `scripts/audit-material-sort-focus-structure.mjs`.
- Proof: `tests/material-parity/sort-focus-structure.spec.mjs`.

```text
node scripts/audit-material-sort-focus-structure.mjs
node --test --test-reporter=tap --test-reporter-destination=artifacts/material-parity/sort-focus-structure-710e926.tap tests/material-parity/sort-focus-structure.spec.mjs
node --test tests/parity/material-audit-harness-inventory.spec.mjs
```

Results: focused proof **2/2 passed**, 1,273.69 ms; complete-suite inventory
checks **4/4 passed**, 584.8944 ms. Negative checks reject a wrong parent,
non-absolute line, duplicate line, missing trigger and ambiguous reference owner.
No renderer, plugin, reference or canonical comparison code changed.
