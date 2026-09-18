# Historical box/grid checks after source-bound input reviews

The original production integration tests now accommodate only the exact later
metadata reviews independently authenticated from their original sources.
Their original scalar, precedence, measurement-gap and complete-row checks
remain in place. No raw input or earlier classification is exempted.

The historical comparison reconstructs prior metadata for the authenticated
later population only. It does not rewrite the current audit. Membership was
projected from each test's actual selected cases before setting count assertions;
the production tests replay and verify that membership again.

| Check | Button box sizing | Owner grid |
| --- | ---: | ---: |
| Original static cases | 36 | 36 |
| Original interaction cases | 52 | 74 |
| Unchanged scalar rows | 6,554 | 6,423 |
| Later source-bound input groups | 59 | 55 |
| Later source-bound observations | 76 | 109 |
| Other complete rows conserved | 6,282 | 6,055 |
| Retained pending caret observations | 53 | 97 |

Button-box baseline: `0165f76`. All nine added box-sizing groups, 48 later
field-host groups, 55 later caret groups / 119 observations, nine measured
owners and 64 geometry-gap cases remain accounted for. Other-row SHA-256:
`9f2623ea77e8ae158048b5a5c80c5229579d4f87ca81179575e9872bc065245a`.

Grid baseline: `364f46a309319201317919b6a23dd1aadd08f405`. All 100 added
groups / 240 occurrences, 683 eligible observations, nine later box-sizing
groups, 48 field-host groups and 55 caret groups / 108 observations remain
accounted for. Other-row SHA-256:
`1806826fdc512ae004b3451c134daa29a81611af8544917c6b844d6d825d5258`.

## Verification

```text
node --test --test-concurrency=1 tests/material-parity/button-box-sizing-canonical-integration.spec.mjs tests/material-parity/owner-grid-initial-canonical-integration.spec.mjs
```

**2/2 pass**, exit 0, **2,080,139.7366ms**, with zero failures, skips,
cancellations or TODOs. Individual durations: box **1,054,736.3131ms**;
grid **1,019,294.7929ms**.

Logs under `artifacts/material-parity/field-host-flow-input-audit/`:
`reviewed-input-box-grid-historical-subsets.log` (independent membership
projection) and `reviewed-input-box-grid-historical-production.log` (terminal
production run).

These are historical subset conservation tests, not full canonical
conservation or input/rendering parity. Canonical unresolved findings remain
2,026. Other historical integration checks and the complete current harness
remain separate obligations.
